import PlantronicsService from '../../../../src/services/vendor-implementations/plantronics/plantronics';
import DeviceInfo from '../../../../src/models/device-info';
import { mockLogger } from '../../test-utils';
import { isFirefox } from 'utils';

const testDevice: DeviceInfo = {
  ProductName: 'testDevice1',
};

const config: any = {
  logger: console,
  vendorName: 'Plantronics'
}

function resetService(plantronicsService: PlantronicsService) {
  plantronicsService.vendorName = 'Plantronics';
  plantronicsService.pluginName = 'emberApp2';
  plantronicsService.deviceInfo = null;
  plantronicsService.activePollingInterval = 2000;
  plantronicsService.connectedDeviceInterval = 6000;
  plantronicsService.disconnectedDeviceInterval = 2000;
  plantronicsService.deviceIdRetryInterval = 2000;
  plantronicsService.isActive = false;
  plantronicsService.disableEventPolling = false;
  plantronicsService.deviceStatusTimer = null;
}

describe('PlantronicsService', () => {
  let plantronicsService: PlantronicsService;

  beforeEach(() => {
    plantronicsService = PlantronicsService.getInstance(config);
    resetService(plantronicsService);
  });

  describe('instantiation', () => {
    afterEach(() => {
      plantronicsService = null;
    });

    it('should be a singleton', () => {
      const plantronicsService2 = PlantronicsService.getInstance(config);

      expect(plantronicsService).not.toBeFalsy();
      expect(plantronicsService2).not.toBeFalsy();
      expect(plantronicsService).toBe(plantronicsService2);
    });
  });

  describe('deviceName', () => {
    it('should return the value of deviceInfo.ProductName', () => {
      plantronicsService.deviceInfo = testDevice;
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
      plantronicsService = PlantronicsService.getInstance(config);
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
});
