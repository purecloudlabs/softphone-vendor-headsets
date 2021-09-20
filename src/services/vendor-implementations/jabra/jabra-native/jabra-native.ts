import { debounce, timedPromise } from '../../../../utils';
import Implementation, { ImplementationConfig } from '../../Implementation';
import DeviceInfo from '../../../../models/device-info';
import { JabraNativeHeadsetState } from './jabra-native-heaset-state';
import { JabraNativeEvent } from './jabra-native-event';
import { JabraNativeCommands } from './jabra-native-commands';
import ApplicationService from '../../../application';
import { JabraNativeEventNames } from './jabra-native-events';

const JabraEventName = 'JabraEvent';
const JabraDeviceAttached = 'JabraDeviceAttached';

const connectTimeout = 5000;
const offHookThrottleTime = 500;

export default class JabraNativeService extends Implementation {
  private static instance: JabraNativeService;

  applicationService: ApplicationService;

  isConnecting = false;
  isConnected = false;
  isActive = false;
  devices: Map<string, DeviceInfo> = null;
  activeDeviceId: string = null;
  handler = this.handleJabraEvent.bind(this);
  deviceAttachedHandler = this.handleJabraDeviceAttached.bind(this);
  headsetState: JabraNativeHeadsetState = null;
  ignoreNextOffhookEvent = false;
  _connectionInProgress: any; // { resolve: Function, reject: Function }

  private constructor(config: ImplementationConfig) {
    super(config);
    this.vendorName = 'Jabra';
    this.headsetState = { ringing: false, offHook: false };
    this.devices = new Map<string, DeviceInfo>();
    this.applicationService = ApplicationService.getInstance();
  }

  static getInstance(config: ImplementationConfig) {
    if (!JabraNativeService.instance) {
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

  deviceLabelMatchesVendor(label: string): boolean {
    return label.toLowerCase().includes('jabra');
  }

  handleJabraDeviceAttached({ deviceName, deviceId, attached }): void {
    this.Logger.debug('handling jabra attach/detach event', { deviceName, deviceId, attached });
    this.updateDevices();
  }

  handleJabraEvent({ eventName, value }: JabraNativeEvent): void {
    this.Logger.debug('handling jabra event', { eventName, value });
    this._processEvent(eventName, value);
  }

  _handleOffhookEvent(isOffhook: boolean): void {
    // if is incoming
    if (isOffhook) {
      if (this.headsetState.ringing) {
        this.deviceAnsweredCall();
        // jabra requires you to echo the event back in acknowledgement
        this._sendCmd(JabraNativeCommands.Offhook, isOffhook);
        this._setRinging(false);
      }

      return;
    }

    this._getHeadsetIntoVanillaState();
    this.deviceEndedCall();
  }

  _handleMuteEvent(isMuted: boolean): void {
    // jabra requires you to echo the event back in acknowledgement
    this._sendCmd(JabraNativeCommands.Mute, isMuted);
    this.deviceMuteChanged(isMuted);
  }

  _handleHoldEvent(): void {
    // jabra requires you to echo the event back in acknowledgement
    this.deviceHoldStatusChanged(null, true);
  }

  _getHeadsetIntoVanillaState(): void {
    this.setHold(null, false);
    this.setMute(false);
  }

  _sendCmd(cmd: JabraNativeCommands, value): void {
    const deviceId = this.activeDeviceId;
    this.Logger.debug('Sending command to headset', { deviceId, cmd, value });
    this.applicationService.hostedContext.sendJabraEventToDesktop(deviceId, cmd, value);
  }

  _setRinging(value: boolean): void {
    this._sendCmd(JabraNativeCommands.Ring, value);
    this.headsetState.ringing = value;
  }

  setMute(value: boolean): Promise<void> {
    this._sendCmd(JabraNativeCommands.Mute, value);
    return Promise.resolve();
  }

  setHold(conversationId: string, value: boolean): Promise<void> {
    this._sendCmd(JabraNativeCommands.Hold, value);
    return Promise.resolve();
  }

  incomingCall(): Promise<void> {
    this._setRinging(true);
    return Promise.resolve();
  }

  answerCall(): Promise<void> {
    // HACK: for some reason the headset echos an offhook event even though it was the app that answered the call rather than the headset
    this.ignoreNextOffhookEvent = true;

    this._sendCmd(JabraNativeCommands.Offhook, true);
    return Promise.resolve();
  }

  outgoingCall(): Promise<void> {
    this._sendCmd(JabraNativeCommands.Offhook, true);
    return Promise.resolve();
  }

  endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    this._setRinging(false);

    if (!hasOtherActiveCalls) {
      this._sendCmd(JabraNativeCommands.Offhook, false);
    }

    return Promise.resolve();
  }

  endAllCalls(): Promise<void> {
    this._setRinging(false);
    this._sendCmd(JabraNativeCommands.Offhook, false);
    return Promise.resolve();
  }

  updateDevices(): Promise<void> {
    const context = this.applicationService.hostedContext;

    return context
      .requestJabraDevices()
      .then((data: DeviceInfo[]) => {
        if (this._connectionInProgress) {
          this._connectionInProgress.resolve();
        }

        this.isConnecting = false;
        this.isConnected = true;

        if (!data || !data.length) {
          this.devices.clear();
          this.activeDeviceId = null;

          this.Logger.error(new Error('No attached jabra devices'));
          return;
        }

        this.Logger.info('connected jabra devices', data);
        this.devices.clear();
        data.forEach(device => this.devices.set(device.deviceID, device));
        this.activeDeviceId = data[0].deviceID;

        // reset headset state
        this._setRinging(false);
        this.setMute(false);
      })
      .catch(err => {
        this.Logger.error('Failed to connect to jabra', err);
        this.disconnect();
      });
  }

  _processEvent(eventName: any, value: any) {
    switch (eventName) {
      case JabraNativeEventNames.OffHook:
        debounce(() => this._handleOffhookEvent(value), offHookThrottleTime)();
        break;

      case JabraNativeEventNames.RejectCall:
        this.deviceRejectedCall(null);
        break;

      case JabraNativeEventNames.Mute:
        this._handleMuteEvent(value);
        break;

      case JabraNativeEventNames.Hold:
        this._handleHoldEvent();
        break;
    }
  }

  connect(): Promise<void> {
    this.isConnecting = true;

    const context = this.applicationService.hostedContext;
    context.on(JabraEventName, this.handler);
    context.on(JabraDeviceAttached, this.deviceAttachedHandler);

    return timedPromise(this.updateDevices(), connectTimeout).catch(err => {
      this.Logger.error('Failed to connect to Jabra', err);
    });
  }

  disconnect(): Promise<void> {
    this.applicationService.hostedContext.off(JabraEventName, this.handler);

    this.isConnecting = false;
    this.isConnected = false;

    return Promise.resolve();
  }
}
