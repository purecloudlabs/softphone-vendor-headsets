import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import DeviceInfo from '../../../types/device-info';
import { CallInfo } from '../../..';
import * as utils from '../../../utils';
import { SennheiserPayload, SennheiserEvents, SennheiserEventTypes } from './types';

const websocketUri = 'wss://127.0.0.1:41088';

export default class SennheiserService extends VendorImplementation {
  private static instance: SennheiserService;

  connectTimeout = 5000;

  vendorName = 'Sennheiser';
  isActive = false;
  devices = null;
  activeDeviceId = null;
  websocketConnected = false;

  websocket = null;
  deviceInfo: DeviceInfo = null;
  ignoreAcknowledgement = false;

  static getInstance (config: ImplementationConfig): SennheiserService {
    if (!SennheiserService.instance || config.createNew) {
      SennheiserService.instance = new SennheiserService(config);
    }

    return SennheiserService.instance;
  }

  deviceLabelMatchesVendor (label: string): boolean {
    const lowerLabel = label.toLowerCase();
    return ['senn', 'epos'].some(searchVal => lowerLabel.includes(searchVal));
  }

  get deviceName (): string {
    return this.deviceInfo && this.deviceInfo.ProductName;
  }

  get isDeviceAttached (): boolean {
    return !!this.deviceInfo;
  }

  resetHeadsetStateForCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<any> {
    this.ignoreAcknowledgement = true;
    return this.endCall(conversationId, hasOtherActiveCalls);
  }

  _handleError (payload: SennheiserPayload): void {
    this.logger.error('Non-zero return code from sennheiser', payload);
  }
  _handleAck (payload: SennheiserPayload): void {
    this.logger.debug(`Received Ack for ${payload.Event}`);
  }

  _sendMessage (payload: SennheiserPayload): void {
    this.logger.debug('sending sennheiser message', payload);
    this.websocket.send(JSON.stringify(payload));
  }

  _registerSoftphone (): void {
    const payload: SennheiserPayload = {
      Event: SennheiserEvents.EstablishConnection,
      EventType: SennheiserEventTypes.Request,
      SPName: 'Genesys Cloud Softphone',
      SPIconImage: 'SPImage.ico',
      RedialSupport: 'No',
      OffHookSupport: 'No',
      MuteSupport: 'Yes',
      DNDOption: 'No',
    };

    this._sendMessage(payload);
  }

