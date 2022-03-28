import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";

export enum HeadsetEvents {
    implementationChanged = 'implementationChanged',
    deviceHoldStatusChanged = 'deviceHoldStatusChanged',
    deviceMuteStatusChanged = 'deviceMuteStatusChanged',
    deviceAnsweredCall = 'deviceAnsweredCall',
    deviceEndedCall = 'deviceEndedCall',
    deviceRejectedCall = 'deviceRejectedCall',
    loggableEvent = 'loggableEvent',
    webHidPermissionRequested = 'webHidPermissionRequested',
    deviceConnectionStatusChanged = 'deviceConnectionStatusChanged',
    deviceMuteChanged = 'deviceMuteChanged',
    deviceEventLogs = 'deviceEventLogs',
}

type Events = {
    [HeadsetEvents.implementationChanged]: VendorImplementation;
    [HeadsetEvents.deviceHoldStatusChanged]: EventInfo;
    [HeadsetEvents.deviceMuteStatusChanged]: EventInfo;
    [HeadsetEvents.deviceAnsweredCall]: EventInfo;
    [HeadsetEvents.deviceEndedCall]: EventInfo
    [HeadsetEvents.deviceRejectedCall]: RejectCallEventInfo;
    [HeadsetEvents.loggableEvent]: EventInfo;
    [HeadsetEvents.webHidPermissionRequested]: { callback: any };
    [HeadsetEvents.deviceConnectionStatusChanged]: DeviceConnectionStatus;
}

export type DeviceConnectionStatus = 'checking' | 'running' | 'notRunning' | 'noVendor';

type EventInfo = {
    name: string;
    event: any;
    code?: string;
    isMuted?: boolean;
    holdRequested?: boolean;
    toggle?: boolean;
    conversationId?: string;
};

type RejectCallEventInfo = {
    conversationId: string;
}

export type ConsumedHeadsetEvents<T = keyof Events> = T extends keyof Events
    ? { event: T, payload: Events[T] }
    : never;