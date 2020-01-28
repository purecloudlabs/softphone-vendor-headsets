import Implementation from '../../Implementation';
import DeviceInfo from '../../../../models/device-info';
import { JabraChromeCommands } from './jabra-chrome-commands';
import { JabraChromeRequestedEvents } from './jabra-chrome-requested-events';

const incomingMessageName = 'jabra-headset-extension-from-content-script';
const outgoingMessageName = 'jabra-headset-extension-from-page-script';
const connectTimeout = 5000;

export default class JabraChromeService extends Implementation {
  private static instance: JabraChromeService;

  isConnecting = false;
  isActive = false;
  devices: Map<string, DeviceInfo>;
  activeDeviceId: string = null;
  version: string = null;

  private constructor() {
    super();
    this.vendorName = 'Jabra';
    this.devices = new Map<string, DeviceInfo>();

    // TODO: implement this
    // window.addEventListener('message', this._messageHandler.bind(this));

    // this.on('Mute', () => {
    //   this.setMute(true);
    //   this.deviceMuteChanged(true);
    // });
    // this.on('Unmute', () => {
    //   this.setMute(false);
    //   this.deviceMuteChanged(false);
    // });
    // this.on('AcceptCall', () => {
    //   this.deviceAnsweredCall();
    // });
    // this.on('TerminateCall', () => {
    //   this._getHeadsetIntoVanillaState();
    //   this.deviceEndedCall();
    // });
    // this.on('IgnoreCall', this, this.deviceRejectedCall);
    // this.on('Flash', () => this.deviceHoldStatusChanged(null, true));
    // this.on('Attached', this, this._deviceAttached);
    // this.on('Detached', this, this._deviceDetached);
  }

  static getInstance() {
    if (!JabraChromeService.instance) {
      JabraChromeService.instance = new JabraChromeService();
    }

    return JabraChromeService.instance;
  }

  // TODO: implement or replace this
  // willDestroy () {
  //   this._super(...arguments);
  //   window.removeEventListener('message', this._messageHandler);
  // },

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

  deviceLabelMatchesVendor(label: string): boolean {
    return label.toLowerCase().includes('jabra');
  }

  _getHeadsetIntoVanillaState(): void {
    this.setHold(null, false);
    this.setMute(false);
  }

  _sendCmd(cmd: JabraChromeCommands) {
    this.Logger.debug('sending jabra event', { cmd });
    window.postMessage(
      {
        direction: outgoingMessageName,
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
      this.Logger.debug('Incoming jabra event', event.data);

      if (this.logHeadsetEvents) {
        this.$headsetEvents.next(this.createJabraEvent(event.data.message));
      }

      if (event.data.message.startsWith(JabraChromeRequestedEvents.GetVersion)) {
        const version = event.data.message.substring(JabraChromeRequestedEvents.GetVersion + 1);
        this.Logger.info(`jabra version: ${version}`);
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

        const translatedEvent = JabraChromeCommands[event.data.message];
        if (!translatedEvent) {
          this.Logger.info('Jabra event unknown or not handled', { event: event.data.message });
          return;
        }

        this.$headsetEvents.next(this.createJabraEvent(translatedEvent));
      }
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

  incomingCall(opts: any = {}): Promise<void> {
    if (!opts.hasOtherActiveCalls) {
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

  async _handleDeviceConnect() {}

  _handleDeviceConnectionFailure(err) {}

  _handleGetDevices(deviceList) {
    this.Logger.debug('device list', deviceList);
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
    this.Logger.debug('active device info', activeDeviceId);
    this.activeDeviceId = activeDeviceId;
  }

  // TODO: Implement these
  // _timeoutConnectTask: task(function * () {}
  // connect () {}
  // disconnect () {}

  private createJabraEvent(message: string): { name: string; event: string } {
    return {
      name: `jabra event - ${message}`,
      event: message,
    };
  }
}
