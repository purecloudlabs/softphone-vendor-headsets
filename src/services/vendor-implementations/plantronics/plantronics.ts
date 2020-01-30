import Implementation from '../Implementation';
import DeviceInfo from '../../../models/device-info';

export default class PlantronicsService extends Implementation {
  private static instance: PlantronicsService;

  activePollingInterval = 2000;
  connectedDeviceInterval = 6000;
  disconnectedDeviceInterval = 2000;
  deviceIdRetryInterval = 2000;
  vendorName = 'Plantronics';
  pluginName = 'emberApp2';
  deviceInfo: DeviceInfo = null;
  isActive = false;
  disableEventPolling = false;
  deviceStatusTimer = null;

  private constructor() {
    super();
    // this.set('disableEventPolling', Ember.testing); // TODO: find an equivalent if necessary
  }

  // TODO: replace this if needed
  // willDestroy () {
  //   this._super(...arguments);
  //   clearTimeout(this.get('deviceStatusTimer'));
  // },

  static getInstance() {
    if (!PlantronicsService.instance) {
      PlantronicsService.instance = new PlantronicsService();
    }

    return PlantronicsService.instance;
  }

  get deviceName(): string {
    return this.deviceInfo.ProductName;
  }

  get apiHost(): string {
    return 'https://127.0.0.1:32018/Spokes';
  }

  deviceLabelMatchesVendor(label) {
    // includes vendor name or vendorId (chrome only)
    return label.toLowerCase().includes('plantronics') || label.toLowerCase().includes('(047f:');
  }

  // TODO: Implement these
  // pollCallEventsTask: task(function * () {}
  // _pollForCallEvents: observer('isConnected', 'isActive', 'disableEventPolling', function () {}
  // pollForDeviceStatusTask: task(function * () {}
  // _pollForDeviceStatus: observer('isConnected', 'isConnecting', 'disableEventPolling', function () {}
  // _makeRequestTask: task(function * (endpoint, isRetry) {}
  // _makeRequest (endpoint, isRetry) {}
  // _checkIsActiveTask: task(function * () {}
  // async _getActiveCalls () {}
  // async getCallEvents () {}
  // async getDeviceStatus () {}
  // connect () {}
  // disconnect () {}
  // incomingCall ({conversationId, contactName}) {}
  // outgoingCall ({conversationId, contactName}) {}
  // answerCall (conversationId) {}
  // async endCall (conversationId) {}
  // async endAllCalls () {}
  // async setMute (value) {}
  // async setHold (conversationId, value) {}
  // _processEvent(event: PlantronicsCallEvents): void {
  // this.on('AcceptCall', this, this.deviceAnsweredCall);
  // this.on('TerminateCall', this, this.deviceEndedCall);
  // this.on('CallEnded', () => this.get('_checkIsActiveTask').perform());
  // this.on('Mute', () => this.deviceMuteChanged(true));
  // this.on('Unmute', () => this.deviceMuteChanged(false));
  // this.on('HoldCall', () => this.deviceHoldStatusChanged(true));
  // this.on('ResumeCall', () => this.deviceHoldStatusChanged(false));
  // }
}
