import DeviceInfo from '../../types/device-info';
import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import { EmittedHeadsetEvents } from '../../types/emitted-headset-events';
import { IApi } from '@gnaudio/jabra-js';
import { CallInfo } from '../..';

type HeadsetEventName = keyof EmittedHeadsetEvents;

export interface ImplementationConfig {
  logger: any;
  vendorName?: string;
  // externalSdk?: Promise<IApi>;
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
  // externalSdk: Promise<IApi>;

  constructor(config: ImplementationConfig) {
    super();
    const eventEmitter = new EventEmitter();
    Object.keys((eventEmitter as any).__proto__).forEach((name) => {
      this[name] = eventEmitter[name];
    });

    this.config = config;
    this.vendorName = config.vendorName;
    this.logger = config.logger;
    // this.externalSdk = config.externalSdk;
  }

  get isDeviceAttached(): boolean {
    throw new Error(`${this.vendorName} - isDeviceAttatched getter not implemented`);
  }

  abstract get deviceInfo (): DeviceInfo;

  /* eslint-disable @typescript-eslint/no-unused-vars */
  deviceLabelMatchesVendor(label: string): boolean {
    throw new Error(`${this.vendorName} - deviceLabelMatchesVendor() not implemented`);
  }

  connect(selectedMicLabel?: string): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - connect() not implemented`));
  }

  disconnect(): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - disconnect() not implemented`));
  }

  incomingCall(callInfo: CallInfo, hasOtherActiveCalls?: boolean): Promise<any> {
    // TODO: propagate this changed parameter (used to be callInfo, but there are several differents signatures in the implementing classes)
    return Promise.reject(new Error(`${this.vendorName} - incomingCall() not implemented`));
  }

  outgoingCall(callInfo: CallInfo): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - outgoingCall() not implemented`));
  }

  answerCall(conversationId: string): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - answerCall() not implemented`));
  }

  endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - endCall() not implemented`));
  }

  endAllCalls(): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - endAllCalls() not implemented`));
  }

  setMute(value: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setMute() not implemented`));
  }

  setHold(conversationId: string, value: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setHold() not implemented`));
  }
  /* eslint-enable */

  private emitEvent(eventName: HeadsetEventName, eventBody: any) {
    this.emit(eventName, { vendor: this, body: {...eventBody } })
  }

  requestWebHidPermissions?(callback: any) {
    this.logger.debug('Emitting premission request event');
    this.emitEvent('webHidPermissionRequested', { callback });
  }

  deviceAnsweredCall(eventInfo?: { name: string, code?: string | number, event?: any }): void {
    this.emitEvent('deviceAnsweredCall', eventInfo);
  }

  deviceRejectedCall(conversationId: string): void {
    this.emitEvent('deviceRejectedCall', conversationId);
  }

  deviceEndedCall(eventInfo?: { name: string, code?: string | number, event?: any }): void {
    this.emitEvent('deviceEndedCall', eventInfo);
  }

  deviceMuteChanged(isMuted: boolean, eventInfo?: { name: string, code?: string | number, event?: any }): void {
    this.emitEvent('deviceMuteChanged', { isMuted, ...eventInfo });
  }

  deviceHoldStatusChanged(holdRequested: boolean, eventInfo?: { name: string, code?: string | number, event?: any }, toggle?: boolean): void {
    this.emitEvent('deviceHoldStatusChanged', { holdRequested, ...eventInfo, toggle });
  }

  deviceEventLogs(eventInfo: { name: string, code?: string | number, event?: any }): void {
    this.emitEvent('deviceEventLogs', eventInfo);
  }
  // defaultHeadsetChanged(deviceName: string, deviceInfo: any, deviceId: any): void {
  //   // this.headsetService.triggerDefaultHeadsetChanged({deviceInfo, deviceName, deviceId});
  //   // HeadsetService.getInstance().triggerDefaultHeadsetChanged({deviceInfo, deviceName, deviceId})
  // }
}

