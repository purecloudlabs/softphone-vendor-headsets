import JabraNativeService from '../../../../src/services/vendor-implementations/jabra/jabra-native/jabra-native';

describe('JabraNativeService', () => {
  describe('instantiation', () => {
    let jabraNativeService: JabraNativeService;

    beforeEach(() => {
      jabraNativeService = JabraNativeService.getInstance();
    });

    afterEach(() => {
      jabraNativeService = null;
    });

    it('should be a singleton', () => {
      const jabraNativeService2 = JabraNativeService.getInstance();

      expect(jabraNativeService).not.toBeFalsy();
      expect(jabraNativeService2).not.toBeFalsy();
      expect(jabraNativeService).toBe(jabraNativeService2);
    });
  });
});
