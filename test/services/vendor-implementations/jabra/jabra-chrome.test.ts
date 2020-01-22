import JabraChromeService from '../../../../src/services/vendor-implementations/jabra/jabra-chrome';

describe('JabraChromeService', () => {
  describe('instantiation', () => {
    let jabraChromeService: JabraChromeService;

    beforeEach(() => {
      jabraChromeService = JabraChromeService.getInstance();
    });

    afterEach(() => {
      jabraChromeService = null;
    });

    it('should be a singleton', () => {
      const jabraChromeService2 = JabraChromeService.getInstance();

      expect(jabraChromeService).not.toBeFalsy();
      expect(jabraChromeService2).not.toBeFalsy();
      expect(jabraChromeService).toBe(jabraChromeService2);
    });
  });
});
