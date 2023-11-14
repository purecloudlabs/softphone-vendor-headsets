// import fetchJsonp from 'fetch-jsonp';
import "whatwg-fetch";
import responses from './plantronics-test-responses';
import 'regenerator-runtime';
import { BroadcastChannel } from "broadcast-channel";
import browserama from 'browserama';
import { mockLogger, eventValidation } from "../../../test-utils";
import DeviceInfo from "../../../types/device-info";
import PlantronicsService from "./plantronics";
import fetchJsonp from "fetch-jsonp";

jest.mock('broadcast-channel');
jest.mock('fetch-jsonp', () => jest.fn());

const mockPlantronicsHost = 'http://localhost:3000/plantronics';

const testDevice: DeviceInfo = {
  ProductName: 'testDevice1',
};

const originalFetchFunction = PlantronicsService.getInstance({ logger: console })._fetch;

function resetService (plantronicsService: PlantronicsService) {
  plantronicsService.apiHost = mockPlantronicsHost;
  plantronicsService.vendorName = 'Plantronics';
  plantronicsService.pluginName = 'genesys-cloud-headset-library';
  plantronicsService._deviceInfo = null;
  plantronicsService.activePollingInterval = 2000;
  plantronicsService.connectedDeviceInterval = 6000;
  plantronicsService.disconnectedDeviceInterval = 2000;
  plantronicsService.deviceIdRetryInterval = 2000;
  plantronicsService.isActive = false;
  plantronicsService.isConnected = false;
  plantronicsService.isConnecting = false;
  plantronicsService.disableEventPolling = false;
  plantronicsService.deviceStatusTimer = null;
}

function buildMockFetch (response, isOk) {
  return new Promise((resolve) => {
    resolve({
      ok: isOk,
      json: () => {
        return response;
      },
    });
  });
}

let callbackCount = 1;

