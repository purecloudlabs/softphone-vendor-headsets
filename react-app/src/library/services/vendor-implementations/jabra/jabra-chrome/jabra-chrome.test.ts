import JabraChromeService from './jabra-chrome';
import DeviceInfo from '../../../../types/device-info';
import { mockLogger } from '../../../test-utils';
import { JabraChromeCommands } from './jabra-chrome-commands';
import { Subscription } from 'rxjs';
import { JabraChromeRequestedEvents } from './jabra-chrome-requested-events';

const ASYNC_TIMEOUT = 1000;

// Keep these in sync with jabra-chrome.ts
const incomingMessageName = 'jabra-headset-extension-from-content-script';
const outgoingMessageName = 'jabra-headset-extension-from-page-script';

const testDevice1: DeviceInfo = {
  deviceName: 'Test Device 1',
  ProductName: 'Super Headset',
  headsetType: 'Wireless',
};
const testDevice2: DeviceInfo = {
  deviceName: 'Test Device 2',
  ProductName: 'Yellow Headset',
  headsetType: 'Wired with buttons',
};
const testDevice3: DeviceInfo = {
  deviceName: 'Test Device 3',
  ProductName: 'Bluetooth Bannana',
  headsetType: 'Looks like a fruit',
};

function resetJabraChromeService(service: JabraChromeService): void {
  service.isConnecting = false;
  service.isActive = false;
  service.devices = new Map<string, DeviceInfo>();
  service.activeDeviceId = null;
  service.logger = mockLogger;
  service._connectDeferred = null;
}

function populateDevices(service: JabraChromeService): void {
  service.devices.set(testDevice1.deviceName, testDevice1);
  service.devices.set(testDevice2.deviceName, testDevice2);
  service.devices.set(testDevice3.deviceName, testDevice3);
}

