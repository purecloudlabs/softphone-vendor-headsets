import Implementation from '../Implementation';
import { SennheiserEvents } from './sennheiser-events';
import { SennheiserEventTypes } from './sennheiser-event-types';
import DeviceInfo from '../../../models/device-info';
import { SennheiserPayload } from './sennheiser-payload';
import * as utils from '../../../utils';

const websocketUri = 'wss://127.0.0.1:41088';

export default class SennheiserService extends Implementation {
  private static instance: SennheiserService;

  connectTimeout: number = 5000;

  vendorName = 'Sennheiser';
  isActive = false;
  devices = null;
  activeDeviceId = null;
  websocketConnected = false;

  callMappings: any = {};

  websocket = null;
  deviceInfo: DeviceInfo = null;

  private constructor() {
    super();
  }

  static getInstance() {
    if (!SennheiserService.instance) {
      SennheiserService.instance = new SennheiserService();
    }

    return SennheiserService.instance;
  }

  get deviceName(): string {
    return this.deviceInfo && this.deviceInfo.ProductName;
  }

  get isDeviceAttached(): boolean {
    return !!this.deviceInfo;
  }

  deviceLabelMatchesVendor(label: string): boolean {
    return label.toLowerCase().includes('sennheiser');
  }

  _handleError(payload: SennheiserPayload): void {
    this.Logger.error('Non-zero return code from sennheiser', payload);
  }
  _handleAck(payload: SennheiserPayload): void {
    this.Logger.debug(`Received Ack for ${payload.Event}`);
  }

  _sendMessage(payload: SennheiserPayload): void {
    this.Logger.debug('sending sennheiser message', payload);
    this.websocket.send(JSON.stringify(payload));
  }

  _registerSoftphone(): void {
    const payload: SennheiserPayload = {
      Event: SennheiserEvents.EstablishConnection,
      EventType: SennheiserEventTypes.Request,
      SPName: 'Purecloud Softphone',
      SPIconImage: 'SPImage.ico',
      RedialSupport: 'No',
      OffHookSupport: 'No',
      MuteSupport: 'Yes',
      DNDOption: 'No',
    };

    this._sendMessage(payload);
  }

  connect(): Promise<void> {
    this.isConnecting = true;
    this.isConnected = false;

    const socket = new WebSocket(websocketUri);
    socket.onopen = this.webSocketOnOpen.bind(this);
    socket.onclose = this.webSocketOnClose.bind(this);
    socket.onmessage = this._handleMessage.bind(this);
    this.websocket = socket;

    return Promise.resolve();
  }

  webSocketOnOpen = (): void => {
    this.websocketConnected = true;
    this.Logger.info('websocket open the sennheiser software');
  };

  webSocketOnClose(err: any): void {
    this.websocketConnected = false;
    if (!err.wasClean) {
      this.Logger.error(err);
    }
    if (!this.isConnected) {
      this.Logger.error(
        new Error('Failed to connect to sennheiser software. Make sure it is installed')
      );
      if (utils.isFirefox()) {
        this.errorCode = 'browser';
        this.disableRetry = true;
      }
    }

    this.isConnecting = false;
    this.isConnected = false;
  }

  disconnect(): Promise<void> {
    if (!this.isConnected) {
      return Promise.resolve();
    }

    this._sendMessage({
      Event: SennheiserEvents.TerminateConnection,
      EventType: SennheiserEventTypes.Request,
    });

    return Promise.resolve();
  }

  private _createCallMapping(conversationId: string) {
    const ID_LENGTH = 7;
    const callId = Math.round(Math.random() * Math.pow(10, ID_LENGTH)); // Generate random number

    this.callMappings = {
      [conversationId]: callId,
      [callId]: conversationId,
    };

    this.Logger.info('Created callId mapping for sennheiser headset', {
      conversationId,
      sennheiserCallId: callId,
    });

    return callId;
  }

  setMute(value): Promise<void> {
    this._sendMessage({
      Event: value ? SennheiserEvents.MuteFromApp : SennheiserEvents.UnmuteFromApp,
      EventType: SennheiserEventTypes.Request,
    });
    return Promise.resolve();
  }

  setHold(conversationId: string, value): Promise<void> {
    this._sendMessage({
      Event: value ? SennheiserEvents.Hold : SennheiserEvents.Resume,
      EventType: SennheiserEventTypes.Request,
      CallID: this.callMappings[conversationId],
    });

    return Promise.resolve();
  }

