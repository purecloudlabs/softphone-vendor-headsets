import SennheiserService from '../../../../src/services/vendor-implementations/sennheiser/sennheiser';
import { SennheiserPayload } from '../../../../src/services/vendor-implementations/sennheiser/sennheiser-payload';
import { SennheiserEvents } from '../../../../src/services/vendor-implementations/sennheiser/sennheiser-events';
import { SennheiserEventTypes } from '../../../../src/services/vendor-implementations/sennheiser/sennheiser-event-types';

const mockWebSocket = {
  send: () => {},
};

describe('SennheiserService', () => {
  let sennheiserService: SennheiserService;

  afterEach(() => {
    sennheiserService = null;
    jest.restoreAllMocks();
  });

  describe('instantiation', () => {
    let sennheiserService: SennheiserService;

    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
    });

    afterEach(() => {
      sennheiserService = null;
    });

    it('should be a singleton', () => {
      const sennheiserService2 = SennheiserService.getInstance();

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
      sennheiserService = SennheiserService.getInstance();
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
      sennheiserService = SennheiserService.getInstance();
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
      sennheiserService = SennheiserService.getInstance();
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
  });

  describe('disconnect', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should not call _sendMessage if the service is not connected', async done => {
      sennheiserService.isConnected = false;
      jest.spyOn(sennheiserService, '_sendMessage');

      await sennheiserService.disconnect();

      expect(sennheiserService._sendMessage).not.toHaveBeenCalled();
      done();
    });
    it('should call _sendMessage with the correct payload when the service is connected', async done => {
      sennheiserService.isConnected = true;
      jest.spyOn(sennheiserService, '_sendMessage');
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.TerminateConnection,
        EventType: SennheiserEventTypes.Request,
      };

      await sennheiserService.disconnect();

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
  });

  describe('setMute', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should call _sendMessage with a payload using SennheiserEvents.MuteFromApp when the value argument is defined', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const value = 'testValue';
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.MuteFromApp,
        EventType: SennheiserEventTypes.Request,
      };

      await sennheiserService.setMute(value);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
    it('should call _sendMessage with a payload using SennheiserEvents.UnmuteFromApp when the value argument is defined', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const value = null;
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.UnmuteFromApp,
        EventType: SennheiserEventTypes.Request,
      };

      await sennheiserService.setMute(value);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
  });

  describe('setHold', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should call _sendMessage with a payload using SennheiserEvents.Hold when the value argument is defined', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const value = 'testValue';
      const conversationId = '23f897b';
      sennheiserService.callMappings[conversationId] = 12345;
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.Hold,
        EventType: SennheiserEventTypes.Request,
        CallID: sennheiserService.callMappings[conversationId],
      };

      await sennheiserService.setHold(conversationId, value);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
    it('should call _sendMessage with a payload using SennheiserEvents.Resume when the value argument is defined', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const value = null;
      const conversationId = '23f897b';
      sennheiserService.callMappings[conversationId] = 12345;
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.Resume,
        EventType: SennheiserEventTypes.Request,
        CallID: sennheiserService.callMappings[conversationId],
      };

      await sennheiserService.setHold(conversationId, value);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
  });

  describe('incomingCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should call _sendMessage with a payload using SennheiserEvents.IncomingCall and the generated callId', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';

      // Run Test
      await sennheiserService.incomingCall({ conversationId });

      // Get generated call mapping to create expected payload
      const generatedCallId = sennheiserService.callMappings[conversationId];
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.IncomingCall,
        EventType: SennheiserEventTypes.Request,
        CallID: generatedCallId,
      };

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
  });

  describe('answerCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should call _sendMessage with a payload using SennheiserEvents.CallEnded', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';
      const CallID = 237894;
      sennheiserService.callMappings = {
        [conversationId]: CallID,
        [CallID]: conversationId,
      };
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.CallEnded,
        EventType: SennheiserEventTypes.Request,
        CallID: CallID,
      };

      await sennheiserService.endCall(conversationId);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
  });

  describe('outgoingCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should call _sendMessage with a payload using SennheiserEvents.OutgoingCall', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';

      // Run Test
      await sennheiserService.outgoingCall({ conversationId });

      // Get generated call mapping to create expected payload
      const generatedCallId = sennheiserService.callMappings[conversationId];
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.OutgoingCall,
        EventType: SennheiserEventTypes.Request,
        CallID: generatedCallId,
      };

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
  });

  describe('endCall', () => {
    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
      sennheiserService.websocket = mockWebSocket;
    });
    afterEach(() => {
      sennheiserService.callMappings = {};
    });
    it('should call _sendMessage with a payload using SennheiserEvents.CallEnded', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';
      const CallID = 237894;
      sennheiserService.callMappings = {
        [conversationId]: CallID,
        [CallID]: conversationId,
      };
      const expectedPayload: SennheiserPayload = {
        Event: SennheiserEvents.CallEnded,
        EventType: SennheiserEventTypes.Request,
        CallID: CallID,
      };

      await sennheiserService.endCall(conversationId);

      expect(sennheiserService._sendMessage).toHaveBeenCalledWith(expectedPayload);
      done();
    });
    it('should not call _sendMessage when there is no callId for the provided conversationId', async done => {
      jest.spyOn(sennheiserService, '_sendMessage');
      const conversationId = '23f897b';

      await sennheiserService.endCall(conversationId);

      expect(sennheiserService._sendMessage).not.toHaveBeenCalled();
      done();
    });
  });
});
