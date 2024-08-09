import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import DeviceInfo from '../../../types/device-info';
import {
  IApi,
  CallControlFactory,
  SignalType,
  ICallControl,
  ErrorType,
  init,
  RequestedBrowserTransport,
  webHidPairing,
  IDevice,
} from '@gnaudio/jabra-js';
import { CallInfo } from '../../..';
import { Subscription, firstValueFrom, Observable, TimeoutError, EmptyError } from 'rxjs';
import { defaultIfEmpty, filter, first, map, timeout } from 'rxjs/operators';
import { isCefHosted } from '../../../utils';

// const extensionId = 'onbcflemjnkemjpjcpkkpcnephnpjkcb';
const extensionId = 'cgilhompfagbhdbdoohclabpgijpjhdk';


export default class JabraService extends VendorImplementation {
  private static instance: JabraService;
  private headsetEventSubscription: Subscription;
  static connectTimeout = 5000;

  isActive = false;
  _deviceInfo: DeviceInfo;
  isMuted = false;
  isHeld = false;
  version: string = null;
  _connectDeferred: any; // { resolve: Function, reject: Function }
  jabraSdk: IApi;
  callControlFactory: CallControlFactory;
  callControl: ICallControl;
  ongoingCalls = 0;
  callLock = false;
  pendingConversationId: string;
  pendingConversationIsOutbound: boolean;
  activeConversationId: string;

