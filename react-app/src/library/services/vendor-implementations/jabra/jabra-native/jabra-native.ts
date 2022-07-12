import { debounce, isCefHosted, requestCefPromise, timedPromise } from '../../../../utils';
import { VendorImplementation, ImplementationConfig } from '../../vendor-implementation';
import DeviceInfo from '../../../../types/device-info';
import { CallInfo } from '../../../../types/call-info';
import { JabraNativeHeadsetState, JabraHeadsetEvent, HeadsetEvent, JabraDeviceEvent, DeviceEvent, JabraNativeCommands, JabraNativeEventNames } from './types';

const connectTimeout = 5000;
const offHookThrottleTime = 500;

export default class JabraNativeService extends VendorImplementation {
  private static instance: JabraNativeService;

  isActive = false;
  devices: Map<string, DeviceInfo> = null;
  activeDeviceId: string = null;
  headsetState: JabraNativeHeadsetState = null;
  ignoreNextOffhookEvent = false;
  cefSupportsJabra = true;
  pendingConversationId: string;
  activeConversationId: string;
  pendingConversationIsOutbound: boolean;

  private constructor(config: ImplementationConfig) {
    super(config);
    this.vendorName = 'Jabra';
    this.headsetState = { ringing: false, offHook: false };
    this.devices = new Map<string, DeviceInfo>();

    // register CEF
    const assetURL = window.location.origin + window.location.pathname;
    const initData = {
      assetURL,
      callback: this.handleCefEvent.bind(this),
      supportsTerminationRequest: true,
      supportsUnifiedPreferences: true
    };
    const data = (window as any)._HostedContextFunctions?.register(initData);
    this.cefSupportsJabra = data?.supportsJabra;
  }

  static getInstance(config: ImplementationConfig): JabraNativeService {
    if (!JabraNativeService.instance || config.createNew) {
      JabraNativeService.instance = new JabraNativeService(config);
    }

    return JabraNativeService.instance;
  }

  get deviceInfo(): DeviceInfo {
    if (
      this.activeDeviceId === null ||
      this.devices === null ||
      (this.devices && !this.devices.size)
    ) {
      return null;
    }

    return this.devices.get(this.activeDeviceId);
  }

  get deviceName(): string {
    return this.deviceInfo && this.deviceInfo.deviceName;
  }

  get isDeviceAttached(): boolean {
    return !!this.deviceInfo;
  }

  private isHeadsetEvent (event: any): event is JabraHeadsetEvent {
    return event.msg === HeadsetEvent;
  }

  private isDeviceEvent (event: any): event is JabraDeviceEvent {
    return event.msg === DeviceEvent;
  }

  private handleCefEvent(event: any): void {
    if (!this.isConnected) {
      return;
    }

    if (this.isDeviceEvent(event)) {
      this.handleJabraDeviceAttached(event)
    } else if (this.isHeadsetEvent(event)) {
      this.handleJabraEvent(event);
    }
  }

  private handleJabraDeviceAttached(event: JabraDeviceEvent): void {
    this.logger.debug('handling jabra attach/detach event', event);
    this.updateDevices();
  }

  private handleJabraEvent(event: JabraHeadsetEvent): void {
    this.logger.debug(`Jabra event received`, event);
    this._processEvent(event.event, event.value);
  }

  private _handleOffhookEvent(isOffhook: boolean): void {
    // if is incoming
    if (isOffhook) {
      this.activeConversationId = this.pendingConversationId;
      this.pendingConversationId = null;
      if (this.headsetState.ringing) {

        if (!this.pendingConversationIsOutbound) {
          this.deviceAnsweredCall({name: 'CallOffHook', conversationId: this.activeConversationId});
        }

        // jabra requires you to echo the event back in acknowledgement
        this._sendCmd(JabraNativeCommands.Offhook, isOffhook);
        this._setRinging(false);
      }

      return;
    }
    this._sendCmd(JabraNativeCommands.Offhook, isOffhook);
    this._getHeadsetIntoVanillaState();
    this.deviceEndedCall({name: 'CallOnHook', conversationId: this.activeConversationId});
    this.activeConversationId = null;
  }

  private _handleMuteEvent(isMuted: boolean): void {
    // jabra requires you to echo the event back in acknowledgement
    this._sendCmd(JabraNativeCommands.Mute, isMuted);
    this.isMuted = isMuted;
    this.deviceMuteChanged({
      isMuted: isMuted,
      name: isMuted ? 'CallMuted' : 'CallUnmuted',
      conversationId: this.activeConversationId
  });
  }

