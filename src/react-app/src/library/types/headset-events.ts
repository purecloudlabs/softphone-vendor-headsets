import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";

export interface HeadsetEvents {
    deviceAnsweredCall: VendorEvent<EventInfo>;
    deviceRejectedCall: VendorConversationIdEvent;
    deviceEndedCall: VendorEvent<any>;
    deviceMuteChanged: VendorMutedEvent;
    deviceHoldStatusChanged: VendorHoldEvent;
    deviceEventLogs: VendorEvent<any>;
}

export interface VendorEvent<Type> {
    vendor: VendorImplementation
    body: Type;
}

export interface VendorConversationIdEvent extends VendorEvent<{ conversationId: string}> {
};

export interface EventInfo {
    name: string;
    code?: string;
    event: any;
}

export interface VendorMutedEvent extends VendorEvent<EventInfo>{
    isMuted: boolean;
}

export interface VendorHoldEvent extends VendorEvent<EventInfo> {
    holdRequested: boolean;
    toggle?: boolean;
}