import VBetService from "./vbet";

const mackTestDevName = 'Test VBet Dev';
const mackReportId = 0x02;
let mackEventReportId = mackReportId;

const mackDeviceList0 = [];
const mackDeviceList1 = [{
  open: jest.fn(),
  close: jest.fn(),
  sendReport: jest.fn(),
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),

  productName: mackTestDevName,
  collections: [{
    usage: 0x0005,
    usagePage: 0x000B,
    inputReports: [{
      reportId: mackReportId
    }]
  }]
}];

const mackDeviceList2 = [{
  open: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),

  productName: mackTestDevName,
  collections: [{
    usage: 0,
    usagePage: 0,
  }]
}];

const mackDeviceList3 = [{
  open: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),

  productName: mackTestDevName,
  collections: [{
    usage: 0x0005,
    usagePage: 0x000B,
    inputReports: []
  }]
}];

const mackDeviceList4 = [{
  open: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),

  opened: true,

  productName: mackTestDevName,
  collections: [{
    usage: 0x0005,
    usagePage: 0x000B,
    inputReports: []
  }]
}];

const mackRecOffhookFlag = 0b1;
const mackRecHoldFlag = 0b1000;
const mackRecMuteFlag = 0b100;
const mackRecReject = 0x40;

describe('YealinkService', () => {
  let vbetService: VBetService;
  let mackDeviceList = mackDeviceList0;
  let mackReqDeviceList = mackDeviceList0;

  Object.defineProperty(window.navigator, 'hid', {
    get: () => ({
      getDevices: () => {
        return mackDeviceList;
      },
      requestDevice: () => {
        mackDeviceList = mackReqDeviceList;
      }
    }),
  });

  beforeEach(() => {
    mackDeviceList = mackDeviceList0;
    mackReqDeviceList = mackDeviceList0;
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
});