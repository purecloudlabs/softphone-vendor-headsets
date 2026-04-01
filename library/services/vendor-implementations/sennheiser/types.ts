export interface SennheiserPayload {
  CallID?: string;
  DNDOption?: 'Yes' | 'No';
  Event?: SennheiserEvents;
  EventType?: SennheiserEventTypes;
  HeadsetName?: string;
  HeadsetType?: string;
  MuteSupport?: 'Yes' | 'No';
  OffHookSupport?: 'Yes' | 'No';
  RedialSupport?: 'Yes' | 'No';
  ReturnCode?: number;
  SPName?: string;
  SPIconImage?: string;
}

export enum SennheiserEvents {
  SocketConnected = 'SocketConnected',
  EstablishConnection = 'EstablishConnection',
  SPLogin = 'SPLoggedIn',
  SPLogout = 'SPLoggedOut',
  TerminateConnection = 'TerminateConnection',
  IncomingCall = 'IncomingCall',
  IncomingCallRejected = 'InCallRejected',
  IncomingCallAccepted = 'InCallAccepted',
  OutgoingCall = 'OutgoingCall',
  CallEnded = 'CallEnded',
  SystemInformation = 'SystemInformation',
  HeadsetConnected = 'HeadsetConnected',
  HeadsetDisconnected = 'HeadsetDisconnected',
  Hold = 'CallHold',
  Resume = 'HeldCallResumed',
  MuteFromApp = 'MuteHeadset',
  UnmuteFromApp = 'UnmuteHeadset',
  MuteFromHeadset = 'MuteSoftphone',
  UnmuteFromHeadset = 'UnmuteSoftphone',
}

export enum SennheiserEventTypes {
  Request = 'Request', // outgoing actions
  Notification = 'Notification', // typically actions from headset
  Ack = 'Acknowledgement',
}
