import DeviceInfo from '../../types/device-info';
import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import { EmittedHeadsetEvents, EventInfo, EventInfoWithConversationId, HoldEventInfo, MutedEventInfo } from '../../types/emitted-headset-events';
import { CallInfo } from '../..';
import { UpdateReasons } from '../../types/headset-states';

type HeadsetEventName = keyof EmittedHeadsetEvents;

export interface ImplementationConfig {
  logger: any;
  vendorName?: string;
  appName?: string;
  createNew?: boolean; // this should only be used for testing
}

export abstract class VendorImplementation extends (EventEmitter as { new(): StrictEventEmitter<EventEmitter, EmittedHeadsetEvents> }) {
  // TODO: rename this to something more descriptive
  vendorName = 'Not Specified';
  isConnecting = false; // trying to connect with the headset controlling software, ex: plantronics hub
  isConnected = false; // represents a connection to the headset controlling software, ex: plantronics hub
  isMuted = false;
  errorCode: string = null;
  disableRetry = false;
  logger: any; // TODO: pass this in on creation?
  config: ImplementationConfig;

  constructor (config: ImplementationConfig) {
    super();
    const eventEmitter = new EventEmitter();
    Object.keys((eventEmitter as any).__proto__).forEach((name) => {
      this[name] = eventEmitter[name];
    });

    this.config = config;
    this.vendorName = config.vendorName;
    this.logger = config.logger;
  }

  get isDeviceAttached (): boolean {
    throw new Error(`${this.vendorName} - isDeviceAttatched getter not implemented`);
  }

  isSupported (): boolean {
    return true;
  }

  abstract get deviceInfo (): DeviceInfo;

  /* eslint-disable @typescript-eslint/no-unused-vars */
  deviceLabelMatchesVendor (label: string): boolean {
    throw new Error(`${this.vendorName} - deviceLabelMatchesVendor() not implemented`);
  }

  connect (selectedMicLabel?: string): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - connect() not implemented`));
  }

  disconnect (clearReason?: UpdateReasons): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - disconnect() not implemented`));
  }

  incomingCall (callInfo: CallInfo, hasOtherActiveCalls?: boolean): Promise<any> {
    // TODO: propagate this changed parameter (used to be callInfo, but there are several differents signatures in the implementing classes)
    return Promise.reject(new Error(`${this.vendorName} - incomingCall() not implemented`));
  }

  outgoingCall (callInfo: CallInfo): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - outgoingCall() not implemented`));
  }

  answerCall (conversationId: string, autoAnswer?: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - answerCall() not implemented`));
  }

  rejectCall (conversationId: string): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - rejectCall() not implemented`));
  }

  endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - endCall() not implemented`));
  }

  endAllCalls (): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - endAllCalls() not implemented`));
  }

  setMute (value: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setMute() not implemented`));
  }

  setHold (conversationId: string, value: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setHold() not implemented`));
  }

  resetHeadsetStateForCall (conversationId?: string): Promise<any> {
    return this.rejectCall(conversationId);
  }
  /* eslint-enable */

  private emitEvent (eventName: HeadsetEventName, eventBody: any) {
    this.emit(eventName, { vendor: this, body: { ...eventBody } });
  }

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  requestWebHidPermissions (callback: any): void {
  /* eslint-enable */
    this.logger.debug('Emitting premission request event');
    this.emitEvent('webHidPermissionRequested', { callback });
  }

  deviceAnsweredCall (eventInfo: EventInfoWithConversationId): void {
    this.emitEvent('deviceAnsweredCall', eventInfo);
  }

  deviceRejectedCall (eventInfo: EventInfoWithConversationId): void {
    this.emitEvent('deviceRejectedCall', eventInfo);
  }

  deviceEndedCall (eventInfo: EventInfoWithConversationId): void {
    this.emitEvent('deviceEndedCall', eventInfo);
  }

  deviceMuteChanged (eventInfo: MutedEventInfo): void {
    this.emitEvent('deviceMuteStatusChanged', { ...eventInfo });
  }

  deviceHoldStatusChanged (eventInfo: HoldEventInfo): void {
    this.emitEvent('deviceHoldStatusChanged', { ...eventInfo });
  }

  deviceEventLogs (eventInfo: EventInfo): void {
    this.emitEvent('deviceEventLogs', eventInfo);
  }

  changeConnectionStatus (headsetState: {isConnected: boolean, isConnecting: boolean}): void {
    this.isConnected = headsetState.isConnected;
    this.isConnecting = headsetState.isConnecting;
    this.emitEvent('deviceConnectionStatusChanged', { currentVendor: this, ...headsetState });
  }

  /**
   * Try to deduct the product id based on the label.
   * Making the assumption that the label will end with (vendorid:productid).
   *
   * @param selectedMicLabel
   * @returns The product id if matched or null.
   */
  deductProductId (selectedMicLabel: string) : string {
    const match = selectedMicLabel?.match(/\((\w+):(\w+)\)$/);
    return match ? match[2] : null;
  }
}
