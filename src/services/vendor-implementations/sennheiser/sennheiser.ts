import Implementation from '../Implementation';
import { SennheiserEvents } from './sennheiser-events';
import { SennheiserEventTypes } from './sennheiser-event-types';
import DeviceInfo from '../../../models/device-info';
import { SennheiserPayload } from './sennheiser-payload';

export default class SennheiserService extends Implementation {
  private static instance: SennheiserService;

  connectTimeout: number = 5000;

  vendorName = 'Sennheiser';
  isConnecting = false;
  isActive = false;
  devices = null;
  activeDeviceId = null;

  callMappings: any = {};

  websocketUri = 'wss://127.0.0.1:41088';
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

  private generateRandomNumber(length = 7): number {
    return Math.round(Math.random() * Math.pow(10, length));
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

  private _handleError(payload): void {
    // Logger.error('Non-zero return code from sennheiser', payload); // TODO: Logger
  }
  private _handleAck(payload): void {
    // Logger.debug(`Received Ack for ${payload.Event}`); // TODO: Logger
  }

  _sendMessage(payload: SennheiserPayload): void {
    // Logger.debug('sending sennheiser message', payload); // TODO: Logger
    this.websocket.send(JSON.stringify(payload));
  }

  private _registerSoftphone(): void {
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
    const callId = this.generateRandomNumber();

    this.callMappings = {
      [conversationId]: callId,
      [callId]: conversationId,
    };

    // Logger.info('Created callId mapping for sennheiser headset', {conversationId, sennheiserCallId: callId}); // TODO: Logger

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
      // Logger.info('Failed to find sennheiser callId, assuming call was already ended'); // TODO: Logger
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
    // Logger.warn('There is no functionality defined for SennheiserService.endAllCalls()'); // TODO: Logger
    return Promise.resolve();
  }

  // TODO: Implement these
  // _timeoutConnectTask
  // connect() {}
  // async _handleMessage (message) {}
}
