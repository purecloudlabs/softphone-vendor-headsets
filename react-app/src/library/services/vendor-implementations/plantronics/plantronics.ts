import fetchJsonp from 'fetch-jsonp';
import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import { PlantronicsCallEvents } from './plantronics-call-events';
import browserama from 'browserama';
import DeviceInfo from '../../../types/device-info';

/**
 * TODO:  This looks like a feasible way to implement the polling we need
 *        https://makeitnew.io/polling-using-rxjs-8347d05e9104
 *  */
export default class PlantronicsService extends VendorImplementation {
  private static instance: PlantronicsService;
  activePollingInterval = 2000;
  connectedDeviceInterval = 6000;
  disconnectedDeviceInterval = 2000;
  deviceIdRetryInterval = 2000;
  vendorName = 'Plantronics';
  pluginName = 'genesys-cloud-headset-library';
  apiHost = 'https://127.0.0.1:32018/Spokes';
  isActive = false;
  disableEventPolling = false;
  config: ImplementationConfig;
  deviceStatusTimer = null;
  isRetry = false;
  _deviceInfo: DeviceInfo;

  private constructor(config: ImplementationConfig) {
    super(config);
    this.config = config;
    this.pollForCallEvents();
    this.pollForDeviceStatus();
    this._deviceInfo = null;
  }

  // TODO: replace this if needed
  // willDestroy () {
  //   this._super(...arguments);
  //   clearTimeout(this.get('deviceStatusTimer'));
  // },

  static getInstance(config: ImplementationConfig) {
    if (!PlantronicsService.instance) {
      PlantronicsService.instance = new PlantronicsService(config);
    }

    return PlantronicsService.instance;
  }

  get deviceName(): string | undefined {
    return this._deviceInfo?.ProductName;
  }

  // get apiHost(): string {
  //   return 'https://127.0.0.1:32018/Spokes';
  // }

  get deviceInfo(): DeviceInfo {
    return this._deviceInfo;
  }

  get isDeviceAttached(): boolean {
    return !!this.deviceInfo;
  }

  async pollForCallEvents() {
    if (this.isConnected && this.isActive && !this.disableEventPolling) {
      await this.getCallEvents();
    }
    setTimeout(() => {
      // console.log('**** POLLING FOR CALL EVENTS ****');
      this.pollForCallEvents();
    }, this.activePollingInterval);
  }

  async pollForDeviceStatus() {
    if (this.isConnected && !this.isConnecting && !this.disableEventPolling) {
      await this.getDeviceStatus();
    }
    setTimeout(
      () => {
        // console.log('**** POLLING FOR DEVICE STATUS ****');
        this.pollForDeviceStatus();
      },
      this.isDeviceAttached ? this.connectedDeviceInterval : this.disconnectedDeviceInterval
    );
  }

  deviceLabelMatchesVendor(label) {
    // includes vendor name or vendorId (chrome only)
    return label.toLowerCase().includes('plantronics') || label.toLowerCase().includes('(047f:');
  }

  async _makeRequestTask(endpoint, isRetry?) {
    return await this._makeRequest(endpoint, isRetry);
  }

  _fetch(url: string) {
    return fetchJsonp(url);
  }

