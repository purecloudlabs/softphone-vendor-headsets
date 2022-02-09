import fetchJsonp from 'fetch-jsonp';
import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import { PlantronicsCallEvents } from './plantronics-call-events';
import browserama from 'browserama';
import DeviceInfo from '../../../types/device-info';
import { CallInfo } from '../../../types/call-info';

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
  callEventsTimerId: any;
  deviceStatusTimerId: any;


  private constructor(config: ImplementationConfig) {
    super(config);
    this.config = config;
    this._deviceInfo = null;
    this.callEventsTimerId = null;
    this.deviceStatusTimerId = null;
  }

  clearTimeouts (): void {
    clearTimeout(this.callEventsTimerId);
    clearTimeout(this.deviceStatusTimerId);
  }

  deviceLabelMatchesVendor(label: string): boolean {
    // includes vendor name or vendorId (chrome only)
    return label.toLowerCase().includes('plantronics') || label.toLowerCase().includes('plt') || label.toLowerCase().includes('poly') || label.toLowerCase().includes('(047f:');
  }

  static getInstance(config: ImplementationConfig): PlantronicsService {
    if (!PlantronicsService.instance) {
      PlantronicsService.instance = new PlantronicsService(config);
    }

    return PlantronicsService.instance;
  }

  get deviceName(): string | undefined {
    return this._deviceInfo?.ProductName;
  }

  get deviceInfo(): DeviceInfo {
    return this._deviceInfo;
  }

  get isDeviceAttached(): boolean {
    return !!this.deviceInfo;
  }

  pollForCallEvents(): void {
    if (this.callEventsTimerId) {
      clearTimeout(this.callEventsTimerId);
      this.callEventsTimerId = null;
    }

    // if(this.isConnected && this.isActive && !this.disableEventPolling) {
    if(this.isConnected && !this.disableEventPolling) {
      this.logger.debug('**** POLLING FOR CALL EVENTS ****');
      this.getCallEvents();
    }
    this.callEventsTimerId = setTimeout(() => {
      this.pollForCallEvents();
    }, this.activePollingInterval);
  }

  pollForDeviceStatus(): void {
    if (this.deviceStatusTimerId) {
      clearTimeout(this.deviceStatusTimerId);
      this.deviceStatusTimerId = null;
    }

    if (this.isConnected && !this.isConnecting && !this.disableEventPolling) {
      this.logger.debug('**** POLLING FOR DEVICE STATUS ****');
      this.getDeviceStatus();
    }

    this.deviceStatusTimerId = setTimeout(() => {
        this.pollForDeviceStatus();
      }, this.isDeviceAttached ? this.connectedDeviceInterval : this.disconnectedDeviceInterval
    )
  }

  async _makeRequestTask(endpoint: string, isRetry?: boolean): Promise<any> {
    return await this._makeRequest(endpoint, isRetry);
  }

  _fetch(url: string): Promise<fetchJsonp.Response> {
    return fetchJsonp(url);
  }

  async _makeRequest(endpoint: string, isRetry: boolean | undefined): Promise<any> {
    const plantronicsInstance = PlantronicsService.instance;
    return this._fetch(`${this.apiHost}${endpoint}`)
      .then(response => {
        return response.json();
      })
      .then(response => {
        if (response.ok === false || response.Type_Name === 'Error') {
          if (response.status === 404) {
            if (isRetry) {
              this.isConnected && this.deviceConnectionStatusChanged({ isConnected: false, isConnecting: this.isConnecting });
              this.isConnected = false;
              this.disconnect();
              const error = new Error(
                'Headset: Failed connection to middleware. Headset features unavailable.'
              );
              (error as any).handled = true;
              this.logger.info(error);
              return Promise.reject(error);
            }
            return this._makeRequestTask(endpoint, true);
          }

          if (browserama.isFirefox) {
            this.errorCode = 'browser';
            this.disableRetry = true;
          }

          return Promise.reject(response);
        } else {
          if (!plantronicsInstance) {
            return Promise.reject(new Error('Application destroyed.'));
          }
          !this.isConnected && this.deviceConnectionStatusChanged({ isConnected: true, isConnecting: this.isConnecting });
          this.isConnected = true;
          return response;
        }
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  async _checkIsActiveTask(): Promise<void> {
    const calls = await this._getActiveCalls();
    this.isActive = !!calls.length;
  }

  async _getActiveCalls(): Promise<any[]> {
    let result;
    try {
      const request = await this._makeRequestTask(`/CallServices/CallManagerState?`);
      result = request;
    } catch (e) {
      this.logger.info('Error making request for active calls', e);
      return [];
    }

    if (!Array.isArray(result?.Result?.Calls)) {
      return [];
    }
    return result?.Result?.Calls.filter(call => call.Source === this.pluginName);
  }

  async getCallEvents(): Promise<any> {
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

        const eventInfo = { name: eventType, code: event.Action, event };
        this.logger.debug('headset info', eventInfo);
        this.callCorrespondingFunction(eventInfo);
      });
    }
  }

  async getDeviceStatus(): Promise<void> {
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

  callCorrespondingFunction(eventInfo: {name: string, code?: string, event?: any }): void {
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

  connect(): Promise<any> {
    !this.isConnecting && this.deviceConnectionStatusChanged({ isConnected: this.isConnected, isConnecting: true });
    this.isConnecting = true;
    this.pollForDeviceStatus();
    this.pollForCallEvents();
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
        this.isConnecting && this.deviceConnectionStatusChanged({ isConnected: this.isConnected, isConnecting: false });
        this.isConnecting = false;
      });
  }

  disconnect(): Promise<any> {
    let promise;
    if (!this.isConnected) {
      promise = Promise.resolve();
    } else {
      promise = this._makeRequestTask(`/SessionManager/UnRegister?name=${this.pluginName}`);
    }

    return promise.then(() => {
      this.clearTimeouts();
      this._deviceInfo = null;
      this.isConnected && this.deviceConnectionStatusChanged({ isConnected: false, isConnecting: this.isConnecting });
      this.isConnected = false;
      this.isActive = false;
    });
  }

  incomingCall(callInfo: CallInfo): Promise<any> {
    this.logger.info('Inside incomingCall of selected implementation (Plantronics/Poly)');
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

    this.logger.info('params of endpoint', params);

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/IncomingCall${encodeURI(params)}`);
  }

  outgoingCall({ conversationId, contactName }: CallInfo): Promise<any> {
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

  answerCall(conversationId: string): Promise<any> {
    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    const params = `?name=${this.pluginName}&callID={${encodeURI(halfEncodedCallIdString)}}`;

    this.isActive = true;
    return this._makeRequestTask(`/CallServices/AnswerCall${encodeURI(params)}`);
  }

  async endCall(conversationId: string): Promise<any> {
    let params = `?name=${this.pluginName}`;

    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    params += `&callID={${encodeURI(halfEncodedCallIdString)}}`;

    const response = await this._makeRequestTask(`/CallServices/TerminateCall${encodeURI(params)}`);
    await this.getCallEvents();
    this._checkIsActiveTask();
    return response;
  }

  async endAllCalls(): Promise<void> {
    const calls = await this._getActiveCalls();
    calls.forEach(call => this.endCall(call.CallId));
  }

  async setMute(value: boolean): Promise<any> {
    const response = await this._makeRequestTask(
      `/CallServices/MuteCall?name=${this.pluginName}&muted=${value}`
    );
    return response;
  }

  async setHold(conversationId: string, value: boolean): Promise<any> {
    const halfEncodedCallIdString = `"Id":"${conversationId}"`;
    const params = `?name=${this.pluginName}&callID={${encodeURI(halfEncodedCallIdString)}}`;
    const response = await this._makeRequestTask(
      `/CallServices/${value ? 'HoldCall' : 'ResumeCall'}${encodeURI(params)}`
    );

    return response;
  }
}