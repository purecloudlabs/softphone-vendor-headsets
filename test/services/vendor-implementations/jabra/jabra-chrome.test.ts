import JabraChromeService from '../../../../src/services/vendor-implementations/jabra/jabra-chrome/jabra-chrome';
import DeviceInfo from '../../../../src/models/device-info';
import { mockLogger } from '../../test-utils';
import { JabraChromeCommands } from '../../../../src/services/vendor-implementations/jabra/jabra-chrome/jabra-chrome-commands';
import { Subscription } from 'rxjs';
import { JabraChromeRequestedEvents } from '../../../../src/services/vendor-implementations/jabra/jabra-chrome/jabra-chrome-requested-events';

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
  service.Logger = mockLogger;
  service.logHeadsetEvents = false;
}

function populateDevices(service: JabraChromeService): void {
  service.devices.set(testDevice1.deviceName, testDevice1);
  service.devices.set(testDevice2.deviceName, testDevice2);
  service.devices.set(testDevice3.deviceName, testDevice3);
}

describe('JabraChromeService', () => {
  let jabraChromeService: JabraChromeService;

  beforeEach(() => {
    jabraChromeService = JabraChromeService.getInstance();
    resetJabraChromeService(jabraChromeService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('instantiation', () => {
    it('should be a singleton', () => {
      const jabraChromeService2 = JabraChromeService.getInstance();

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
        message: JabraChromeCommands.Hold,
      };

      jabraChromeService._sendCmd(JabraChromeCommands.Hold);

      expect(window.postMessage).toHaveBeenCalledWith(expectedMessage, '*');
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

      it(
        'should emit a headset event with event.data.message if logHeadsetEvents is true',
        done => {
          jabraChromeService.logHeadsetEvents = true;
          event.data.message = 'test message';
          headsetEventSubscription = jabraChromeService.headsetEvents.subscribe(headsetEvent => {
            expect(headsetEvent).toBeTruthy();
            expect(headsetEvent.event).toEqual('test message');
            done();
          });

          jabraChromeService._messageHandler(event);
        },
        ASYNC_TIMEOUT
      );
      describe(`event.data.message starts with ${JabraChromeRequestedEvents.GetVersion}`, () => {
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
    });
  });

  // describe('_timeoutConnectTask', () => {

  // });

  // describe('connect', () => {

  // });

  // describe('disconnect', () => {

  // });

  // describe('setMute', () => {

  // });

  // describe('setHold', () => {

  // });

  // describe('incomingCall', () => {

  // });

  // describe('answerCall', () => {

  // });

  // describe('outgoingCall', () => {

  // });

  // describe('endCall', () => {

  // });

  // describe('endAllCalls', () => {

  // });

  // describe('async', () => {

  // });

  // describe('_handleDeviceConnectionFailure', () => {

  // });

  // describe('_handleGetActiveDevice', () => {

  // });

  // describe('_handleGetDevices', () => {

  // });

  // describe('_deviceAttached', () => {

  // });

  // describe('_deviceDetached', () => {

  // });
});
