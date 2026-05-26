import { ImplementationConfig } from './services/vendor-implementations/vendor-implementation';
import { timedPromise, checkWebHidSupport } from './utils';

describe('utils', () => {
  describe('timedPromise', () => {
    it('should return a promise rejection after the specified timeout', done => {
      const timeout = 250;
      const promiseResolutionDelay = 1000;
      const expectedRejection = `Timed out in ${timeout}ms`;

      const passedInPromise = new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          resolve();
        }, promiseResolutionDelay);
      });

      timedPromise(passedInPromise, timeout)
        .then(() => {
          fail('The promise should not have resolved before the specified timeout');
        })
        .catch(err => {
          expect(err).toEqual(expectedRejection);
          done();
        });
    }, 3000);
    it('should return a promise resolution if the promise resolves before the timeout elapses', done => {
      const timeout = 1000;
      const promiseResolutionDelay = 100;
      const expectedResolution = 'success';

      const passedInPromise = new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          resolve(expectedResolution);
        }, promiseResolutionDelay);
      });

      timedPromise(passedInPromise, timeout)
        .then(result => {
          expect(result).toEqual(expectedResolution);
          done();
        })
        .catch(() => {
          fail('Promise should have resolved before the timeout elapsed');
        });
    }, 3000);
  });

  describe('checkForWebHidSupport', () => {
    it('should check supportsWebHid from the passed in config object if any of the feature toggles are enabled; return true if supportsWebHid and FT enabled', () => {
      (window as any)._HostedContextFunctions = { get: () => true };
      const config = {
        useWebHidOnDesktopJabra: true,
        useWebHidOnDesktopYealink: false,
        useWebHidOnDesktopVbet: false,
        useWebHidOnDesktopCyberAcoustics: false,
        hostedContext: {
          supportsWebHid: jest.fn().mockReturnValue(true)
        }
      } as ImplementationConfig;

      expect(checkWebHidSupport(config, 'jabra')).toBe(true);

      config.useWebHidOnDesktopJabra = false;
      config.useWebHidOnDesktopYealink = true;

      expect(checkWebHidSupport(config, 'yealink')).toBe(true);

      config.useWebHidOnDesktopYealink = false;
      config.useWebHidOnDesktopVbet = true;

      expect(checkWebHidSupport(config, 'vbet')).toBe(true);

      config.useWebHidOnDesktopVbet = false;
      config.useWebHidOnDesktopCyberAcoustics = true;

      expect(checkWebHidSupport(config, 'cyberacoustics')).toBe(true);
    });

    it('should return falsy if hosted BUT requested feature toggle is false/undefined', () => {
      const config = {
        useWebHidOnDesktopJabra: true,
        useWebHidOnDesktopYealink: false,
        useWebHidOnDesktopVbet: false,
        useWebHidOnDesktopCyberAcoustics: false,
        hostedContext: {
          supportsWebHid: jest.fn().mockReturnValue(true)
        }
      } as ImplementationConfig;

      expect(checkWebHidSupport(config, 'yealink')).toBe(undefined);
    });

    it('should check the hid object on the window object if isCefHosted is false', () => {
      (window as any)._HostedContextFunctions = undefined;
      Object.defineProperty(window.navigator, 'hid', { get: () => ({}) });
      const config = {
        useWebHidOnDesktopJabra: true,
        useWebHidOnDesktopYealink: false,
        useWebHidOnDesktopVbet: false,
        useWebHidOnDesktopCyberAcoustics: false,
        hostedContext: {
          supportsWebHid: jest.fn().mockReturnValue(true)
        }
      } as ImplementationConfig;

      expect(checkWebHidSupport(config, 'jabra')).toBe(true);
    });
  });
});
