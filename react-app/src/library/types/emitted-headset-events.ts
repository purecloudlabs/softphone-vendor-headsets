import { VendorImplementation } from "../services/vendor-implementations/vendor-implementation";
import { WebHidPermissionRequest } from "..";

export interface EmittedHeadsetEvents {
  deviceAnsweredCall: VendorEvent<EventInfo>;
  deviceRejectedCall: VendorConversationIdEvent;
  deviceEndedCall: VendorEvent<any>;
  deviceMuteChanged: VendorEvent<MutedEventInfo>;
  deviceHoldStatusChanged: VendorEvent<HoldEventInfo>;
  deviceEventLogs: VendorEvent<any>;
  webHidPermissionRequested: VendorEvent<WebHidPermissionRequest>;
  deviceConnectionStatusChanged: VendorEvent<any>;
}

export type VendorEvent<Type> = {
  vendor: VendorImplementation
  body: Type;
}

export type VendorConversationIdEvent = VendorEvent<{ conversationId: string}>;

export interface EventInfo {
  name: string;
  code?: string;
  event: any;
}

export interface MutedEventInfo extends EventInfo {
  isMuted: boolean;
}

export interface HoldEventInfo extends EventInfo {
  holdRequested: boolean;
  toggle?: boolean;
}