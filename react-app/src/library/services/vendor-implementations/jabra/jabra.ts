import {
  EasyCallControlFactory,
  HoldState,
  IApi,
  IDevice,
  IMultiCallControl,
  init,
  MuteState,
  RequestedBrowserTransport,
  webHidPairing
} from '@gnaudio/jabra-js';
import { EmptyError, firstValueFrom, Observable, Subscription, TimeoutError } from 'rxjs';
import { defaultIfEmpty, filter, first, map, skip, timeout } from 'rxjs/operators';
import { CallInfo } from '../../..';
import DeviceInfo from '../../../types/device-info';
import { isCefHosted } from '../../../utils';
import { ImplementationConfig, VendorImplementation } from '../vendor-implementation';
export interface ActiveCallState {
  conversationId: string;
  isMuted: boolean;
  isHeld: boolean;
}
export interface PendingCallState {
  conversationId: string;
  isOutbound: boolean;
  isSignaled: boolean;
}
export default class JabraService extends VendorImplementation {
  private static instance: JabraService;
  private eccSubscriptions: Subscription[] = [];
  static connectTimeout = 5000;

  _deviceInfo: DeviceInfo;

  // Both `isMuted` and `isHeld` mirror the corresponding fields
  // on `activeCall` and are kept in sync via the helpers below.
  isMuted = false;
  isHeld = false;

  jabraSdk: IApi;
  easyCallControlFactory: EasyCallControlFactory;
  easyCallControl: IMultiCallControl;

  activeCall: ActiveCallState | null = null;
  pendingCall: PendingCallState | null = null;

  // When the consumer answers a pending call, we end the active call on
  // their behalf. This flag tells the `ongoingCalls = 0` handler not to
  // fire `deviceEndedCall` — the consumer already knows the call is ending.
  private suppressNextOngoingCallsEnd = false;

  private constructor (config: ImplementationConfig) {
    super(config);
    this.vendorName = 'Jabra';
  }

  isSupported (): boolean {
    return (window.navigator as any).hid && !isCefHosted();
  }

  deviceLabelMatchesVendor (label: string): boolean {
    const lowerLabel = label.toLowerCase();
    if (['jabra'].some((searchVal) => lowerLabel.includes(searchVal))) {
      return true;
    }
    return false;
  }

  static getInstance (config: ImplementationConfig): JabraService {
    if (!JabraService.instance || config.createNew) {
      JabraService.instance = new JabraService(config);
    }

    return JabraService.instance;
  }

  get deviceInfo (): DeviceInfo {
    return this._deviceInfo;
  }

  get deviceName (): string {
    return this.deviceInfo?.deviceName;
  }

  get isDeviceAttached (): boolean {
    return !!this.deviceInfo;
  }

  private startActiveCall (conversationId: string): void {
    this.activeCall = { conversationId, isMuted: false, isHeld: false };
    this.isMuted = false;
    this.isHeld = false;
  }

  private endActiveCall (): void {
    this.activeCall = null;
    this.isMuted = false;
    this.isHeld = false;
  }

  private requireEcc (action: string): boolean {
    if (!this.easyCallControl) {
      this.logger.warn(`EasyCallControl not available; cannot ${action}`);
      return false;
    }
    return true;
  }

  private updateActiveCallState (patch: Partial<Pick<ActiveCallState, 'isMuted' | 'isHeld'>>): void {
    /* istanbul ignore if -- defensive guard; callers always check activeCall first */
    if (!this.activeCall) {
      return;
    }
    if (patch.isMuted !== undefined) {
      this.activeCall.isMuted = patch.isMuted;
      this.isMuted = patch.isMuted;
    }
    if (patch.isHeld !== undefined) {
      this.activeCall.isHeld = patch.isHeld;
      this.isHeld = patch.isHeld;
    }
  }

