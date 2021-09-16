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