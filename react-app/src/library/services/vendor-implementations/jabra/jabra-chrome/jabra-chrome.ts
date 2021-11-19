import { VendorImplementation, ImplementationConfig } from '../../vendor-implementation';
import DeviceInfo from '../../../../types/device-info';
import { JabraChromeCommands } from './jabra-chrome-commands';
import { JabraChromeRequestedEvents } from './jabra-chrome-requested-events';
import { timedPromise } from '../../../../utils';
import { EventTranslation } from './jabra-chrome-event-translation';
import { v4 } from 'uuid';

const incomingMessageName = 'jabra-headset-extension-from-content-script';
const outgoingMessageName = 'jabra-headset-extension-from-page-script';
const clientId = v4();

export default class JabraChromeService extends VendorImplementation {
  private static instance: JabraChromeService;
  static connectTimeout = 5000;

  isConnecting = false;
  isActive = false;
  devices: Map<string, DeviceInfo>;
  activeDeviceId: string = null;
  version: string = null;
  _connectDeferred: any; // { resolve: Function, reject: Function }

  private constructor(config: ImplementationConfig) {
    super(config);
    this.vendorName = 'Jabra';
    this.devices = new Map<string, DeviceInfo>();

    window.addEventListener('message', this._messageHandler.bind(this));
  }

  deviceLabelMatchesVendor(label: string): boolean {
    return label.toLowerCase().includes('jabra');
  }

  static getInstance(config: ImplementationConfig) {
    if (!JabraChromeService.instance) {
      JabraChromeService.instance = new JabraChromeService(config);
    }

    return JabraChromeService.instance;
  }

  get deviceInfo(): DeviceInfo {
    if (this.activeDeviceId === null || this.devices.size === 0) {
      return null;
    }

    return this.devices.get(this.activeDeviceId);
  }

  get deviceName(): string {
    return this.deviceInfo.deviceName;
  }

  get isDeviceAttached(): boolean {
    return !!this.deviceInfo;
  }

  _getHeadsetIntoVanillaState(): void {
    this.setHold(null, false);
    this.setMute(false);
  }

  _sendCmd(cmd: JabraChromeCommands) {
    this.logger.debug('sending jabra event', { cmd });
    window.postMessage(
      {
        direction: outgoingMessageName,
        requestId: v4(),
        apiClientId: clientId,
        message: cmd,
      },
      '*'
    );
  }

  _messageHandler(event): void {
    if (
      event.source === window &&
      event.data.direction &&
      event.data.direction === incomingMessageName
    ) {
      this.logger.debug('Incoming jabra event', event.data);

      this.logger.info(event.data.message);

      if (event.data.message.startsWith(JabraChromeRequestedEvents.GetVersion)) {
        const version = event.data.message.substring(JabraChromeRequestedEvents.GetVersion + 1);
        this.logger.info(`jabra version: ${version}`);
        this.version = version;
      }

      if (this.isConnecting) {
        if (event.data.error !== null && event.data.error !== undefined) {
          this._handleDeviceConnectionFailure(event.data.error);
        } else {
          this._handleDeviceConnect();
        }
      } else {
        if (event.data.message.startsWith(JabraChromeRequestedEvents.GetDevices)) {
          this._handleGetDevices(
            event.data.message.substring(JabraChromeRequestedEvents.GetDevices.length + 1)
          );
          return;
        }

        if (event.data.message.startsWith(JabraChromeRequestedEvents.GetActiveDevice)) {
          this._handleGetActiveDevice(
            event.data.message.substring(JabraChromeRequestedEvents.GetActiveDevice.length + 1)
          );
          return;
        }

        const translatedEvent = EventTranslation[event.data.message];
        if (!translatedEvent) {
          this.logger.info('Jabra event unknown or not handled', { event: event.data.message });
          return;
        }

        this._processEvent(translatedEvent);
      }
    }
  }