  /**
   * Subscribe to EasyCallControl observables for headset-initiated events
   * (mute button, hold button, device disconnect).
   */
  private _subscribeToEccEvents (ecc: IMultiCallControl): void {
    // `skip(1)` discards the initial replay, so we only react to real state changes (button presses, our own commands).
    this.eccSubscriptions.push(
      ecc.muteState.pipe(skip(1)).subscribe((state) => {
        if (!this.activeCall) return;

        const isMuted = state === MuteState.MUTED;
        if (isMuted === this.activeCall.isMuted) return;

        this.logger.info('ECC muteState changed', { isMuted, conversationId: this.activeCall.conversationId });
        const conversationId = this.activeCall.conversationId;
        this.updateActiveCallState({ isMuted });
        this.deviceMuteChanged({
          isMuted,
          name: isMuted ? 'CallMuted' : 'CallUnmuted',
          conversationId,
        });
      })
    );

    this.eccSubscriptions.push(
      ecc.holdState.pipe(skip(1)).subscribe((state) => {
        if (!this.activeCall) return; 

        const isHeld = state === HoldState.ON_HOLD;
        if (isHeld === this.activeCall.isHeld) return;

        this.logger.info('ECC holdState changed', { isHeld, conversationId: this.activeCall.conversationId });
        const conversationId = this.activeCall.conversationId;
        this.updateActiveCallState({ isHeld });
        this.deviceHoldStatusChanged({
          holdRequested: isHeld,
          name: isHeld ? 'OnHold' : 'ResumeCall',
          conversationId,
        });
      })
    );

    this.eccSubscriptions.push(
      ecc.ongoingCalls.subscribe((count) => {
        this.logger.info('ECC ongoingCalls changed', { count, conversationId: this.activeCall?.conversationId });
        if (count === 0 && this.activeCall) {

          const conversationId = this.activeCall.conversationId;
          const consumerInitiated = this.suppressNextOngoingCallsEnd; // We can ignore these
          this.suppressNextOngoingCallsEnd = false;
          this.endActiveCall();
          if (!consumerInitiated) {
            this.deviceEndedCall({
              name: 'CallOnHook',
              conversationId,
            });
          }
        }

        if (count === 0 && this.pendingCall && !this.pendingCall.isSignaled) {
          this.logger.info('active call ended; signaling deferred pending call', {
            conversationId: this.pendingCall.conversationId,
          });
          this._signalPendingCall(this.pendingCall.conversationId);
        }
      })
    );

    // Device disconnected
    this.eccSubscriptions.push(
      ecc.onDisconnect.subscribe(() => {
        this.logger.warn('ECC device disconnected');
        this.endActiveCall();
        this.pendingCall = null;
        this.changeConnectionStatus({ isConnected: false, isConnecting: false });
      })
    );
  }

  async setMute (value: boolean): Promise<void> {
    if (!this.activeCall) {
      this.logger.info('setMute: skipping, no active call');
      return;
    }

    try {
      value ? await this.easyCallControl.mute() : this.easyCallControl.unmute();
      this.updateActiveCallState({ isMuted: value });
    } catch (err) {
      this.logger.error('Failed to set mute', err);
    }
  }

  async setHold (conversationId: string, value: boolean): Promise<void> {
    if (!this.activeCall) {
      this.logger.info('setHold: skipping, no active call');
      return;
    }

    try {
      value ? await this.easyCallControl.hold() : await this.easyCallControl.resume();
      this.updateActiveCallState({ isHeld: value });
    } catch (err) {
      this.logger.error('Failed to set hold', err);
    }
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    if (!this.requireEcc('handle incoming call')) return;

    this.pendingCall = {
      conversationId: callInfo.conversationId,
      isOutbound: false,
      isSignaled: false,
    };

    if (this.activeCall) {
      this.logger.info('incomingCall: active call exists; deferring headset ring until it ends', {
        activeConversationId: this.activeCall.conversationId,
        incomingConversationId: callInfo.conversationId,
      });
      return;
    }

    this._signalPendingCall(callInfo.conversationId);
  }

