import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";

export interface HeadsetEvents {
  deviceAnsweredCall: VendorEventWithInfo;
  deviceRejectedCall: VendorConversationIdEvent;
  deviceEndedCall: VendorEvent<any>;
  deviceMuteChanged: VendorEvent<any>;
  deviceHoldStatusChanged: VendorEvent<any>;
  deviceEventLogs: VendorEvent<any>;
}

export interface VendorEvent<Type> {
  vendor: VendorImplementation
  body: Type;
}

export interface VendorConversationIdEvent extends VendorEvent<{ conversationId: string}> {

};

export interface EventInfo {
  eventCode: string;
}

export interface VendorEventWithInfo extends VendorEvent<EventInfo> {

};