  private constructor (config: ImplementationConfig) {
    super(config);
    this.vendorName = 'Jabra';
    console.log('mMoo: connecting to extension');
    chrome.runtime.connect(extensionId);
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

  resetState (): void {
    this.setHold(null, false);
    this.setMute(false);
  }

  _processEvents (callControl: ICallControl): void {
    this.headsetEventSubscription = callControl.deviceSignals.subscribe(async (signal) => {
      if (!this.callLock) {
        this.logger.debug(
          'Currently not in possession of the Call Lock; Cannot react to Device Actions'
        );
        return;
      }

      switch (signal.type) {
      case SignalType.HOOK_SWITCH:
        // do nothing when the end call button is pressed and we have an incoming call while we have an active call
        if (this.activeConversationId && this.pendingConversationId) {
          this.logger.info('ignoring hookswitch event because there is an active and incoming call');
          break;
        }

        if (signal.value) {
          callControl.offHook(true);
          callControl.ring(false);
          this.activeConversationId = this.pendingConversationId;
          this.pendingConversationId = null;
          if (!this.pendingConversationIsOutbound) {
            this.deviceAnsweredCall({
              name: 'CallOffHook',
              code: signal.type,
              conversationId: this.activeConversationId,
            });
          }
        } else {
          callControl.mute(false);
          callControl.hold(false);
          callControl.offHook(false);
          this.deviceEndedCall({
            name: 'CallOnHook',
            code: signal.type,
            conversationId: this.activeConversationId,
          });
          try {
            callControl.releaseCallLock();
          } catch ({ message, type }) {
            if (this.checkForCallLockError(message, type)) {
              this.logger.info(message);
            } else {
              this.logger.error(type, message);
            }
          } finally {
            this.activeConversationId = null;
            this.callLock = false;
          }
        }
        break;
      case SignalType.FLASH:
      case SignalType.ALT_HOLD:
        this.isHeld = !this.isHeld;
        callControl.hold(this.isHeld);
        this.deviceHoldStatusChanged({
          holdRequested: this.isHeld,
          name: this.isHeld ? 'OnHold' : 'ResumeCall',
          code: signal.type,
          conversationId: this.activeConversationId,
        });
        break;
      case SignalType.PHONE_MUTE:
        this.isMuted = !this.isMuted;
        callControl.mute(this.isMuted);
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
          code: signal.type,
          conversationId: this.activeConversationId,
        });
        break;
      case SignalType.REJECT_CALL:
        callControl.ring(false);
        this.deviceRejectedCall({
          name: SignalType[signal.type],
          conversationId: this.pendingConversationId,
        });
        this.pendingConversationId = null;
        try {
          // we only want to release call controls if there isn't another call active
          if (!this.activeConversationId) {
            callControl.releaseCallLock();
            this.callLock = false;
          }
        } catch ({ message, type }) {
          if (this.checkForCallLockError(message, type)) {
            this.logger.info(message);
          } else {
            this.logger.error(type, message);
          }
        }
      }
    });
  }

  async setMute (value: boolean): Promise<void> {
    if (!this.callLock) {
      return;
    }
    this.isMuted = value;
    this.callControl.mute(value);
  }

  async setHold (conversationId: string, value: boolean): Promise<void> {
    if (!this.callLock) {
      return;
    }
    this.isHeld = value;
    this.callControl.hold(value);
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.pendingConversationIsOutbound = false;
    try {
      this.callLock = await this.callControl.takeCallLock();
    } catch ({ message, type }) {
      if (this.checkForCallLockError(message, type)) {
        this.logger.info(message);
        this.callLock = true;
      } else {
        this.logger.error(type, message);
      }
    }

    if (this.callLock) {
      this.callControl.ring(true);
    }
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if (autoAnswer) {
      this.pendingConversationId = conversationId;
      try {
        this.callLock = await this.callControl.takeCallLock();
      } catch ({ message, type }) {
        if (this.checkForCallLockError(message, type)) {
          this.logger.info(message);
          this.callLock = true;
        } else {
          this.logger.error(type, message);
        }
      }
    }

    if (!this.callLock) {
      return;
    }

    this.callControl.ring(false);
    this.callControl.offHook(true);
  }

  async rejectCall (): Promise<void> {
    if (!this.callLock) {
      return this.logger.info(
        'Currently not in possession of the Call Lock; Cannot react to Device Actions'
      );
    }
    this.callControl.ring(false);
    this.pendingConversationId = null;
    if (!this.activeConversationId) {
      try {
        this.resetState();
        this.callControl.releaseCallLock();
      } catch ({ message, type }) {
        if (this.checkForCallLockError(message, type)) {
          this.logger.info(message);
        } else {
          this.logger.error(type, message);
        }
      } finally {
        this.pendingConversationId = null;
        this.callLock = false;
      }
    }
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    try {
      this.callLock = await this.callControl.takeCallLock();
    } catch ({ message, type }) {
      if (this.checkForCallLockError(message, type)) {
        this.logger.info(message);
        this.callLock = true;
      } else {
        this.logger.error(type, message);
      }
    }

    if (this.callLock) {
      this.pendingConversationId = callInfo.conversationId;
      this.pendingConversationIsOutbound = true;
      this.callControl.offHook(true);
    }
  }

  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (hasOtherActiveCalls) {
      return;
    }

    if (conversationId === this.activeConversationId) {
      this.activeConversationId = null;
    }

    try {
      if (!this.callLock) {
        return this.logger.info(
          'Currently not in possession of the Call Lock; Cannot react to Device Actions'
        );
      }
      this.callControl.offHook(false);
      this.resetState();
      this.callControl.releaseCallLock();
    } catch ({ message, type }) {
      if (this.checkForCallLockError(message, type)) {
        this.logger.info(message);
      } else {
        this.logger.error(type, message);
      }
    } finally {
      this.callLock = false;
    }
  }

  async endAllCalls (): Promise<void> {
    try {
      if (!this.callLock) {
        return this.logger.info(
          'Currently not in possession of the Call Lock; Cannot react to Device Actions'
        );
      }
      this.activeConversationId = null;
      this.callControl.offHook(false);
      this.resetState();
      this.callControl.releaseCallLock();
    } catch ({ message, type }) {
      if (this.checkForCallLockError(message, type)) {
        this.logger.info(message);
      } else {
        this.logger.error(type, message);
      }
    } finally {
      this.callLock = false;
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
      this.callControlFactory = this.createCallControlFactory(this.jabraSdk);
    }

    const deviceLabel = originalDeviceLabel.toLocaleLowerCase();

    this._deviceInfo = null;

    let selectedDevice;
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

    /* istanbul ignore next */
    console.log('mMoo: chrome', { chrome, runtime: chrome.runtime });
    if (chrome && chrome?.runtime) {
      chrome?.runtime?.sendMessage(extensionId, 'newDevice');
    }

    this.callControl = await this.callControlFactory.createCallControl(selectedDevice);
    await this.resetHeadsetState();
    this._processEvents(this.callControl);
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
      // transport: RequestedBrowserTransport.CHROME_EXTENSION_WITH_WEB_HID_FALLBACK,
      // transport: RequestedBrowserTransport.CHROME_EXTENSION,
      transport: RequestedBrowserTransport.WEB_HID,
    });
  }

  /* istanbul ignore next */
  createCallControlFactory (sdk: IApi): CallControlFactory {
    return new CallControlFactory(sdk);
  }

  checkForCallLockError (message: unknown, type: unknown): boolean {
    return (
      (type as ErrorType) === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')
    );
  }

  async resetHeadsetState (): Promise<void> {
    if (!this.callControl) {
      return;
    }

    try {
      await this.callControl.takeCallLock();
      this.callControl.hold(false);
      this.callControl.mute(false);
      this.callControl.offHook(false);
      this.callControl.releaseCallLock();
    } catch (e) {
      this.logger.warn('Failed to takeCallLock in order to resetHeadsetState. Ignoring reset.');
    }
  }

  async disconnect (): Promise<void> {
    try {
      if (!this.callLock) {
        return this.logger.info(
          'Currently not in possession of the Call Lock; Cannot react to Device Actions'
        );
      }
      this.callControl.releaseCallLock();
    } catch ({ message, type }) {
      if (this.checkForCallLockError(message, type)) {
        this.logger.info(message);
      } else {
        this.logger.error(type, message);
      }
    } finally {
      this.resetHeadsetState();
      this.callLock = false;
      if (this.activeConversationId) {
        this.activeConversationId = null;
      }
      this.headsetEventSubscription && this.headsetEventSubscription.unsubscribe();
      (this.isConnected || this.isConnecting) &&
        this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    }
  }
}