import DeviceInfo from "models/device-info";
import HeadsetService from "../headset";

export interface ImplementationConfig {
  logger: any;
  vendorName?: string;
}

export default abstract class Implementation {
  // TODO: rename this to something more descriptive
  headsetService: HeadsetService;
  currentHeadset: Implementation;
  vendorName = 'Not Specified';
  isConnecting = false; // trying to connect with the headset controlling software, ex: plantronics hub
  isConnected = false; // represents a connection to the headset controlling software, ex: plantronics hub
  isMuted = false;
  errorCode: string = null;
  disableRetry = false;
  logger: any; // TODO: pass this in on creation?
  config: ImplementationConfig;
  deviceInfo: DeviceInfo;

  constructor(config: ImplementationConfig) {
    this.config = config;
    this.vendorName = config.vendorName;
    this.logger = config.logger;
    this.currentHeadset = null;
  }

  get logHeadsetEvents(): boolean{
    return HeadsetService.getInstance(this.config).logHeadsetEvents;
  }

  get isDeviceAttached(): boolean {
    throw new Error(`${this.vendorName} - isDeviceAttatched getter not implemented`);
  }

  deviceLabelMatchesVendor(label: string): boolean {
    throw new Error(`${this.vendorName} - deviceLabelMatchesVendor() not implemented`);
  }

  connect(): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - connect() not implemented`));
  }

  disconnect(): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - disconnect() not implemented`));
  }

  incomingCall(opts: {}): Promise<any> {
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

  deviceAnsweredCall(eventInfo): void {
    HeadsetService.getInstance(this.config).triggerDeviceAnsweredCall(eventInfo);
  }

  deviceRejectedCall(conversationId: string) {
    HeadsetService.getInstance(this.config).triggerDeviceRejectedCall(conversationId);
  }

  deviceEndedCall(eventInfo): void {
    HeadsetService.getInstance(this.config).triggerDeviceEndedCall(eventInfo);
  }

  deviceMuteChanged(isMuted: boolean, eventInfo): void {
    HeadsetService.getInstance(this.config).triggerDeviceMuteStatusChanged(isMuted, eventInfo);
  }

  deviceHoldStatusChanged(holdRequested: boolean, eventInfo, toggle?: any): void {
    HeadsetService.getInstance(this.config).triggerDeviceHoldStatusChanged({holdRequested, toggle}, eventInfo);
  }

  deviceEventLogs(eventInfo): void {
    HeadsetService.getInstance(this.config).triggerDeviceLogs(eventInfo);
  };

  // defaultHeadsetChanged(deviceName: string, deviceInfo: any, deviceId: any): void {
  //   // this.headsetService.triggerDefaultHeadsetChanged({deviceInfo, deviceName, deviceId});
  //   // HeadsetService.getInstance().triggerDefaultHeadsetChanged({deviceInfo, deviceName, deviceId})
  // }
}
