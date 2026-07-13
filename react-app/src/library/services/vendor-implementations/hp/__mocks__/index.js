// jest.mock('@hp/call-control-sdk', () => {
//   // Require the original module to not be mocked...
//   const originalModule = jest.requireActual('../CallControlSDK-2.1.16-Web');

//   return {
//     __esModule: true, // Use it when dealing with esModules
//     ...originalModule,
//     getRandom: jest.fn(() => 10),
//   };
// });

var CallState;
(function (CallState) {
  CallState[CallState["IDLE"] = 0] = "IDLE";
  CallState[CallState["INCOMING"] = 1] = "INCOMING";
  CallState[CallState["OUTGOING"] = 2] = "OUTGOING";
  CallState[CallState["ACTIVE"] = 3] = "ACTIVE";
  CallState[CallState["ACTIVE_AND_INCOMING"] = 4] = "ACTIVE_AND_INCOMING";
  CallState[CallState["ACTIVE_AND_HELD"] = 5] = "ACTIVE_AND_HELD";
  CallState[CallState["HELD"] = 6] = "HELD";
})(CallState || (CallState = {}));

var SdkEvent;
(function (SdkEvent) {
  SdkEvent[SdkEvent["ANSWER"] = 0] = "ANSWER";
  SdkEvent[SdkEvent["TERMINATE"] = 1] = "TERMINATE";
  SdkEvent[SdkEvent["REJECT"] = 2] = "REJECT";
  SdkEvent[SdkEvent["HOLD"] = 3] = "HOLD";
  SdkEvent[SdkEvent["RESUME"] = 4] = "RESUME";
  SdkEvent[SdkEvent["REDIAL"] = 5] = "REDIAL";
  SdkEvent[SdkEvent["FLASH"] = 6] = "FLASH";
  SdkEvent[SdkEvent["MUTE"] = 7] = "MUTE";
  SdkEvent[SdkEvent["UNMUTE"] = 8] = "UNMUTE";
  SdkEvent[SdkEvent["DISCONNECT"] = 9] = "DISCONNECT";
  SdkEvent[SdkEvent["CONNECT_SUCCESS"] = 10] = "CONNECT_SUCCESS";
  SdkEvent[SdkEvent["CONNECT_FAILED"] = 11] = "CONNECT_FAILED";
})(SdkEvent || (SdkEvent = {}));


const mockConnectHeadset = jest.fn(async () => true);
const mockDisconnectHeadset = jest.fn(async () => true);
const mockRegisterEventHandler = jest.fn(async () => true);
const mockSetCallState = jest.fn(async () => true);
const mockSetMuteState = jest.fn(async () => true);

const mock = jest.fn(() => {
  return {
    connectHeadset: mockConnectHeadset,
    disconnectHeadset: mockDisconnectHeadset,
    registerEventHandler: mockRegisterEventHandler,
    setCallState: mockSetCallState,
    setMuteState: mockSetMuteState,
  };
});

export {
  CallState,
  SdkEvent,
  mock as CallControlSdk,
  mock as default,
  mockConnectHeadset,
  mockDisconnectHeadset,
  mockRegisterEventHandler,
  mockSetCallState,
  mockSetMuteState
};