export enum HeadsetEventName {
    IMPLEMENTATION_CHANGED = 'implementationChanged',
    DEVICE_ANSWERED_CALL = 'deviceAnsweredCall',
    DEVICE_REJECTED_CALL = 'deviceRejectedCall',
    DEVICE_ENDED_CALL = 'deviceEndedCall',
    DEVICE_MUTE_STATUS_CHANGED = 'deviceMuteStatusChanged',
    DEVICE_HOLD_STATUS_CHANGED = 'deviceHoldStatusChanged',
    CLEAR_HEADSET_EVENTS = 'clear_headset_events'
}

export class HeadsetEvent {
    constructor(
        public eventName: HeadsetEventName,
        public eventData: any) { }
}
