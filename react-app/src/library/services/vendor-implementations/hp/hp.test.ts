// import fetchJsonp from 'fetch-jsonp';
import "whatwg-fetch";
import 'regenerator-runtime';
import { mockLogger, eventValidation } from "../../../test-utils";
import { UpdateReasons } from '../../../types/headset-states';
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

  describe('isSupported', () => {
    it('should return false if the proper values are not met', () => {
      expect(hpService.isSupported()).toBe(false);
    });

    it('should return true if the proper values are met', () => {
      hpService.config = { logger: console, useNewPolyImplementation: true };
      expect(hpService.isSupported()).toBe(true);
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

  describe('deviceInfo', () => {
    it('should return _deviceInfo', () => {
      const device: DeviceInfo = {
        ProductName: 'Poly Headset',
        deviceId: '123',
        attached: true,
      };
      hpService._deviceInfo = device;

      expect(hpService.deviceInfo).toBe(device);

      expect(hpService.isDeviceAttached).toBe(true);
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

    it('should clear connectionTimer', () => {
      jest.useFakeTimers();
      hpService.connectionTimer = setTimeout(() => {}, 30000);
      hpService.disconnect();
      expect(mockDisconnectHeadset).not.toBeCalled();
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe('When connected', () => {
    beforeEach(() => {
      hpService.isConnected = true;
      mockDisconnectHeadset.mockClear();
    });

    it('should call the SDK when disconnect is called', async () => {
      await hpService.disconnect();
      expect(mockDisconnectHeadset).toBeCalled();
    });

    it('should not call the SDK when disconnect is called with reason alternativeClient', async () => {
      await hpService.disconnect('alternativeClient');
      expect(mockDisconnectHeadset).not.toBeCalled();
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

    it('will notify the when a disconnection has happened.', async () => {
      const deviceStatusEvent = eventValidation(hpService, 'deviceConnectionStatusChanged');
      hpService.isConnected = true;
      const sdkevent = SdkEvent.DISCONNECT;
      await hpService.sdkEventHandler(sdkevent);
      expect(hpService.isConnected).toBe(false);
      expect(hpService.isConnecting).toBe(false);
      await deviceStatusEvent;
    });

  });

  describe('Connecting a device', () => {
    const testDevice = { productName: 'testDevice1' };
    let getDevicesDevice = testDevice;

    Object.defineProperty(window.navigator, 'hid', {
      get: () => ({
        getDevices: () => { return [getDevicesDevice as any]; },
        requestDevice: () => { return [getDevicesDevice as any]; }
      }),
      configurable: true
    });

    it('that has been previously authed call the sdk and set the correct states.', async () => {

      await hpService.connect(testDevice.productName);
      expect(mockConnectHeadset).toBeCalledWith(testDevice);
      expect(mockRegisterEventHandler).toBeCalled();
      expect(hpService.isConnecting).toBe(true);
      expect(hpService.isConnected).toBe(false);
      expect(hpService._device).toEqual(testDevice);
    });

    it('that has been previously authed but is rejected by sdk.', async () => {
      (mockConnectHeadset as jest.Mock).mockReturnValueOnce(false);

      await hpService.connect(testDevice.productName);
      expect(mockConnectHeadset).toBeCalledWith(testDevice);
      expect(mockRegisterEventHandler).toBeCalled();
      expect(hpService.isConnecting).toBe(false);
      expect(hpService.isConnected).toBe(false);
    });

    it('that has not been previously authed.', async () => {
      getDevicesDevice = null;

      (mockConnectHeadset as jest.Mock).mockReturnValue(false);

      await hpService.connect(testDevice.productName);
      expect(mockConnectHeadset).toBeCalledWith(testDevice);
      expect(mockRegisterEventHandler).toBeCalled();
      expect(hpService.isConnecting).toBe(true);
      expect(hpService.isConnected).toBe(false);

      // Test the case where requesting permissions fails.
      const originalRequestWebHidPermissions = (hpService as any).requestWebHidPermissions;
      (hpService as any).requestWebHidPermissions = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await hpService.connect(testDevice.productName);
      expect(hpService.isConnecting).toBe(false);
      expect(hpService.isConnected).toBe(false);

      (hpService as any).requestWebHidPermissions = originalRequestWebHidPermissions;

      // Test the case where webHidPairing is called.
      await hpService.webHidPairing();
      expect(hpService.isConnecting).toBe(false);

      // Test webHidPairing does not return a device, but connect fails.
      hpService.isConnecting = true;
      await hpService.webHidPairing();
      expect(hpService.isConnecting).toBe(false);

      // Test webHidPairing returns device, but connect fails.
      getDevicesDevice = testDevice;
      hpService.isConnecting = true;
      await hpService.webHidPairing();
      expect(hpService.isConnecting).toBe(false);

      // Test webHidPairing with a device now available.
      (mockConnectHeadset as jest.Mock).mockReturnValue(true);
      getDevicesDevice = testDevice;
      await hpService.webHidPairing();
      expect(hpService.isConnecting).toBe(true);

      // Test webHidPairing returns a different device than requested.
      hpService.pendingDeviceLabel = 'another device';
      try {
        await hpService.webHidPairing();
      } catch (err) {
        expect(hpService.isConnecting).toBe(false);
        expect(err).toBeDefined();
      }

    });

    it('should timeout and clear isConnecting after 30 seconds if no device is connected.', async () => {
      jest.useFakeTimers();
      getDevicesDevice = testDevice;
      (mockConnectHeadset as jest.Mock).mockReturnValue(true);
      await hpService.connect(testDevice.productName);
      expect(hpService.isConnecting).toBe(true);
      jest.advanceTimersByTime(30000);
      expect(hpService.isConnecting).toBe(false);
      expect(hpService.pendingDeviceLabel).toBe(null);
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should not change status when connection timer fires after isConnecting is already false.', async () => {
      jest.useFakeTimers();
      getDevicesDevice = testDevice;
      (mockConnectHeadset as jest.Mock).mockReturnValue(true);
      await hpService.connect(testDevice.productName);
      hpService.isConnecting = false;
      jest.advanceTimersByTime(30000);
      expect(hpService.isConnecting).toBe(false);
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should return null when requested match is not found.', async () => {
      const hidGetMock = jest.spyOn(window.navigator as any, 'hid', 'get').mockReturnValue({
        getDevices: () => [{ productName: 'differentDevice' }]
      } as any);
      const result = await hpService.getPreviouslyConnectedDevice('testDevice1');
      expect(result).toBeNull();
      hidGetMock.mockRestore();
    });

    it('will reject and update status when requestDevice errors in webHidPairing.', async () => {
      const error = new Error('requestDevice failed');
      hpService.isConnecting = true;
      const hidGetMock = jest.spyOn(window.navigator as any, 'hid', 'get').mockReturnValue({
        requestDevice: () => Promise.reject(error)
      } as any);
      try {
        await hpService.webHidPairing();
      } catch (err) {
        expect(err).toBe(error);
        expect(hpService.isConnecting).toBe(false);
        expect(hpService.pendingDeviceLabel).toBe(null);
      } finally {
        hidGetMock.mockRestore();
      }
    });

    it('should match a previously connected device excluding anything after "/".', async () => {
      const slashDevice = { productName: 'testDevice1/extra' };
      const hidGetMock = jest.spyOn(window.navigator as any, 'hid', 'get').mockReturnValue({
        getDevices: () => [slashDevice],
        requestDevice: () => [slashDevice]
      });
      (mockConnectHeadset as jest.Mock).mockReturnValue(true);
      await hpService.connect('testDevice1');
      expect(hpService._device).toEqual(slashDevice);
      hidGetMock.mockRestore();
    });

    it('will split productName on "/" when connecting via request permissions.', async () => {
      const slashDevice = { productName: 'testDevice-1/extra' };
      (mockConnectHeadset as jest.Mock).mockReturnValue(true);
      const hidGetMock = jest.spyOn(window.navigator as any, 'hid', 'get').mockReturnValue({
        requestDevice: () => [slashDevice]
      } as any);
      await hpService.webHidPairing();
      expect(hpService._device).toEqual(slashDevice);
      hidGetMock.mockRestore();
    });

    it('will clear connectionTimer and set connecting to false when requestDevice errors.', async () => {
      const error = new Error('requestDevice failed');
      jest.useFakeTimers();
      hpService.connectionTimer = setTimeout(() => {}, 30000);
      const hidGetMock = jest.spyOn(window.navigator as any, 'hid', 'get').mockReturnValue({
        requestDevice: () => Promise.reject(error)
      } as any);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      hpService.isConnecting = true;
      try {
        await hpService.webHidPairing();
      } catch (err) {
        expect(err).toBe(error);
        expect(hpService.pendingDeviceLabel).toBe(null);
        expect(clearTimeoutSpy).toBeCalledWith(hpService.connectionTimer);
        expect(hpService.isConnecting).toBe(false);
      } finally {
        hidGetMock.mockRestore();
        clearTimeoutSpy.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    });

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

    it('will call deviceAnsweredCall', async () => {
      const deviceAnsweredCallSpy = jest.spyOn(hpService, 'deviceAnsweredCall');
      hpService.incomingConversationId = callInfo['conversationId'];
      const sdkevent = SdkEvent.ANSWER;
      await hpService.sdkEventHandler(sdkevent);
      expect(deviceAnsweredCallSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent });
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.ACTIVE);

      /* Calling answer again with the same id should not increase active calls */
      hpService.incomingConversationId = callInfo['conversationId'];
      await hpService.sdkEventHandler(sdkevent);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.ACTIVE);
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

    it('will not call deviceHoldStatusChanged to resume when there is no held call (flash)', async () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      const sdkevent = SdkEvent.FLASH;
      await hpService.sdkEventHandler(sdkevent);
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

    it('will call deviceHoldStatusChanged to hold an active call and answer incoming with flash', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(hpService, 'deviceHoldStatusChanged');
      const deviceAnsweredCallSpy = jest.spyOn(hpService, 'deviceAnsweredCall');
      hpService.incomingConversationId = 'convoId2';
      hpService.activeConversationIds.push(callInfo['conversationId']);
      const sdkevent = SdkEvent.FLASH;
      hpService.sdkEventHandler(sdkevent);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({ conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "holdRequested": true });
      expect(deviceAnsweredCallSpy).toHaveBeenCalledWith({ conversationId: 'convoId2', name: SdkEvent[sdkevent], code: sdkevent });
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(hpService.heldConversationIds.length).toBe(1);
      expect(mockSetCallState).toBeCalledWith(CallState.ACTIVE_AND_HELD);
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
      await hpService.sdkEventHandler(sdkevent);
      expect(deviceMuteChangedSpy).toHaveBeenNthCalledWith(1, { conversationId: callInfo['conversationId'], name: SdkEvent[sdkevent], code: sdkevent, "isMuted": true });
      expect(mockSetMuteState).toBeCalled();
      await deviceMutedEvent;

      // Test mute event with no active call
      hpService.activeConversationIds.pop();
      await hpService.sdkEventHandler(sdkevent);
      expect(deviceMuteChangedSpy).toHaveBeenNthCalledWith(2, { conversationId: undefined, name: SdkEvent[sdkevent], code: sdkevent, "isMuted": true });
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

    it('will not update state when invalid event is sent', async () => {
      const sdkevent = SdkEvent.INVALID;
      await hpService.sdkEventHandler(sdkevent);
      expect(mockSetCallState).not.toBeCalled();
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

    it('will inform the headset of an incoming call.', async () => {
      /* Test no call info */
      try {
        await hpService.incomingCall(null);
      } catch (err) {
        expect(hpService.incomingConversationId).toBe(null);
        expect(err).toBeDefined();
      }

      /* Normal test */
      await hpService.incomingCall(callInfo);
      expect(hpService.incomingConversationId).toBe(callInfo['conversationId']);
      expect(mockSetCallState).toBeCalledWith(CallState.INCOMING);

      /* Test another incoming call while one is already incoming */
      const callInfo2 = { conversationId: 'convoId2' };
      await hpService.incomingCall(callInfo2);
      expect(hpService.incomingConversationId).toBe(callInfo2['conversationId']);
      expect(mockSetCallState).toBeCalledWith(CallState.INCOMING);
    });

    it('will inform the headset of an incoming call when call is already active.', async () => {
      hpService.activeConversationIds.push(callInfo['conversationId']);

      /* Test another incoming call while one is already active */
      const callInfo2 = { conversationId: 'convoId2' };
      await hpService.incomingCall(callInfo2);
      expect(hpService.incomingConversationId).toBe(callInfo2['conversationId']);
      expect(mockSetCallState).toBeCalledWith(CallState.ACTIVE_AND_INCOMING);
    });

    it('will send idle for end call even with no active call.', async () => {
      await hpService.endCall(null);
      expect(mockSetCallState).toBeCalledWith(CallState.IDLE);
      expect(hpService.activeConversationIds.length).toBe(0);
    });

    it('will send the correct states for incoming call, answer then end for a single call.', async () => {
      await hpService.incomingCall(callInfo);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.INCOMING);
      expect(hpService.incomingConversationId).toBe(callInfo['conversationId']);

      await hpService.answerCall(callInfo['conversationId'], false);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.ACTIVE);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);

      /* Calling answer again with the same id should not increase active calls */
      await hpService.answerCall(callInfo['conversationId'], false);
      expect(mockSetCallState).toHaveBeenNthCalledWith(3, CallState.ACTIVE);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);

      await hpService.endCall(callInfo['conversationId']);
      expect(mockSetCallState).toHaveBeenNthCalledWith(4, CallState.IDLE);
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
      try {
        await hpService.outgoingCall(null);
      } catch (err) {
        expect(hpService.activeConversationIds.length).toBe(0);
        expect(err).toBeDefined();
      }
      await hpService.outgoingCall(callInfo);
      expect(hpService.incomingConversationId).toBe(null);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(1, CallState.ACTIVE);
      expect(hpService.heldConversationIds.length).toBe(0);

      /* Calling outgoing again with the same id should not increase active calls */
      await hpService.outgoingCall(callInfo);
      expect(hpService.activeConversationIds.length).toBe(1);
      expect(mockSetCallState).toHaveBeenNthCalledWith(2, CallState.ACTIVE);
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