  private _handleHoldEvent(isHeld: boolean): void {
    // jabra requires you to echo the event back in acknowledgement
    this._sendCmd(JabraNativeCommands.Hold, !!isHeld);
    this.deviceHoldStatusChanged({
      holdRequested: !!isHeld,
      name: !!isHeld ? 'OnHold' : 'ResumeCall',
      conversationId: this.activeConversationId
    });
  }

  private _getHeadsetIntoVanillaState(): void {
    this.setHold(null, false);
    this.setMute(false);
  }

  private _sendCmd(cmd: JabraNativeCommands, value: boolean): void {
    const deviceId = this.activeDeviceId;
    this.logger.debug('Sending command to headset', { deviceId, cmd, value });

    (window as any)._HostedContextFunctions.sendEventToDesktop(
      'jabraEvent',
      {
        deviceID: deviceId,
        event: cmd,
        value
      }
    );
  }

  private _setRinging(value: boolean): void {
    this._sendCmd(JabraNativeCommands.Ring, value);
    this.headsetState.ringing = value;
  }

  isSupported (): boolean {
    return isCefHosted() && this.cefSupportsJabra;
  }

  deviceLabelMatchesVendor(label: string): boolean {
    const lowerLabel = label.toLowerCase();
    return ['jabra'].some(searchVal => lowerLabel.includes(searchVal));
  }

  async setMute(value: boolean): Promise<void> {
    this._sendCmd(JabraNativeCommands.Mute, value);
  }

  async setHold(conversationId: string, value: boolean): Promise<void> {
    this._sendCmd(JabraNativeCommands.Hold, value);
  }

  async incomingCall(callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.pendingConversationIsOutbound = false;
    this._setRinging(true);
  }

  async answerCall(): Promise<void> {
    // HACK: for some reason the headset echos an offhook event even though it was the app that answered the call rather than the headset
    this.ignoreNextOffhookEvent = true;
    this._sendCmd(JabraNativeCommands.Offhook, true);
  }

  async rejectCall(): Promise<void> {
    this._setRinging(false);
    this.pendingConversationId = null;
  }

  async outgoingCall(callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.pendingConversationIsOutbound = true;
    this._sendCmd(JabraNativeCommands.Offhook, true);
  }

  async endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    this._setRinging(false);

    if (!hasOtherActiveCalls) {
      this._sendCmd(JabraNativeCommands.Offhook, false);
    }
    this.activeConversationId = null;
  }

  async endAllCalls(): Promise<void> {
    this._setRinging(false);
    this._sendCmd(JabraNativeCommands.Offhook, false);
    this.activeConversationId = null;
  }

  async updateDevices(): Promise<void> {
    try {
      const data = (await requestCefPromise({ cmd: 'requestJabraDevices' })) as DeviceInfo[];

      this.changeConnectionStatus({ isConnected: true, isConnecting: false });

      if (!data || !data.length) {
        this.devices.clear();
        this.activeDeviceId = null;

        this.logger.error(new Error('No attached jabra devices'));
        return;
      }

      this.logger.info('connected jabra devices', data);
      this.devices.clear();
      data.forEach(device => this.devices.set(device.deviceID, device));
      this.activeDeviceId = data[0].deviceID;

      // reset headset state
      this._setRinging(false);
      this.setMute(false);
    } catch (err) {
      this.logger.error('Failed to connect to jabra', err);
      this.disconnect();
    }
  }

  private _processEvent(eventName: any, value: any): void {
    switch (eventName) {
      case JabraNativeEventNames.OffHook:
        debounce(() => this._handleOffhookEvent(value), offHookThrottleTime)();
        break;

      case JabraNativeEventNames.RejectCall:
        this.deviceRejectedCall({name: JabraNativeEventNames.RejectCall, conversationId: this.pendingConversationId});
        break;

      case JabraNativeEventNames.Mute:
        this._handleMuteEvent(value);
        break;

      case JabraNativeEventNames.Hold:
        this._handleHoldEvent(value);
        break;
    }
  }

  connect(): Promise<void> {
    this.changeConnectionStatus({ isConnected: false, isConnecting: true });

    return timedPromise(this.updateDevices(), connectTimeout).catch(err => {
      this.logger.error('Failed to connect to Jabra', err);
    });
  }

  disconnect(): Promise<void> {
    this.changeConnectionStatus({ isConnected: false, isConnecting: false });

    return Promise.resolve();
  }
}