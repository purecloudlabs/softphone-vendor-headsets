import { timedPromise } from './utils';

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
});
