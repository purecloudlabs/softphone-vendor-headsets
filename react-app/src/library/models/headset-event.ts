export enum HeadsetEventName {
  IMPLEMENTATION_CHANGED = 'implementationChanged',
  DEVICE_ANSWERED_CALL = 'deviceAnsweredCall',
  DEVICE_REJECTED_CALL = 'deviceRejectedCall',
  DEVICE_ENDED_CALL = 'deviceEndedCall',
  DEVICE_MUTE_STATUS_CHANGED = 'deviceMuteStatusChanged',
  DEVICE_HOLD_STATUS_CHANGED = 'deviceHoldStatusChanged',
}

export class HeadsetEvent {
  constructor(
    public eventName: HeadsetEventName,
    public eventData: any) { }
}
