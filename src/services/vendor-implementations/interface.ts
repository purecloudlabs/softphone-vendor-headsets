export default abstract class Interface { // TODO: rename this to something more descriptive
  vendorName = 'Not Specified';
  isConnecting = false; // trying to connect with the headset controlling software, ex: plantronics hub
  isConnected = false;  // represents a connection to the headset controlling software, ex: plantronics hub
  isDeviceAttached = false;
  isMuted = false;

  deviceLabelMatchesVendor (label: string): boolean {
    throw new Error(`${this.vendorName} - deviceLabelMatchesVendor() not implemented`);
  }

  connect (): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - connect() not implemented`));
  }

  disconnect (): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - disconnect() not implemented`));
  }

  incomingCall (callInfo: any): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - incomingCall() not implemented`));
  }

  outgoingCall (callInfo: any): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - outgoingCall() not implemented`));
  }

  answerCall (conversationId: string): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - answerCall() not implemented`));
  }

  endCall (conversationId: string, hasotherActiveCalls: boolean): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - endCall() not implemented`));
  }

  setMute (value: any): Promise<any> {
    return Promise.reject(new Error(`${this.vendorName} - setMute() not implemented`));
  }

  setHold (conversationId: string, value: any) {
    return Promise.reject(new Error(`${this.vendorName} - setHold() not implemented`));
  }

  deviceAnsweredCall (): void {

  }

  deviceRejectedCall (conversationId: string) {

  }

  deviceEndedCall (): void {

  }

  deviceMuteChanged (isMuted: boolean): void {

  }

  deviceHoldStatusChanged (isHeld: boolean, toggle: any): void {

  }

  defaultHeadsetChanged (deviceName: string, deviceInfo: any, deviceId: any): void {

  }

}