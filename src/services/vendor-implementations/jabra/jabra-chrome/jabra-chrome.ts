import Implementation from '../../Implementation';
import DeviceInfo from '../../../../models/device-info';
import { JabraChromeCommands } from './jabra-chrome-commands';
import { JabraChromeRequestedEvents } from './jabra-chrome-requested-events';

const incomingMessageName = 'jabra-headset-extension-from-content-script';
const outgoingMessageName = 'jabra-headset-extension-from-page-script';
const connectTimeout = 5000;

export default class JabraChromeService extends Implementation {
  private static instance: JabraChromeService;

  isConnecting: false;
  isActive: false;
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

  _messageHandler(event) {
    if (
      event.source === window &&
      event.data.direction &&
      event.data.direction === incomingMessageName
    ) {
      this.Logger.debug('Incoming jabra event', event.data);

      if (this.logHeadsetEvents) {
        const headsetEvent = {
          name: `jabra event - ${event.data.message}`,
          event: event.data.message,
        };
        this.$headsetEvents.next(headsetEvent);
      }

      if (event.data.message.startsWith(JabraChromeRequestedEvents.GetVersion)) {
        const version = event.data.message.substring(JabraChromeRequestedEvents.GetVersion + 1);
        this.Logger.info(`jabra version: ${version}`);
        this.version = version;
      }

      // if (this.get('isConnecting')) {
      //   if (event.data.error !== null && event.data.error !== undefined) {
      //     this._handleDeviceConnectionFailure(event.data.error);
      //   } else {
      //     this._handleDeviceConnect();
      //   }
      // } else {
      //   if (event.data.message.startsWith(requestedEvents.GetDevices)) {
      //     return this._handleGetDevices(event.data.message.substring(requestedEvents.GetDevices.length + 1));
      //   }

      //   if (event.data.message.startsWith(requestedEvents.GetActiveDevice)) {
      //     return this._handleGetActiveDevice(event.data.message.substring(requestedEvents.GetActiveDevice.length + 1));
      //   }

      //   const translatedEvent = EventTranslation[event.data.message];
      //   if (!translatedEvent) {
      //     return Logger.info('Jabra event unknown or not handled', { event: event.data.message });
      //   }

      //   return this.trigger(translatedEvent);
      // }
    }
  }

  // TODO: Implement these
  // _timeoutConnectTask: task(function * () {}
  // connect () {}
  // disconnect () {}
  // setMute (value) {}
  // setHold (conversationId, value) {}
  // incomingCall (callInfo, hasOtherActiveCalls) {}
  // answerCall () {}
  // outgoingCall () {}
  // endCall (conversationId, hasOtherActiveCalls) {}
  // endAllCalls () {}
  // async _handleDeviceConnect () {}
  // _handleDeviceConnectionFailure (err) {}
  // _handleGetActiveDevice (data) {}
  // _handleGetDevices (data) {}
  // _deviceAttached () {}
  // _deviceDetached () {}
}
