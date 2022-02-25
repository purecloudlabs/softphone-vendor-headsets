import JabraNativeService from './jabra-native';
import DeviceInfo from '../../../../types/device-info';
import { mockLogger } from '../../../test-utils';
import { JabraNativeCommands } from './jabra-native-commands';
import { HeadsetEvent, JabraDeviceEvent, JabraHeadsetEvent, JabraNativeEventNames } from './jabra-native-types';
import * as utils from '../../../../utils';

const ASYNC_TIMEOUT = 1000;
const testDevice1 = { deviceID: '123', deviceName: 'testDevice1' };
const testDevice2 = { deviceID: '456', deviceName: 'testDevice2' };
const testDevice3 = { deviceID: '789', deviceName: 'testDevice' };

function resetJabraNativeService(service: JabraNativeService) {
  service.isConnecting = false;
  service.isConnected = false;
  service.isActive = false;
  service.devices = new Map<string, DeviceInfo>();
  service.activeDeviceId = null;
  service.logger = mockLogger;
  service.ignoreNextOffhookEvent = false;
  service._connectionInProgress = null;
}

function populateDevices(service: JabraNativeService): void {
  service.devices.set(testDevice1.deviceID, testDevice1);
  service.devices.set(testDevice2.deviceID, testDevice2);
  service.devices.set(testDevice3.deviceID, testDevice3);
}