  private _signalPendingCall (incomingConversationId: string): void {
    /* istanbul ignore else -- defensive; callers always set pendingCall first */
    if (this.pendingCall) {
      this.pendingCall.isSignaled = true;
    }

    this.logger.info('signalIncomingCall: calling signalIncomingCall()', { conversationId: incomingConversationId });

    this.easyCallControl.signalIncomingCall(120000).then((accepted) => {
      if (this.pendingCall?.conversationId !== incomingConversationId) {
        this.logger.info('signalIncomingCall resolved but pendingCall changed; ignoring', {
          accepted,
          incomingConversationId,
          currentPendingId: this.pendingCall?.conversationId,
        });
        return;
      }

      if (accepted) {
        if (this.activeCall && this.activeCall.conversationId !== incomingConversationId) {
          const previousActiveId = this.activeCall.conversationId;
          this.logger.info('headset accept during active+pending: ending previous active', {
            previousActiveId,
            newActiveId: incomingConversationId,
          });
          this.endActiveCall();
          this.deviceEndedCall({ name: 'CallOnHook', conversationId: previousActiveId });
        }

        this.logger.info('signalIncomingCall: call accepted from headset', { conversationId: incomingConversationId });
        this.startActiveCall(incomingConversationId);
        this.pendingCall = null;
        this.deviceAnsweredCall({
          name: 'CallOffHook',
          conversationId: incomingConversationId,
        });
      } else {
        this.logger.info('signalIncomingCall: call rejected from headset', { conversationId: incomingConversationId });
        this.deviceRejectedCall({
          name: 'REJECT_CALL',
          conversationId: incomingConversationId,
        });
        this.pendingCall = null;
      }
    }).catch((err) => {
      this.logger.error('signalIncomingCall failed', err);
      this.pendingCall = null;
    });
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if (!this.requireEcc('answer call')) return;

    if (autoAnswer) {
      this.pendingCall = { conversationId, isOutbound: false, isSignaled: false };
    }

    const wasSignaled = !!this.pendingCall?.isSignaled;
    const previousActive = this.activeCall;

    // Suppress the deferred-ring auto-trigger: by marking `isSignaled = true`
    // up-front, the `ongoingCalls = 0` handler (which fires when we end the
    // previous active call below) won't try to ring this pending call while
    // we're already taking it over.
    if (this.pendingCall) {
      this.pendingCall.isSignaled = true;
    }

    try {
      if (wasSignaled) {
        // Standard accept: SDK has this call as pending incoming.
        // `acceptIncomingCall` (default END_CURRENT) implicitly ends any prior
        // active call and promotes the incoming.
        this.logger.info('answerCall: acceptIncomingCall()', { conversationId });
        await this.easyCallControl.acceptIncomingCall();
      } else {
        // Call-waiting path: we deferred signalIncomingCall, so the SDK has
        // no pending incoming to accept. End the previous active call (if
        // any) and put the device into call state for the new one ourselves.
        if (previousActive) {
          this.logger.info('answerCall: ending previous active before starting new', {
            previousActiveId: previousActive.conversationId,
            newConversationId: conversationId,
          });
          // Suppress the `deviceEndedCall` event for the previous active —
          // the consumer initiated this end by answering the pending call.
          this.suppressNextOngoingCallsEnd = true;
          try {
            await this.easyCallControl.endCall();
          } catch (err) {
            this.suppressNextOngoingCallsEnd = false;
            this.logger.debug('answerCall: endCall cleanup', err);
          }
        }
        this.logger.info('answerCall: startCall()', { conversationId });
        await this.easyCallControl.startCall();
      }

      // The `ongoingCalls = 0` handler has already cleared `activeCall` and
      // fired `deviceEndedCall` for any prior active call. We just promote
      // the pending call locally.
      this.startActiveCall(this.pendingCall?.conversationId || conversationId);
      this.pendingCall = null;
    } catch (err) {
      this.logger.error('Failed to answer call', err);
    }
  }

