import SennheiserService from '../../../../src/services/vendor-implementations/sennheiser/sennheiser';

describe('SennheiserService', () => {
  describe('instantiation', () => {
    let sennheiserService: SennheiserService;

    beforeEach(() => {
      sennheiserService = SennheiserService.getInstance();
    });

    afterEach(() => {
      sennheiserService = null;
    });

    it('should be a singleton', () => {
      const sennheiserService2 = SennheiserService.getInstance();

      expect(sennheiserService).not.toBeFalsy();
      expect(sennheiserService2).not.toBeFalsy();
      expect(sennheiserService).toBe(sennheiserService2);
    });
  });
});
