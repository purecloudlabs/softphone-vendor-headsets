export const HeadsetEvent = 'JabraEvent';
export const DeviceEvent = 'JabraDeviceAttached';

type HeadsetEvent = typeof HeadsetEvent;
type DeviceEvent = typeof DeviceEvent;

export interface JabraHeadsetEvent {
  msg: HeadsetEvent;
  event: JabraNativeEventNames;
  value?: any;
  hidInput: string;
}

export interface JabraDeviceEvent {
  msg: DeviceEvent;
  attached: boolean;
  deviceId: number;
  deviceName: string;
}

export enum JabraNativeEventNames {
  OffHook = 'OffHook',
  Mute = 'Mute',
  Hold = 'Flash',
  RejectCall = 'RejectCall',
}