describe('JabraNativeService', () => {
  let jabraNativeService: JabraNativeService = null;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    (window as any)._HostedContextFunctions = {
      register: jest.fn().mockReturnValue({ supportsJabra: true }),
      sendEventToDesktop: jest.fn()
    };

    jabraNativeService = JabraNativeService.getInstance({ logger: console, createNew: true });
    resetJabraNativeService(jabraNativeService);
  });

  describe('instantiation', () => {
    it('should be a singleton', () => {
      const jabraNativeService2 = JabraNativeService.getInstance({ logger: console });

      expect(jabraNativeService).not.toBeFalsy();
      expect(jabraNativeService2).not.toBeFalsy();
      expect(jabraNativeService).toBe(jabraNativeService2);
    });

    it("should have the value 'Jabra' as the vendor name", () => {
      expect(jabraNativeService.vendorName).toEqual('Jabra');
    });

    it('should set the headsetState properties to false', () => {
      expect(jabraNativeService.headsetState.ringing).toBe(false);
      expect(jabraNativeService.headsetState.offHook).toBe(false);
    });
  });

  describe('deviceInfo', () => {
    it('should return null if activeDeviceId is null', () => {
      jabraNativeService.activeDeviceId = null;
      const result: DeviceInfo = jabraNativeService.deviceInfo;
      expect(result).toBeNull();
    });
    it('should return null if devices is null', () => {
      jabraNativeService.activeDeviceId = 'asdf';
      jabraNativeService.devices = null;

      const result: DeviceInfo = jabraNativeService.deviceInfo;

      expect(result).toBeNull();
    });
    it('should return null if there is nothing in the devices list', () => {
      jabraNativeService.activeDeviceId = 'asdf';
      // jabraNativeService.devices = [];

      const result: DeviceInfo = jabraNativeService.deviceInfo;

      expect(result).toBeNull();
    });
    it('should return the deviceInfo corresponding to the value in activeDeviceId', () => {
      populateDevices(jabraNativeService);
      jabraNativeService.activeDeviceId = '456';

      const result: DeviceInfo = jabraNativeService.deviceInfo;

      expect(result).toBe(testDevice2);
    });
  });

  describe('deviceName', () => {
    it('should return null when there is no active deviceId', () => {
      jabraNativeService.activeDeviceId = null;
      const result = jabraNativeService.deviceName;
      expect(result).toBeNull();
    });
    it('should return the device name of the device corresponding to the value of activeDeviceId', () => {
      populateDevices(jabraNativeService);
      jabraNativeService.activeDeviceId = '456';

      const result: string = jabraNativeService.deviceName;

      expect(result).toBe('testDevice2');
    });
  });

  describe('isDeviceAttached', () => {
    it('should return false if deviceInfo returns null', () => {
      jabraNativeService.activeDeviceId = null;

      const result: boolean = jabraNativeService.isDeviceAttached;

      expect(result).toBe(false);
    });
    it('should return true if deviceInfo returns a value', () => {
      populateDevices(jabraNativeService);
      jabraNativeService.activeDeviceId = '456';

      const result: boolean = jabraNativeService.isDeviceAttached;

      expect(result).toBe(true);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    it("should return true if the label contains 'jabra'", () => {
      expect(jabraNativeService.deviceLabelMatchesVendor('Jabra')).toBe(true);
      expect(jabraNativeService.deviceLabelMatchesVendor('The Jabra Thing')).toBe(true);
      expect(jabraNativeService.deviceLabelMatchesVendor('Headset of jabra')).toBe(true);
    });
    it("should return true if the label does not container 'jabra'", () => {
      expect(jabraNativeService.deviceLabelMatchesVendor('Plantronics')).toBe(false);
      expect(jabraNativeService.deviceLabelMatchesVendor('Sennheiser S1234')).toBe(false);
      expect(jabraNativeService.deviceLabelMatchesVendor('Invisible Headset by Dre')).toBe(false);
    });
  });

  describe('handleJabraDeivceAttached', () => {
    it('should log a debug message and call updateDevices', () => {
      jest.spyOn(mockLogger, 'debug');
      jest.spyOn(jabraNativeService, 'updateDevices');
      const deviceData: JabraDeviceEvent = { deviceName: 'a', deviceId: 1, attached: true, msg: 'JabraDeviceAttached' };

      jabraNativeService['handleJabraDeviceAttached'](deviceData);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'handling jabra attach/detach event',
        deviceData
      );
      expect(jabraNativeService.updateDevices).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleJabraEvent', () => {
    it('should log a debug message and call _processEvent', () => {
      jest.spyOn(mockLogger, 'debug');
      const eventData: JabraHeadsetEvent = { event: JabraNativeEventNames.Hold, hidInput: "1", msg: HeadsetEvent, value: true };

      jabraNativeService['handleJabraEvent'](eventData);

      expect(mockLogger.debug).toHaveBeenCalledWith('Jabra event received', eventData);
    });
  });

  describe('_handleOffhookEvent', () => {
    describe('isOffhook = false', () => {
      it('should call _getHeadsetIntoVanillaState() and deviceEndedCall()', () => {
        const spy = jest.fn();
        jabraNativeService['_getHeadsetIntoVanillaState'] = spy;

        jest.spyOn(jabraNativeService, 'deviceEndedCall');

        jabraNativeService['_handleOffhookEvent'](false);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(jabraNativeService.deviceEndedCall).toHaveBeenCalledTimes(1);
      });
    });
    describe('isOffhook = true', () => {
      let resetSpy: jest.Mock;
      let sendCmdSpy: jest.Mock;
      let setRingingSpy: jest.Mock;

      beforeEach(() => {
        resetSpy = jabraNativeService['_getHeadsetIntoVanillaState'] = jest.fn();
        sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
        setRingingSpy = jabraNativeService['_setRinging'] = jest.fn();
        jest.spyOn(jabraNativeService, 'deviceEndedCall');
        jest.spyOn(jabraNativeService, 'deviceAnsweredCall');
      });
      afterEach(() => {
        expect(resetSpy).not.toHaveBeenCalled();
        expect(jabraNativeService.deviceEndedCall).not.toHaveBeenCalled();
      });
      it('should do nothing if this.headsetState.ringing is false', () => {
        jabraNativeService.headsetState.ringing = false;

        jabraNativeService['_handleOffhookEvent'](true);

        expect(jabraNativeService.deviceAnsweredCall).not.toHaveBeenCalled();
        expect(sendCmdSpy).not.toHaveBeenCalled();
        expect(setRingingSpy).not.toHaveBeenCalled();
      });
      it('should call deviceAnsweredCall(), _sendCmd(), and _setRinging() if this.headsetState.ringing is true', () => {
        jabraNativeService.headsetState.ringing = true;

        jabraNativeService['_handleOffhookEvent'](true);

        expect(jabraNativeService.deviceAnsweredCall).toHaveBeenCalled();
        expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Offhook, true);
        expect(setRingingSpy).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('_handleMuteEvent', () => {
    it('should call _sendCmd() and deviceMuteChanged() with the appropriate values', () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      jest.spyOn(jabraNativeService, 'deviceMuteChanged');
      const isMuted = Boolean(true); // Using the Boolean object so as to test for reference equality

      jabraNativeService['_handleMuteEvent'](isMuted);

      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Mute, isMuted);
      expect(jabraNativeService.deviceMuteChanged).toHaveBeenCalledWith(isMuted);
    });
  });

  describe('_handleHoldEvent', () => {
    it('should call deviceHoldStatusChanged() with null and false', () => {
      jest.spyOn(jabraNativeService, 'deviceHoldStatusChanged');
      jabraNativeService['_handleHoldEvent'](null as any);
      expect(jabraNativeService.deviceHoldStatusChanged).toHaveBeenCalledWith(false);
    });
  });

  describe('_getHeadsetIntoVanillaState', () => {
    it('should call setHold with null and false', () => {
      jest.spyOn(jabraNativeService, 'setHold').mockImplementationOnce(() => null);
      jest.spyOn(jabraNativeService, 'setMute').mockImplementationOnce(() => null);
      jabraNativeService['_getHeadsetIntoVanillaState']();
      expect(jabraNativeService.setHold).toHaveBeenCalledWith(null, false);
    });
    it('should call setMute with false', () => {
      jest.spyOn(jabraNativeService, 'setHold').mockImplementationOnce(() => null);
      jest.spyOn(jabraNativeService, 'setMute').mockImplementationOnce(() => null);
      jabraNativeService['_getHeadsetIntoVanillaState']();
      expect(jabraNativeService.setMute).toHaveBeenCalledWith(false);
    });
  });

  describe('_sendCmd', () => {
    it('should log a debug message', () => {
      jabraNativeService.activeDeviceId = 'asdf';
      jest.spyOn(mockLogger, 'debug');
      const expectedLogData = {
        deviceId: jabraNativeService.activeDeviceId,
        cmd: JabraNativeCommands.Mute,
        value: true,
      };

      jabraNativeService['_sendCmd'](JabraNativeCommands.Mute, true);

      expect(mockLogger.debug).toHaveBeenCalledWith('Sending command to headset', expectedLogData);
    });
    it('should call sendJabraEventToDesktop', () => {
      jabraNativeService.activeDeviceId = testDevice1.deviceID;
      const spy = (window as any)._HostedContextFunctions.sendEventToDesktop;
      const cmd = JabraNativeCommands.Mute;

      jabraNativeService['_sendCmd'](cmd, true);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        'jabraEvent', {
          deviceID: jabraNativeService.activeDeviceId,
          event: cmd,
          value: true
        });
    });
  });

  describe('setRinging', () => {
    it(`should call _sendCmd() with the received value and the '${JabraNativeCommands.Ring}' command`, () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      const value = true;

      jabraNativeService['_setRinging'](value);

      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Ring, value);
    });
    it('should set heasetState.ringing to the passed in value', () => {
      const value = true;
      jabraNativeService['_setRinging'](value);
      expect(jabraNativeService.headsetState.ringing).toBe(value);
    });
  });

  describe('setMute', () => {
    it(`should call _sendCmd() with the '${JabraNativeCommands.Mute}' command and the passed in value`, async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      const value = false;

      await jabraNativeService.setMute(value);

      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Mute, value);
    });
  });

  describe('setHold', () => {
    it(`should call _sendCmd() with the '${JabraNativeCommands.Hold}' command and the passed in value`, async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      const value = false;

      await jabraNativeService.setHold(null, value);

      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Hold, value);
    });
  });

  describe('incomingCall', () => {
    it('should call _setRinging() with true', async () => {
      const spy = jabraNativeService['_setRinging'] = jest.fn();
      await jabraNativeService.incomingCall();
      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('answerCall', () => {
    it('should set ignoreNextOffhookEvent to true', async () => {
      jabraNativeService.ignoreNextOffhookEvent = false;
      jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.answerCall();
      expect(jabraNativeService.ignoreNextOffhookEvent).toBe(true);
    });
    it(`should call _sendCmd() with the '${JabraNativeCommands.Offhook}' command and true`, async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.answerCall();
      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Offhook, true);
    });
  });

  describe('outgoingCall', () => {
    it(`should call _sendCmd with the '${JabraNativeCommands.Offhook}' command and true`, async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.outgoingCall();
      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Offhook, true);
    });
  });

  describe('endCall', () => {
    it('should call _setRinging() with false', async () => {
      jabraNativeService['_setRinging'] = jest.fn();
      jabraNativeService['_sendCmd'] = jest.fn();

      await jabraNativeService.endCall(null, false);

      expect(jabraNativeService['_setRinging']).toHaveBeenCalledTimes(1);
      expect(jabraNativeService['_setRinging']).toHaveBeenCalledWith(false);
    });
    it('should do nothing if hasOtherActiveCalls is true', async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.endCall(null, true);
      expect(sendCmdSpy).not.toHaveBeenCalledWith(
        JabraNativeCommands.Offhook,
        false
      );
    });
    it(`should call _sendCmd with the '${JabraNativeCommands.Offhook}' command and false when hasOtherActiveCalls is false`, async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.endCall(null, false);
      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Offhook, false);
    });
  });

  describe('endAllCalls', () => {
    it('should call _setRinging() with false', async () => {
      jabraNativeService['_setRinging'] = jest.fn();
      jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.endAllCalls();
      expect(jabraNativeService['_setRinging']).toHaveBeenCalledWith(false);
    });
    it(`should call _sendCmd with the '${JabraNativeCommands.Offhook} command and false`, async () => {
      const sendCmdSpy = jabraNativeService['_sendCmd'] = jest.fn();
      await jabraNativeService.endAllCalls();
      expect(sendCmdSpy).toHaveBeenCalledWith(JabraNativeCommands.Offhook, false);
    });
  });

  describe('updateDevices', () => {
    describe('requestJabraDevices rejects', () => {
      it(
        'should log an error and call disconnect() when it cannot connect to jabra',
        async () => {
          jest
            .spyOn(utils, 'requestCefPromise')
            .mockRejectedValue('expected test error');
          jest.spyOn(mockLogger, 'error');
          jest.spyOn(jabraNativeService, 'disconnect');

          await jabraNativeService.updateDevices();

          expect(mockLogger.error).toHaveBeenCalledTimes(1);
          expect(jabraNativeService.disconnect).toHaveBeenCalledTimes(1);
        },
        ASYNC_TIMEOUT
      );
    });

    describe('requestJabraDevices resolves successfully', () => {
      const devices: DeviceInfo[] = [testDevice1, testDevice2, testDevice3];

      beforeEach(() => {
        jabraNativeService._connectionInProgress = {
          resolve: () => {},
          reject: () => {},
        };
      });

      it('should set isConnecting to false and isConnected to true', async () => {
        jest
          .spyOn(utils, 'requestCefPromise')
          .mockResolvedValue(devices);
        jabraNativeService.isConnecting = true;
        jabraNativeService.isConnected = false;
        jabraNativeService['_sendCmd'] = jest.fn();

        await jabraNativeService.updateDevices();

        expect(jabraNativeService.isConnecting).toBe(false);
        expect(jabraNativeService.isConnected).toBe(true);
      });
      it('should reset the devices property and set activeDeviceId to null when the received data is null', async () => {
        populateDevices(jabraNativeService);
        jabraNativeService.activeDeviceId = testDevice1.deviceID;
        jest.spyOn(utils, 'requestCefPromise').mockResolvedValue(null);

        await jabraNativeService.updateDevices();

        expect(jabraNativeService.devices.size).toBe(0);
        expect(jabraNativeService.activeDeviceId).toBeNull();
      });
      it('should reset the devices property and set activeDeviceId to null when the received data is an empty array', async () => {
        populateDevices(jabraNativeService);
        jabraNativeService.activeDeviceId = testDevice1.deviceID;
        jest.spyOn(utils, 'requestCefPromise').mockResolvedValue([]);

        await jabraNativeService.updateDevices();

        expect(jabraNativeService.devices.size).toBe(0);
        expect(jabraNativeService.activeDeviceId).toBeNull();
      });
      it('should log a message with the data received from utils.requestJabraDevices()', async () => {
        jest.spyOn(mockLogger, 'info');
        jest
          .spyOn(utils, 'requestCefPromise')
          .mockResolvedValue(devices);

        await jabraNativeService.updateDevices();

        expect(mockLogger.info).toHaveBeenCalledWith('connected jabra devices', devices);
      });
      it('should put the devices from the respose into the devices property and set the activeDeviceId to the first', async () => {
        jest
          .spyOn(utils, 'requestCefPromise')
          .mockResolvedValue(devices);
        jabraNativeService.activeDeviceId = 'foo';
        jabraNativeService.devices = new Map();

        await jabraNativeService.updateDevices();

        expect(jabraNativeService.activeDeviceId).toEqual(devices[0].deviceID);
        expect(jabraNativeService.devices.size).toEqual(devices.length);
      });
      it('should call _setRinging(false) and setMute(false)', async () => {
        jest
          .spyOn(utils, 'requestCefPromise')
          .mockResolvedValue(devices);
        jabraNativeService['_setRinging'] = jest.fn();
        jest.spyOn(jabraNativeService, 'setMute');

        await jabraNativeService.updateDevices();

        expect(jabraNativeService['_setRinging']).toHaveBeenCalledWith(false);
        expect(jabraNativeService.setMute).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('_processEvent', () => {
    describe(`${JabraNativeEventNames.OffHook}`, () => {
      it('should debounce a call to _handleOffhookEvent', () => {
        jest.useFakeTimers();
        jabraNativeService['_handleOffhookEvent'] = jest.fn();

        jabraNativeService['_processEvent'](JabraNativeEventNames.OffHook, true);
        jest.runOnlyPendingTimers();

        expect(jabraNativeService['_handleOffhookEvent']).toHaveBeenCalled();
        jest.useRealTimers();
      });
    });
    describe(`${JabraNativeEventNames.RejectCall}`, () => {
      it('should should call deviceRejectedCall()', () => {
        jest.spyOn(jabraNativeService, 'deviceRejectedCall');
        jabraNativeService['_processEvent'](JabraNativeEventNames.RejectCall, null);
        expect(jabraNativeService.deviceRejectedCall).toHaveBeenCalledTimes(1);
      });
    });
    describe(`${JabraNativeEventNames.Mute}`, () => {
      it('should call _handleMuteEvent()', () => {
        jabraNativeService['_handleMuteEvent'] = jest.fn();
        const value = false;

        jabraNativeService['_processEvent'](JabraNativeEventNames.Mute, value);

        expect(jabraNativeService['_handleMuteEvent']).toHaveBeenCalledTimes(1);
        expect(jabraNativeService['_handleMuteEvent']).toHaveBeenCalledWith(value);
      });
    });
    describe(`${JabraNativeEventNames.Hold}`, () => {
      it('should call _handleHoldEvent()', () => {
        jabraNativeService['_handleHoldEvent'] = jest.fn();

        jabraNativeService['_processEvent'](JabraNativeEventNames.Hold, null);

        expect(jabraNativeService['_handleHoldEvent']).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('disconnect', () => {
    it('should set isConnecting and isConnected to false', () => {
      jabraNativeService.isConnected = true;
      jabraNativeService.isConnecting = true;

      jabraNativeService.disconnect();

      expect(jabraNativeService.isConnected).toBe(false);
      expect(jabraNativeService.isConnecting).toBe(false);
    });
  });

  describe('connected', () => {
    it('should set isConnecting to true', async () => {
      jabraNativeService.isConnecting = false;
      jest.spyOn(jabraNativeService, 'updateDevices').mockResolvedValue(); // Have to mock updateDevices because it will set isConnecting back to false when it resolves

      await jabraNativeService.connect();

      expect(jabraNativeService.isConnecting).toBe(true);
    });
    it('should log an error message when it failes to connect', async () => {
      jest.spyOn(mockLogger, 'error');
      jest.spyOn(jabraNativeService, 'updateDevices').mockRejectedValue({});

      await jabraNativeService.connect();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect to Jabra', {});
    });
  });
});