  incomingCall({ conversationId }): Promise<void> {
    const callId = this._createCallMapping(conversationId);

    this._sendMessage({
      Event: SennheiserEvents.IncomingCall,
      EventType: SennheiserEventTypes.Request,
      CallID: callId,
    });

    return Promise.resolve();
  }

  answerCall(conversationId: string): Promise<void> {
    this._sendMessage({
      Event: SennheiserEvents.IncomingCallAccepted,
      EventType: SennheiserEventTypes.Request,
      CallID: this.callMappings[conversationId],
    });
    return Promise.resolve();
  }

  outgoingCall({ conversationId }): Promise<void> {
    const callId = this._createCallMapping(conversationId);

    this._sendMessage({
      Event: SennheiserEvents.OutgoingCall,
      EventType: SennheiserEventTypes.Request,
      CallID: callId,
    });

    return Promise.resolve();
  }

  endCall(conversationId: string): Promise<void> {
    const callId = this.callMappings[conversationId];

    if (!callId) {
      this.Logger.info('Failed to find sennheiser callId, assuming call was already ended');
      return Promise.resolve();
    }

    this._sendMessage({
      Event: SennheiserEvents.CallEnded,
      EventType: SennheiserEventTypes.Request,
      CallID: callId,
    });

    return Promise.resolve();
  }

  endAllCalls(): Promise<void> {
    this.Logger.warn('There is no functionality defined for SennheiserService.endAllCalls()');
    return Promise.resolve();
  }

  _handleMessage(message): void {
    let payload: SennheiserPayload;
    try {
      payload = JSON.parse(message.data);
    } catch (err) {
      this.Logger.error(err);
      this.Logger.error('Failed to parse sennheiser payload', { message });
      return;
    }
    this.Logger.debug('incoming sennheiser message', payload);

    if (payload.ReturnCode) {
      this._handleError(payload);
      return;
    }

    let conversationId: string;
    const callId: number = payload.CallID;
    if (callId) {
      conversationId = this.callMappings[callId];
    }

    switch (payload.Event) {
      case SennheiserEvents.SocketConnected:
        this._registerSoftphone();
        break;
      case SennheiserEvents.EstablishConnection:
        this._sendMessage({
          Event: SennheiserEvents.SPLogin,
          EventType: SennheiserEventTypes.Request,
        });
        break;
      case SennheiserEvents.SPLogin:
        this.isConnecting = false;
        this.isConnected = true;
        this._sendMessage({
          Event: SennheiserEvents.SystemInformation,
          EventType: SennheiserEventTypes.Request,
        });
        break;
      case SennheiserEvents.HeadsetConnected:
        if (payload.HeadsetName) {
          this.deviceInfo = {
            deviceName: payload.HeadsetName,
            headsetType: payload.HeadsetType,
          };
        }
        break;
      case SennheiserEvents.HeadsetDisconnected:
        if (payload.HeadsetName === this.deviceName) {
          this.deviceInfo = null;
        }

        break;
      case SennheiserEvents.IncomingCallAccepted:
        if (payload.EventType === SennheiserEventTypes.Notification) {
          this.deviceAnsweredCall();
        }

        break;
      case SennheiserEvents.Hold:
        if (payload.EventType === SennheiserEventTypes.Ack) {
          this._handleAck(payload);
          break;
        }
        this.deviceHoldStatusChanged(true);
        break;
      case SennheiserEvents.Resume:
        if (payload.EventType === SennheiserEventTypes.Ack) {
          this._handleAck(payload);
          break;
        }
        this.deviceHoldStatusChanged(false);
        break;
      case SennheiserEvents.MuteFromHeadset:
        this.deviceMuteChanged(true);
        break;
      case SennheiserEvents.UnmuteFromHeadset:
        this.deviceMuteChanged(false);
        break;
      case SennheiserEvents.CallEnded:
        // clean up mappings
        delete this.callMappings[callId];
        delete this.callMappings[conversationId];

        if (payload.EventType === SennheiserEventTypes.Notification) {
          this.deviceEndedCall();
        }
        break;
      case SennheiserEvents.IncomingCallRejected:
        this.deviceRejectedCall(conversationId);
        break;
      case SennheiserEvents.TerminateConnection:
        if (this.websocket.readyState === 1) {
          this.websocket.close();
        }
        this.websocket = null;
        break;
      default:
        if (payload.EventType === SennheiserEventTypes.Ack) {
          // this is mostly for testing purposes so we can confirm reciept of events we don't normally care about
          this._handleAck(payload);
        }
        break;
    }
  }

  // TODO: Implement these
  // _timeoutConnectTask
}
