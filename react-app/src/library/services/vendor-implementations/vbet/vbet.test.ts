import { DeviceSignalType } from '@vbet/webhid-sdk';
import VBetService from './vbet';

const mockTestDevName = 'VT Lync (340b:0020)';
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
    productId: 13323,
    collections: [
      {
        children: [],
        featureReports: [],
        inputReports: [
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [786665],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [786666],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: false,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 6,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [786432],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: true,
                isBufferedBytes: false,
                isConstant: true,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 112,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [],
                wrap: false,
              },
            ],
            reportId: 5,
          },
        ],
        outputReports: [
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: -1,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 15,
                reportSize: 8,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [786432],
                wrap: false,
              },
            ],
            reportId: 5,
          },
        ],
        type: 0,
        usage: 1,
        usagePage: 12,
      },
      {
        children: [],
        featureReports: [],
        inputReports: [
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720935],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: false,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720931],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720928],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: false,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720943],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [721047],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [589831],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720929],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720896],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: false,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 1,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 14,
                reportSize: 8,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [720896],
                wrap: false,
              },
            ],
            reportId: 1,
          },
        ],
        outputReports: [
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 1,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 15,
                reportSize: 8,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [134152192],
                wrap: false,
              },
            ],
            reportId: 1,
          },
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: false,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [524311],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: false,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [524320],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: false,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [524321],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: true,
                isBufferedBytes: false,
                isConstant: true,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 117,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [],
                wrap: false,
              },
            ],
            reportId: 2,
          },
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [524297],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: true,
                isBufferedBytes: false,
                isConstant: true,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 119,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [],
                wrap: false,
              },
            ],
            reportId: 3,
          },
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [524312],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: true,
                isBufferedBytes: false,
                isConstant: true,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 119,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [],
                wrap: false,
              },
            ],
            reportId: 4,
          },
          {
            items: [
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: false,
                isBufferedBytes: false,
                isConstant: false,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 1,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [524358],
                wrap: false,
              },
              {
                hasNull: false,
                hasPreferredState: true,
                isAbsolute: true,
                isArray: true,
                isBufferedBytes: false,
                isConstant: true,
                isLinear: true,
                isRange: false,
                isVolatile: false,
                logicalMaximum: 0,
                logicalMinimum: 0,
                physicalMaximum: 0,
                physicalMinimum: 0,
                reportCount: 1,
                reportSize: 119,
                unitExponent: 0,
                unitFactorCurrentExponent: 0,
                unitFactorLengthExponent: 0,
                unitFactorLuminousIntensityExponent: 0,
                unitFactorMassExponent: 0,
                unitFactorTemperatureExponent: 0,
                unitFactorTimeExponent: 0,
                unitSystem: 'none',
                usages: [],
                wrap: false,
              },
            ],
            reportId: 6,
          },
        ],
        type: 0,
        usage: 5,
        usagePage: 11,
      },
    ],
  },
  {}
];

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
        return mockReqDeviceList;
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

    it('webhidRequest, connect with previously connected device', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn());
      mockDeviceList = mockDeviceList1;
      await vbetService.connect(mockTestDevName);

      const devName = vbetService.deviceInfo;
      expect(devName.ProductName).toBe(mockTestDevName);
      expect(requestSpy).not.toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('webhidRequest, let users select from dev list if label not matched', async () => {
      const statusChangeSpy = jest.spyOn(vbetService, 'changeConnectionStatus');
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn((callback) => {
        mockReqDeviceList = mockDeviceList1;
        callback();
      }));

      await vbetService.connect('random name');
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('webhidRequest, let users select from dev list if label matched', async () => {
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
      const requestSpy = (vbetService.requestWebHidPermissions = jest.fn((callback) => callback()));

      await vbetService.connect(mockTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
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

  describe('telephoney control', () => {
    beforeEach(async () => {
      mockDeviceList = mockDeviceList1;
      await vbetService.connect(mockTestDevName);
    });

    afterEach(async () => {
      await vbetService.endAllCalls();
      await vbetService.disconnect();
    });

    it('accept inbound call', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');

      await vbetService.incomingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.ACCEPT_CALL);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('reject inbound call', async () => {
      const rejFun = jest.spyOn(vbetService, 'rejectCall');
      const devRejFun = jest.spyOn(vbetService, 'deviceRejectedCall');

      await vbetService.incomingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.REJECT_CALL);
      expect(rejFun).toHaveBeenCalled();
      expect(devRejFun).toHaveBeenCalled();
    });

    it('end current call', async () => {
      const endFun = jest.spyOn(vbetService, 'endCall');
      const devEndFun = jest.spyOn(vbetService, 'deviceEndedCall');

      await vbetService.outgoingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.END_CALL);
      expect(endFun).toHaveBeenCalled();
      expect(devEndFun).toHaveBeenCalled();
    });

    it('mute/unmute current call', async () => {
      const muteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');

      await vbetService.outgoingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.MUTE_CALL);
      vbetService.processBtnPress(DeviceSignalType.UNMUTE_CALL);
      expect(muteFun).toHaveBeenCalledTimes(2);
      expect(devMuteFun).toHaveBeenCalledTimes(2);
      expect(muteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: true,
        name: 'CallMuted',
        conversationId: 'id',
      });
      expect(muteFun).toHaveBeenCalledWith(false);
      expect(devMuteFun).toHaveBeenCalledWith({
        isMuted: false,
        name: 'CallUnmuted',
        conversationId: 'id',
      });
    });

    it('answer inbound call but no id', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');

      await vbetService.incomingCall({ conversationId: '' });
      vbetService.processBtnPress(DeviceSignalType.ACCEPT_CALL);
      expect(ansFun).not.toHaveBeenCalled();
      expect(devAnsFun).not.toHaveBeenCalled();
    });

    it('end call but no id', async () => {
      const endFun = jest.spyOn(vbetService, 'endCall');
      const devEndFun = jest.spyOn(vbetService, 'deviceEndedCall');

      await vbetService.outgoingCall({ conversationId: 'id' });
      await vbetService.endCall('id');
      vbetService.processBtnPress(DeviceSignalType.END_CALL);
      expect(endFun).toHaveBeenCalledTimes(1);
      expect(devEndFun).not.toHaveBeenCalled();
    });

    it('mute call but no id', async () => {
      const muteFun = jest.spyOn(vbetService, 'setMute');
      const devMuteFun = jest.spyOn(vbetService, 'deviceMuteChanged');

      await vbetService.outgoingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.MUTE_CALL);
      await vbetService.endCall('id');
      vbetService.processBtnPress(DeviceSignalType.MUTE_CALL);
      expect(muteFun).toHaveBeenCalledTimes(1);
      expect(devMuteFun).toHaveBeenCalledTimes(1);
    });

    it('reject call but no id', async () => {
      const rejectFun = jest.spyOn(vbetService, 'rejectCall');
      const devRejectFun = jest.spyOn(vbetService, 'deviceRejectedCall');

      await vbetService.incomingCall({ conversationId: 'id' });
      await vbetService.endAllCalls();
      vbetService.processBtnPress(DeviceSignalType.REJECT_CALL);
      expect(rejectFun).not.toHaveBeenCalled();
      expect(devRejectFun).not.toHaveBeenCalled();
    });

    it('answer inbound call from ui but no id', async () => {
      const ansFun = jest.spyOn(vbetService, 'answerCall');
      const devAnsFun = jest.spyOn(vbetService, 'deviceAnsweredCall');

      await vbetService.incomingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.ACCEPT_CALL);
      vbetService.answerCall('id');
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('reject call from ui but no id', async () => {
      const rejectFun = jest.spyOn(vbetService, 'rejectCall');
      const devRejectFun = jest.spyOn(vbetService, 'deviceRejectedCall');

      await vbetService.incomingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.REJECT_CALL);
      vbetService.rejectCall('id');
      expect(rejectFun).toHaveBeenCalled();
      expect(devRejectFun).toHaveBeenCalled();
    });

    it('end call from ui but no id', async () => {
      const endFun = jest.spyOn(vbetService, 'endCall');
      const devEndFun = jest.spyOn(vbetService, 'deviceEndedCall');

      await vbetService.outgoingCall({ conversationId: 'id' });
      vbetService.processBtnPress(DeviceSignalType.END_CALL);
      vbetService.endCall('id');
      expect(endFun).toHaveBeenCalled();
      expect(devEndFun).toHaveBeenCalled();
    });
  });
});