  async rejectCall (): Promise<void> {
    if (!this.requireEcc('reject call')) return;

    if (!this.pendingCall) {
      this.logger.info('rejectCall: no pending call to reject');
      return;
    }

    const wasSignaled = this.pendingCall.isSignaled;
    const conversationId = this.pendingCall.conversationId;

    try {
      if (wasSignaled) {
        // SDK has the call as pending incoming — dismiss via rejectIncomingCall.
        this.logger.info('rejectCall: rejectIncomingCall()', { conversationId });
        this.easyCallControl.rejectIncomingCall();
      } else {
        // Call-waiting path: we never told the SDK about this call, so there
        // is nothing to clean up on the device side. The active call (if any)
        // is unaffected.
        this.logger.info('rejectCall: pending was not signaled to headset, clearing locally', { conversationId });
      }
      this.pendingCall = null;
    } catch (err) {
      this.logger.error('Failed to reject call', err);
    }
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    if (!this.requireEcc('start outgoing call')) return;

    if (this.activeCall) {
      this.logger.info('outgoingCall: already in an active call, ignoring', {
        activeConversationId: this.activeCall.conversationId,
        requestedConversationId: callInfo.conversationId,
      });
      return;
    }

    try {
      this.pendingCall = {
        conversationId: callInfo.conversationId,
        isOutbound: true,
        isSignaled: false,
      };
      this.logger.info('outgoingCall: startCall()', { conversationId: callInfo.conversationId });
      await this.easyCallControl.startCall();
      this.startActiveCall(callInfo.conversationId);
      this.pendingCall = null;
    } catch (err) {
      this.logger.error('Failed to start outgoing call', err);
      this.pendingCall = null;
    }
  }

  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (hasOtherActiveCalls) {
      this.logger.info('endCall: skipping because hasOtherActiveCalls=true', { conversationId });
      return;
    }

    if (conversationId === this.activeCall?.conversationId) {
      this.endActiveCall();
    }

    if (!this.requireEcc('end call')) return;

