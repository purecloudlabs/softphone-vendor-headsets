import Implementation from '../Implementation';
import { PlantronicsCallEvents } from './plantronics-call-events';
import DeviceInfo from '../../../models/device-info';
import browserama from 'browserama'

/**
 * TODO:  This looks like a feasible way to implement the polling we need
 *        https://makeitnew.io/polling-using-rxjs-8347d05e9104
 *  */
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
  ajax = new XMLHttpRequest();
  isRetry = false;
  endpoint = '';
  ajaxResponse;

  private constructor() {
    super();
    this.ajax.onreadystatechange = function() {
      let planatronicsInstance = PlantronicsService.instance;
      const ajaxResponse = () => {
          if(this.readyState === 4) {
            if (this.status >= 400) {
              if(this.response?.errors && this.response.errors.some(error => error.status && parseInt(error.status) === 404)) {
                if(planatronicsInstance.isRetry) {
                  planatronicsInstance.isConnected = false;
                  planatronicsInstance.disconnect();
                  const error = new Error('Headset: Failed connection to middleware. Headset features unavailable.');
                  // error.handled = true;
                  planatronicsInstance.Logger.info(error);
                  return Promise.reject(error);
                } else {
                  return planatronicsInstance._makeRequestTask(planatronicsInstance.endpoint, true)
                }
              }

              if(browserama.isFirefox) {
                planatronicsInstance.errorCode = 'browser';
                planatronicsInstance.disableRetry = true;
              }

              return Promise.reject(this.response);
            } else if(this.status >= 200 && this.status < 300) {
              if(!planatronicsInstance) {
                return Promise.reject(new Error('Application destroyed'));
              }
              planatronicsInstance.isConnected = true;

              if(this.response.Err) {
                return Promise.reject(this.response);
              }

              return this.response;
            }
          }
      }
      planatronicsInstance.ajaxResponse = ajaxResponse;
    }
    // this.disableEventPolling = ; // TODO: find an equivalent if necessary
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
    return this.deviceInfo?.ProductName;
  }

  get isDeviceAttached(): boolean {
    return !!this.deviceInfo;
  }

  get apiHost(): string {
    return 'https://127.0.0.1:32018/Spokes';
  }

  *pollCallEventsTask() {
    yield this.getCallEvents();
    setTimeout(() => {
      this.pollCallEventsTask();
    }, this.activePollingInterval);
  }

  _pollForCallEvents() {
    // this.pollCallEventsTask().cancellAll(); //Implement pollCallEventsTaks as a generator
    // Or find alternative
    if (this.isConnected && this.isActive && !this.disableEventPolling) {
      this.pollCallEventsTask();
    }
  }

  deviceLabelMatchesVendor(label) {
    // includes vendor name or vendorId (chrome only)
    return label.toLowerCase().includes('plantronics') || label.toLowerCase().includes('(047f:');
  }

  *pollForDeviceStatusTask() {
    yield this.getDeviceStatus();
    setTimeout(() => {
      this.pollForDeviceStatusTask();
    }, this.isDeviceAttached ? this.connectedDeviceInterval : this.disconnectedDeviceInterval);
  }

  _pollForDeviceStatus() {
    // this.pollForDeviceStatusTask().cancellAll();  //Implement pollCallEventsTaks as a generator
    // Or find alternative
    if(this.isConnected && !this.isConnecting && !this.disableEventPolling) {
      this.pollForDeviceStatusTask();
    }
  }

  async _makeRequestTask(endpoint, isRetry?) {
    // return yield this._makeRequest(endpoint, isRetry);
    this.isRetry = !!isRetry;
    this.endpoint = endpoint;
    return await this._makeRequest();
  }

  //This function needs A LOT of work
  // async _makeRequest(endpoint, isRetry) {
  _makeRequest() {
    this.ajax.open('GET', this.apiHost + this.endpoint, true);
    this.ajax.setRequestHeader('Content-type', 'jsonp');
    this.ajax.send();
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
    } catch(e) {
      this.Logger.info('Error making request for active calls', e);
      return [];
    }

    if(!Array.isArray(result.Calls)) {
      return [];
    }

    return result.Calls.filter(call => call.Source === this.pluginName);
  }

  async getCallEvents() {
    let response;
    try {
      response = await this._makeRequestTask(`/CallServices/CallEvents?name=${this.pluginName}`);
    } catch(e) {
      this.Logger.info('Error making request for call events', e);
      return;
    }

    if(response.Result) {
      response.Result.forEach((event) => {
        const eventType = PlantronicsCallEvents[event.Action];

        if(!eventType) {
          return this.Logger.info('Unknown call event from headset', { event });
        }
        // this.trigger(eventType);

        // if(this.headset.logHeadsetEvents) {
        //   const eventInfo = { name: eventType, code: event.Action, event };
        //   this.Logger.debug('headset info', eventInfo);
        //   this.callCorrespondingFunction(eventType);
        //   // this.trigger(headsetEvent, eventInfo)
        //   // HeadsetService.getInstance().headsetEvent
        // }
      })
    }
  }

  async getDeviceStatus() {
    let deviceInfo;

    try {
      await this._makeRequestTask(`/DeviceServices/Info`);
      deviceInfo = this.ajaxResponse.Result;
    } catch (err) {
      const noDevicesError = err.Err && err.Err.Description.includes('no supported devices');
      if(!noDevicesError) {
        this.Logger.info('Error making request for device status', err);
      }
    }

    this.deviceInfo = deviceInfo;
    // this.isDeviceAttached = !!deviceInfo;
  }

  callCorrespondingFunction(eventType: string) {
    switch(eventType) {
      case 'AcceptCall':
        this.deviceAnsweredCall();
        break;
      case 'TerminateCall':
        this.deviceEndedCall();
        break;
      case 'CallEnded':
        this._checkIsActiveTask();
        break;
      case 'Mute':
        this.deviceMuteChanged(true);
        break;
      case 'Unmute':
        this.deviceMuteChanged(false);
        break;
      case 'HoldCall':
        this.deviceHoldStatusChanged(true);
        break;
      case 'ResumeCall':
        this.deviceHoldStatusChanged(false);
        break;
      default:
        this.Logger.info('Unknown call event from headset', { eventType });    }
  }

  connect() {
    this.isConnecting = true;
    return this._makeRequestTask(`/SessionManager/Register?name=${this.pluginName}`)
      .catch(() => {
        if(this.ajaxResponse.Err && this.ajaxResponse.Err.Description === 'Plugin Exists') {
          return this.Logger.warn('Plugin already exists');
        }

        // return RSVP.reject(response);
        return Promise.reject(this.ajaxResponse);
      })
      .then(() => this._makeRequestTask(`/SessionManager/IsActive?name=${this.pluginName}&active=true`))
      .then(() => {
        if(this.ajaxResponse.Result !== true) {
          // return RSVP.reject(response);
          return Promise.reject(this.ajaxResponse);
        }

        return this._makeRequestTask(`/UserPreferences/SetDefaultSoftPhone?name=${this.pluginName}`);
      })
      .then(() => this.getDeviceStatus())
      .then(() => {
        return this._getActiveCalls();
      })
      .then((calls) => {
        if(calls.length) {
          this.isActive = true;
          return this.Logger.info('Currently active calls in the session')
        } else {
          return this.getCallEvents();
        }
      })
      .catch((err) => {
        if(!err.handled) {
          // return RSVP.reject(err);
          return Promise.reject(err);
        }
        return this.Logger.error('Unable to properly connect headset');
      })
      .finally(() => this.isConnecting = false);
  }

  disconnect() {
    let promise;
    if(!this.isConnected) {
      // promise.RSVP.resolve();
      promise.resolve();
    } else {
      promise = this._makeRequestTask(`/SessionManager/UnRegister?name=${this.pluginName}`);
    }

    return promise
      .then(() => {
        this.deviceInfo = null;
        this.isConnected = false;
        this.isActive = false;
        // this.isDeviceAttached = false;
      });
  }

  incomingCall({conversationId, contactName}) {
    if(!conversationId) {
      throw new Error('Must provide conversationId');
    }
    let params = `?name=${this.pluginName}&tones=Unknown&route=ToHeadset`;

    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    params += `&callID={${encodeURI(halfEncodedCallIdString)}}`;

    if(contactName) {
      const halfEncodedContactString = `"Name":"${contactName}"`;
      params += `&contact={${encodeURI(halfEncodedContactString)}}`;
    }

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/IncomingCall${encodeURI(params)}`);
  }

  outgoingCall ({conversationId, contactName}) {
    if(!conversationId) {
      throw new Error('Must provide conversationId');
    }
    let params = `?name=${this.pluginName}&tones=Unknown&route=ToHeadset`;

    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    params += `&callID={${encodeURI(halfEncodedCallIdString)}}`;

    if(contactName) {
      const halfEncodedContactString = `"Name":"${contactName}"`;
      params += `&contact={${encodeURI(halfEncodedContactString)}}`;
    }

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/OutgoingCall${encodeURI(params)}`);
  }

  answerCall(conversationId) {
    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    let params = `?name=${this.pluginName}&callID={${encodeURI(halfEncodedCallIdString)}}`;

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
    const response = await this._makeRequestTask(`/CallServices/MuteCall?name=${this.pluginName}&muted=${!!value}`);
    return response;
  }

  async setHold(conversationId, value) {
    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    let params = `?name=${this.pluginName}&callID={${encodeURI(halfEncodedCallIdString)}}`;
    const response = await this._makeRequestTask(`/CallServices/${value ? 'HoldCall' : 'ResumeCall'}${encodeURI(params)}`);

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
