import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";

type Events = {
    implementationChanged: VendorImplementation;
    deviceHoldStatusChanged: EventInfo;
    deviceMuteStatusChanged: EventInfo;
    deviceAnsweredCall: EventInfo;
    deviceEndedCall: EventInfo
    deviceRejectedCall: RejectCallEventInfo
    loggableEvent: EventInfo;
    webHidPermissionRequested: { callback: any }
}

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