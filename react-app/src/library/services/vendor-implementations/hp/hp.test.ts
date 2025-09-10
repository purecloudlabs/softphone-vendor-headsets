// import fetchJsonp from 'fetch-jsonp';
import "whatwg-fetch";
import 'regenerator-runtime';
import { mockLogger, eventValidation } from "../../../test-utils";
import DeviceInfo from "../../../types/device-info";
import HpService from "./hp";
import {
  mockConnectHeadset,
  mockDisconnectHeadset,
  mockRegisterEventHandler,
  mockSetCallState,
  mockSetMuteState,
  SdkEvent,
  CallState
} from "./__mocks__/index";

const testDevice: DeviceInfo = {
  ProductName: 'testDevice1',
  deviceName: 'testDevice1',
};

describe('HpService', () => {
  let hpService: HpService;

  beforeEach(() => {
    hpService = HpService.getInstance({ logger: console, createNew: true });
  });

  describe('instantiation', () => {
    afterEach(() => {
      hpService = null;
    });

    it('should be a singleton', () => {
      const hpService2 = HpService.getInstance({ logger: console });

      expect(hpService).not.toBeFalsy();
      expect(hpService2).not.toBeFalsy();
      expect(hpService).toBe(hpService2);
    });
  });

  describe('deviceName', () => {
    it('should return the value of deviceInfo.ProductName', () => {
      hpService._deviceInfo = testDevice;
      const result = hpService.deviceName;
      expect(result).toEqual(testDevice.ProductName);
    });

    it('should return undefined if _deviceInfo is undefined', () => {
      hpService._deviceInfo = undefined;
      const result = hpService.deviceName;
      expect(result).toBeUndefined();
    });
  });

  describe('vendorName', () => {
    it('should return the expected name', () => {
      const expected = 'Hp';
      expect(hpService.vendorName).toEqual(expected);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    beforeEach(() => {
      hpService = HpService.getInstance({ logger: console });
      hpService.logger = mockLogger;
    });

    it('should return true when the device label contains the string "plantronics"', () => {
      let testLabel = 'plantronics headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset PlanTroniCs made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of Plantronics';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });

    it('should return false when the device label does not contain the string "plantronics"', () => {
      let testLabel = 'standard headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });

    it('should return true when device label contains the string "poly"', () => {
      let testLabel = 'Poly: a sandwich';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'test test pOly';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'test poLy test';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });

    it('should return false when device label does not contain the string "poly"', () => {
      const testLabel = 'standard headset';
      const result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });

    it('should return true when the device label contains the string "(047f:"', () => {
      let testLabel = '(047f: headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset (047f: made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of (047f:';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "(047f:"', () => {
      let testLabel = 'standard headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });

    it('should return true when the device label contains the string "(095d:"', () => {
      let testLabel = '(095d: headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset (095d: made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of (095d:';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "(095d:"', () => {
      let testLabel = 'standard headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });

    it('should return true when the device label contains the string "(03f0:"', () => {
      let testLabel = '(03f0: headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset (03f0: made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of (03f0:';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "(03f0:"', () => {
      let testLabel = 'standard headset';
      let result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = hpService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
  });

  describe('When disconnected', () => {
    it('should not call the SDK when disconnect is called', () => {
      hpService.disconnect();
      expect(mockDisconnectHeadset).not.toBeCalled();
    });
  });

  describe('When connected', () => {
    beforeEach(() => {
      hpService.isConnected = true;
    });

    it('should call the SDK when disconnect is called', () => {
      hpService.disconnect();
      expect(mockDisconnectHeadset).toBeCalled();
    });
  });

  describe('sdkEventHandler conenction events', () => {
    it('will notify the when a connection has been made.', async () => {
      const deviceStatusEvent = eventValidation(hpService, 'deviceConnectionStatusChanged');
      hpService._device = { name: 'testDevice1' };
      const sdkevent = SdkEvent.CONNECT_SUCCESS;
      await hpService.sdkEventHandler(sdkevent);
      expect(hpService.isConnected).toBe(true);
      expect(hpService.isConnecting).toBe(false);
      await deviceStatusEvent;
    });
    /*
    it('will notify the when a disconnection has happened.', async () => {
      const deviceStatusEvent = eventValidation(hpService, 'deviceConnectionStatusChanged');
      hpService.isConnected = true;
      const sdkevent = SdkEvent.DISCONNECTED;
      await hpService.sdkEventHandler(sdkevent);
      expect(hpService.isConnected).toBe(false);
      expect(hpService.isConnecting).toBe(false);
      await deviceStatusEvent;
    });
    */

  });


  describe('sdkEventHandler in a single call scenario', () => {
    const callInfo = { conversationId: 'convoId1' };

    beforeEach(() => {
      mockSetCallState.mockClear();
      mockSetMuteState.mockClear();
    });

    it('will call not call deviceAnsweredCall when there was no incoming call notification', () => {
      const deviceAnsweredCallSpy = jest.spyOn(hpService, 'deviceAnsweredCall');
      const sdkevent = SdkEvent.ANSWER;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceAnsweredCallSpy).not.toBeCalled();
    });

    it('will call deviceAnsweredCall', () => {
      const deviceAnsweredCallSpy = jest.spyOn(hpService, 'deviceAnsweredCall');
      hpService.incomingConversationId = callInfo['conversationId'];
      const sdkevent = SdkEvent.ANSWER;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceAnsweredCallSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent });
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toBeCalledWith(CallState.ACTIVE);
    });

    it('will not call deviceEndedCall if there is not an active call', () => {
      const deviceEndedCallSpy = jest.spyOn(hpService, 'deviceEndedCall');
      const sdkevent = SdkEvent.TERMINATE;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceEndedCallSpy).not.toBeCalled();
    });

    it('will call deviceEndedCall', () => {
      const deviceEndedCallSpy = jest.spyOn(hpService, 'deviceEndedCall');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.TERMINATE;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceEndedCallSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent });
      expect(hpService.activeConversationIds.length).toBe(0);
    });

    it('will call stop calling deviceEndedCall when no more active calls present', () => {
      const deviceEndedCallSpy = jest.spyOn(hpService, 'deviceEndedCall');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.TERMINATE;
      hpService.sdkEventHandler(sdkevent);
      hpService.sdkEventHandler(sdkevent);
      hpService.sdkEventHandler(sdkevent);
      expect(deviceEndedCallSpy).toBeCalledTimes(1);
      expect(hpService.activeConversationIds.length).toBe(0);
      // Ensure mockSetCallState is only ever called with CallState.IDLE
      const calls = mockSetCallState.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        if (call.length > 0) {
          expect(call.pop()).toBe(CallState.IDLE);
        }
      }
    });

    it('will call not call deviceRejectedCall when there was no incoming call notification', () => {
      const deviceRejectedCallSpy = jest.spyOn(hpService, 'deviceRejectedCall');
      const sdkevent = SdkEvent.REJECT;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceRejectedCallSpy).not.toBeCalled();
      expect(mockSetCallState).not.toBeCalled();
    });

    it('will call deviceRejectedCall when incoming call is known', () => {
      const deviceRejectedCallSpy = jest.spyOn(hpService, 'deviceRejectedCall');
      hpService.incomingConversationId = callInfo['conversationId'];
      const sdkevent = SdkEvent.REJECT;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceRejectedCallSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent });
      expect(hpService.incomingConversationId).toBe(null);
      expect(mockSetCallState).toBeCalledWith(CallState.IDLE);
    });

    it('will call deviceHoldStatusChanged to hold an active call', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.HOLD;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": true });
      expect(hpService.activeConversationIds.length).toBe(0);
      expect(hpService.heldConversationIds.length).toBe(1);
      expect(mockSetCallState).toBeCalledWith(CallState.HELD);
    });

    it('will not call deviceHoldStatusChanged to hold an active call if there is none', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      const sdkevent = SdkEvent.HOLD;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).not.toBeCalled();
      expect(mockSetCallState).not.toBeCalled();
    });

    it('will not call deviceHoldStatusChanged to hold an active call if there is none', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      const sdkevent = SdkEvent.HOLD;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).not.toBeCalled();
      expect(mockSetCallState).not.toBeCalled();
    });

    it('will call deviceHoldStatusChanged to resume a held call', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      hpService.heldConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.RESUME;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": false });
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(hpService.heldConversationIds.length).toBe(0);
      expect(mockSetCallState).toBeCalledWith(CallState.ACTIVE);
    });

    it('will not call deviceHoldStatusChanged to resume when there is no held call', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      const sdkevent = SdkEvent.RESUME;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).not.toBeCalled();
      expect(mockSetCallState).not.toBeCalled();
    });

    it('will call deviceHoldStatusChanged to hold an active call (with flash)', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.FLASH;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": true });
      expect(hpService.activeConversationIds.length).toBe(0);
      expect(hpService.heldConversationIds.length).toBe(1);
      expect(mockSetCallState).toBeCalledWith(CallState.HELD);
    });

    it('will call deviceHoldStatusChanged to resume a held call (with flash)', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      hpService.heldConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.FLASH;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": false });
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(hpService.heldConversationIds.length).toBe(0);
      expect(mockSetCallState).toBeCalledWith(CallState.ACTIVE);
    });

    it('will call deviceHoldStatusChanged to swap calls with flash', () => {
      const callInfo2 = { conversationId: 'convoId2' };
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      hpService.heldConversationIds.push(callInfo2['conversationId']);
      const sdkevent = SdkEvent.FLASH;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).toHaveBeenNthCalledWith(1, { conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": true });
      expect(deviceHoldStatusChangedSpy).toHaveBeenNthCalledWith(2, { conversationId: callInfo2['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": false });
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(hpService.heldConversationIds.length).toBe(1);
      expect(mockSetCallState).toBeCalledWith(CallState.ACTIVE_AND_HELD);
    });

    it('will call deviceMuteChanged when getting a mute event', async () => {
      const deviceMutedEvent = eventValidation(hpService, 'deviceMuteStatusChanged');
      const deviceMuteChangedSpy = jest.spyOn(hpService, 'deviceMuteChanged');
      const sdkevent = SdkEvent.MUTE;
      hpService.activeConversationIds.push(callInfo['conversationId']);
      hpService.sdkEventHandler(sdkevent);
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "isMuted": true });
      expect(mockSetMuteState).toBeCalled();
      await deviceMutedEvent;
    });

    it('will call deviceMuteChanged when getting an umute event', async () => {
      const deviceMutedEvent = eventValidation(hpService, 'deviceMuteStatusChanged');
      const deviceMuteChangedSpy = jest.spyOn(hpService, 'deviceMuteChanged');
      const sdkevent = SdkEvent.UNMUTE;
      hpService.activeConversationIds.push(callInfo['conversationId']);
      hpService.sdkEventHandler(sdkevent);
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "isMuted": false });
      expect(mockSetMuteState).toBeCalled();
      await deviceMutedEvent;
    });
  });

  describe('sdkEventHandler in a multi call scenario', () => {
    const callInfo = { conversationId: 'convoId1' };
    const callInfo2 = { conversationId: 'convoId2' };

    it('will call deviceEndedCall with most recent call when 2 active', () => {
      const deviceEndedCallSpy = jest.spyOn(hpService, 'deviceEndedCall');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      hpService.activeConversationIds.push(callInfo2['conversationId']);
      const sdkevent = SdkEvent.TERMINATE;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceEndedCallSpy).toHaveBeenCalledWith({ conversationId: callInfo2['conversationId'], name: SdkEvent[sdkevent], code: sdkevent });
    });

    it('will call stop calling deviceEndedCall when no more active calls present', () => {
      const deviceEndedCallSpy = jest.spyOn(hpService, 'deviceEndedCall');
      hpService.activeConversationIds.push(callInfo['conversationId']);
      hpService.activeConversationIds.push(callInfo2['conversationId']);
      const sdkevent = SdkEvent.TERMINATE;
      hpService.sdkEventHandler(sdkevent);
      hpService.sdkEventHandler(sdkevent);
      hpService.sdkEventHandler(sdkevent);
      expect(deviceEndedCallSpy).toBeCalledTimes(2);
    });
  });

  describe('Headset Service API implementation', () => {
    const callInfo = { conversationId: 'convoId1' };

    beforeEach(() => {
      mockSetCallState.mockClear();
      mockSetMuteState.mockClear();
    });

    it('will inform the headset of an incoming call.', () => {
      hpService.incomingCall(callInfo);
      expect(hpService.incomingConversationId).toBe(callInfo['conversationId']);
      expect(mockSetCallState).toBeCalledWith(CallState.INCOMING);
    });

    it('will send the correct states for incoming call, answer then end for a single call.', async () => {
      await hpService.incomingCall(callInfo);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.INCOMING);
      expect(hpService.incomingConversationId).toBe(callInfo['conversationId']);

      await hpService.answerCall(callInfo['conversationId'], false);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.ACTIVE);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);

      await hpService.endCall(callInfo['conversationId']);
      expect(mockSetCallState).toHaveBeenNthCalledWith(3, CallState.IDLE);
      expect(hpService.activeConversationIds.length).toBe(0);
    });

    it('will send the correct states for auto answering an incoming call.', async () => {
      await hpService.answerCall(callInfo['conversationId'], true);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.INCOMING);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.ACTIVE);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);

      await hpService.endCall(callInfo['conversationId']);
      expect(mockSetCallState).toHaveBeenNthCalledWith(3, CallState.IDLE);
      expect(hpService.activeConversationIds.length).toBe(0);
    });

    it('will only set headset state correctly for an outgoing call.', async () => {
      await hpService.outgoingCall(callInfo);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.ACTIVE);
      expect(hpService.heldConversationIds.length).toBe(0);
    });

    it('will set headset state correctly based on hold requests.', async () => {

      await hpService.outgoingCall(callInfo);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.ACTIVE);
      expect(hpService.heldConversationIds.length).toBe(0);

      await hpService.setHold(callInfo['conversationId'], true);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.HELD);
      expect(hpService.activeConversationIds.length).toBe(0);
      expect(hpService.heldConversationIds.length).toBe(1);

      await hpService.setHold(callInfo['conversationId'], false);
      expect(mockSetCallState).toHaveBeenNthCalledWith(3, CallState.ACTIVE);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(hpService.heldConversationIds.length).toBe(0);

      await hpService.setHold(callInfo['conversationId'], false);
      expect(mockSetCallState).toHaveBeenNthCalledWith(4, CallState.ACTIVE);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(hpService.heldConversationIds.length).toBe(0);

      await hpService.endCall(callInfo['conversationId']);
      expect(mockSetCallState).toHaveBeenNthCalledWith(5, CallState.IDLE);
      expect(hpService.activeConversationIds.length).toBe(0);
    });

    it('will set headset state correctly for rejecting an incoming call.', async () => {
      hpService.incomingConversationId = callInfo['conversationId'];
      await hpService.rejectCall(callInfo['conversationId']);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(0);
      expect(mockSetCallState).toBeCalledWith(CallState.IDLE);
    });

    it('will set headset state correctly after ending all calls from an ACTIVE_AND_HELD state.', async () => {
      await hpService.outgoingCall(callInfo);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.ACTIVE);

      const callInfo2 = { conversationId: 'convoId2' };
      await hpService.setHold(callInfo2['conversationId'], true);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.ACTIVE_AND_HELD);
      expect(hpService.heldConversationIds.length).toBe(1);

      await hpService.endAllCalls();
      expect(hpService.activeConversationIds.length).toBe(0);
      expect(hpService.heldConversationIds.length).toBe(0);
      expect(mockSetCallState).toHaveBeenNthCalledWith(3, CallState.IDLE);
    });

    it('will set headset mute state correctly.', async () => {
      await hpService.outgoingCall(callInfo);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.ACTIVE);

      await hpService.setMute(true);
      expect(mockSetMuteState).toHaveBeenNthCalledWith(1, true);

      await hpService.setMute(false);
      expect(mockSetMuteState).toHaveBeenNthCalledWith(2, false);
    });

  });
});