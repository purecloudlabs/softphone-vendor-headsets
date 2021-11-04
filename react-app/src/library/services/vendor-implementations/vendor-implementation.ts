import DeviceInfo from '../../types/device-info';
import StrictEventEmitter from 'strict-event-emitter-types';
import { EventEmitter } from 'events';
import { HeadsetEvents } from '../../types/headset-events';

type HeadsetEventName = keyof HeadsetEvents;

export interface ImplementationConfig {
  logger: any;
  vendorName?: string;
  logHeadsetEvents?: boolean;
  externalSdk?: any;
}

export abstract class VendorImplementation {
  // TODO: rename this to something more descriptive
  vendorName = 'Not Specified';
  isConnecting = false; // trying to connect with the headset controlling software, ex: plantronics hub
  isConnected = false; // represents a connection to the headset controlling software, ex: plantronics hub
  isMuted = false;
  errorCode: string = null;
  disableRetry = false;
  logger: any; // TODO: pass this in on creation?
  config: ImplementationConfig;
  externalSdk: any;

  constructor(config: ImplementationConfig) {
    const eventEmitter = new EventEmitter();
    Object.keys((eventEmitter as any).__proto__).forEach((name) => {
      this[name] = eventEmitter[name];
    });

    this.config = config;
    this.vendorName = config.vendorName;
    this.logger = config.logger;
    this.externalSdk = config.externalSdk;
  }

  abstract canHandleHeadset(newMicLabel: string): boolean;

  get logHeadsetEvents(): boolean {
    if (typeof this.config.logHeadsetEvents === 'undefined' || this.config.logHeadsetEvents === null) {
      return true;
    }

    return this.config.logHeadsetEvents;
  }

  get isDeviceAttached(): boolean {
    throw new Error(`${this.vendorName} - isDeviceAttatched getter not implemented`);
  }

  abstract get deviceInfo (): DeviceInfo;

  deviceLabelMatchesVendor(label: string): boolean {
    throw new Error(`${this.vendorName} - deviceLabelMatchesVendor() not implemented`);
  }

  connect(selectedMicLabel?: string): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - connect() not implemented`));
  }

  disconnect(): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - disconnect() not implemented`));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  incomingCall(opts: any): Promise<any> {
    // TODO: propagate this changed parameter (used to be callInfo, but there are several differents signatures in the implementing classes)
    return Promise.reject(new Error(`${this.vendorName} - incomingCall() not implemented`));
  }

  outgoingCall(callInfo: any): Promise<any> {
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

  setMute(value: any): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setMute() not implemented`));
  }

  setHold(conversationId: string, value: any): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setHold() not implemented`));
  }

  private emitEvent(eventName: HeadsetEventName, eventBody: any) {
    this.emit(eventName, { vendor: this, ...eventBody })
  }

  deviceAnsweredCall(eventInfo?: any): void {
    this.emitEvent('deviceAnsweredCall', eventInfo);
  }

  deviceRejectedCall(conversationId: string) {
    this.emitEvent('deviceRejectedCall', conversationId);
  }

  deviceEndedCall(eventInfo?: any): void {
    this.emitEvent('deviceEndedCall', eventInfo);
  }

  deviceMuteChanged(isMuted: boolean, eventInfo?: any): void {
    this.emitEvent('deviceMuteChanged', { isMuted, ...eventInfo });
  }

  deviceHoldStatusChanged(holdRequested: boolean, eventInfo?: any, toggle?: any): void {
    this.emitEvent('deviceHoldStatusChanged', { holdRequested, ...eventInfo, toggle });
  }

  deviceEventLogs(eventInfo: any): void {
    this.emitEvent('deviceEventLogs', eventInfo);
  }
  // defaultHeadsetChanged(deviceName: string, deviceInfo: any, deviceId: any): void {
  //   // this.headsetService.triggerDefaultHeadsetChanged({deviceInfo, deviceName, deviceId});
  //   // HeadsetService.getInstance().triggerDefaultHeadsetChanged({deviceInfo, deviceName, deviceId})
  // }
}

export interface VendorImplementation extends StrictEventEmitter<EventEmitter, HeadsetEvents> { };
