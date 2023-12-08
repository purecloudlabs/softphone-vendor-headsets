/* eslint-disable */
/* istanbul ignore file */
import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import DeviceInfo from '../../../types/device-info';
import {
  IApi,
  CallControlFactory,
  EasyCallControlFactory,
  // ICallControl,
  IMultiCallControl,
  init,
  RequestedBrowserTransport,
  webHidPairing,
  IDevice,
  AcceptIncomingCallBehavior,
  MuteState,
  HoldState
} from '@gnaudio/jabra-js';
import { CallInfo } from '../../..';
import { firstValueFrom, Observable, TimeoutError, EmptyError } from 'rxjs';
import { defaultIfEmpty, filter, first, map, timeout } from 'rxjs/operators';
import { isCefHosted } from '../../../utils';

export default class JabraService extends VendorImplementation {
  private static instance: JabraService;
  static connectTimeout = 5000;

  isActive = false;
  _deviceInfo: DeviceInfo;
  isMuted = false;
  isHeld = false;
  version: string = null;
  _connectDeferred: any; // { resolve: Function, reject: Function }
  jabraSdk: IApi;
  // callControlFactory: CallControlFactory;
  easyCallControlFactory: EasyCallControlFactory;
  // callControl: ICallControl;
  multiCallControl: IMultiCallControl;
  ongoingCalls = 0;
  activeCalls: string[] = [];
  // callLock = false;
  pendingConversationId: string;
  pendingConversationIsOutbound: boolean;
  activeConversationId: string;

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

  resetState (): void {
    this.setHold(null, false);
    this.setMute(false);
  }

  _processEvents (callControl: IMultiCallControl): void {
    callControl.muteState.subscribe((muteState) => {
      this.isMuted = muteState === MuteState.MUTED ? true : false;
      this.deviceMuteChanged({
        isMuted: this.isMuted,
        name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
        conversationId: this.activeConversationId
      });
    });

    callControl.holdState.subscribe((holdState) => {
      this.isHeld = holdState === HoldState.ON_HOLD ? true : false;
      this.deviceHoldStatusChanged({
        holdRequested: this.isHeld,
        name: this.isHeld ? 'OnHold' : 'ResumeCall',
        conversationId: this.activeConversationId
      });
    });

    callControl.ongoingCalls.subscribe((activeCalls) => {
      if (activeCalls < this.ongoingCalls && this.activeCalls.includes(this.activeConversationId)) {

        this.deviceEndedCall({
          name: 'CallOnHook',
          conversationId: this.activeConversationId
        });
        this.activeConversationId = null;
      }

      this.ongoingCalls = activeCalls;
    });
  }

  async setMute (value: boolean): Promise<void> {
    if (value) {
      this.multiCallControl.mute();
    } else {
      this.multiCallControl.unmute();
    }
  }

  async setHold (conversationId: string, value: boolean): Promise<void> {
    if (value) {
      this.multiCallControl.hold();
    } else {
      this.multiCallControl.resume();
    }
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.pendingConversationIsOutbound = false;
    const callAccepted = await this.multiCallControl.signalIncomingCall();
    if (callAccepted) {
      this.activeConversationId = this.pendingConversationId;
      this.deviceAnsweredCall({
        name: 'CallOffHook',
        conversationId: this.activeConversationId,
      });
    } else {
      this.deviceRejectedCall({
        name: 'IncomingCallRejected',
        conversationId: this.pendingConversationId
      });
      this.pendingConversationId = null;
    }
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if (autoAnswer) {
      this.pendingConversationId = conversationId;
    }

    this.multiCallControl.acceptIncomingCall(AcceptIncomingCallBehavior.HOLD_CURRENT);
  }

  async rejectCall (conversationId: string): Promise<void> {
    this.pendingConversationId = null;
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.pendingConversationIsOutbound = true;
    this.multiCallControl.startCall();
  }

  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (conversationId === this.activeConversationId) {
      this.activeConversationId = null;
    }

    const endedCall = this.activeCalls.indexOf(conversationId);
    if (endedCall > -1) {
      this.activeCalls.splice(endedCall, 1);
    }

    this.multiCallControl.endCall();
  }

  isDeviceInList (device: IDevice, deviceLabel: string): boolean {
    return deviceLabel.toLowerCase().includes(device?.name?.toLowerCase());
  }


  async connect (originalDeviceLabel: string): Promise<void> {
    console.log('mMoo: inside the connect function');
    if (this.isConnecting) {
      return;
    }

    this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    if (!this.jabraSdk) {
      this.jabraSdk = await this.initializeJabraSdk();
      this.easyCallControlFactory = this.createEasyCallControlFactory(this.jabraSdk);
    }

    const deviceLabel = originalDeviceLabel.toLocaleLowerCase();

    this._deviceInfo = null;

    let selectedDevice = await this.getPreviouslyConnectedDevice(deviceLabel);
    if (!selectedDevice) {
      try {
        selectedDevice = await this.getDeviceFromWebhid(deviceLabel);
      } catch (e) {
        this.isConnecting &&
          this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
        return;
      }
    }

    this.multiCallControl = await this.easyCallControlFactory.createMultiCallControl(selectedDevice);
    this._processEvents(this.multiCallControl);
    this._deviceInfo = {
      ProductName: selectedDevice.name,
      deviceName: selectedDevice.name,
      attached: true,
      deviceId: selectedDevice.id.toString()
    };
    this.changeConnectionStatus({ isConnected: true, isConnecting: false });
  }

  async getPreviouslyConnectedDevice (deviceLabel: string): Promise<IDevice> {
    // we want to wait for up to 2 events or timeout after 2 seconds
    const waitForDevice: Observable<IDevice> = this.jabraSdk.deviceList.pipe(
      defaultIfEmpty(null),
      first((devices: IDevice[]) => !!devices.length),
      map((devices: IDevice[]) =>
        devices.find((device) => this.isDeviceInList(device, deviceLabel))
      ),
      filter((device) => !!device),
      timeout(3000)
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
  createCallControlFactory (sdk: IApi): CallControlFactory {
    return new CallControlFactory(sdk);
  }

  /* istanbul ignore next */
  createEasyCallControlFactory (sdk: IApi): EasyCallControlFactory {
    return new EasyCallControlFactory(sdk);
  }
}
/* eslint-enable */