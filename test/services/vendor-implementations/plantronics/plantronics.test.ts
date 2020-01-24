import PlantronicsService from '../../../../src/services/vendor-implementations/plantronics/plantronics';

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
    plantronicsService = PlantronicsService.getInstance();
    resetService(plantronicsService);
  });

  describe('instantiation', () => {
    afterEach(() => {
      plantronicsService = null;
    });

    it('should be a singleton', () => {
      const plantronicsService2 = PlantronicsService.getInstance();

      expect(plantronicsService).not.toBeFalsy();
      expect(plantronicsService2).not.toBeFalsy();
      expect(plantronicsService).toBe(plantronicsService2);
    });
  });

  describe('deviceName', () => {
    it('should return the value of deviceInfo.ProductName', () => {});
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
});
