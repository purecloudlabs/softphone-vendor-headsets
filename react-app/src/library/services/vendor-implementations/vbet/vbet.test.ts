import VBetService from './vbet';

const mockTestDevName = 'Test VBet Dev';
const mockDeviceList0 = [];
const mockDeviceList1 = [
  {
    open: jest.fn(),
    close: jest.fn(),
    sendReport: jest.fn(),
    addEventListener: jest.fn((name, callback) => {
      callback({
        reportId: 0x08,
        data: {
          getUint8: jest.fn(),
        },
      });
    }),
    productName: mockTestDevName,
    productId: 0x0001,
    collections: [
      {
        usage: 0x0005,
        usagePage: 0x000b,
        inputReports: [
          {
            reportId: 0x08,
          },
        ],
      },
    ],
  },
];

const mockDeviceList2 = [
  {
    open: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn((name, callback) => {
      callback({
        reportId: 0x01,
        data: {
          getUint8: jest.fn(),
        },
      });
    }),
    productName: mockTestDevName,
    collections: [
      {
        usage: 0,
        usagePage: 0,
      },
    ],
  },
];

const mockDeviceList3 = [
  {
    open: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn((name, callback) => {
      callback({
        reportId: 0x01,
        data: {
          getUint8: jest.fn(),
        },
      });
    }),
    productName: mockTestDevName,
    collections: [
      {
        usage: 0x0005,
        usagePage: 0x000b,
        inputReports: [],
      },
    ],
  },
];

const mockDeviceList5 = [
  {
    open: jest.fn(),
    close: jest.fn(),
    sendReport: jest.fn(),
    addEventListener: jest.fn((name, callback) => {
      callback({
        reportId: 0x01,
        data: {
          getUint8: jest.fn(),
        },
      });
    }),
    productName: mockTestDevName,
    productId: 0x0020,
    collections: [
      {
        usage: 0x0005,
        usagePage: 0x000b,
        inputReports: [
          {
            reportId: 0x01,
          },
        ],
      },
    ],
  },
];

const mockDeviceList6 = [
  {
    open: jest.fn(),
    close: jest.fn(),
    sendReport: jest.fn(),
    addEventListener: jest.fn((name, callback) => {
      callback({
        reportId: 0x01,
        data: {
          getUint8: jest.fn(),
        },
      });
    }),
    productName: mockTestDevName,
    productId: 0x0014,
    collections: [
      {
        usage: 0x0005,
        usagePage: 0x000b,
        inputReports: [
          {
            reportId: 0x01,
          },
        ],
      },
    ],
  },
];

const mockDeviceList7 = [
  {
    open: jest.fn(),
    close: jest.fn(),
    sendReport: jest.fn(),
    addEventListener: jest.fn((name, callback) => {
      callback({
        reportId: 0x05,
        data: {
          getUint8: jest.fn(),
        },
      });
    }),
    productName: mockTestDevName,
    productId: 0x0040,
    collections: [
      {
        usage: 0x0005,
        usagePage: 0x000b,
        inputReports: [
          {
            reportId: 0x05,
          },
        ],
      },
    ],
  },
];

const mockOffhookFlag = {
  BT100USeries: 0x04,
  CMEDIASeries: 0x01,
  DECTSeries: 0x02,
  ACTIONSeries: 0x20,
};
const mockOnhookFlag = {
  BT100USeries: 0x00,
  CMEDIASeries: 0x00,
  DECTSeries: 0x00,
  ACTIONSeries: 0x00,
};
const mockMuteFlag = {
  BT100USeries: 0x0c,
  CMEDIASeries: 0x14,
  DECTSeries: [0x03, 0x04],
  ACTIONSeries: [0x05, 0x01],
};
const mockReject = { BT100USeries: 0x10, ACTIONSeries: 0x08 };

