import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";

export interface EmittedHeadsetEvents {
  deviceAnsweredCall: VendorEvent<EventInfoWithConversationId>;
  deviceRejectedCall: VendorEvent<EventInfoWithConversationId>;
  deviceEndedCall: VendorEvent<EventInfoWithConversationId>;
  deviceMuteStatusChanged: VendorEvent<MutedEventInfo>;
  deviceHoldStatusChanged: VendorEvent<HoldEventInfo>;
  deviceEventLogs: VendorEvent<any>;
  webHidPermissionRequested: VendorEvent<WebHidPermissionRequest>;
  deviceConnectionStatusChanged: VendorEvent<any>;
}

export type VendorEvent<Type> = {
  vendor: VendorImplementation
  body: Type;
}

export interface EventInfo {
  name: string;
  code?: string|number;
  event?: any;
  conversationId?: string;
}

export interface EventInfoWithConversationId extends EventInfo {
  conversationId: string;
}

export interface MutedEventInfo extends EventInfo {
  isMuted: boolean;
}

export interface HoldEventInfo extends EventInfoWithConversationId {
  holdRequested: boolean;
  toggle?: boolean;
}

export interface WebHidPermissionRequest {
  callback: any
}