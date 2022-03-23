// import fetchJsonp from 'fetch-jsonp';
import "whatwg-fetch";
import responses from './plantronics-test-responses';
import 'regenerator-runtime';
import { BroadcastChannel } from "broadcast-channel";
import browserama from 'browserama';
import { mockLogger, eventValidation } from "../../../test-utils.test";
import DeviceInfo from "../../../types/device-info";
import PlantronicsService from "./plantronics";
import { PlantronicsCallEvents } from "./plantronics-call-events";
import fetchJsonp from "fetch-jsonp";

jest.mock('broadcast-channel');
jest.mock('fetch-jsonp', () => jest.fn());

const mockPlantronicsHost = 'http://localhost:3000/plantronics';

const testDevice: DeviceInfo = {
  ProductName: 'testDevice1',
};

const originalFetchFunction = PlantronicsService.getInstance({ logger: console })._fetch;

function resetService(plantronicsService: PlantronicsService) {
  plantronicsService.apiHost = mockPlantronicsHost
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

const sendScenario = function (scenario) {
  return fetch(`${mockPlantronicsHost}/scenario`, {
    method: 'post',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(scenario),
    mode: 'cors'
  })
}

const queueCallEvents = function (scenario) {
  return fetch(`${mockPlantronicsHost}/callEvents`, {
    method: 'PUT',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(scenario),
    mode: 'cors'
  })
}

let callbackCount = 1;

describe('PlantronicsService', () => {
  let plantronicsService: PlantronicsService;
  beforeEach(() => {
    plantronicsService = PlantronicsService.getInstance({ logger: console });
    plantronicsService._fetch = (url: string) => {
      const fullUrl = `${url}&callback=${callbackCount++}`;

      return fetch(fullUrl, {
        method: 'get',
        headers: {
          "Content-Type": "application/json"
        }
      });
    };
    resetService(plantronicsService);
  });

  afterAll(() => {
    resetService(plantronicsService);
  })

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
    })
  });

  describe('apiHost', () => {
    it('should return the expected value', () => {
      expect(plantronicsService.apiHost).toEqual(mockPlantronicsHost);
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
    })
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
    })
    it('will not call getCallEventsSpy if proper flags are not met', () => {
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const pollForCallEventsSpy = jest.spyOn(plantronicsService, 'pollForCallEvents');
      jest.useFakeTimers();
      plantronicsService.pollForCallEvents();
      expect(getCallEventsSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.activePollingInterval);
      expect(pollForCallEventsSpy).toHaveBeenCalled();
    })
    it('will call getCallEventsSpy if proper flags are met', () => {
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const pollForCallEventsSpy = jest.spyOn(plantronicsService, 'pollForCallEvents');
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      plantronicsService.disableEventPolling = false;

      jest.useFakeTimers();
      plantronicsService.pollForCallEvents();

      expect(getCallEventsSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.activePollingInterval);
      expect(pollForCallEventsSpy).toHaveBeenCalled();
    });
  });

  describe('pollForDeviceStatus', () => {
    afterEach(() => {
      jest.useRealTimers();
    })
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
    })
  });

  describe('callCorrespondingFunction', () => {
    it('will call deviceAnsweredCall', () => {
      const deviceAnsweredCallSpy = jest.spyOn(plantronicsService, 'deviceAnsweredCall');
      plantronicsService.callCorrespondingFunction({
        name: 'AcceptCall',
        code: '1',
        event: {}
      });
      expect(deviceAnsweredCallSpy).toHaveBeenCalled();
    });
    it('will call deviceRejectedCall', () => {
      plantronicsService.incomingConversationId = 'convoId1234';
      const deviceRejectedCallSpy = jest.spyOn(plantronicsService, 'deviceRejectedCall');
      plantronicsService.callCorrespondingFunction({
        name: 'RejectCall',
        code: '23',
        event: {}
      });
      expect(deviceRejectedCallSpy).toHaveBeenCalledWith('convoId1234');
    })
    it('will call deviceEndedCall', () => {
      const deviceEndedCallSpy = jest.spyOn(plantronicsService, 'deviceEndedCall');
      plantronicsService.callCorrespondingFunction({
        name: 'TerminateCall'
      });
      expect(deviceEndedCallSpy).toHaveBeenCalled();
    });
    it('will call _checkIsActiveTask', () => {
      const _checkIsActiveTaskSpy = jest.spyOn(plantronicsService, '_checkIsActiveTask');
      plantronicsService.callCorrespondingFunction({
        name: 'CallEnded'
      });
      expect(_checkIsActiveTaskSpy).toHaveBeenCalled();
    })
    it('will call deviceMuteChanged with the proper flag', () => {
      const deviceMuteChangedSpy = jest.spyOn(plantronicsService, 'deviceMuteChanged');
      plantronicsService.callCorrespondingFunction({
        name: 'Mute'
      });
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith(true, {name: 'Mute'});

      plantronicsService.callCorrespondingFunction({
        name: 'Unmute'
      });
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith(false, {name: 'Unmute'});
    });
    it('will call deviceHoldStatusChanged with the proper flag', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(plantronicsService, 'deviceHoldStatusChanged');
      plantronicsService.callCorrespondingFunction({
        name: 'HoldCall'
      });
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(true, {name: 'HoldCall'});

      plantronicsService.callCorrespondingFunction({
        name: 'ResumeCall'
      });
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(false, {name: 'ResumeCall'});
    });

    it('calls deviceEventLogs when no valid event was passed in', () => {
      const deviceEventLogsSpy = jest.spyOn(plantronicsService, 'deviceEventLogs');
      plantronicsService.callCorrespondingFunction({
        name: 'Test'
      });
      expect(deviceEventLogsSpy).toHaveBeenCalled();
    })
  });

  describe('check various endpoint calls', () => {
    Object.defineProperty(window.navigator, 'hid', { get: () => ({
      getDevices: () => { return [] }
    })});
    Object.defineProperty(window.navigator, 'locks', { get: () => ({})});
    (window as any).BroadcastChannel = BroadcastChannel;
    it('connects properly with a clean state', async () => {
      await sendScenario({
        '/SessionManager/Register*': {
          responses: [responses.SessionManager.Register.default]
        },
        '/SessionManager/IsActive*': {
          responses: [responses.SessionManager.IsActive.default]
        },
        '/UserPreference/SetDefaultSoftPhone*': {
          responses: [responses.UserPreference.SetDefaultSoftPhone.default]
        },
        '/DeviceServices/Info*': {
          responses: [responses.DeviceServices.Info.default]
        },
        '/CallServices/CallManagerState*' : {
          responses: [responses.CallServices.CallManagerState.default]
        }
      })
      await plantronicsService.connect();
      expect(plantronicsService.isConnected).toBeTruthy();
      expect(plantronicsService.isActive).toBeFalsy();
      expect(plantronicsService.isConnecting).toBeFalsy();
    }, 30000);
    it('builds an endpoint for incoming calls', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      await sendScenario({
        '/CallServices/IncomingCall*': {
          responses: [responses.CallServices.IncomingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      let callInfo: any = {conversationId: 'convoId123', contactName: 'Dio Brando'};
      const conversationIdString = `"Id":"${callInfo.conversationId}"`;
      const contactNameString = `"Name":"${callInfo.contactName}"`;
      const endpointParams = `?name=${plantronicsService.pluginName}&tones=Unknown&route=ToHeadset`;
      let completeEndpoint = endpointParams;
      completeEndpoint += encodeURI(`&callID={${encodeURI(conversationIdString)}}`);
      completeEndpoint += encodeURI(`&contact={${encodeURI(contactNameString)}}`);
      await plantronicsService.incomingCall(callInfo)
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/IncomingCall${completeEndpoint}`);
      resetService(plantronicsService);

      completeEndpoint = endpointParams;
      completeEndpoint += encodeURI(`&callID={${encodeURI(conversationIdString)}}`);
      callInfo = {conversationId: 'convoId123'};
      await plantronicsService.incomingCall(callInfo);
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/IncomingCall${completeEndpoint}`);
      resetService(plantronicsService);

      try {
        callInfo = {contactName: 'Dio Brando'}
        await plantronicsService.incomingCall(callInfo);
      } catch (err) {
        expect(plantronicsService.isActive).toBe(false);
        expect(err).toBeDefined();
      }
    });
    it('builds an endpoint for outgoing calls', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      await sendScenario({
        '/CallServices/OutgoingCall*': {
          responses: [responses.CallServices.OutgoingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      let callInfo: any = {conversationId: 'convoId123', contactName: 'Dio Brando'};
      const conversationIdString = `"Id":"${callInfo.conversationId}"`;
      const contactNameString = `"Name":"${callInfo.contactName}"`;
      const endpointParams = `?name=${plantronicsService.pluginName}&tones=Unknown&route=ToHeadset`;
      let completeEndpoint = endpointParams;
      completeEndpoint += encodeURI(`&callID={${encodeURI(conversationIdString)}}`);
      completeEndpoint += encodeURI(`&contact={${encodeURI(contactNameString)}}`);
      await plantronicsService.outgoingCall({...callInfo})
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/OutgoingCall${completeEndpoint}`);
      resetService(plantronicsService);

      completeEndpoint = endpointParams;
      completeEndpoint += encodeURI(`&callID={${encodeURI(conversationIdString)}}`);
      callInfo = {conversationId: 'convoId123'};
      await plantronicsService.outgoingCall({ ...callInfo });
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/OutgoingCall${completeEndpoint}`);
      resetService(plantronicsService);

      try {
        callInfo = {contactName: 'Dio Brando'}
        await plantronicsService.outgoingCall({ ...callInfo });
      } catch (err) {
        expect(plantronicsService.isActive).toBe(false);
        expect(err).toBeDefined();
      }
    });
    it('builds an endpoint for answering a call', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      await sendScenario({
        '/CallServices/AnswerCall*': {
          responses: [responses.CallServices.AnswerCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });
      const conversationIdString = encodeURI(`"Id":"convoId123"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += encodeURI(`&callID={${conversationIdString}}`);
      await plantronicsService.answerCall('convoId123');
      expect(plantronicsService.isActive).toBe(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/AnswerCall${completeEndpoint}`);
    });
    it('builds an endpoint for terminating a call', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const _checkIsActiveTaskSpy = jest.spyOn(plantronicsService, '_checkIsActiveTask');
      await sendScenario({
        '/CallServices/TerminateCall*': {
          responses: [responses.CallServices.TerminateCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      const conversationIdString = encodeURI(`"Id":"convoId123"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += encodeURI(`&callID={${conversationIdString}}`);
      await plantronicsService.endCall('convoId123');
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/TerminateCall${completeEndpoint}`);
      expect(getCallEventsSpy).toHaveBeenCalled();
      expect(_checkIsActiveTaskSpy).toHaveBeenCalled();
    });
    it('calls endCall an appropriate number of times for endAllCalls', async () => {
      const endCallSpy = jest.spyOn(plantronicsService, 'endCall');
      await sendScenario({
        '/CallServices/CallManagerState*' : {
          responses: [responses.CallServices.CallManagerState.callsInProgress]
        }
      });
      await plantronicsService.endAllCalls();
      expect(endCallSpy).toHaveBeenCalledTimes(2);
    });
    it('properly calls endCall in the case of call rejection', () => {
      plantronicsService.incomingConversationId = 'convoId1234';
      const plantronicsEndCallSpy = jest.spyOn(plantronicsService, 'endCall');
      plantronicsService.rejectCall('convoId1234');
      expect(plantronicsService.incomingConversationId).toBe('');
      expect(plantronicsEndCallSpy).toHaveBeenCalledWith('convoId1234');
    });
    it('calls _makeRequestTask wth proper endpoint for mute', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      await sendScenario({
        '/CallServices/MuteCall*': {
          responses: [responses.CallServices.MuteCall.mute, responses.CallServices.MuteCall.unmute]
        }
      });
      await plantronicsService.setMute(true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/MuteCall?name=${plantronicsService.pluginName}&muted=${true}`);

      await plantronicsService.setMute(false);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/MuteCall?name=${plantronicsService.pluginName}&muted=${false}`);
    });
    it('calls _makeRequestTask with proper endpoint for hold', async () => {
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask')
      await sendScenario({
        '/CallServices/HoldCall*': {
          responses: [responses.CallServices.HoldCall.default]
        },
        '/CallServices/ResumeCall*': {
          responses: [responses.CallServices.ResumeCall.default]
        }
      });
      const conversationIdString = encodeURI(`"Id":"convoId123"`);
      let completeEndpoint = `?name=${plantronicsService.pluginName}`;
      completeEndpoint += encodeURI(`&callID={${conversationIdString}}`);
      await plantronicsService.setHold('convoId123', true);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/HoldCall${completeEndpoint}`);

      await plantronicsService.setHold('convoId123', false);
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/CallServices/ResumeCall${completeEndpoint}`);
    });
    it('checkIsActiveTask', async () => {
      await sendScenario({
        '/CallServices/CallManagerState*': {
          responses: [responses.CallServices.CallManagerState.callsInProgress]
        }
      });
      await plantronicsService._checkIsActiveTask();
      expect(plantronicsService.isActive).toBe(true);
    });
    it('catches the error during _getActiveCalls', async () => {
      await sendScenario({
        '/CallServices/CallManagerState*': {
          responses: [responses.CallServices.CallManagerState.errorState]
        }
      });
      plantronicsService.logger.info = jest.fn();
      const result = await plantronicsService._getActiveCalls();
      expect(plantronicsService.logger.info).toHaveBeenCalledWith('Error making request for active calls', responses.CallServices.CallManagerState.errorState);
      expect(result).toStrictEqual([]);
    });
    it('catches the error during getDeviceStatus', async () => {
      await sendScenario({
        '/DeviceServices/Info*': {
          responses: [responses.DeviceServices.Info.errorState]
        }
      });
      plantronicsService.logger.info = jest.fn();
      await plantronicsService.getDeviceStatus();
      expect(plantronicsService.logger.info).toHaveBeenCalledWith('Error making request for device status', responses.DeviceServices.Info.errorState);
    });
    it('handles scenarios for getCallEvents function', async () => {
      await sendScenario({
        '/CallServices/IncomingCall*': {
          responses: [responses.CallServices.IncomingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      await queueCallEvents([PlantronicsCallEvents.AcceptCall, PlantronicsCallEvents.CallInProgress]);
    })
  });
  describe('getCallEvents', () => {
    it('should answer from headset', async () => {
      await sendScenario({
        '/CallServices/IncomingCall*': {
          responses: [responses.CallServices.IncomingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      const deviceAnswered = eventValidation(plantronicsService, 'deviceAnsweredCall');
      await queueCallEvents([PlantronicsCallEvents.AcceptCall, PlantronicsCallEvents.CallInProgress]);
      await deviceAnswered;
    });
    it('should mute and unmute from headset', async () => {
      await sendScenario({
        '/CallServices/IncomingCall*': {
          responses: [responses.CallServices.IncomingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      const deviceMuted = eventValidation(plantronicsService, 'deviceMuteChanged');
      await queueCallEvents([PlantronicsCallEvents.Mute]);
      await deviceMuted;

      const deviceUnmuted = eventValidation(plantronicsService, 'deviceMuteChanged');
      await queueCallEvents([PlantronicsCallEvents.Unmute]);
      await deviceUnmuted;
    });
    it('should hold and resume from the headset', async () => {
      await sendScenario({
        '/CallServices/IncomingCall*': {
          responses: [responses.CallServices.IncomingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });

      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      const deviceHeld = eventValidation(plantronicsService, 'deviceHoldStatusChanged');
      await queueCallEvents([PlantronicsCallEvents.HoldCall]);
      await deviceHeld;

      const deviceResumed = eventValidation(plantronicsService, 'deviceHoldStatusChanged');
      await queueCallEvents([PlantronicsCallEvents.ResumeCall]);
      await deviceResumed;
    });
    it('should terminate the call from the headset', async () => {
      await sendScenario({
        '/CallServices/IncomingCall*': {
          responses: [responses.CallServices.IncomingCall.default]
        },
        '/DeviceServices/Info*': {
          repeatResponse: responses.DeviceServices.Info.default
        }
      });
      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      const deviceTerminated = eventValidation(plantronicsService, 'deviceEndedCall');
      await queueCallEvents([PlantronicsCallEvents.TerminateCall]);
      await deviceTerminated;
    });
    it('should log an error if something goes wrong during _makeRequestTask', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      PlantronicsService['instance'] = null;
      const loggerInfoSpy = jest.spyOn(plantronicsService.logger, 'info');
      try {
        plantronicsService.getCallEvents();
      } catch (err) {
        expect(loggerInfoSpy).toHaveBeenCalledWith('Error making request for all events', err);
      }
    })
    it('should log a message if an unexpected event is received', async () => {
      plantronicsService.isActive = true;
      plantronicsService.isConnected = true;
      const loggerInfoSpy = jest.spyOn(plantronicsService.logger, 'info');
      jest.spyOn(plantronicsService, '_makeRequestTask').mockResolvedValueOnce(responses.CallServices.CallManagerState.unknownEvent)
      await plantronicsService.getCallEvents();
      expect(loggerInfoSpy).toHaveBeenCalledWith('Unknown call event from headset', { event: responses.CallServices.CallManagerState.unknownEvent.Result[0] });
    })
  });
  describe('connect function', () => {
    it('handles all scenarios appropriately for Register endpoint', async () => {
      await sendScenario({
        '/SessionManager/Register*': {
          responses: [responses.SessionManager.Register.errorState]
        }
      });
      return expect(plantronicsService.connect()).rejects.toEqual(responses.SessionManager.Register.errorState)
    });
    it('handles all scenarios appropriately for isActive endpoint',  async () => {
      plantronicsService.logger.debug = jest.fn();
      await sendScenario({
        '/SessionManager/Register*': {
          responses: [responses.SessionManager.Register.default]
        },
        '/SessionManager/IsActive*': {
          responses: [responses.SessionManager.IsActive.errorState]
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
      await sendScenario({
        '/SessionManager/Register*': {
          responses: [responses.SessionManager.Register.default]
        },
        '/SessionManager/IsActive*': {
          responses: [responses.SessionManager.IsActive.default]
        },
        '/UserPreference/SetDefaultSoftPhone*': {
          responses: [responses.UserPreference.SetDefaultSoftPhone.default]
        },
        '/DeviceServices/Info*': {
          responses: [responses.DeviceServices.Info.default]
        },
        '/CallServices/CallManagerState*' : {
          responses: [responses.CallServices.CallManagerState.callsInProgress]
        }
      });
      await plantronicsService.connect();
      expect(plantronicsService.isActive).toBe(true);
      expect(plantronicsService.logger.info).toHaveBeenCalledWith('Currently active calls in the session');
    });
    it('logs an error message if we are unable to connect the headset', async () => {
      const errorLoggerSpy = jest.spyOn(plantronicsService.logger, 'error');
      const testIsActiveEvent = {
        Description: 'Is Active',
        Result: true,
        Type: 2,
        Type_Name: 'Bool',
        isError: false
      }
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
  })
  describe('_makeRequest function', () => {
    beforeEach(() => {
      Object.defineProperty(browserama, 'isFirefox', { get: () => true });
    })
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

      await sendScenario({
        '/SessionManager/IsActive*': {
          responses: [isActiveResponseWithStatus]
        }
      });

      try {
        await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, true);
      } catch (err) {
        expect(plantronicsService.isConnected).toBe(false);
        expect(disconnectSpy).toHaveBeenCalled();
        expect(plantronicsService.logger.info).toHaveBeenCalledWith(err);
      }
    })
    it('handles error from endpoint with 404 status and !isRetry', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask');
      const isActiveResponseWithStatus = {
        ...responses.SessionManager.IsActive.default,
        status: 404,
        'Type_Name': 'Error'
      };

      await sendScenario({
        '/SessionManager/IsActive*': {
          responses: [isActiveResponseWithStatus]
        }
      });

      try {
        await plantronicsService._makeRequestTask(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`);
      } catch (err) {
        expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, true);
      }
    })
    it('handles browersama.isFirefox true error case', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      const isActiveResponseWithStatus = {
        ...responses.SessionManager.IsActive.default,
        status: 418,
        'Type_Name': 'Error'
      };

      await sendScenario({
        '/SessionManager/IsActive*': {
          responses: [isActiveResponseWithStatus]
        }
      });

      try {
      await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, false);
    } catch (err) {
        expect(plantronicsService.errorCode).toBe('browser');
        expect(plantronicsService.disableRetry).toBe(true);
      }
    })
    it('handles successful return but no plantronics instance', async () => {
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      PlantronicsService['instance'] = null;

      await sendScenario({
        '/SessionManager/IsActive*': {
          responses: [responses.SessionManager.IsActive.default]
        }
      });

      const noInstanceError = new Error('Application destroyed.');
      try {
        await plantronicsService._makeRequest(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`, false);
      } catch (err) {
        expect(err).toStrictEqual(noInstanceError)
      }
    })
  })
  describe('disconnect function', () => {
    it('calls makeRequestTask if the implementation is connected', () => {
      plantronicsService.isConnected = true;
      const _makeRequestTaskSpy = jest.spyOn(plantronicsService, '_makeRequestTask')
      plantronicsService.disconnect();
      expect(_makeRequestTaskSpy).toHaveBeenCalledWith(`/SessionManager/UnRegister?name=${plantronicsService.pluginName}`);
    })
    it('sets the flags to the proper values after promise resolution', (done) => {
      plantronicsService.isConnected = true;
      const clearTimeoutsSpy = jest.spyOn(plantronicsService, 'clearTimeouts');
      plantronicsService.disconnect().then(() => {
        expect(plantronicsService.isConnected).toBe(false);
        expect(plantronicsService._deviceInfo).toBeNull();
        expect(clearTimeoutsSpy).toHaveBeenCalled();
        expect(plantronicsService.isActive).toBe(false);
        done();
      });
    })
  })
  describe('_fetch', () => {
    it('should call the fetchJsonp function with the proper URL', () => {
      plantronicsService._fetch = originalFetchFunction;
      console.log(plantronicsService._fetch('/test'));
      plantronicsService._fetch('/test')
      expect(fetchJsonp).toHaveBeenCalledWith('/test');
    })
  })
});