describe('VBetservice', () => {
  let vbetService: VBetService;
  let mockDeviceList = mockDeviceList0;
  let mockReqDeviceList = mockDeviceList0;

  Object.defineProperty(window.navigator, 'hid', {
    get: () => ({
      getDevices: () => {
        return mockDeviceList;
      },
      requestDevice: () => {
        mockDeviceList = mockReqDeviceList;
      },
    }),
  });

  beforeEach(() => {
    mockDeviceList = mockDeviceList0;
    mockReqDeviceList = mockDeviceList0;
    vbetService = VBetService.getInstance({ logger: console });
  });

  afterEach(() => {
    vbetService = null;
    jest.restoreAllMocks();
  });

  describe('instantiation', () => {
    it('should be a singleton', () => {
      const vbetService2 = VBetService.getInstance({ logger: console });

      expect(vbetService).not.toBeFalsy();
      expect(vbetService2).not.toBeFalsy();
      expect(vbetService).toBe(vbetService2);
    });

    it('should have the correct vendorName', () => {
      expect(vbetService.vendorName).toEqual('VBet');
    });
  });

  describe('isSupported', () => {
    it('should return true if proper values are met', () => {
      expect(vbetService.isSupported()).toBe(true);
    });

    it('should return false if proper values are not met', () => {
      Object.defineProperty(window, '_HostedContextFunctions', { get: () => true });
      expect(vbetService.isSupported()).toBe(false);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    it('deviceLabelMatchesVendor', () => {
      let result;
      result = vbetService.deviceLabelMatchesVendor('Test vt Label');
      expect(result).toBe(true);

      result = vbetService.deviceLabelMatchesVendor('Something test');
      expect(result).toBe(false);
    });
  });

  describe('connect', () => {
    afterEach(() => {
      vbetService.disconnect();
    });

    it('should connect with previouslyConnectedDevice', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      mockDeviceList = mockDeviceList1;
      await vbetService.connect(mockTestDevName);
      const devName = vbetService.deviceInfo;
      expect(devName.ProductName).toBe(mockTestDevName);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('already have active device', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      mockDeviceList = mockDeviceList1;
      await vbetService.connect(mockTestDevName);
      await vbetService.connect(mockTestDevName);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('device usage not match', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList0;
        callback();
      });
      mockDeviceList = mockDeviceList2;
      await vbetService.connect(mockTestDevName);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('device inputReports is empty', async () => {
      vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList0;
        callback();
      });
      mockDeviceList = mockDeviceList3;
      await vbetService.connect(mockTestDevName);
      expect(vbetService.isConnected).toBe(true);
      expect(vbetService.isConnecting).toBe(false);
    });

    it('previouslyConnectedDevice not have device', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList0;
        callback();
      });
      mockDeviceList = mockDeviceList1;
      await vbetService.connect('test');
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, 30s timeout, failed to connect', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      jest.useFakeTimers();
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn(() => {
        jest.advanceTimersByTime(30100);
      }));

      await vbetService.connect(mockTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: true });
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('webhidRequest, connect success', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList1;
        callback();
      }));

      await vbetService.connect(mockTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('webhidRequest, connect fail', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn((callback) => {
        callback();
      }));

      await vbetService.connect(mockTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, connect fail, device name error', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList1;
        callback();
      }));

      await vbetService.connect('test');
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, connect fail, device usage error', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList2;
        callback();
      }));

      await vbetService.connect(mockTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, device inputReports is empty', async () => {
      vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList3;
        callback();
      });

      await vbetService.connect(mockTestDevName);
      expect(vbetService.isConnected).toBe(true);
      expect(vbetService.isConnecting).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('test disconnect', async () => {
      mockDeviceList = mockDeviceList1;
      vbetService.isConnecting = true;
      await vbetService.connect(mockTestDevName);
      await vbetService.disconnect();
      expect(vbetService.isConnecting).toBe(false);
      expect(vbetService.isConnected).toBe(false);
    });
  });

  describe('processBtnPress BT100USeries', () => {
    beforeEach(async () => {
      mockDeviceList = mockDeviceList1;
      await vbetService.connect(mockTestDevName);
    });

    afterEach(async () => {
      await vbetService.endAllCalls();
      await vbetService.disconnect();
    });

    it('activeDevice is null', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      await vbetService.disconnect();
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      expect(ansFun).not.toHaveBeenCalled();
    });

    it('test offhook', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test offhook but no active conversion id', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      expect(ansFun).not.toHaveBeenCalledWith('offHook');
      expect(devAnsFun).not.toHaveBeenCalled();
    });

    it('test onhook', async () => {
      const ansFun = jest.spyOn(vbetService, 'endCallFromDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceEndedCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      await vbetService.processBtnPress(mockOnhookFlag.BT100USeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test onhook but no active conversion id', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceEndedCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      vbetService.activeConversationId = null;
      await vbetService.processBtnPress(mockOnhookFlag.BT100USeries);
      expect(ansFun).not.toHaveBeenCalledWith('onHook');
      expect(devAnsFun).not.toHaveBeenCalled();
    });

    it('test mute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      await vbetService.processBtnPress(mockMuteFlag.BT100USeries);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: true,
        name: 'CallMuted',
        conversationId: 'id',
      });
    });

    it('test unmute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      await vbetService.processBtnPress(mockMuteFlag.BT100USeries);
      await vbetService.processBtnPress(mockMuteFlag.BT100USeries);
      expect(setMuteFun).toHaveBeenCalledTimes(2);
      expect(devMuteFun).toHaveBeenCalledTimes(2);
    });

    it('test rejectCall', async () => {
      const devRejectFun = jest.spyOn(vbetService, 'deviceRejectedCall');
      const setRejectFun = jest.spyOn(vbetService, 'rejectCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockReject.BT100USeries);
      expect(devRejectFun).toHaveBeenCalledWith({ name: 'Reject', conversationId: 'id' });
      expect(setRejectFun).toHaveBeenCalled();
    });

    it('test outgoing call', async () => {
      const ansFun = jest.spyOn(vbetService, 'endCallFromDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceEndedCall');
      await vbetService.outgoingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOnhookFlag.BT100USeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test auto answer call', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      await vbetService.answerCall('id', true);
      expect(ansFun).toHaveBeenCalledWith('ring');
      expect(ansFun).toHaveBeenCalledWith('offHook');
    });
  });

  describe('processBtnPress CMEDIASeries', () => {
    beforeEach(async () => {
      mockDeviceList = mockDeviceList5;
      await vbetService.connect(mockTestDevName);
    });

    afterEach(async () => {
      await vbetService.endAllCalls();
      await vbetService.disconnect();
    });

    it('activeDevice is null', async () => {
      await vbetService.disconnect();
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      await vbetService.processBtnPress(mockOffhookFlag.CMEDIASeries);
      expect(ansFun).not.toHaveBeenCalled();
    });

    it('test offhook', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.CMEDIASeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test mute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.CMEDIASeries);
      await vbetService.processBtnPress(mockMuteFlag.CMEDIASeries);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: true,
        name: 'CallMuted',
        conversationId: 'id',
      });
    });

    it('test mute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.CMEDIASeries);
      await vbetService.processBtnPress(0x08);
      await vbetService.processBtnPress(0x00);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: true,
        name: 'CallMuted',
        conversationId: 'id',
      });
    });

    it('test outgoing call', async () => {
      const ansFun = jest.spyOn(vbetService, 'endCallFromDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceEndedCall');
      await vbetService.outgoingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOnhookFlag.CMEDIASeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });
  });

  describe('processBtnPress DECTSeries', () => {
    beforeEach(async () => {
      mockDeviceList = mockDeviceList6;
      await vbetService.connect(mockTestDevName);
    });

    afterEach(async () => {
      await vbetService.endAllCalls();
      await vbetService.disconnect();
    });

    it('activeDevice is null', async () => {
      await vbetService.disconnect();
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      await vbetService.processBtnPress(mockOffhookFlag.DECTSeries);
      expect(ansFun).not.toHaveBeenCalled();
    });

    it('test offhook', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.DECTSeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test mute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.DECTSeries);
      await vbetService.processBtnPress(mockMuteFlag.DECTSeries[0]);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: true,
        name: 'CallMuted',
        conversationId: 'id',
      });
    });

    it('test unmute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.DECTSeries);
      await vbetService.processBtnPress(mockMuteFlag.DECTSeries[1]);
      expect(setMuteFun).toHaveBeenCalledWith(false);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: false,
        name: 'CallUnmuted',
        conversationId: 'id',
      });
    });

    it('test outgoing call', async () => {
      const ansFun = jest.spyOn(vbetService, 'endCallFromDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceEndedCall');
      await vbetService.outgoingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOnhookFlag.DECTSeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });
  });

  describe('processBtnPress ACTIONSeries', () => {
    beforeEach(async () => {
      mockDeviceList = mockDeviceList7;
      await vbetService.connect(mockTestDevName);
    });

    afterEach(async () => {
      await vbetService.endAllCalls();
      await vbetService.disconnect();
    });

    it('activeDevice is null', async () => {
      await vbetService.disconnect();
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      await vbetService.processBtnPress(mockOffhookFlag.ACTIONSeries);
      expect(ansFun).not.toHaveBeenCalled();
    });

    it('test offhook', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.ACTIONSeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test reject', async () => {
      const ansFun = jest.spyOn(vbetService, 'rejectCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceRejectedCall');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockReject.ACTIONSeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test mute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.ACTIONSeries);
      await vbetService.processBtnPress(mockMuteFlag.ACTIONSeries[0]);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: true,
        name: 'CallMuted',
        conversationId: 'id',
      });
    });

    it('test unmute', async () => {
      const setMuteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.ACTIONSeries);
      await vbetService.processBtnPress(mockMuteFlag.ACTIONSeries[1]);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: false,
        name: 'CallUnmuted',
        conversationId: 'id',
      });
    });

    it('test outgoing call', async () => {
      const ansFun = jest.spyOn(vbetService, 'endCallFromDevice');
      const devAnsFun = jest.spyOn(vbetService, 'deviceEndedCall');
      await vbetService.outgoingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOnhookFlag.ACTIONSeries);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });
  });

  describe('endcall from user interface', () => {
    beforeEach(async () => {
      mockDeviceList = mockDeviceList1;
      await vbetService.connect(mockTestDevName);
    });

    afterEach(async () => {
      await vbetService.disconnect();
    });

    it('test onhook', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      await vbetService.endCall('id', false);
      expect(ansFun).toHaveBeenCalledWith('onHook');
    });

    it('test onhook with other active calls', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      await vbetService.endCall('id', true);
      expect(ansFun).not.toHaveBeenCalledWith('onHook');
    });

    it('test onhook but no matching conversion id', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.processBtnPress(mockOffhookFlag.BT100USeries);
      await vbetService.endCall('dif', false);
      expect(ansFun).not.toHaveBeenCalledWith('onHook');
    });

    it('test reject call but no pending conversion id', async () => {
      const ansFun = jest.spyOn(vbetService, 'sendOpToDevice');
      await vbetService.incomingCall({ conversationId: '' });
      await vbetService.rejectCall();
      expect(ansFun).not.toHaveBeenCalledWith('onHook');
    });
  });
});
