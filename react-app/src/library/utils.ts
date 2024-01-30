/* istanbul ignore file */

import browserama from 'browserama';

export function isFirefox (): boolean {
  return browserama.isFireFox;
}

/**
 *
 * @param promise
 * @param timeoutInMillis
 *
 * Returns a promise that resolves if the passed in promise resolves before the timeout
 * time elapses.  If the timeout elapses, then the returned promise rejects with a
 * message that the timeout time was exceeded.
 */
export function timedPromise (
  promise: Promise<any>,
  timeoutInMillis: number,
  timeoutError?: Error
): Promise<any> {
  let timeoutId;
  const timeoutPromise: Promise<any> = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(timeoutError ? timeoutError : 'Timed out in ' + timeoutInMillis + 'ms');
    }, timeoutInMillis);
  }).then(result => {
    clearTimeout(timeoutId);
    return result;
  });

  return Promise.race([promise, timeoutPromise]);
}

export function debounce (func: () => void, delay: number): any {
  let timer = null;

  return function () {
    clearTimeout(timer);

    timer = setTimeout(function () {
      func();
    }, delay);
  };
}

export function isCefHosted (): boolean {
  return !!(window as any)._HostedContextFunctions;
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export function requestCefPromise (cmd: any): Promise<any> {
/* eslint-enable */
  return new Promise((resolve, reject) => {
    try {
      const sCmd = JSON.stringify(cmd);
      (window as any).cefQuery({
        request: sCmd,
        persistent: false,
        onSuccess: response => {
          try {
            const obj = JSON.parse(response);
            resolve(obj);
          } catch (e) {
            resolve({});
          }
        },
        onFailure: response => {
          reject(response);
        }
      });
    } catch (e) {
      console.error('Error requesting desktop promise', e);
      reject(e);
    }
  });
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export class HeadsetChangesQueue {
  static toDoQueue = [];
  static processingPromise = false;

  static queueHeadsetChanges (fn: () => Promise<any> | any) {
    return new Promise<void> ((resolve, reject) => {
      this.toDoQueue.push({
        fn,
        resolve,
        reject
      });

      if (!this.processingPromise) {
        this.dequeueHeadsetChanges();
      }
    });
  }

  static async dequeueHeadsetChanges () {
    if (this.processingPromise) {
      return false;
    }

    const item = this.toDoQueue.shift();
    if (!item) {
      return false;
    }

    try {
      this.processingPromise = true;
      const result = await item.fn();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.processingPromise = false;
      this.dequeueHeadsetChanges();
    }
  }

  static clearQueue () {
    this.toDoQueue = [];
  }
}
/* eslint-enable */