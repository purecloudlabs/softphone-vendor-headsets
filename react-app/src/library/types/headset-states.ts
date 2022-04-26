// this is an internal interface and doesn't need to be documented
export interface HeadsetState {
  offHook: boolean;
  muted: boolean;
  held: boolean;
  ringing: boolean;
}

// this is an internal interface and doesn't need to be documented
export interface HeadsetStateRecord extends HeadsetState {
  conversationId: string;
  removeTimer?: any;
}