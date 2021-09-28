import PlantronicsService from '../../../../library/services/vendor-implementations/plantronics/plantronics';
import DeviceInfo from '../../../../library/types/device-info';
import { mockLogger } from '../../test-utils';
import responses from './plantronics-responses';
// import {
//   createNock,
//   mockRegister,
// } from '../../../mock-apis';
// import fetchJsonp from 'fetch-jsonp';
// const fetchJsonp = require('fetch-jsonp');

let ajax = new XMLHttpRequest();
const mockPlantronicsHost = 'https://localhost:3000/plantronics';

const testDevice: DeviceInfo = {
  ProductName: 'testDevice1',
};

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
  ajax.open('POST', `${mockPlantronicsHost}/scenario`, true);
  ajax.setRequestHeader('Content-Type', 'application/json');
  ajax.withCredentials = true;
  return ajax.send(JSON.stringify(scenario));
}

describe('PlantronicsService', () => {
  let plantronicsService: PlantronicsService;

  beforeEach(() => {
    // nock.cleanAll();
    plantronicsService = PlantronicsService.getInstance({ logger: console });
    resetService(plantronicsService);
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
  });

  describe('apiHost', () => {
    it('should return the expected value', () => {
      const expected = 'https://127.0.0.1:32018/Spokes';
      expect(plantronicsService.apiHost).toEqual(expected);
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
    afterEach(() => {
      jest.useRealTimers();
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
    it('will call getDeviceStatusSpy if proper flags are met', () => {
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
      expect(deviceMuteChangedSpy).toHaveBeenLastCalledWith(false, {name: 'Unmute'});
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
    // beforeEach(() => {
    //   nock(mockPlantronicsHost)
    //   .get(`/SessionManager/Register?name=${plantronicsService.pluginName}`)
    //   .reply(200, responses.SessionManager.Register.default);

    // nock(mockPlantronicsHost)
    //   .get(`/SessionManager/IsActive?name=${plantronicsService.pluginName}&active=true`)
    //   .reply(200 , responses.SessionManager.IsActive.default);

    // nock(mockPlantronicsHost)
    //   .get(`/UserPreferences/SetDefaultSoftPhone?name=${plantronicsService.pluginName}`)
    //   .reply(200, responses.UserPreference.SetDefaultSoftPhone.default);

    // nock(mockPlantronicsHost)
    //   .get('/DeviceServices/Info')
    //   .reply(200, responses.DeviceServices.Info.default);

    // nock(mockPlantronicsHost)
    //   .get('/CallServices/CallManagerState?')
    //   .reply(200, responses.CallServices.CallManagerState.default)
    // })
    it('connects properly with a clean state', async () => {
      // await sendScenario({
      //   '/SessionManager/Register*': {
      //     responses: [responses.SessionManager.Register.default]
      //   },
      //   '/SessionManager/IsActive*': {
      //     responses: [responses.SessionManager.IsActive.default]
      //   },
      //   '/UserPreferences/SetDefaultSoftPhone*': {
      //     responses: [responses.UserPreference.SetDefaultSoftPhone.default]
      //   },
      //   '/DeviceServices/Info*': {
      //     responses: [responses.DeviceServices.Info.default]
      //   },
      //   '/CallServices/CallManagerState*': {
      //     responses: [responses.CallServices.CallManagerState.default]
      //   }
      // });

      (fetch as any).mockResponseOnce(JSON.stringify(responses.SessionManager.Register.default));
      (fetch as any).mockResponseOnce(JSON.stringify(responses.SessionManager.IsActive.default));
      (fetch as any).mockResponseOnce(JSON.stringify(responses.UserPreference.SetDefaultSoftPhone.default));
      (fetch as any).mockResponseOnce(JSON.stringify(responses.DeviceServices.Info.default));
      (fetch as any).mockResponseOnce(JSON.stringify(responses.CallServices.CallManagerState.default));

      // fetchJsonp.mockResolvedValue({
      //   ...responses.SessionManager.Register.default
      // });

      // await plantronicsService.connect();
      // expect(plantronicsService.isConnected).toBeTruthy();

      await plantronicsService.connect();
      expect(plantronicsService.isConnected).toBeTruthy();
      expect(plantronicsService.isActive).toBeFalsy();
      expect(plantronicsService.isConnecting).toBeFalsy();
    });
    // it('connects properly with a clean state', async () => {
    //   jest.setTimeout(20000);
    //   fetchMock.mockResponseOnce(JSON.stringify(responses.SessionManager.Register.default))
    //   fetchMock.mockResponseOnce(JSON.stringify(responses.SessionManager.IsActive.default))
    //   fetchMock.mockResponseOnce(JSON.stringify(responses.UserPreference.SetDefaultSoftPhone.default))
    //   fetchMock.mockResponseOnce(JSON.stringify(responses.DeviceServices.Info.default))
    //   fetchMock.mockResponseOnce(JSON.stringify(responses.CallServices.CallManagerState.default))

    //   await plantronicsService.connect();
    //   expect(fetch).toHaveBeenCalledTimes(5);
    //   expect(plantronicsService.isConnected).toBe(true);
    //   expect(plantronicsService.isConnecting).toBe(false);
    //   expect(plantronicsService.isActive).toBe(false);
    // });
  })
});