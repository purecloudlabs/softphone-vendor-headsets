import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";
import { EventInfoWithConversationId, HoldEventInfo, MutedEventInfo, WebHidPermissionRequest } from "./emitted-headset-events";

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
    [HeadsetEvents.deviceHoldStatusChanged]: HoldEventInfo;
    [HeadsetEvents.deviceMuteStatusChanged]: MutedEventInfo;
    [HeadsetEvents.deviceAnsweredCall]: EventInfoWithConversationId;
    [HeadsetEvents.deviceEndedCall]: EventInfoWithConversationId
    [HeadsetEvents.deviceRejectedCall]: EventInfoWithConversationId;
    [HeadsetEvents.loggableEvent]: any;
    [HeadsetEvents.webHidPermissionRequested]: WebHidPermissionRequest;
    [HeadsetEvents.deviceConnectionStatusChanged]: DeviceConnectionStatus;
}

export type DeviceConnectionStatus = 'checking' | 'running' | 'notRunning' | 'noVendor';

export type ConsumedHeadsetEvents<T = keyof Events> = T extends keyof Events
    ? { event: T, payload: Events[T] }
    : never;