describe('JabraChromeService', () => {
  let jabraChromeService: JabraChromeService;

  beforeEach(() => {
    jabraChromeService = JabraChromeService.getInstance({ logger: console });
    resetJabraChromeService(jabraChromeService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('instantiation', () => {
    it('should be a singleton', () => {
      const jabraChromeService2 = JabraChromeService.getInstance({ logger: console });

      expect(jabraChromeService).not.toBeFalsy();
      expect(jabraChromeService2).not.toBeFalsy();
      expect(jabraChromeService).toBe(jabraChromeService2);
    });
    it('should have the correct vendorName', () => {
      expect(jabraChromeService.vendorName).toEqual('Jabra');
    });
  });

  describe('deviceInfo', () => {
    it('should return null if activeDeviceId is null', () => {
      jabraChromeService.devices.set(testDevice1.deviceName, testDevice1);
      jabraChromeService.activeDeviceId = null;
      const result = jabraChromeService.deviceInfo;
      expect(result).toBeNull();
    });
    it('should return null if there are no devices registered', () => {
      jabraChromeService.activeDeviceId = 'foobar';
      const result = jabraChromeService.deviceInfo;
      expect(result).toBeNull();
    });
    it('should return a device when it is registered and matches the activeDeviceId', () => {
      jabraChromeService.activeDeviceId = testDevice1.deviceName;
      jabraChromeService.devices.set(testDevice1.deviceName, testDevice1);
      jabraChromeService.devices.set(testDevice2.deviceName, testDevice2);

      const result: DeviceInfo = jabraChromeService.deviceInfo;

      expect(result).toBe(testDevice1);
    });
  });

  describe('deviceName', () => {
    it('should return the deviceName of the active device', () => {
      populateDevices(jabraChromeService);
      jabraChromeService.activeDeviceId = testDevice1.deviceName;
      expect(jabraChromeService.deviceName).toEqual(testDevice1.deviceName);
    });
  });

  describe('isDeviceAttached', () => {
    it('should return true if the the device is in the devices list is the activeDeviceId', () => {
      populateDevices(jabraChromeService);
      jabraChromeService.activeDeviceId = testDevice1.deviceName;
      expect(jabraChromeService.isDeviceAttached).toEqual(true);
    });
    it('should return false if the the device is NOT in the devices list is the activeDeviceId', () => {
      populateDevices(jabraChromeService);
      jabraChromeService.activeDeviceId = 'Imaginary Device';
      expect(jabraChromeService.isDeviceAttached).toEqual(false);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    it("should return true if the label contains 'jabra'", () => {
      expect(jabraChromeService.deviceLabelMatchesVendor('Jabra')).toBe(true);
      expect(jabraChromeService.deviceLabelMatchesVendor('The Jabra Thing')).toBe(true);
      expect(jabraChromeService.deviceLabelMatchesVendor('Headset of jabra')).toBe(true);
    });
    it("should return true if the label does not container 'jabra'", () => {
      expect(jabraChromeService.deviceLabelMatchesVendor('Plantronics')).toBe(false);
      expect(jabraChromeService.deviceLabelMatchesVendor('Sennheiser S1234')).toBe(false);
      expect(jabraChromeService.deviceLabelMatchesVendor('Invisible Headset by Dre')).toBe(false);
    });
  });

  describe('_getHeadsetIntoVanillaState', () => {
    it('should call setHold with null and false', () => {
      jest.spyOn(jabraChromeService, 'setHold').mockImplementationOnce(() => null);
      jest.spyOn(jabraChromeService, 'setMute').mockImplementationOnce(() => null);
      jabraChromeService._getHeadsetIntoVanillaState();
      expect(jabraChromeService.setHold).toHaveBeenCalledWith(null, false);
    });
    it('should call setMute with false', () => {
      jest.spyOn(jabraChromeService, 'setHold').mockImplementationOnce(() => null);
      jest.spyOn(jabraChromeService, 'setMute').mockImplementationOnce(() => null);
      jabraChromeService._getHeadsetIntoVanillaState();
      expect(jabraChromeService.setMute).toHaveBeenCalledWith(false);
    });
  });

  describe('_sendCmd', () => {
    it('should log a debug message of the received command', () => {
      jest.spyOn(mockLogger, 'debug');
      jabraChromeService._sendCmd(JabraChromeCommands.Hold);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
    it('should post a message to window with the expected message, and *', () => {
      jest.spyOn(window, 'postMessage').mockImplementationOnce(() => {});
      const expectedMessage = {
        direction: outgoingMessageName,
        message: JabraChromeCommands.Hold
      };

      jabraChromeService._sendCmd(JabraChromeCommands.Hold);

      expect(window.postMessage).toHaveBeenCalledWith(expect.objectContaining(expectedMessage), '*');
    });
  });

  describe('_messageHandler', () => {
    it('should log a debug message if the event is a jabra event', () => {
      jest.spyOn(mockLogger, 'debug');
      const event = {
        source: window,
        data: {
          direction: incomingMessageName,
          message: 'test message',
        },
      };

      jabraChromeService._messageHandler(event);

      expect(mockLogger.debug).toHaveBeenCalled();
    });
    it('should NOT log a debug message if the event did not come from window', () => {
      jest.spyOn(mockLogger, 'debug');
      const event = {
        source: {},
        data: {
          direction: incomingMessageName,
          message: 'test message',
        },
      };

      jabraChromeService._messageHandler(event);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
    it(`should NOT log a debug message if the event direction is not ${incomingMessageName}`, () => {
      jest.spyOn(mockLogger, 'debug');
      const event = {
        source: window,
        data: {
          direction: 'not-a-jabra-message',
          message: 'test message',
        },
      };

      jabraChromeService._messageHandler(event);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    describe('event is jabra event:', () => {
      let event = null;
      let headsetEventSubscription: Subscription;

      beforeEach(() => {
        headsetEventSubscription = null;

        event = {
          source: window,
          data: {
            direction: incomingMessageName,
            message: '',
          },
        };
      });

      afterEach(() => {
        if (headsetEventSubscription) {
          headsetEventSubscription.unsubscribe();
        }
      });

      it('should log an info message if logHeasetEvents is true', () => {
        event.data.message = 'test message';
        jest.spyOn(mockLogger, 'info');

        jabraChromeService._messageHandler(event);

        expect(mockLogger.info).toHaveBeenCalledWith(event.data.message);
      });

      describe(`event.data.message starts with '${JabraChromeRequestedEvents.GetVersion}'`, () => {
        it(`should log an info message`, () => {
          const jabraVersion = '2';
          event.data.message = JabraChromeRequestedEvents.GetVersion + jabraVersion;
          const expectedLog = `jabra version: ${JabraChromeRequestedEvents.GetVersion}${jabraVersion}`;
          jest.spyOn(mockLogger, 'info');

          jabraChromeService._messageHandler(event);

          expect(mockLogger.info).toHaveBeenCalledWith(expectedLog);
        });
        it('should set the version to the version parsed off the message ', () => {
          event.data.message = JabraChromeRequestedEvents.GetVersion + '2';
          jabraChromeService._messageHandler(event);
          expect(jabraChromeService.version).toEqual(event.data.message);
        });
      });

      it('should call _handleDeviceConnectionFailure if event.data.error is present and isConnecting is true', () => {
        jabraChromeService.isConnecting = true;
        event.data.error = { message: 'mock test error' };
        jest.spyOn(jabraChromeService, '_handleDeviceConnectionFailure');
        jest.spyOn(jabraChromeService, '_handleDeviceConnect');

        jabraChromeService._messageHandler(event);

        expect(jabraChromeService._handleDeviceConnectionFailure).toHaveBeenCalled();
        expect(jabraChromeService._handleDeviceConnect).not.toHaveBeenCalled();
      });
      it('should call _handleDeviceConnect if there is no error on the event and isConnecting is true', () => {
        jabraChromeService.isConnecting = true;
        event.data.error = null;
        jest.spyOn(jabraChromeService, '_handleDeviceConnectionFailure');
        jest.spyOn(jabraChromeService, '_handleDeviceConnect');

        jabraChromeService._messageHandler(event);

        expect(jabraChromeService._handleDeviceConnect).toHaveBeenCalled();
        expect(jabraChromeService._handleDeviceConnectionFailure).not.toHaveBeenCalled();
      });
      it(`should call _handleGetDevices when isConnecting is false and event.data.message starts with '${JabraChromeRequestedEvents.GetDevices}'`, () => {
        jabraChromeService.isConnecting = false;
        event.data.message = JabraChromeRequestedEvents.GetDevices + ' device';
        jest.spyOn(jabraChromeService, '_handleGetDevices');

        jabraChromeService._messageHandler(event);

        expect(jabraChromeService._handleGetDevices).toHaveBeenCalledWith('device');
      });
      it(`should call _handleGetActiveDevice when isConnecting is false and event.data.message starts with '${JabraChromeRequestedEvents.GetDevices}'`, () => {
        jabraChromeService.isConnecting = false;
        event.data.message = JabraChromeRequestedEvents.GetActiveDevice + ' device';
        jest.spyOn(jabraChromeService, '_handleGetActiveDevice');

        jabraChromeService._messageHandler(event);

        expect(jabraChromeService._handleGetActiveDevice).toHaveBeenCalledWith('device');
      });
      it('should log a message when isConnecting is false and the jabra event is unknown or is not handled', () => {
        jabraChromeService.isConnecting = false;
        event.data.message = 'some unkonwn jabra command';
        jest.spyOn(mockLogger, 'info');

        jabraChromeService._messageHandler(event);

        expect(mockLogger.info).toHaveBeenCalledWith('Jabra event unknown or not handled', {
          event: event.data.message,
        });
      });
      it(
        `should call _processEvent when isConnecting = false and the event is neither '${JabraChromeRequestedEvents.GetDevices}' nor '${JabraChromeRequestedEvents.GetActiveDevice}'`,
        () => {
          event.data.message = 'Event: offline';
          jest.spyOn(jabraChromeService, '_processEvent');

          jabraChromeService._messageHandler(event);

          expect(jabraChromeService._processEvent).toHaveBeenCalledWith('offline');
        },
        ASYNC_TIMEOUT
      );
    });
  });

  describe('connect', () => {
    it('should set isConnecting to true', () => {
      jabraChromeService.isConnecting = false;
      jabraChromeService.connect();
      expect(jabraChromeService.isConnecting).toBe(true);
    });
    it('should set connectionDeferred to an object with the promise resolve and reject functions', () => {
      jabraChromeService._connectDeferred = null;
      jabraChromeService.connect();
      expect(jabraChromeService._connectDeferred).not.toBeNull();
      expect(typeof jabraChromeService._connectDeferred.resolve).toEqual('function');
      expect(typeof jabraChromeService._connectDeferred.reject).toEqual('function');
    });
    it(`should call _sendCmd with '${JabraChromeCommands.GetVersion}'`, () => {
      jest.spyOn(jabraChromeService, '_sendCmd');
      jabraChromeService.connect();
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.GetVersion);
    });
    it(
      'should set isConnected and isConnecting to false and log the error if the connection promise times out',
      async () => {
        jabraChromeService.isConnected = true;
        jabraChromeService.isConnecting = true;
        jest.spyOn(mockLogger, 'info');

        await jabraChromeService.connect();

        expect(jabraChromeService.isConnected).toBe(false);
        expect(jabraChromeService.isConnecting).toBe(false);
        expect(mockLogger.info).toHaveBeenCalled();
      },
      JabraChromeService.connectTimeout + 1000
    );
  });

  describe('_handleDeviceConnect', () => {
    it(
      'should log a warning if there is no connection pending',
      async () => {
        jabraChromeService._connectDeferred = null;
        jest.spyOn(mockLogger, 'warn');

        await jabraChromeService._handleDeviceConnect();

        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      },
      ASYNC_TIMEOUT
    );
    describe('pending connection', () => {
      it(`'should call _sendCmd with '${JabraChromeCommands.GetActiveDevice}' and '${JabraChromeCommands.GetDevices}'`, () => {
        jest.spyOn(jabraChromeService, '_sendCmd');
        jabraChromeService.connect();

        jabraChromeService._handleDeviceConnect();

        expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(
          JabraChromeCommands.GetActiveDevice
        );
        expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.GetDevices);
      });
      it('should set isConnecting to false and isConnected to true', () => {
        jabraChromeService.connect();

        jabraChromeService._handleDeviceConnect();

        expect(jabraChromeService.isConnected).toBe(true);
        expect(jabraChromeService.isConnecting).toBe(false);
      });
      it('should call resolve() on the _connectDeferred property, and then set it to null', () => {
        jabraChromeService.connect();
        const deferred = jabraChromeService._connectDeferred;
        jest.spyOn(deferred, 'resolve');
        jest.spyOn(deferred, 'reject');

        jabraChromeService._handleDeviceConnect();

        expect(deferred.resolve).toHaveBeenCalled();
        expect(deferred.reject).not.toHaveBeenCalled();
        expect(jabraChromeService._connectDeferred).toBeNull();
      });
    });
  });

  describe('disconnect', () => {
    it('should set isConnecting and isConnected to false', () => {
      jabraChromeService.isConnecting = true;
      jabraChromeService.isConnected = true;

      jabraChromeService.disconnect();

      expect(jabraChromeService.isConnecting).toBe(false);
      expect(jabraChromeService.isConnected).toBe(false);
    });
  });

  describe('_handleDeviceConnectionFailure', () => {
    it('should log a warning when _connectDeferred is null', () => {
      jabraChromeService._connectDeferred = null;
      jest.spyOn(mockLogger, 'warn');

      jabraChromeService._handleDeviceConnectionFailure(null);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
    it('should call reject on _connectDeferred with the received error when _connectDeferred is defined, then set _connectDeferred to null', () => {
      jabraChromeService.connect();
      const deferred = jabraChromeService._connectDeferred;
      const expectedError = new Error('Test error');
      jest.spyOn(deferred, 'resolve');
      jest.spyOn(deferred, 'reject');

      jabraChromeService._handleDeviceConnectionFailure(expectedError);

      expect(deferred.resolve).not.toHaveBeenCalled();
      expect(deferred.reject).toHaveBeenCalledWith(expectedError);
      expect(jabraChromeService._connectDeferred).toBeNull();
    });
  });

  describe('setMute', () => {
    it(
      `should call _sendCmd with '${JabraChromeCommands.Mute}' when value is true`,
      async () => {
        jest.spyOn(jabraChromeService, '_sendCmd');
        await jabraChromeService.setMute(true);
        expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Mute);
      },
      ASYNC_TIMEOUT
    );
    it(
      `should call _sendCmd with '${JabraChromeCommands.Unmute}' when value is false`,
      async () => {
        jest.spyOn(jabraChromeService, '_sendCmd');
        await jabraChromeService.setMute(false);
        expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Unmute);
      },
      ASYNC_TIMEOUT
    );
  });

  describe('setHold', () => {
    it(
      `should call _sendCmd with '${JabraChromeCommands.Hold}' when value is true`,
      async () => {
        jest.spyOn(jabraChromeService, '_sendCmd');
        await jabraChromeService.setHold(null, true);
        expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Hold);
      },
      ASYNC_TIMEOUT
    );
    it(
      `should call _sendCmd with '${JabraChromeCommands.Resume}' when value is false`,
      async () => {
        jest.spyOn(jabraChromeService, '_sendCmd');
        await jabraChromeService.setHold(null, false);
        expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Resume);
      },
      ASYNC_TIMEOUT
    );
  });

  describe('incomingCall', () => {
    it('should not call _sendCmd when hasOtherActiveCalls is true', async () => {
      const opts = { hasOtherActiveCalls: true };
      jest.spyOn(jabraChromeService, '_sendCmd');

      await jabraChromeService.incomingCall(opts);

      expect(jabraChromeService._sendCmd).not.toHaveBeenCalled();
    });
    it('should call _sendCmd when hasOtherActiveCalls is false', async () => {
      const opts = { hasOtherActiveCalls: false };
      jest.spyOn(jabraChromeService, '_sendCmd');

      await jabraChromeService.incomingCall(opts);

      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Ring);
    });
  });

  describe('answerCall', () => {
    it(`should call _sendCmd with '${JabraChromeCommands.Offhook}'`, async () => {
      jest.spyOn(jabraChromeService, '_sendCmd');
      await jabraChromeService.answerCall();
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Offhook);
    });
  });

  describe('outgoingCall', () => {
    it(`should call _sendCmd with '${JabraChromeCommands.Offhook}'`, async () => {
      jest.spyOn(jabraChromeService, '_sendCmd');
      await jabraChromeService.outgoingCall();
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Offhook);
    });
  });

  describe('endCall', () => {
    it('should do nothing if hasOtherActiveCalls is true', async () => {
      jest.spyOn(jabraChromeService, '_getHeadsetIntoVanillaState');
      jest.spyOn(jabraChromeService, '_sendCmd');

      await jabraChromeService.endCall(null, true);

      expect(jabraChromeService._getHeadsetIntoVanillaState).not.toHaveBeenCalled();
      expect(jabraChromeService._sendCmd).not.toHaveBeenCalled();
    });
    it(`should call put the headset into its vanilla state and call _sendCmd with ${JabraChromeCommands.Onhook}`, async () => {
      jest.spyOn(jabraChromeService, '_getHeadsetIntoVanillaState');
      jest.spyOn(jabraChromeService, '_sendCmd');

      await jabraChromeService.endCall(null, false);

      expect(jabraChromeService._getHeadsetIntoVanillaState).toHaveBeenCalled();
      expect(jabraChromeService._sendCmd).toHaveBeenCalled();
    });
  });

  describe('endAllCalls', () => {
    it(`should call _sendCmd with '${JabraChromeCommands.Onhook}'`, async () => {
      jest.spyOn(jabraChromeService, '_sendCmd');
      await jabraChromeService.endAllCalls();
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.Onhook);
    });
  });

  describe('_handleGetActiveDevice', () => {
    it('should log a debug message with the passed in data', () => {
      const data = 'newDeviceId';
      jest.spyOn(mockLogger, 'debug');

      jabraChromeService._handleGetActiveDevice(data);

      expect(mockLogger.debug).toHaveBeenCalledWith('active device info', data);
    });
    it('should log a debug message with the passed in data', () => {
      const data = 'newDevideId';
      jabraChromeService._handleGetActiveDevice(data);
      expect(jabraChromeService.activeDeviceId).toEqual(data);
    });
  });

  describe('_handleGetDevices', () => {
    it('should log a debug messgae of the device list', () => {
      jest.spyOn(mockLogger, 'debug');
      jabraChromeService._handleGetDevices('1,2,3,4,5,6,7,8,9');
      expect(mockLogger.debug).toHaveBeenCalled();
    });
    it('should create a map of the devices from the provided data', () => {
      const device1 = ['device1Id', 'device1Name'];
      const device2 = ['device2Id', 'device2Name'];
      const device3 = ['device3Id', 'device3Name'];
      const deviceList = `${device1[0]},${device1[1]},${device2[0]},${device2[1]},${device3[0]},${device3[1]}`;

      jabraChromeService._handleGetDevices(deviceList);

      expect(jabraChromeService.devices.get(device1[0])).toEqual({
        deviceId: device1[0],
        deviceName: device1[1],
      });
      expect(jabraChromeService.devices.get(device2[0])).toEqual({
        deviceId: device2[0],
        deviceName: device2[1],
      });
      expect(jabraChromeService.devices.get(device3[0])).toEqual({
        deviceId: device3[0],
        deviceName: device3[1],
      });
    });
  });

  describe('_deviceAttached', () => {
    it(`should send a '${JabraChromeCommands.GetActiveDevice}' command`, () => {
      jest.spyOn(jabraChromeService, '_sendCmd');
      jabraChromeService._deviceAttached();
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.GetActiveDevice);
    });
    it(`should send a '${JabraChromeCommands.GetDevices}' command`, () => {
      jest.spyOn(jabraChromeService, '_sendCmd');
      jabraChromeService._deviceAttached();
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.GetDevices);
    });
  });

  describe('_deviceDetached', () => {
    it('should set devices and activeDeviceId to null', () => {
      jabraChromeService.devices = new Map();
      jabraChromeService.activeDeviceId = 'abcdefg';

      jabraChromeService._deviceDetached();

      expect(jabraChromeService.devices).toBeNull();
      expect(jabraChromeService.activeDeviceId).toBeNull();
    });
    it(`should call _sendCmd with ${JabraChromeCommands.GetActiveDevice} and ${JabraChromeCommands.GetDevices}`, () => {
      jest.spyOn(jabraChromeService, '_sendCmd');

      jabraChromeService._deviceDetached();

      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.GetActiveDevice);
      expect(jabraChromeService._sendCmd).toHaveBeenCalledWith(JabraChromeCommands.GetDevices);
    });
  });

  describe('_processEvent', () => {
    describe('Mute', () => {
      it('should call setMute(true) and deviceMuteChanged(true)', () => {
        jest.spyOn(jabraChromeService, 'setMute');
        jest.spyOn(jabraChromeService, 'deviceMuteChanged');

        jabraChromeService._processEvent('Mute');

        expect(jabraChromeService.setMute).toHaveBeenCalledWith(true);
        expect(jabraChromeService.deviceMuteChanged).toHaveBeenCalledWith(true);
      });
    });
    describe('Unmute', () => {
      it('should call setMute(false) and deviceMuteChanged(false)', () => {
        jest.spyOn(jabraChromeService, 'setMute');
        jest.spyOn(jabraChromeService, 'deviceMuteChanged');

        jabraChromeService._processEvent('Unmute');

        expect(jabraChromeService.setMute).toHaveBeenCalledWith(false);
        expect(jabraChromeService.deviceMuteChanged).toHaveBeenCalledWith(false);
      });
    });
    describe('AcceptCall', () => {
      it('should call deviceAnsweredCall', () => {
        jest.spyOn(jabraChromeService, 'deviceAnsweredCall');
        jabraChromeService._processEvent('AcceptCall');
        expect(jabraChromeService.deviceAnsweredCall).toHaveBeenCalledTimes(1);
      });
    });
    describe('TerminateCall', () => {
      it('should call _getHeadsetIntoVanillaState and deviceEndedCall', () => {
        jest.spyOn(jabraChromeService, '_getHeadsetIntoVanillaState');
        jest.spyOn(jabraChromeService, 'deviceEndedCall');

        jabraChromeService._processEvent('TerminateCall');

        expect(jabraChromeService._getHeadsetIntoVanillaState).toHaveBeenCalledTimes(1);
        expect(jabraChromeService.deviceEndedCall).toHaveBeenCalledTimes(1);
      });
    });
    describe('IgnoreCall', () => {
      it('should call deviceRejectedCall()', () => {
        jest.spyOn(jabraChromeService, 'deviceRejectedCall');
        jabraChromeService._processEvent('IgnoreCall');
        expect(jabraChromeService.deviceRejectedCall).toHaveBeenCalledTimes(1);
      });
    });
    describe('Flash', () => {
      it('should call deviceHoldStatusChanged()', () => {
        jest.spyOn(jabraChromeService, 'deviceHoldStatusChanged');
        jabraChromeService._processEvent('Flash');
        expect(jabraChromeService.deviceHoldStatusChanged).toHaveBeenCalledTimes(1);
      });
    });
    describe('Attached', () => {
      it('should call _deviceAttached', () => {
        jest.spyOn(jabraChromeService, '_deviceAttached');
        jabraChromeService._processEvent('Attached');
        expect(jabraChromeService._deviceAttached).toHaveBeenCalledTimes(1);
      });
    });
    describe('Detached', () => {
      it('should call _deviceDetached', () => {
        jest.spyOn(jabraChromeService, '_deviceDetached');
        jabraChromeService._processEvent('Detached');
        expect(jabraChromeService._deviceDetached).toHaveBeenCalledTimes(1);
      });
    });
  });
});