  _processEvent(eventTranslation) {
    switch (eventTranslation) {
      case 'Mute':
        this.setMute(true);
        this.deviceMuteChanged(true);
        break;
      case 'Unmute':
        this.setMute(false);
        this.deviceMuteChanged(false);
        break;
      case 'AcceptCall':
        this.deviceAnsweredCall();
        break;
      case 'TerminateCall':
        this._getHeadsetIntoVanillaState();
        this.deviceEndedCall();
        break;
      case 'IgnoreCall':
        this.deviceRejectedCall(null);
        break;
      case 'Flash':
        this.deviceHoldStatusChanged(null, true);
        break;
      case 'Attached':
        this._deviceAttached();
        break;
      case 'Detached':
        this._deviceDetached();
        break;
      default:
        this.logger.info('Unknown Jabra event: ', eventTranslation);
    }
  }

  setMute(value: boolean): Promise<void> {
    if (value) {
      this._sendCmd(JabraChromeCommands.Mute);
    } else {
      this._sendCmd(JabraChromeCommands.Unmute);
    }

    return Promise.resolve();
  }

  setHold(conversationId: string, value: boolean): Promise<void> {
    if (value) {
      this._sendCmd(JabraChromeCommands.Hold);
    } else {
      this._sendCmd(JabraChromeCommands.Resume);
    }

    return Promise.resolve();
  }

  incomingCall(opts: any): Promise<void> {
    if (opts && !opts.hasOtherActiveCalls) {
      this._sendCmd(JabraChromeCommands.Ring);
    }
    return Promise.resolve();
  }

  answerCall(): Promise<void> {
    this._sendCmd(JabraChromeCommands.Offhook);
    return Promise.resolve();
  }

  outgoingCall(): Promise<void> {
    this._sendCmd(JabraChromeCommands.Offhook);
    return Promise.resolve();
  }

  endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (hasOtherActiveCalls) {
      return Promise.resolve();
    }

    this._getHeadsetIntoVanillaState();
    this._sendCmd(JabraChromeCommands.Onhook);
    return Promise.resolve();
  }

  endAllCalls(): Promise<void> {
    this._sendCmd(JabraChromeCommands.Onhook);
    return Promise.resolve();
  }

  _deviceAttached(): void {
    this._sendCmd(JabraChromeCommands.GetActiveDevice);
    this._sendCmd(JabraChromeCommands.GetDevices);
  }

  _deviceDetached() {
    this.devices = null;
    this.activeDeviceId = null;

    this._sendCmd(JabraChromeCommands.GetActiveDevice);
    this._sendCmd(JabraChromeCommands.GetDevices);
  }

  connect(): Promise<any> {
    this.isConnecting = true;
    const connectionPromise = new Promise((resolve, reject) => {
      this._connectDeferred = { resolve, reject };
      this._sendCmd(JabraChromeCommands.GetVersion);
    });

    const connectionError = new Error('Jabra-Chrome connection request timed out');
    return timedPromise(
      connectionPromise,
      JabraChromeService.connectTimeout,
      connectionError
    ).catch(err => {
      this.isConnected = false;
      this.isConnecting = false;
      this.logger.info(err);
    });
  }

  async _handleDeviceConnect() {
    if (this._connectDeferred) {
      this._sendCmd(JabraChromeCommands.GetActiveDevice);
      this._sendCmd(JabraChromeCommands.GetDevices);
      this.isConnecting = false;
      this.isConnected = true;
      this._connectDeferred.resolve();
      this._connectDeferred = null;
    } else {
      this.logger.warn(new Error('_handleDeviceConnect called but there is no pending connection'));
    }
  }

  disconnect(): Promise<void> {
    this.isConnecting = false;
    this.isConnected = false;
    return Promise.resolve();
  }

  _handleDeviceConnectionFailure(err) {
    if (this._connectDeferred) {
      this._connectDeferred.reject(err);
      this._connectDeferred = null;
    } else {
      this.logger.warn(
        new Error('_handleDeviceConnectionFailure was called but there is no pending connection')
      );
    }
  }

  _handleGetDevices(deviceList) {
    this.logger.debug('device list', deviceList);
    const items = deviceList.split(',');
    const deviceMap = new Map<string, DeviceInfo>();

    for (let i = 0; i < items.length; i += 2) {
      const deviceId = items[i];
      const deviceName = items[i + 1];
      deviceMap.set(deviceId, { deviceId, deviceName });
    }

    this.devices = deviceMap;
  }

  _handleGetActiveDevice(activeDeviceId: string) {
    this.logger.debug('active device info', activeDeviceId);
    this.activeDeviceId = activeDeviceId;
  }
}