  connect (): Promise<void> {
    this.ignoreAcknowledgement = false;
    !this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: true });

    const socket = new WebSocket(websocketUri);
    socket.onopen = this.webSocketOnOpen.bind(this);
    socket.onclose = this.webSocketOnClose.bind(this);
    socket.onmessage = this._handleMessage.bind(this);
    this.websocket = socket;

    return Promise.resolve();
  }

  webSocketOnOpen = (): void => {
    this.websocketConnected = true;
    this.logger.info('websocket open the sennheiser software');
  };

  webSocketOnClose (err: { code: number, reason: string, wasClean: boolean }): void {
    this.websocketConnected = false;
    if (!err.wasClean) {
      this.logger.error(err);
    }
    if (!this.isConnected) {
      this.logger.error(
        new Error('Failed to connect to sennheiser software. Make sure it is installed')
      );
      if (utils.isFirefox()) {
        this.errorCode = 'browser';
        this.disableRetry = true;
      }
    }

    if (this.isConnected || this.isConnecting) {
      this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    }
  }

  disconnect (): Promise<void> {
    if (!this.isConnected) {
      return Promise.resolve();
    }

    this._sendMessage({
      Event: SennheiserEvents.TerminateConnection,
      EventType: SennheiserEventTypes.Request,
    });

    return Promise.resolve();
  }

  setMute (value: boolean): Promise<void> {
    this._sendMessage({
      Event: value ? SennheiserEvents.MuteFromApp : SennheiserEvents.UnmuteFromApp,
      EventType: SennheiserEventTypes.Request,
    });
    return Promise.resolve();
  }

  setHold (conversationId: string, value: boolean): Promise<void> {
    this._sendMessage({
      Event: value ? SennheiserEvents.Hold : SennheiserEvents.Resume,
      EventType: SennheiserEventTypes.Request,
      CallID: conversationId,
    });

    return Promise.resolve();
  }

  incomingCall (callInfo: CallInfo): Promise<void> {
    this.ignoreAcknowledgement = false;
    this._sendMessage({
      Event: SennheiserEvents.IncomingCall,
      EventType: SennheiserEventTypes.Request,
      CallID: callInfo.conversationId,
    });

    return Promise.resolve();
  }

  answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if (autoAnswer) {
      this.incomingCall({ conversationId });
    }

    this._sendMessage({
      Event: SennheiserEvents.IncomingCallAccepted,
      EventType: SennheiserEventTypes.Request,
      CallID: conversationId,
    });
    return Promise.resolve();
  }

  rejectCall (conversationId: string): Promise<void> {
    this._sendMessage({
      Event: SennheiserEvents.IncomingCallRejected,
      EventType: SennheiserEventTypes.Request,
      CallID: conversationId,
    });
    return Promise.resolve();
  }

  outgoingCall (callInfo: CallInfo): Promise<void> {
    this.ignoreAcknowledgement = false;
    const { conversationId } = callInfo;

    this._sendMessage({
      Event: SennheiserEvents.OutgoingCall,
      EventType: SennheiserEventTypes.Request,
      CallID: conversationId,
    });

    return Promise.resolve();
  }

  endCall (conversationId: string, hasOtherActiveCalls?: boolean): Promise<void> {
    if (!hasOtherActiveCalls) {
      this._sendMessage({
        Event: SennheiserEvents.Resume,
        EventType: SennheiserEventTypes.Request
      });
      this._sendMessage({
        Event: SennheiserEvents.UnmuteFromApp,
        EventType: SennheiserEventTypes.Request,
      });
    }
    this._sendMessage({
      Event: SennheiserEvents.CallEnded,
      EventType: SennheiserEventTypes.Request,
      CallID: conversationId,
    });
    return Promise.resolve();
  }

  endAllCalls (): Promise<void> {
    this.logger.warn('There is no functionality defined for SennheiserService.endAllCalls()');
    return Promise.resolve();
  }

  _handleMessage (message: { data: string }): void {
    let payload: SennheiserPayload;
    try {
      payload = JSON.parse(message.data);
    } catch (err) {
      this.logger.error(err);
      this.logger.error('Failed to parse sennheiser payload', { message });
      return;
    }
    this.logger.debug('incoming sennheiser message', payload);

    if (payload.ReturnCode) {
      this._handleError(payload);
      return;
    }

    const conversationId = payload.CallID;

    if (!this.ignoreAcknowledgement) {
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
        if (!this.isConnected || this.isConnecting) {
          this.changeConnectionStatus({ isConnected: true, isConnecting: false });
        }

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
          this.deviceAnsweredCall({ name: payload.Event, conversationId });
        }

        break;
      case SennheiserEvents.Hold:
        if (payload.EventType === SennheiserEventTypes.Ack) {
          this._handleAck(payload);
          break;
        }
        this.deviceHoldStatusChanged({ holdRequested: true, name: payload.Event, conversationId });
        break;
      case SennheiserEvents.Resume:
        if (payload.EventType === SennheiserEventTypes.Ack) {
          this._handleAck(payload);
          break;
        }
        this.deviceHoldStatusChanged({ holdRequested: false, name: payload.Event, conversationId });
        break;
      case SennheiserEvents.MuteFromHeadset:
        this.deviceMuteChanged({ isMuted: true, name: payload.Event });
        break;
      case SennheiserEvents.UnmuteFromHeadset:
        this.deviceMuteChanged({ isMuted: false, name: payload.Event });
        break;
      case SennheiserEvents.CallEnded:
        if (payload.EventType === SennheiserEventTypes.Notification) {
          this._sendMessage({
            Event: SennheiserEvents.UnmuteFromApp,
            EventType: SennheiserEventTypes.Request,
          });
          this.deviceEndedCall({ name: payload.Event, conversationId });
        }
        break;
      case SennheiserEvents.IncomingCallRejected:
        this.deviceRejectedCall({ name: payload.Event, conversationId });
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
  }
}