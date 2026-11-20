import DellService from './dell';
import * as utils from '../../../utils';

const VENDOR_ID = 0x413c;
const PRODUCT_ID = 0xa53a;
const NEW_PRODUCT_ID = 0xa53c;
const REPORT_ID = 0x05;
const PRODUCT_NAME = 'Dell Pro Wired Headset WH327';

const createMockDevice = (overrides: Record<string, any> = {}) => {
  let inputReportHandler: ((event: any) => void) | undefined;
  const device = {
    vendorId: VENDOR_ID,
    productId: PRODUCT_ID,
    productName: PRODUCT_NAME,
    opened: false,
    collections: [{
      usagePage: 0x000b,
      usage: 0x0005,
      inputReports: [{ reportId: REPORT_ID }],
    }],
    open: jest.fn(async function (this: any) { this.opened = true; }),
    close: jest.fn(async function (this: any) { this.opened = false; }),
    sendReport: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn((eventName: string, handler: (event: any) => void) => {
      if (eventName === 'inputreport') inputReportHandler = handler;
    }),
    removeEventListener: jest.fn(),
    emitInputReport: (value: number, reportId = REPORT_ID) => inputReportHandler?.({
      reportId,
      data: { getUint8: jest.fn(() => value) },
    }),
    ...overrides,
  };

  return device;
};

const createDellService = () => {
  (DellService as any).instance = undefined;
  return DellService.getInstance({ logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }, createNew: true });
};

