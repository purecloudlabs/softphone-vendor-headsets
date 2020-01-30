import browserama from 'browserama';

export function isFirefox(): boolean {
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
export function timedPromise(
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

export function debounce(func: Function, delay: number) {
  var timer = null;

  return function() {
    var context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      func.apply(context, args);
    }, delay);
  };
}