  async _makeRequest(endpoint, isRetry) {
    const plantronicsInstance = PlantronicsService.instance;
    return this._fetch(`${this.apiHost}${endpoint}`)
      .then(response => {
        return response.json();
      })
      .then(response => {
        if (response.ok === false || response.Type_Name === 'Error') {
          if (response.status === 404) {
            if (isRetry) {
              plantronicsInstance.isConnected = false;
              plantronicsInstance.disconnect();
              const error = new Error(
                'Headset: Failed connection to middleware. Headset features unavailable.'
              );
              (error as any).handled = true;
              plantronicsInstance.logger.info(error);
              return Promise.reject(error);
            }
            return plantronicsInstance._makeRequestTask(endpoint, true);
          }

          if (browserama.isFirefox) {
            plantronicsInstance.errorCode = 'browser';
            plantronicsInstance.disableRetry = true;
          }

          return Promise.reject(response);
        } else {
          if (!plantronicsInstance) {
            return Promise.reject(new Error('Application destroyed.'));
          }
          plantronicsInstance.isConnected = true;
          return response;
        }
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  *_checkIsActiveTask() {
    const calls = yield this._getActiveCalls();
    this.isActive = !!calls.length;
  }

  async _getActiveCalls() {
    let result;
    try {
      const request = await this._makeRequestTask(`/CallServices/CallManagerState?`);
      result = request;
    } catch (e) {
      this.logger.info('Error making request for active calls', e);
      return [];
    }

    if (!Array.isArray(result.Calls)) {
      return [];
    }
    return result.Calls.filter(call => call.Source === this.pluginName);
  }

  async getCallEvents() {
    let response;
    try {
      response = await this._makeRequestTask(`/CallServices/CallEvents?name=${this.pluginName}`);
    } catch (e) {
      this.logger.info('Error making request for call events', e);
      return;
    }
    if (response.Result) {
      response.Result.forEach(event => {
        const eventType = PlantronicsCallEvents[event.Action];

        if (!eventType) {
          return this.logger.info('Unknown call event from headset', { event });
        }

        if (this.logHeadsetEvents) {
          const eventInfo = { name: eventType, code: event.Action, event };
          this.logger.debug('headset info', eventInfo);
          this.callCorrespondingFunction(eventInfo);
        }
      });
    }
  }

  async getDeviceStatus() {
    await this._makeRequestTask(`/DeviceServices/Info`)
      .then(response => {
        this._deviceInfo = response.Result;
      })
      .catch(err => {
        const noDevicesError = err.Err && err.Err.Description.includes('no supported devices');
        if (!noDevicesError) {
          this.logger.info('Error making request for device status', err);
        }
      });
  }

  callCorrespondingFunction(eventInfo) {
    switch (eventInfo.name) {
      case 'AcceptCall':
        this.deviceAnsweredCall(eventInfo);
        break;
      case 'TerminateCall':
        this.deviceEndedCall(eventInfo);
        break;
      case 'CallEnded':
        this._checkIsActiveTask();
        break;
      case 'Mute':
        this.deviceMuteChanged(true, eventInfo);
        break;
      case 'Unmute':
        this.deviceMuteChanged(false, eventInfo);
        break;
      case 'HoldCall':
        this.deviceHoldStatusChanged(true, eventInfo);
        break;
      case 'ResumeCall':
        this.deviceHoldStatusChanged(false, eventInfo);
        break;
      default:
        this.logger.info('A headset event has occurred', eventInfo);
        this.deviceEventLogs(eventInfo);
    }
  }

  connect() {
    this.isConnecting = true;
    return this._makeRequestTask(`/SessionManager/Register?name=${this.pluginName}`)
      .catch(response => {
        if (response.Err && response.Err.Description === 'Plugin exists') {
          return this.logger.debug('Plugin already exists', response);
        }

        return Promise.reject(response);
      })
      .then(() =>
        this._makeRequestTask(`/SessionManager/IsActive?name=${this.pluginName}&active=true`)
      )
      .catch(response => {
        if (response.Err && !response.isError) {
          return this.logger.debug('Is Active', response);
        }

        return Promise.reject(response);
      })
      .then(response => {
        if (response?.Result !== true) {
          return Promise.reject(response);
        }

        return this._makeRequestTask(`/UserPreference/SetDefaultSoftPhone?name=${this.pluginName}`);
      })
      .then(() => {
        this.getDeviceStatus();
      })
      .then(() => {
        return this._getActiveCalls();
      })
      .then(calls => {
        if (calls.length) {
          this.isActive = true;
          return this.logger.info('Currently active calls in the session');
        } else {
          return this.getCallEvents();
        }
      })
      .catch(err => {
        if (!err?.handled) {
          return Promise.reject(err);
        }
        return this.logger.error('Unable to properly connect headset');
      })
      .finally(() => {
        this.isConnecting = false;
      });
  }

  disconnect() {
    let promise;
    if (!this.isConnected) {
      promise = Promise.resolve();
    } else {
      promise = this._makeRequestTask(`/SessionManager/UnRegister?name=${this.pluginName}`);
    }

    return promise.then(() => {
      this._deviceInfo = null;
      this.isConnected = false;
      this.isActive = false;
    });
  }

  incomingCall({ callInfo }) {
    const { conversationId, contactName } = callInfo;
    if (!conversationId) {
      throw new Error('Must provide conversationId');
    }
    let params = `?name=${this.pluginName}&tones=Unknown&route=ToHeadset`;

    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    params += `&callID={${encodeURI(halfEncodedCallIdString)}}`;

    if (contactName) {
      const halfEncodedContactString = `"Name":"${contactName}"`;
      params += `&contact={${encodeURI(halfEncodedContactString)}}`;
    }

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/IncomingCall${encodeURI(params)}`);
  }

  outgoingCall({ conversationId, contactName }) {
    if (!conversationId) {
      throw new Error('Must provide conversationId');
    }
    let params = `?name=${this.pluginName}&tones=Unknown&route=ToHeadset`;

    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    params += `&callID={${encodeURI(halfEncodedCallIdString)}}`;

    if (contactName) {
      const halfEncodedContactString = `"Name":"${contactName}"`;
      params += `&contact={${encodeURI(halfEncodedContactString)}}`;
    }

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/OutgoingCall${encodeURI(params)}`);
  }

  answerCall(conversationId) {
    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    const params = `?name=${this.pluginName}&callID={${encodeURI(halfEncodedCallIdString)}}`;

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/AnswerCall${encodeURI(params)}`);
  }

  async endCall(conversationId) {
    let params = `?name=${this.pluginName}`;

    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    params += `&callID={${encodeURI(halfEncodedCallIdString)}}`;

    const response = await this._makeRequestTask(`/CallServices/TerminateCall${encodeURI(params)}`);
    await this.getCallEvents();
    this._checkIsActiveTask();
    return response;
  }

  async endAllCalls() {
    const calls = await this._getActiveCalls();
    calls.forEach(call => this.endCall(call.CallId));
  }

  async setMute(value) {
    const response = await this._makeRequestTask(
      `/CallServices/MuteCall?name=${this.pluginName}&muted=${value}`
    );
    return response;
  }

  async setHold(conversationId, value) {
    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    const params = `?name=${this.pluginName}&callID={${encodeURI(halfEncodedCallIdString)}}`;
    const response = await this._makeRequestTask(
      `/CallServices/${value ? 'HoldCall' : 'ResumeCall'}${encodeURI(params)}`
    );

    return response;
  }

  // TODO: Implement these
  // pollCallEventsTask: task(function * () {} X
  // _pollForCallEvents: observer('isConnected', 'isActive', 'disableEventPolling', function () {} X
  // pollForDeviceStatusTask: task(function * () {} X
  // _pollForDeviceStatus: observer('isConnected', 'isConnecting', 'disableEventPolling', function () {} X
  // _makeRequestTask: task(function * (endpoint, isRetry) {} X
  // _makeRequest (endpoint, isRetry) {} X
  // _checkIsActiveTask: task(function * () {} X
  // async _getActiveCalls () {} X
  // async getCallEvents () {} X
  // async getDeviceStatus () {} X
  // connect () {} X
  // disconnect () {} X
  // incomingCall ({conversationId, contactName}) {} X
  // outgoingCall ({conversationId, contactName}) {} X
  // answerCall (conversationId) {} X
  // async endCall (conversationId) {} X
  // async endAllCalls () {} X
  // async setMute (value) {} X
  // async setHold (conversationId, value) {} X
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