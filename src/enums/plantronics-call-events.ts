export enum CallEvents {
  Unknown = 0,
  AcceptCall = 1,
  TerminateCall = 2,
  HoldCall = 3,
  ResumeCall = 4,
  Flash = 5,
  CallInProgress = 6,
  CallRinging = 7,
  CallEnded = 8,
  TransferToHeadset = 9,
  TransferToSpeaker = 10,
  Mute = 11,
  Unmute = 12,
  MobileCallRinging = 13,
  MobileCallInProgress = 14,
  MobileCallEnded = 15,
  DOn = 16,
  DOff = 17,
  CallIdle = 18,
  Play = 19,
  Pause = 20,
  Stop = 21,
  DTMLKey = 22,
  RejectCall = 23,
  MakeCall = 24,
  Hook = 25,
  HookIdle = 26,
  HookDocked = 27,
  HookUndocked = 28,
  BaseEvent = 29,
  CallAnsweredAndEnded = 30,
  CallUnansweredAndEnded = 31,
  DeviceChange = 32,
  DeviceArrived = 33,
  DeviceRemoved = 3,
}

// Don't need this, because CallEvents[code] will return the name
// const reverseCallEvents: Dictionary;
// for (const eventName of Object.keys(CallEvents)) {
//   const code = CallEvents[eventName];
//   reverseCallEvents[code] = eventName;
// }

// export function getEventName (code) {
//   return reverseCallEvents[code];
// }