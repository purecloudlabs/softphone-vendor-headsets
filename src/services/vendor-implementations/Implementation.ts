export default abstract class Implementation {
  // TODO: rename this to something more descriptive
  headset: Implementation;
  vendorName = 'Not Specified';
  isConnecting = false; // trying to connect with the headset controlling software, ex: plantronics hub
  isConnected = false; // represents a connection to the headset controlling software, ex: plantronics hub
  isMuted = false;

  constructor(vendorName: string = 'Not Specified') {
    this.vendorName = vendorName;
    this.headset = null;
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

  deviceAnsweredCall(): void {}

  deviceRejectedCall(conversationId: string) {}

  deviceEndedCall(): void {}

  deviceMuteChanged(isMuted: boolean): void {}

  deviceHoldStatusChanged(isHeld: boolean, toggle?: any): void {}

  defaultHeadsetChanged(deviceName: string, deviceInfo: any, deviceId: any): void {}
}
