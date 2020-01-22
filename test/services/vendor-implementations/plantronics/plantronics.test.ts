import PlantronicsService from '../../../../src/services/vendor-implementations/plantronics/plantronics';

describe('PlantronicsService', () => {
  describe('instantiation', () => {
    let plantronicsService: PlantronicsService;

    beforeEach(() => {
      plantronicsService = PlantronicsService.getInstance();
    });

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
});
