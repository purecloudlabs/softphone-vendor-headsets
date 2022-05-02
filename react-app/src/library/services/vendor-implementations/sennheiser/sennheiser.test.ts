import SennheiserService from './sennheiser';
import { SennheiserPayload } from './sennheiser-payload';
import { SennheiserEvents } from './sennheiser-events';
import { SennheiserEventTypes } from './sennheiser-event-types';
import * as utils from '../../../utils';
import DeviceInfo from '../../../types/device-info';
import { mockWebSocket, mockLogger } from '../../../test-utils.test';
import { CallInfo } from '../../../types/call-info';

describe('SennheiserService', () => {
  let sennheiserService: SennheiserService;

  beforeEach(() => {
    sennheiserService = SennheiserService.getInstance({ logger: console, createNew: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('instantiation', () => {
    let sennheiserService: SennheiserService;

    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
    });

    it('should be a singleton', () => {
      const sennheiserService2 = SennheiserService.getInstance({ logger: console });

      expect(sennheiserService).not.toBeFalsy();
      expect(sennheiserService2).not.toBeFalsy();
      expect(sennheiserService).toBe(sennheiserService2);
    });

    it('should have a connectTimeout value of 5000', () => {
      expect(sennheiserService.connectTimeout).toBe(5000);
    });
  });

  describe('deviceName', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
    });
    it('should return null if deviceInfo is null', () => {
      sennheiserService.deviceInfo = null;
      const result = sennheiserService.deviceName;
      expect(result).toBeNull();
    });
    it('should return the name of the device if deviceInfo is not null', () => {
      const ProductName = 'fake device';
      sennheiserService.deviceInfo = { ProductName };
      const result = sennheiserService.deviceName;
      expect(result).toEqual(ProductName);
    });
  });

  describe('isDeviceAttached', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
    });
    it('should return true if deviceInfo is defined', () => {
      sennheiserService.deviceInfo = { ProductName: 'fakeDevice' };
      const result = sennheiserService.isDeviceAttached;
      expect(result).toBe(true);
    });
    it('should return false if deviceInfo is undefined or null', () => {
      sennheiserService.deviceInfo = null;
      expect(sennheiserService.isDeviceAttached).toBe(false);
      sennheiserService.deviceInfo = undefined;
      expect(sennheiserService.isDeviceAttached).toBe(false);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
    });
    it('should return true when the device label contains the string "sennheiser"', () => {
      let testLabel = 'sennheiser headset';
      let result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset SennHeiseR made';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of Sennheiser';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "sennheiser"', () => {
      let testLabel = 'standard headset';
      let result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset plantronics made';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
    it('should return true when the device label contains the string "senn"', () => {
      let testLabel = 'senn headset';
      let result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset SeNN made';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of Senn';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "senn"', () => {
      let testLabel = 'standard headset';
      let result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset plantronics made';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
    it('should return true when the device label contains the string "epos"', () => {
      let testLabel = 'EPOS headset';
      let result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset EpOs made';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of ePoS';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "epos"', () => {
      let testLabel = 'standard headset';
      let result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset plantronics made';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = sennheiserService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
      sennheiserService.logger = mockLogger;
    });
    it('should not call _sendMessage if the service is not connected', async () => {
      sennheiserService.isConnected = false;
      jest.spyOn(sennheiserService, '_sendMessage');

      await sennheiserService.disconnect();

      expect(sennheiserService._sendMessage).not.toHaveBeenCalled();
    });
    it('should call _sendMessage with the correct payload when the service is connected', async () => {
      sennheiserService.isConnected = true;
      jest.spyOn(sennheiserService, '_sendMessage');
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.TerminateConnection,
        EventType: SennheiserEventTypes.Request,
      };

      await sennheiserService.disconnect();

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('setMute', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
      sennheiserService.logger = mockLogger;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.MuteFromApp when the value argument is defined', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.MuteFromApp,
        EventType: SennheiserEventTypes.Request,
      };

      await sennheiserService.setMute(true);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
    it('should call _sendMessage with a payload using SennheiserEvents.UnmuteFromApp when the value argument is defined', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const value = null;
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.UnmuteFromApp,
        EventType: SennheiserEventTypes.Request,
      };

      await sennheiserService.setMute(value);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('setHold', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.Hold when the value argument is defined', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.Hold,
        EventType: SennheiserEventTypes.Request,
        CallID: conversationId
      };

      await sennheiserService.setHold(conversationId, true);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
    it('should call _sendMessage with a payload using SennheiserEvents.Resume when the value argument is defined', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const value = null;
      const conversationId = '23f897b';
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.Resume,
        EventType: SennheiserEventTypes.Request,
        CallID: conversationId
      };

      await sennheiserService.setHold(conversationId, value);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('incomingCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.IncomingCall and the generated callId', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const callInfo: CallInfo = {
        contactName: 'Ted Danson',
        conversationId: '23f897b'
      }

      // Run Test
      await sennheiserService.incomingCall(callInfo);

      // Get generated call mapping to create expected payload
      // const generatedCallId = sennheiserService.callMappings[callInfo.conversationId];
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.IncomingCall,
        EventType: SennheiserEventTypes.Request,
        CallID: callInfo.conversationId
      };

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('answerCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.CallEnded', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.IncomingCallAccepted,
        EventType: SennheiserEventTypes.Request,
        CallID: conversationId,
      };

      await sennheiserService.answerCall(conversationId);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('rejectCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.CallEnded', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.IncomingCallRejected,
        EventType: SennheiserEventTypes.Request,
        CallID: conversationId
      };

      await sennheiserService.rejectCall(conversationId);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('outgoingCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.OutgoingCall', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const callInfo: CallInfo = {
        contactName: 'Joe Fixit',
        conversationId: '23f897b'
      }

      // Run Test
      await sennheiserService.outgoingCall(callInfo);

      // Get generated call mapping to create expected payload
      // const generatedCallId = sennheiserService.callMappings[callInfo.conversationId];
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.OutgoingCall,
        EventType: SennheiserEventTypes.Request,
        CallID: callInfo.conversationId
      };

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('endCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocket = mockWebSocket;
    });
    it('should call _sendMessage with a payload using SennheiserEvents.CallEnded', async () => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.CallEnded,
        EventType: SennheiserEventTypes.Request,
        CallID: conversationId
      };

      await sennheiserService.endCall(conversationId);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('_handleMessage', () => {
    let message;

    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;

      jest.spyOn(sennheiserService, '_handleAck');
      jest.spyOn(sennheiserService, '_handleError');
      jest.spyOn(sennheiserService, '_registerSoftphone');
      sennheiserService._sendMessage = jest.fn();
      jest.spyOn(sennheiserService, 'deviceAnsweredCall');
      jest.spyOn(sennheiserService, 'deviceEndedCall');
      jest.spyOn(sennheiserService, 'deviceHoldStatusChanged');
      jest.spyOn(sennheiserService, 'deviceMuteChanged');
      jest.spyOn(sennheiserService, 'deviceRejectedCall');
    });

    it('should call _handleError() if there is a ReturnCode in the message', () => {
      message = { data: '{ "ReturnCode": 4 }' };
      sennheiserService._handleMessage(message);
      expect(sennheiserService._handleError).toHaveBeenCalledTimes(1);
    });

    it('should log an error if there is an error parsing the message', () => {
      message = { data: '{"fail : "asdf" }' };
      jest.spyOn(mockLogger, 'error');

      sennheiserService._handleMessage(message);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    describe(`event type: ${SennheiserEvents.SocketConnected}`, () => {
      it(`should call _registerSoftphone when the message event is '${SennheiserEvents.SocketConnected}'`, () => {
        message = { data: `{ "Event": "${SennheiserEvents.SocketConnected}" }` };
        sennheiserService._handleMessage(message);
        expect(sennheiserService._registerSoftphone).toHaveBeenCalledTimes(1);
      });
    });

    describe(`event type: ${SennheiserEvents.EstablishConnection}`, () => {
      it(`should call _sendMessage with the correct payload when the message event is '${SennheiserEvents.EstablishConnection}'`, () => {
        message = { data: `{ "Event": "${SennheiserEvents.EstablishConnection}" }` };
        const expectedPayload: SennheiserPayload = {
          Event: SennheiserEvents.SPLogin,
          EventType: SennheiserEventTypes.Request,
        };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._sendMessage).toHaveBeenCalledTimes(1);
        expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      });
    });

    describe(`event type: ${SennheiserEvents.SPLogin}`, () => {
      beforeEach(() => {
        message = { data: `{ "Event": "${SennheiserEvents.SPLogin}" }` };
      });

      it(`should call _sendMessage with the correct payload when the message event is '${SennheiserEvents.SPLogin}'`, () => {
        const expectedPayload: SennheiserPayload = {
          Event: SennheiserEvents.SystemInformation,
          EventType: SennheiserEventTypes.Request,
        };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._sendMessage).toHaveBeenCalledTimes(1);
        expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      });
      it('should set isConnecting to false', () => {
        sennheiserService.isConnecting = true;
        sennheiserService._handleMessage(message);
        expect(sennheiserService.isConnecting).toBe(false);
      });
      it('should set isConnected to true', () => {
        sennheiserService.isConnected = false;
        sennheiserService._handleMessage(message);
        expect(sennheiserService.isConnected).toBe(true);
      });
    });

    describe(`event type: ${SennheiserEvents.HeadsetConnected}`, () => {
      it('should set deviceInfo to the correct values if payload.HeadsetName is defined', () => {
        const name = 'Test Headset';
        const type = 'The kind that you wear on your head';
        message = {
          data: `{
            "Event": "${SennheiserEvents.HeadsetConnected}",
            "HeadsetName": "${name}",
            "HeadsetType": "${type}"
          }`,
        };
        sennheiserService.deviceInfo = null;
        const expectedDeviceInfo: DeviceInfo = {
          deviceName: name,
          headsetType: type,
        };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceInfo).toEqual(expectedDeviceInfo);
      });
      it('should not change deviceInfo if payload.HeadsetName is undefined', () => {
        message = { data: `{ "Event": "${SennheiserEvents.HeadsetConnected}" }` };
        const expectedDeviceInfo: DeviceInfo = {
          deviceName: 'Test Headset',
          headsetType: 'Test Headset Type',
        };
        sennheiserService.deviceInfo = expectedDeviceInfo;

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceInfo).toEqual(expectedDeviceInfo);
      });
    });

    describe(`event type: ${SennheiserEvents.HeadsetDisconnected}`, () => {
      it('should set deviceInfo to null if the HeadsetName on the payload is the same as the currently set deviceName', () => {
        const testDeviceName = 'Test Device';
        message = {
          data: `{
            "Event": "${SennheiserEvents.HeadsetDisconnected}",
            "HeadsetName": "${testDeviceName}"
          }`,
        };
        sennheiserService.deviceInfo = { ProductName: testDeviceName };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceInfo).toBeNull();
      });
      it('should NOT set deviceInfo to null if the HeadsetName on the payload is the different than the currently set deviceName', () => {
        const testDeviceName1 = 'Test Device 1';
        const testDeviceName2 = 'Test Device 2';
        message = {
          data: `{
            "Event": "${SennheiserEvents.HeadsetDisconnected}",
            "HeadsetName": "${testDeviceName2}"
          }`,
        };
        sennheiserService.deviceInfo = { ProductName: testDeviceName1 };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceInfo).not.toBeNull();
        expect(sennheiserService.deviceInfo.ProductName).toEqual(testDeviceName1);
      });
    });

    describe(`event type: ${SennheiserEvents.IncomingCallAccepted}`, () => {
      it(`should call deviceAnsweredCall() when the payload EventType is '${SennheiserEventTypes.Notification}'`, () => {
        message = {
          data: `{
            "Event": "${SennheiserEvents.IncomingCallAccepted}",
            "EventType": "${SennheiserEventTypes.Notification}"
          }`,
        };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceAnsweredCall).toHaveBeenCalledTimes(1);
      });
      it(`should NOT call deviceAnsweredCall() when the payload EventType is NOT '${SennheiserEventTypes.Notification}'`, () => {
        message = {
          data: `{
            "Event": "${SennheiserEvents.IncomingCallAccepted}",
            "EventType": "${SennheiserEventTypes.Ack}"
          }`,
        };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceAnsweredCall).not.toHaveBeenCalled();
      });
    });

    describe(`event type: ${SennheiserEvents.Hold}`, () => {
      it(`should call _handleAck with the payload if the event type is '${SennheiserEventTypes.Notification}'`, () => {
        const expectedPayload: SennheiserPayload = {
          Event: SennheiserEvents.Hold,
          EventType: SennheiserEventTypes.Ack,
        };
        message = { data: JSON.stringify(expectedPayload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._handleAck).toHaveBeenCalledWith(expectedPayload);
        expect(sennheiserService.deviceHoldStatusChanged).not.toHaveBeenCalled();
      });
      it(`should call deviceHoldStatusChanged(true) if the event type is NOT ${SennheiserEventTypes.Notification}`, () => {
        const expectedPayload: SennheiserPayload = {
          CallID: '23f897b',
          Event: SennheiserEvents.Hold,
          EventType: SennheiserEventTypes.Notification,
        };
        message = { data: JSON.stringify(expectedPayload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._handleAck).not.toHaveBeenCalled();
        expect(sennheiserService.deviceHoldStatusChanged).toHaveBeenCalledWith({ holdRequested: true, name: SennheiserEvents.Hold, conversationId: expectedPayload.CallID });
      });
    });

    describe(`event type: ${SennheiserEvents.Resume}`, () => {
      it(`should call _handleAck with the payload if the event type is '${SennheiserEventTypes.Ack}'`, () => {
        const expectedPayload: SennheiserPayload = {
          Event: SennheiserEvents.Resume,
          EventType: SennheiserEventTypes.Ack,
        };
        message = { data: JSON.stringify(expectedPayload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._handleAck).toHaveBeenCalledWith(expectedPayload);
        expect(sennheiserService.deviceHoldStatusChanged).not.toHaveBeenCalled();
      });
      it(`should call deviceHoldStatusChanged(false) if the event type is NOT ${SennheiserEventTypes.Notification}`, () => {
        const expectedPayload: SennheiserPayload = {
          CallID: '23f897b',
          Event: SennheiserEvents.Resume,
          EventType: SennheiserEventTypes.Notification,
        };
        message = { data: JSON.stringify(expectedPayload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._handleAck).not.toHaveBeenCalled();
        expect(sennheiserService.deviceHoldStatusChanged).toHaveBeenCalledWith({ holdRequested: false, name: SennheiserEvents.Resume, conversationId: expectedPayload.CallID });
      });
    });

    describe(`event type: ${SennheiserEvents.MuteFromHeadset}`, () => {
      it('should call deviceMuteChanged(true)', () => {
        message = { data: `{ "Event": "${SennheiserEvents.MuteFromHeadset}" }` };
        sennheiserService._handleMessage(message);
        expect(sennheiserService.deviceMuteChanged).toHaveBeenCalledWith({ isMuted: true, name: SennheiserEvents.MuteFromHeadset });
      });
    });

    describe(`event type: ${SennheiserEvents.UnmuteFromHeadset}`, () => {
      it('should call deviceMuteChanged(false)', () => {
        message = { data: `{ "Event": "${SennheiserEvents.UnmuteFromHeadset}" }` };
        sennheiserService._handleMessage(message);
        expect(sennheiserService.deviceMuteChanged).toHaveBeenCalledWith({ isMuted: false, name: SennheiserEvents.UnmuteFromHeadset });
      });
    });

    describe(`event type: ${SennheiserEvents.CallEnded}`, () => {
      it('should delete the call mappings for callId and conversationId', () => {
        const payload: SennheiserPayload = {
          CallID: '23f897b',
          Event: SennheiserEvents.CallEnded,
          EventType: SennheiserEventTypes.Notification,
        };
        message = { data: JSON.stringify(payload) };

        sennheiserService._handleMessage(message);
        expect(sennheiserService.deviceEndedCall).toHaveBeenCalledWith({ name: SennheiserEvents.CallEnded, conversationId: payload.CallID });
      });
      it(`should call deviceEndedCall() when the payload event type is '${SennheiserEventTypes.Notification}'`, () => {
        const payload: SennheiserPayload = {
          Event: SennheiserEvents.CallEnded,
          EventType: SennheiserEventTypes.Notification,
        };
        message = { data: JSON.stringify(payload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceEndedCall).toHaveBeenCalledTimes(1);
      });
      it(`should NOT call deviceEndedCall() when the payload event type is NOT '${SennheiserEventTypes.Notification}'`, () => {
        const payload: SennheiserPayload = {
          Event: SennheiserEvents.CallEnded,
          EventType: SennheiserEventTypes.Ack,
        };
        message = { data: JSON.stringify(payload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceEndedCall).not.toHaveBeenCalled();
      });
    });

    describe(`event type: ${SennheiserEvents.IncomingCallRejected}`, () => {
      it('should call deviceRejectedCall() with the relevant conversationID', () => {
        const conversationId = '12r3kh';
        const payload: SennheiserPayload = {
          CallID: conversationId,
          Event: SennheiserEvents.IncomingCallRejected,
        };
        message = { data: JSON.stringify(payload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService.deviceRejectedCall).toHaveBeenCalledWith({ name: payload.Event, conversationId: payload.CallID });
      });
    });

    describe(`event type: ${SennheiserEvents.TerminateConnection}`, () => {
      it('should close the websocket connection if the socket.ReadyState === 1, and set the websocket to null', () => {
        message = { data: `{ "Event": "${SennheiserEvents.TerminateConnection}" }` };
        mockWebSocket.readyState = 1;
        jest.spyOn(mockWebSocket, 'close');
        sennheiserService.websocket = mockWebSocket;

        sennheiserService._handleMessage(message);

        expect(sennheiserService.websocket).toBeNull();
        expect(mockWebSocket.close).toHaveBeenCalled();
      });
      it('should NOT call close() on the websocket if socket.ReadyState is !== 1', () => {
        message = { data: `{ "Event": "${SennheiserEvents.TerminateConnection}" }` };
        mockWebSocket.readyState = 2;
        jest.spyOn(mockWebSocket, 'close');
        sennheiserService.websocket = mockWebSocket;

        sennheiserService._handleMessage(message);

        expect(sennheiserService.websocket).toBeNull();
        expect(mockWebSocket.close).not.toHaveBeenCalled();
      });
    });

    describe('default case', () => {
      it(`should call _handleAck with the given payload when the event type is ${SennheiserEventTypes.Ack}`, () => {
        const payload = {
          Event: 'UnexpectedEvent',
          EventType: SennheiserEventTypes.Ack,
        };
        message = { data: JSON.stringify(payload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._handleAck).toHaveBeenCalledWith(payload);
      });
      it(`should call NOT _handleAck with the given payload when the event type is NOT ${SennheiserEventTypes.Ack}`, () => {
        const payload = {
          Event: 'UnexpectedEvent',
          EventType: SennheiserEventTypes.Notification,
        };
        message = { data: JSON.stringify(payload) };

        sennheiserService._handleMessage(message);

        expect(sennheiserService._handleAck).not.toHaveBeenCalled();
      });
    });
  });

  describe('endAllCalls', () => {
    it('should return a Promise<void>', () => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.logger = mockLogger;
      jest.spyOn(mockLogger, 'warn');

      sennheiserService.endAllCalls();

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('webSocketOnOpen', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
    });

    it('should set websocketConnected to true', () => {
      sennheiserService.websocketConnected = false;
      sennheiserService.webSocketOnOpen();
      expect(sennheiserService.websocketConnected).toBe(true);
    });
    it('should call logger to inform that the websocket is connected', () => {
      jest.spyOn(mockLogger, 'info');
      sennheiserService.webSocketOnOpen();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('webSocketOnClose', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance({ logger: console });
      sennheiserService.logger = mockLogger;
      sennheiserService.websocketConnected = true;
    });

    it('should set websocketConnected to false', () => {
      sennheiserService.webSocketOnClose({ code: 123, reason: 'something broke', wasClean: true });
      expect(sennheiserService.websocketConnected).toBe(false);
    });

    it('should log error for unclean close', () => {
      const spy = sennheiserService.logger.error = jest.fn();
      const err = { code: 123, reason: 'something broke', wasClean: false };
      sennheiserService.webSocketOnClose(err);
      expect(sennheiserService.websocketConnected).toBe(false);
      expect(spy).toHaveBeenCalledWith(err);
    });

    it('should log an error message when err.wasClean is false', () => {
      jest.spyOn(mockLogger, 'error');
      const err = { code: 123, reason: 'something broke', wasClean: true };

      sennheiserService.webSocketOnClose(err);

      expect(mockLogger.error).toHaveBeenCalled();
    });
    it('should set isConnecting to false', () => {
      sennheiserService.isConnecting = true;
      sennheiserService.webSocketOnClose({ code: 123, reason: 'something broke', wasClean: true });
      expect(sennheiserService.isConnecting).toBe(false);
    });
    it('should set isConnected to false', () => {
      sennheiserService.isConnected = true;
      sennheiserService.webSocketOnClose({ code: 123, reason: 'something broke', wasClean: true });
      expect(sennheiserService.isConnected).toBe(false);
    });
    it('should log an error if isConnected is false', () => {
      sennheiserService.isConnected = false;
      jest.spyOn(mockLogger, 'error');

      sennheiserService.webSocketOnClose({ code: 123, reason: 'something broke', wasClean: true });

      expect(mockLogger.error).toHaveBeenCalled();
    });
    it("should set errorCode to 'browser' when isConnected is false and the browser is Firefox", () => {
      sennheiserService.isConnected = false;
      sennheiserService.errorCode = null;
      jest.spyOn(utils, 'isFirefox').mockReturnValue(true);

      sennheiserService.webSocketOnClose({ code: 123, reason: 'something broke', wasClean: true });

      expect(sennheiserService.errorCode).toEqual('browser');
    });
    it('should set disableRetry to true when isConnected is false and the browser is Firefox', () => {
      sennheiserService.isConnected = false;
      sennheiserService.disableRetry = false;
      jest.spyOn(utils, 'isFirefox').mockReturnValue(true);

      sennheiserService.webSocketOnClose({ code: 123, reason: 'something broke', wasClean: true });

      expect(sennheiserService.disableRetry).toEqual(true);
    });
  });

  describe('connect', () => {
    it('should set isConnecting to true and isConnected to false', () => {
      sennheiserService.isConnecting = false;
      sennheiserService.isConnected = true;

      sennheiserService.connect();

      expect(sennheiserService.isConnected).toBe(false);
      expect(sennheiserService.isConnecting).toBe(true);
    });
    it('should set the socket opopen, onclose, and onmessage functions', () => {
      sennheiserService.websocket = null;
      sennheiserService.connect();
      expect(typeof sennheiserService.websocket.onopen).toBe('function');
      expect(typeof sennheiserService.websocket.onclose).toBe('function');
      expect(typeof sennheiserService.websocket.onmessage).toBe('function');
    });
    it('should set the service websocket', () => {
      sennheiserService.websocket = null;
      sennheiserService.connect();
      expect(sennheiserService.websocket).toBeTruthy();
    });
  });
});