describe('DellService', () => {
  let dellService: DellService;
  let devices: any[];
  let requestedDevices: any[];
  let requestDevice: jest.Mock;

  beforeEach(() => {
    dellService = createDellService();
    devices = [];
    requestedDevices = [];
    requestDevice = jest.fn(async () => {
      devices = requestedDevices;
    });

    Object.defineProperty(window.navigator, 'hid', {
      configurable: true,
      value: {
        getDevices: jest.fn(async () => devices),
        requestDevice,
      },
    });
    jest.spyOn(utils, 'checkWebHidSupport').mockReturnValue(true);
  });

  afterEach(async () => {
    if (dellService?.isConnected || dellService?.isConnecting) {
      await dellService.disconnect();
    }
    jest.restoreAllMocks();
  });

  describe('singleton and support', () => {
    it('returns the same instance unless createNew is requested', () => {
      expect(DellService.getInstance({ logger: console })).toBe(dellService);
      expect(DellService.getInstance({ logger: console, createNew: true })).not.toBe(dellService);
    });

    it('reports WebHID support and recognizes both Dell product IDs', () => {
      expect(dellService.isSupported()).toBe(true);
      expect(dellService.deviceLabelMatchesVendor('Dell Pro Wired Headset WH327')).toBe(true);
      expect(dellService.deviceLabelMatchesVendor('USB Headset (413c:a53a)')).toBe(true);
      expect(dellService.deviceLabelMatchesVendor('USB Headset (413c:a53c)')).toBe(true);
      expect(dellService.deviceLabelMatchesVendor('Unrelated headset')).toBe(false);
    });
  });

  describe('connect', () => {
    it.each([PRODUCT_ID, NEW_PRODUCT_ID])('connects to Dell device product ID %s', async (productId) => {
      const device = createMockDevice({ productId });
      devices = [device];
      const statusSpy = jest.spyOn(dellService, 'changeConnectionStatus');

      await dellService.connect(PRODUCT_NAME);

      expect(device.open).toHaveBeenCalledTimes(1);
      expect(device.addEventListener).toHaveBeenCalledWith('inputreport', expect.any(Function));
      expect(dellService.deviceInfo).toEqual({ ProductName: PRODUCT_NAME, deviceName: PRODUCT_NAME, attached: true });
      expect(dellService.isDeviceAttached).toBe(true);
      expect(statusSpy).toHaveBeenLastCalledWith({ isConnected: true, isConnecting: false });
    });

    it('uses WebHID permission request filters for both product IDs when the device is not pre-authorized', async () => {
      const device = createMockDevice({ productId: NEW_PRODUCT_ID });
      requestedDevices = [device];
      const permissionRequested = new Promise<() => Promise<void>>((resolve) => {
        dellService.once('webHidPermissionRequested', (event: any) => resolve(event.body.callback));
      });

      const connectPromise = dellService.connect(PRODUCT_NAME);
      const grantPermission = await permissionRequested;
      await grantPermission();
      await connectPromise;

      expect(requestDevice).toHaveBeenCalledWith({ filters: [
        { vendorId: VENDOR_ID, productId: PRODUCT_ID },
        { vendorId: VENDOR_ID, productId: NEW_PRODUCT_ID },
      ] });
      expect(dellService.isConnected).toBe(true);
    });

    it('does not connect when no device is available after permission is granted', async () => {
      requestedDevices = [];
      const permissionRequested = new Promise<() => Promise<void>>((resolve) => {
        dellService.once('webHidPermissionRequested', (event: any) => resolve(event.body.callback));
      });

      const connectPromise = dellService.connect(PRODUCT_NAME);
      const grantPermission = await permissionRequested;
      await grantPermission();
      await connectPromise;

      expect(dellService.isConnected).toBe(false);
      expect(dellService.isConnecting).toBe(false);
      expect(dellService.isDeviceAttached).toBe(false);
    });

    it.each([
      ['wrong product ID', { productId: 0xffff }],
      ['wrong usage', { collections: [{ usagePage: 0x000b, usage: 0x0001, inputReports: [{ reportId: REPORT_ID }] }] }],
      ['missing input reports', { collections: [{ usagePage: 0x000b, usage: 0x0005, inputReports: [] }] }],
      ['wrong report ID', { collections: [{ usagePage: 0x000b, usage: 0x0005, inputReports: [{ reportId: 0x04 }] }] }],
    ])('rejects a device with %s', async (_reason, overrides) => {
      const device = createMockDevice(overrides);
      devices = [device];
      requestedDevices = [];
      const permissionRequested = new Promise<() => Promise<void>>((resolve) => {
        dellService.once('webHidPermissionRequested', (event: any) => resolve(event.body.callback));
      });

      const connectPromise = dellService.connect(PRODUCT_NAME);
      const grantPermission = await permissionRequested;
      await grantPermission();
      await connectPromise;

      expect(device.open).not.toHaveBeenCalled();
      expect(dellService.isConnected).toBe(false);
      expect(dellService.isDeviceAttached).toBe(false);
    });

    it('does not reopen a device that is already open', async () => {
      const device = createMockDevice({ opened: true });
      devices = [device];

      await dellService.connect(PRODUCT_NAME);

      expect(device.open).not.toHaveBeenCalled();
      expect(dellService.isConnected).toBe(true);
    });

    it('disconnects, closes the device, and clears device state', async () => {
      const device = createMockDevice();
      devices = [device];
      await dellService.connect(PRODUCT_NAME);

      await dellService.disconnect();

      expect(device.removeEventListener).toHaveBeenCalledWith('inputreport', expect.any(Function));
      expect(device.close).toHaveBeenCalledTimes(1);
      expect(dellService.deviceInfo).toBeNull();
      expect(dellService.isDeviceAttached).toBe(false);
      expect(dellService.isConnected).toBe(false);
    });
  });

  describe('HID reports and call state synchronization', () => {
    let device: ReturnType<typeof createMockDevice>;

    beforeEach(async () => {
      device = createMockDevice();
      devices = [device];
      await dellService.connect(PRODUCT_NAME);
    });

    it('uses the descriptor Report ID for output reports and sends incoming/answer call state', async () => {
      await dellService.incomingCall({ conversationId: 'incoming-1' });
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0100]));

      await dellService.answerCall('incoming-1');
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0001]));
    });

    it('synchronizes outgoing call, hold, mute, and end call state to the headset', async () => {
      await dellService.outgoingCall({ conversationId: 'outgoing-1' });
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0001]));

      await dellService.setHold('outgoing-1', true);
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b1001]));

      await dellService.setMute(true);
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b1011]));

      await dellService.endCall('outgoing-1');
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0010]));
    });

    it('emits answer and hangup events when the off-hook bit changes', async () => {
      const answerHandler = jest.fn();
      const endedHandler = jest.fn();
      dellService.on('deviceAnsweredCall', answerHandler);
      dellService.on('deviceEndedCall', endedHandler);
      await dellService.incomingCall({ conversationId: 'button-call' });

      device.emitInputReport(0b0001);
      expect(answerHandler).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({ name: 'OffHook', conversationId: 'button-call' }),
      }));

      device.emitInputReport(0);
      expect(endedHandler).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({ name: 'OnHook', conversationId: 'button-call' }),
      }));
    });

    it('emits mute events and toggles mute state from the headset mute button', async () => {
      await dellService.outgoingCall({ conversationId: 'mute-call' });
      const muteHandler = jest.fn();
      dellService.on('deviceMuteStatusChanged', muteHandler);

      device.emitInputReport(0b0011);
      expect(muteHandler).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({ isMuted: true, conversationId: 'mute-call' }),
      }));
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0011]));

      device.emitInputReport(0b0001);
      device.emitInputReport(0b0011);
      expect(muteHandler).toHaveBeenLastCalledWith(expect.objectContaining({
        body: expect.objectContaining({ isMuted: false, conversationId: 'mute-call' }),
      }));
      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0001]));
    });

    it('ignores reports with a different Report ID', async () => {
      const answerHandler = jest.fn();
      dellService.on('deviceAnsweredCall', answerHandler);
      await dellService.incomingCall({ conversationId: 'wrong-report' });

      device.emitInputReport(0b0001, 0x04);

      expect(answerHandler).not.toHaveBeenCalled();
    });

    it('ends all calls and clears the call flags', async () => {
      await dellService.outgoingCall({ conversationId: 'active-call' });
      await dellService.setMute(true);
      await dellService.setHold('active-call', true);

      await dellService.endAllCalls();

      expect(device.sendReport).toHaveBeenLastCalledWith(REPORT_ID, new Uint8Array([0b0010]));
    });
  });
});