describe('PlantronicsService', () => {
  let plantronicsService: PlantronicsService;

  beforeEach(() => {
    plantronicsService = PlantronicsService.getInstance({ logger: console, createNew: true });
    plantronicsService._fetch = (url: string) => {
      const fullUrl = `${url}&callback=${callbackCount++}`;

      return fetch(fullUrl, {
        method: 'get',
        headers: {
          "Content-Type": "application/json"
        }
      });
    };
  });

  describe('instantiation', () => {
    afterEach(() => {
      plantronicsService = null;
    });

    it('should be a singleton', () => {
      const plantronicsService2 = PlantronicsService.getInstance({ logger: console });

      expect(plantronicsService).not.toBeFalsy();
      expect(plantronicsService2).not.toBeFalsy();
      expect(plantronicsService).toBe(plantronicsService2);
    });
  });

  describe('deviceName', () => {
    it('should return the value of deviceInfo.ProductName', () => {
      plantronicsService._deviceInfo = testDevice;
      const result = plantronicsService.deviceName;
      expect(result).toEqual(testDevice.ProductName);
    });

    it('should return undefined if _deviceInfo is undefined', () => {
      plantronicsService._deviceInfo = undefined;
      const result = plantronicsService.deviceName;
      expect(result).toBeUndefined();
    });
  });

  describe('vendorName', () => {
    it('should return the expected name', () => {
      const expected = 'Plantronics';
      expect(plantronicsService.vendorName).toEqual(expected);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    beforeEach(() => {
      plantronicsService = PlantronicsService.getInstance({ logger: console });
      plantronicsService.logger = mockLogger;
    });

    it('should return true when the device label contains the string "plantronics"', () => {
      let testLabel = 'plantronics headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset PlanTroniCs made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of Plantronics';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });

    it('should return false when the device label does not contain the string "plantronics"', () => {
      let testLabel = 'standard headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });

    it('should return true when device label contains the string "plt"', () => {
      let testLabel = 'plt: a sandwich';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'test test PlT';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'test pLt test';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });

    it('should return false when device label does not contain the string "plt"', () => {
      const testLabel = 'standard headset';
      const result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });

    it('should return true when the device label contains the string "(047f:"', () => {
      let testLabel = '(047f: headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset (047f: made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of (047f:';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "(047f:"', () => {
      let testLabel = 'standard headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
  });

  describe('pollForCallEvents', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('will not call getCallEventsSpy if proper flags are not met', () => {
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const pollForCallEventsSpy = jest.spyOn(plantronicsService, 'pollForCallEvents');
      plantronicsService.pollForCallEvents();
      pollForCallEventsSpy.mockReset();
      expect(getCallEventsSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.activePollingInterval);
      expect(pollForCallEventsSpy).toHaveBeenCalled();
    });

    it('will call getCallEventsSpy if proper flags are met', () => {
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      plantronicsService.disableEventPolling = false;

      plantronicsService.pollForCallEvents();

      expect(getCallEventsSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.activePollingInterval);
    });
  });

  describe('pollForDeviceStatus', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('will not call getDeviceStatusSpy if proper flags are not met', () => {
      plantronicsService.isConnecting = true;
      const getDeviceStatusSpy = jest.spyOn(plantronicsService, 'getDeviceStatus');
      const pollForDeviceStatusSpy = jest.spyOn(plantronicsService, 'pollForDeviceStatus');
      jest.useFakeTimers();
      plantronicsService.pollForDeviceStatus();
      expect(getDeviceStatusSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.disconnectedDeviceInterval);
      expect(pollForDeviceStatusSpy).toHaveBeenCalled();
    });

    it('will call getDeviceStatusSpy if proper flags are met', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isConnecting = false;
      const getDeviceStatusSpy = jest.spyOn(plantronicsService, 'getDeviceStatus');
      const pollForDeviceStatusSpy = jest.spyOn(plantronicsService, 'pollForDeviceStatus');
      jest.useFakeTimers();
      plantronicsService.pollForDeviceStatus();
      expect(getDeviceStatusSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.disconnectedDeviceInterval);
      expect(pollForDeviceStatusSpy).toHaveBeenCalled();
    });

    it('will use connectedDeviceInterval if a device is attached', () => {
      plantronicsService.isConnected = true;
      plantronicsService.isConnecting = false;
      const getDeviceStatusSpy = jest.spyOn(plantronicsService, 'getDeviceStatus');
      const pollForDeviceStatusSpy = jest.spyOn(plantronicsService, 'pollForDeviceStatus');
      Object.defineProperty(plantronicsService, 'isDeviceAttached', { get: () => { return true; } });
      jest.useFakeTimers();
      plantronicsService.pollForDeviceStatus();
      expect(getDeviceStatusSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.connectedDeviceInterval);
      expect(pollForDeviceStatusSpy).toHaveBeenCalled();
      const timeoutSpy = jest.spyOn(window, 'setTimeout');
      plantronicsService.pollForDeviceStatus();
      expect(timeoutSpy).toHaveBeenCalledWith(expect.anything(), plantronicsService.connectedDeviceInterval);
      timeoutSpy.mockRestore();
    });
  });

  describe('callCorrespondingFunction', () => {
    it('will call deviceAnsweredCall', () => {
      const deviceAnsweredCallSpy = jest.spyOn(plantronicsService, 'deviceAnsweredCall');
      plantronicsService.callCorrespondingFunction({
        name: 'AcceptCall',
        code: '1',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceAnsweredCallSpy).toHaveBeenCalled();
    });
    it('will call deviceRejectedCall', () => {
      plantronicsService.incomingConversationId = 'convoId1234';
      const deviceRejectedCallSpy = jest.spyOn(plantronicsService, 'deviceRejectedCall');
      plantronicsService.callCorrespondingFunction({
        name: 'RejectCall',
        code: '23',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceRejectedCallSpy).toHaveBeenCalledWith({ conversationId: 'convoId1234', name: 'RejectCall' });
    });

    it('will call deviceEndedCall', () => {
      const deviceEndedCallSpy = jest.spyOn(plantronicsService, 'deviceEndedCall');
      plantronicsService.callCorrespondingFunction({
        name: 'TerminateCall',
        event: {
          CallId: {
            Id: '123456',
          }
        }
      } as any);
      expect(deviceEndedCallSpy).toHaveBeenCalled();
    });

    it('will call _checkIsActiveTask', () => {
      const _checkIsActiveTaskSpy = jest.spyOn(plantronicsService, '_checkIsActiveTask');
      plantronicsService.callCorrespondingFunction({
        name: 'CallEnded',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(_checkIsActiveTaskSpy).toHaveBeenCalled();
    });

    it('will call deviceMuteChanged with the proper flag', () => {
      plantronicsService.callMappings = { '123456': 'convo1234' };
      const deviceMuteChangedSpy = jest.spyOn(plantronicsService, 'deviceMuteChanged');
      plantronicsService.callCorrespondingFunction({
        name: 'Mute',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith({
        conversationId: 'convo1234',
        event: {
          CallId: {
            Id: '123456'
          },
        },
        isMuted: true,
        name: 'Mute'
      });

      plantronicsService.callCorrespondingFunction({
        name: 'Unmute',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith({
        conversationId: 'convo1234',
        event: {
          CallId: {
            Id: '123456'
          },
        },
        isMuted: false,
        name: 'Unmute'
      });
    });

    it('will call deviceHoldStatusChanged with the proper flag', () => {
      plantronicsService.callMappings = { '123456': 'convo1234' };
      const deviceHoldStatusChangedSpy = jest.spyOn(plantronicsService, 'deviceHoldStatusChanged');
      plantronicsService.callCorrespondingFunction({
        name: 'HoldCall',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({
        conversationId: 'convo1234',
        event: {
          CallId: {
            Id: '123456'
          },
        },
        holdRequested: true,
        name: 'HoldCall'
      });

      plantronicsService.callCorrespondingFunction({
        name: 'ResumeCall',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({
        conversationId: 'convo1234',
        event: {
          CallId: {
            Id: '123456'
          },
        },
        holdRequested: false,
        name: 'ResumeCall'
      });
    });

    it('calls deviceEventLogs when no valid event was passed in', () => {
      const deviceEventLogsSpy = jest.spyOn(plantronicsService, 'deviceEventLogs');
      plantronicsService.callCorrespondingFunction({
        name: 'Test',
        event: {
          CallId: {
            Id: '123456'
          }
        }
      } as any);
      expect(deviceEventLogsSpy).toHaveBeenCalled();
    });
  });

  describe('check various endpoint calls', () => {
    Object.defineProperty(window.navigator, 'hid', { get: () => ({
      getDevices: () => { return []; }
    }) });
    Object.defineProperty(window.navigator, 'locks', { get: () => ({}) });
    (window as any).BroadcastChannel = BroadcastChannel;

    it('connects properly with a clean state', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/Register')) {
          return buildMockFetch(responses.SessionManager.Register.default, true);
        }

        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(responses.SessionManager.IsActive.default, true);
        }

        if (url.includes('/UserPreference/SetDefaultSoftphone')) {
          return buildMockFetch(responses.UserPreference.SetDefaultSoftPhone.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        if (url.includes('/CallServices/CallManagerState')) {
          return buildMockFetch(responses.CallServices.CallManagerState.default, true);
        }

        return buildMockFetch({}, true);
      });
      await plantronicsService.connect();
      expect(plantronicsService.isConnected).toBeTruthy();
      expect(plantronicsService.isActive).toBeFalsy();
      expect(plantronicsService.isConnecting).toBeFalsy();
    }, 30000);

    it('builds an endpoint for incoming calls', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        return buildMockFetch({}, true);
      });

      let callInfo: any = { conversationId: 'convoId123', contactName: 'Dio Brando' };
      plantronicsService['_createCallMapping'] = jest.fn().mockReturnValue(12345678);
      const conversationIdString = `"Id":"${12345678}"`;
      const contactNameString = `"Name":"${callInfo.contactName}"`;
      const endpointParams = `?name=${plantronicsService.pluginName}&tones=Unknown&route=ToHeadset`;
      let completeEndpoint = endpointParams;
      completeEndpoint += `&callID={${encodeURI(conversationIdString)}}`;
      completeEndpoint += `&contact={${encodeURI(contactNameString)}}`;
      await plantronicsService.incomingCall(callInfo);
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/IncomingCall${completeEndpoint}`);
      resetService(plantronicsService);

      completeEndpoint = endpointParams;
      completeEndpoint += `&callID={${encodeURI(conversationIdString)}}`;
      callInfo = { conversationId: 'convoId123' };
      await plantronicsService.incomingCall(callInfo);
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/IncomingCall${completeEndpoint}`);
      resetService(plantronicsService);

      try {
        callInfo = { contactName: 'Dio Brando' };
        await plantronicsService.incomingCall(callInfo);
      } catch (err) {
        expect(plantronicsService.isActive).toBe(false);
        expect(err).toBeDefined();
      }
    });

    it('builds an endpoint for outgoing calls', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/OutgoingCall')) {
          return buildMockFetch(responses.CallServices.OutgoingCall.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        return buildMockFetch({}, true);
      });

      let callInfo: any = { conversationId: 'convoId123', contactName: 'Dio Brando' };
      plantronicsService['_createCallMapping'] = jest.fn().mockReturnValue(12345678);
      const conversationIdString = `"Id":"12345678"`;
      const contactNameString = `"Name":"${callInfo.contactName}"`;
      const endpointParams = `?name=${plantronicsService.pluginName}&tones=Unknown&route=ToHeadset`;
      let completeEndpoint = endpointParams;
      completeEndpoint += `&callID={${encodeURI(conversationIdString)}}`;
      completeEndpoint += `&contact={${encodeURI(contactNameString)}}`;
      await plantronicsService.outgoingCall({ ...callInfo });
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/OutgoingCall${completeEndpoint}`);
      resetService(plantronicsService);

      completeEndpoint = endpointParams;
      completeEndpoint += `&callID={${encodeURI(conversationIdString)}}`;
      callInfo = { conversationId: 'convoId123' };
      await plantronicsService.outgoingCall({ ...callInfo });
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/OutgoingCall${completeEndpoint}`);
      resetService(plantronicsService);

      try {
        callInfo = { contactName: 'Dio Brando' };
        await plantronicsService.outgoingCall({ ...callInfo });
      } catch (err) {
        expect(plantronicsService.isActive).toBe(false);
        expect(err).toBeDefined();
      }
    });

    it('builds an endpoint for answering a call', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/AnswerCall')) {
          return buildMockFetch(responses.CallServices.AnswerCall.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService.callMappings = {
        'convoId123': '12345678'
      };
      const conversationIdString = encodeURI(`"Id":"12345678"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += `&callID={${conversationIdString}}`;
      await plantronicsService.answerCall('convoId123');
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/AnswerCall${completeEndpoint}`);
    });

    it('builds an endpoint for answering a call, autoAnswer on', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/AnswerCall')) {
          return buildMockFetch(responses.CallServices.AnswerCall.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService['incomingCall'] = jest.fn();
      plantronicsService.callMappings = {
        'convoId123': '12345678'
      };
      const conversationIdString = encodeURI(`"Id":"12345678"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += `&callID={${conversationIdString}}`;
      await plantronicsService.answerCall('convoId123', true);
      expect(plantronicsService['incomingCall']).toHaveBeenCalled();
      expect(plantronicsService.callMappings['convoId123']).toBeDefined();
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/AnswerCall${completeEndpoint}`);
    });

    it('builds an endpoint for terminating a call', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const _checkIsActiveTaskSpy = jest.spyOn(plantronicsService, '_checkIsActiveTask');
      plantronicsService.isConnected = true;
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/TerminateCall')) {
          return buildMockFetch(responses.CallServices.TerminateCall.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        return buildMockFetch({}, true);
      });

      const conversationId = 'myConvoId12345';
      const callId = 555123;
      plantronicsService.callMappings = {
        [conversationId]: callId,
        [callId]: conversationId
      };

      const conversationIdString = encodeURI(`"Id":"${callId}"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += `&callID={${conversationIdString}}`;
      await plantronicsService.endCall(conversationId);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/TerminateCall${completeEndpoint}`);
      expect(getCallEventsSpy).toHaveBeenCalled();
      expect(_checkIsActiveTaskSpy).toHaveBeenCalled();
    });

    it('calls endCall an appropriate number of times for endAllCalls', async () => {
      const endCallSpy = jest.spyOn(plantronicsService, 'endCall');
      plantronicsService.isConnected = true;
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/CallManagerState')) {
          return buildMockFetch(responses.CallServices.CallManagerState.callsInProgress, true);
        }

        return buildMockFetch({}, true);
      });
      await plantronicsService.endAllCalls();
      expect(endCallSpy).toHaveBeenCalledTimes(2);
    });
    it('properly calls endCall in the case of call rejection', () => {
      plantronicsService.incomingConversationId = 'convoId1234';
      const plantronicsEndCallSpy = jest.spyOn(plantronicsService, 'endCall');
      plantronicsService.rejectCall('convoId1234');
      expect(plantronicsService.incomingConversationId).toBe(null);
      expect(plantronicsEndCallSpy).toHaveBeenCalledWith('convoId1234');
    });

    it('calls _makeRequestTask wth proper endpoint for mute', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/MuteCall')) {
          return buildMockFetch(responses.CallServices.MuteCall[url.includes('&muted=true') ? 'mute':'unmute'], true);
        }

        return buildMockFetch({}, true);
      });

      await plantronicsService.setMute(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/MuteCall?name=${plantronicsService.pluginName}&muted=${true}`);

      await plantronicsService.setMute(false);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/MuteCall?name=${plantronicsService.pluginName}&muted=${false}`);
    });

    it('calls _makeRequestTask with proper endpoint for hold', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/HoldCall')) {
          return buildMockFetch(responses.CallServices.HoldCall.default, true);
        }

        if (url.includes('/CallServices/ResumeCall')) {
          return buildMockFetch(responses.CallServices.ResumeCall.default, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService.callMappings = {
        "convoId123": '12345678'
      };
      const conversationIdString = encodeURI(`"Id":"12345678"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += `&callID={${conversationIdString}}`;
      await plantronicsService.setHold('convoId123', true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/HoldCall${completeEndpoint}`);

      await plantronicsService.setHold('convoId123', false);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/ResumeCall${completeEndpoint}`);
    });

    it('checkIsActiveTask', async () => {
      plantronicsService.isConnected = true;
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/CallManagerState')) {
          return buildMockFetch(responses.CallServices.CallManagerState.callsInProgress, true);
        }

        return buildMockFetch({}, true);
      });

      await plantronicsService._checkIsActiveTask();
      expect(plantronicsService.isActive).toBe(true);
    });

    it('catches the error during _getActiveCalls', async () => {
      plantronicsService.isConnected = true;
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/CallManagerState')) {
          return buildMockFetch(responses.CallServices.CallManagerState.errorState, true);
        }

        return buildMockFetch({}, true);
      });

      plantronicsService.logger.info = jest.fn();
      const result = await plantronicsService._getActiveCalls();
      expect(plantronicsService.logger.info).toHaveBeenCalledWith('Error making request for active calls', responses.CallServices.CallManagerState.errorState);
      expect(result).toStrictEqual([]);
    });

    it('catches the error during getDeviceStatus', async () => {
      plantronicsService.isConnected = true;
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService.logger.info = jest.fn();
      await plantronicsService.getDeviceStatus();
      expect(plantronicsService.logger.info).toHaveBeenCalledWith('Error making request for device status', responses.DeviceServices.Info.errorState);
    });

    it('should not set deviceInfo if err', async () => {
      jest.spyOn(plantronicsService, '_makeRequestTask').mockRejectedValue({ Err: {
        Description: 'no supported devices'
      } });

      try {
        await plantronicsService.getDeviceStatus();
      } catch (e) {
        expect(plantronicsService.deviceInfo).toBeFalsy();
      }
    });

    it('if noDeviceError is true, do not log', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.noDeviceErrorState, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService.logger.info = jest.fn();
      await plantronicsService.getDeviceStatus();
      expect(plantronicsService.logger.info).not.toHaveBeenCalledWith('Error making request for device status', responses.DeviceServices.Info.errorState);
    });
    it('handles scenarios for getCallEvents function', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
    });
  });
  describe('getCallEvents', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    it('should answer from headset', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.AnsweredCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }
        return buildMockFetch({}, true);
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      plantronicsService.getCallEvents();
      const deviceAnswered = eventValidation(plantronicsService, 'deviceAnsweredCall');
      await deviceAnswered;
    });
    it('should mute from headset', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.MuteCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      plantronicsService.getCallEvents();
      const deviceMuted = eventValidation(plantronicsService, 'deviceMuteStatusChanged');
      await deviceMuted;
    });
    it('should unmute from headset', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.UnmuteCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      plantronicsService.getCallEvents();

      const deviceUnmuted = eventValidation(plantronicsService, 'deviceMuteStatusChanged');
      await deviceUnmuted;
    });
    it('should hold from the headset', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.HoldCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      plantronicsService.getCallEvents();
      const deviceHeld = eventValidation(plantronicsService, 'deviceHoldStatusChanged');
      await deviceHeld;
    });
    it('should resume from the headset', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.ResumeCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      plantronicsService.getCallEvents();

      const deviceResumed = eventValidation(plantronicsService, 'deviceHoldStatusChanged');
      await deviceResumed;
    });

    it('should terminate the call from the headset', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.TerminateCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      plantronicsService.getCallEvents();
      const deviceTerminated = eventValidation(plantronicsService, 'deviceEndedCall');
      await deviceTerminated;
    });

    it('should log an error if something goes wrong during _makeRequestTask', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/CallServices/IncomingCall')) {
          return buildMockFetch(responses.CallServices.IncomingCall.default, true);
        }

        if (url.includes('/CallServices/CallEvents')) {
          return buildMockFetch(responses.CallServices.CallEvents.TerminateCall, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.errorState, true);
        }

        return buildMockFetch({}, true);
      });
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      PlantronicsService['instance'] = null;
      const loggerInfoSpy = jest.spyOn(plantronicsService.logger, 'info');
      await plantronicsService.getCallEvents();
      expect(loggerInfoSpy).toHaveBeenCalledWith('Error making request for call events', expect.any(Error));
    });

    it('should log a message if an unexpected event is received', async () => {
      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      const loggerInfoSpy = jest.spyOn(plantronicsService.logger, 'info');
      jest.spyOn(plantronicsService, '_makeRequestTask').mockResolvedValueOnce(responses.CallServices.CallManagerState.unknownEvent);
      await plantronicsService.getCallEvents();
      expect(loggerInfoSpy).toHaveBeenCalledWith('Unknown call event from headset', { event: responses.CallServices.CallManagerState.unknownEvent.Result[0] });
    });
  });

  describe('unregister function', () => {
    it('should not blow up if unregister fails', async () => {
      const logSpy = plantronicsService.logger.error = jest.fn();
      plantronicsService.isConnecting = true;
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/UnRegister')) {
          return buildMockFetch(responses.SessionManager.UnRegister.alreadyRegistered, false);
        }
      });

      await plantronicsService.unregisterPlugin();
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('connect function', () => {
    it('handles all scenarios appropriately for Register endpoint', async () => {
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/Register')) {
          return buildMockFetch(responses.SessionManager.Register.errorState, true);
        }
      });
      return expect(plantronicsService.connect()).rejects.toEqual(responses.SessionManager.Register.errorState);
    });

    it('handles all scenarios appropriately for isActive endpoint',  async () => {
      plantronicsService.logger.debug = jest.fn();
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/UnRegister')) {
          return buildMockFetch(responses.SessionManager.UnRegister.default, true);
        }

        if (url.includes('/SessionManager/Register')) {
          return buildMockFetch(responses.SessionManager.Register.default, true);
        }

        if(url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(responses.SessionManager.IsActive.errorState, true);
        }
      });

      try {
        await plantronicsService.connect();
      } catch (err) {
        expect(plantronicsService.logger.debug).toHaveBeenCalledWith('Is Active', responses.SessionManager.IsActive.errorState);
      }
    });

    it('handles all scenarios appropriately for getActiveCalls endpoint', async () => {
      plantronicsService.logger.info = jest.fn();
      plantronicsService.logger.warn = jest.fn();
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/UnRegister')) {
          return buildMockFetch(responses.SessionManager.UnRegister.default, true);
        }

        if (url.includes('/SessionManager/Register')) {
          return buildMockFetch(responses.SessionManager.Register.default, true);
        }

        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(responses.SessionManager.IsActive.default, true);
        }

        if (url.includes('/UserPreference/SetDefaultSoftphone')) {
          return buildMockFetch(responses.UserPreference.SetDefaultSoftPhone.default, true);
        }

        if (url.includes('/DeviceServices/Info')) {
          return buildMockFetch(responses.DeviceServices.Info.default, true);
        }

        if (url.includes('/CallServices/CallManagerState')) {
          return buildMockFetch(responses.CallServices.CallManagerState.callsInProgress, true);
        }

        return buildMockFetch({}, true);
      });
      await plantronicsService.connect();
      expect(plantronicsService.isActive).toBe(true);
      expect(plantronicsService.logger.warn).toHaveBeenCalledWith('Plantronics headset should be in vanilla state but is reporting active call state.');
    });

    it('logs an error message if we are unable to connect the headset', async () => {
      const errorLoggerSpy = jest.spyOn(plantronicsService.logger, 'error');
      const testIsActiveEvent = {
        Description: 'Is Active',
        Result: true,
        Type: 2,
        Type_Name: 'Bool',
        isError: false
      };
      jest.spyOn(plantronicsService, '_makeRequestTask')
        .mockResolvedValueOnce(responses.SessionManager.Register.default)
        .mockResolvedValueOnce(testIsActiveEvent)
        .mockRejectedValueOnce({ handled: true });
      await plantronicsService.connect();
      expect(errorLoggerSpy).toHaveBeenCalledWith('Unable to properly connect headset');
    });

    it('returns empty array if makeRequestTask resolves to undefined', async () => {
      jest.spyOn(plantronicsService, '_makeRequestTask').mockResolvedValueOnce(undefined);
      const getActiveCallsResult = await plantronicsService._getActiveCalls();
      expect(getActiveCallsResult).toStrictEqual([]);
    });
  });

  describe('_makeRequest function', () => {
    beforeEach(() => {
      Object.defineProperty(browserama, 'isFirefox', { get: () => true });
    });

    it('should bail out if not connected and not connecting', async () => {
      plantronicsService.isConnected = false;
      plantronicsService.isActive = true;
      const disconnectSpy = jest.spyOn(plantronicsService, 'disconnect');
      plantronicsService.logger.info = jest.fn();
      const isActiveResponseWithStatus = {
        ...responses.SessionManager.IsActive.default,
        status: 404,
        'Type_Name': 'Error'
      };

      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(isActiveResponseWithStatus, true);
        }
      });

      try {
        await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, true);
      } catch (err) {
        expect(plantronicsService.isConnected).toBe(false);
        expect(disconnectSpy).not.toHaveBeenCalled();
        expect(plantronicsService.logger.info).toHaveBeenCalledWith(err);
      }
    });

    it('handles error from endpoint with 404 status and isRetry', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      const disconnectSpy = jest.spyOn(plantronicsService, 'disconnect');
      plantronicsService.logger.info = jest.fn();
      const isActiveResponseWithStatus = {
        ...responses.SessionManager.IsActive.default,
        status: 404,
        'Type_Name': 'Error'
      };

      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(isActiveResponseWithStatus, true);
        }
      });

      try {
        await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, true);
      } catch (err) {
        expect(plantronicsService.isConnected).toBe(false);
        expect(disconnectSpy).toHaveBeenCalled();
        expect(plantronicsService.logger.info).toHaveBeenCalledWith(err);
      }
    });

    it('handles error from endpoint with 404 status and !isRetry', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      const isActiveResponseWithStatus = {
        ...responses.SessionManager.IsActive.default,
        status: 404,
        'Type_Name': 'Error'
      };

      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(isActiveResponseWithStatus, true);
        }
      });

      try {
        await plantronicsService._makeRequestTask(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`);
      } catch (err) {
        expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, true);
      }
    });

    it('handles browersama.isFirefox true error case', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      const isActiveResponseWithStatus = {
        ...responses.SessionManager.IsActive.default,
        status: 418,
        'Type_Name': 'Error'
      };

      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(isActiveResponseWithStatus, true);
        }
      });

      try {
        await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, false);
      } catch (err) {
        expect(plantronicsService.errorCode).toBe('browser');
        expect(plantronicsService.disableRetry).toBe(true);
      }
    });

    it('handles successful return but no plantronics instance', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      PlantronicsService['instance'] = null;

      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/IsActive')) {
          return buildMockFetch(responses.SessionManager.IsActive.default, true);
        }
      });

      const noInstanceError = new Error('Application destroyed.');
      try {
        await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, false);
      } catch (err) {
        expect(err).toStrictEqual(noInstanceError);
      }
    });
  });

  describe('disconnect function', () => {
    it('calls makeRequestTask if the implementation is connected', async () => {
      plantronicsService.isConnected = true;
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask').mockResolvedValue(null);
      await plantronicsService.disconnect();
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/SessionManager/UnRegister?name=${plantronicsService.pluginName}`);
    });

    it('sets the flags to the proper values after promise resolution', async () => {
      plantronicsService.isConnected = true;
      const clearTimeoutsSpy = jest.spyOn(plantronicsService, 'clearTimeouts');
      jest.spyOn(plantronicsService, '_fetch').mockImplementation((url): Promise<any> => {
        if (url.includes('/SessionManager/UnRegister')) {
          return buildMockFetch(responses.SessionManager.UnRegister.default, true);
        }
      });
      await plantronicsService.disconnect();
      expect(plantronicsService.isConnected).toBe(false);
      expect(plantronicsService._deviceInfo).toBeNull();
      expect(clearTimeoutsSpy).toHaveBeenCalled();
      expect(plantronicsService.isActive).toBe(false);
    });
  });

  describe('_fetch', () => {
    it('should call the fetchJsonp function with the proper URL', () => {
      plantronicsService._fetch = originalFetchFunction;
      console.log(plantronicsService._fetch('/test'));
      plantronicsService._fetch('/test');
      expect(fetchJsonp).toHaveBeenCalledWith('/test');
    });
  });

  describe('_createCallMapping', () => {
    it('should populate the callMappings value in the service', () => {
      const returnedValue = plantronicsService['_createCallMapping']('convoId123');
      expect(plantronicsService.callMappings).toStrictEqual({
        [returnedValue]: 'convoId123',
        'convoId123': returnedValue
      });
    });
  });

  describe('resetHeadsetStateForCall', () => {
    it('should call the rejectCall function', () => {
      const rejectSpy = jest.spyOn(plantronicsService, 'rejectCall');
      plantronicsService.resetHeadsetStateForCall('test123');
      expect(rejectSpy).toHaveBeenCalledWith('test123');
    });
  });
});