    try {
      this.logger.info('endCall: endCall()', { conversationId });
      await this.easyCallControl.endCall();
    } catch (err) {
      this.logger.error('Failed to end call', err);
    }
  }

  async endAllCalls (): Promise<void> {
    if (!this.requireEcc('end all calls')) return;

    // If there's a pending incoming call, reject it. Only call the SDK if we
    // actually signaled the device — otherwise the SDK doesn't know about it
    // and `rejectIncomingCall` would throw "no incoming call pending".
    if (this.pendingCall) {
      if (this.pendingCall.isSignaled) {
        try {
          this.easyCallControl.rejectIncomingCall();
          this.logger.info('endAllCalls: rejected pending incoming call');
        } catch (err) {
          this.logger.debug('endAllCalls: rejectIncomingCall cleanup', err);
        }
      }
      this.pendingCall = null;
    }

    // If there's an active call, end it
    if (this.activeCall) {
      this.endActiveCall();
      try {
        await this.easyCallControl.endCall();
      } catch (err) {
        this.logger.debug('endAllCalls: endCall cleanup', err);
      }
    }
  }

  isDeviceInList (device: IDevice, deviceLabel: string): boolean {
    return deviceLabel.toLowerCase().includes(device?.name?.toLowerCase());
  }

  async connect (originalDeviceLabel: string): Promise<void> {
    if (this.isConnecting) {
      return;
    }

    this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    if (!this.jabraSdk) {
      this.jabraSdk = await this.initializeJabraSdk();
    }

    const deviceLabel = originalDeviceLabel.toLocaleLowerCase();

    this._deviceInfo = null;

    let selectedDevice: IDevice;
    if (await this.deviceHasPermissions(deviceLabel)) {
      selectedDevice = await this.getPreviouslyConnectedDevice(deviceLabel);

      if (!selectedDevice) {
        console.warn('Unable to find appropriate device. Setting state to "Not Running" to allow a retry"', deviceLabel);
        this.changeConnectionStatus({ isConnected: false, isConnecting: false });
        return;
      }
    } else {
      try {
        selectedDevice = await this.getDeviceFromWebhid(deviceLabel);
      } catch (e) {
        this.isConnecting &&
          this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
        return;
      }
    }

    this.easyCallControl = await this.createEasyCallControl(selectedDevice).catch((err) => {
      this.logger.warn('Failed to create EasyCallControl instance.', err);
      return null;
    });

    if (this.easyCallControl) {
      this.logger.info('EasyCallControl created successfully', this.easyCallControl.device);
      this._subscribeToEccEvents(this.easyCallControl);
    } else {
      this.logger.error('EasyCallControl not available — headset will not function');
    }

    this._deviceInfo = {
      ProductName: selectedDevice.name,
      deviceName: selectedDevice.name,
      attached: true,
      deviceId: selectedDevice.id.toString(),
    };
    this.changeConnectionStatus({ isConnected: true, isConnecting: false });
  }

  async deviceHasPermissions (deviceLabel: string): Promise<boolean> {
    const allowedHIDDevices = await (window.navigator as any).hid.getDevices();
    let deviceFound = false;
    allowedHIDDevices.forEach(device => {
      if (deviceLabel.includes(device?.productName?.toLowerCase())) {
        deviceFound = true;
      }
    });
    return deviceFound;
  }

  async getPreviouslyConnectedDevice (deviceLabel: string): Promise<IDevice> {
    const waitForDevice: Observable<IDevice> = this.jabraSdk.deviceList.pipe(
      defaultIfEmpty(null),
      first((devices: IDevice[]) => !!devices.length),
      map((devices: IDevice[]) =>
        devices.find((device) => this.isDeviceInList(device, deviceLabel))
      ),
      filter((device) => !!device),
      timeout(15000)
    );

    return firstValueFrom(waitForDevice).catch((err) => {
      if (err instanceof TimeoutError || err instanceof EmptyError) {
        return null;
      }

      return Promise.reject(err);
    });
  }

  async getDeviceFromWebhid (deviceLabel: string): Promise<IDevice> {
    this.requestWebHidPermissions(webHidPairing);

    return firstValueFrom(
      this.jabraSdk.deviceList.pipe(
        map((devices: IDevice[]) =>
          devices.find((device) => this.isDeviceInList(device, deviceLabel))
        ),
        filter((device) => !!device),
        first(),
        timeout(30000)
      )
    ).catch((err) => {
      if (err instanceof TimeoutError) {
        err = new Error('The selected device was not granted WebHID permissions');
      }
      this.logger.error(err);
      return Promise.reject(err);
    });
  }

  /* istanbul ignore next */
  async initializeJabraSdk (): Promise<IApi> {
    return init({
      appId: 'softphone-vendor-headsets',
      appName: 'Softphone Headset Library',
      transport: RequestedBrowserTransport.CHROME_EXTENSION_WITH_WEB_HID_FALLBACK,
    });
  }

  /* istanbul ignore next */
  createEasyCallControl (device: IDevice): Promise<IMultiCallControl> {
    try {
      if (!this.easyCallControlFactory) {
        this.easyCallControlFactory = new EasyCallControlFactory(this.jabraSdk);
      }
      return this.easyCallControlFactory.createMultiCallControl(device);
    } catch (err) {
      this.logger.warn('Failed to create EasyCallControlFactory', err);
      return Promise.resolve(null);
    }
  }

  async disconnect (): Promise<void> {
    // Unsubscribe from all ECC observables
    this.eccSubscriptions.forEach(sub => sub.unsubscribe());
    this.eccSubscriptions = [];

    // Teardown EasyCallControl (releases lock, cleans up)
    if (this.easyCallControl) {
      try {
        this.easyCallControl.teardown();
        this.logger.info('disconnect: EasyCallControl teardown completed');
      } catch (err) {
        this.logger.warn('disconnect: EasyCallControl teardown failed', err);
      }
    }

    this.endActiveCall();
    this.pendingCall = null;

    (this.isConnected || this.isConnecting) &&
      this.changeConnectionStatus({ isConnected: false, isConnecting: false });
  }
}
