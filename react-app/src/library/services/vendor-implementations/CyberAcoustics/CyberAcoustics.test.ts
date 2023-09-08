
import CyberAcousticsService from './CyberAcoustics';


describe('instantiation', () => {
    it('should be a singleton', () => {
      const CyberAcousticsService2 = CyberAcousticsService.getInstance({ logger: console });

      expect(CyberAcousticsService).not.toBeFalsy();
      expect(CyberAcousticsService).not.toBeFalsy();
      expect(CyberAcousticsService).toBe(CyberAcousticsService);
    });

    //it('should have the correct vendorName', () => {
    //  expect(CyberAcousticsService.vendorName).toEqual('CyberAcoustics');
    //});
  });
