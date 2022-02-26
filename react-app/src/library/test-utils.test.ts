/* istanbul ignore file */


import { VendorImplementation } from "./services/vendor-implementations/vendor-implementation";
import { EmittedHeadsetEvents } from "./types/emitted-headset-events";

export const mockWebSocket = {
  readyState: 0,
  send: () => {},
  close: () => {},
  onOpen: () => {},
  onClose: () => {},
};

export const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

export function eventValidation (headsetService: VendorImplementation, eventName: keyof EmittedHeadsetEvents, assertHandler?: Function): Promise<void> {
  return new Promise((resolve, reject) => {
    let timeout: any;

    const handler = function (/* arguments */) {
      clearTimeout(timeout);
      if (assertHandler) {
        assertHandler(...arguments);
      }
      headsetService.off(eventName, handler);
      resolve();
    };
    // wait up to 3 seconds for the event to be polled/triggered
    timeout = setTimeout(() => {
      headsetService.off(eventName, handler);
      reject(new Error(`${eventName} was never triggered on the service`));
    }, 3000);

    headsetService.on(eventName, handler);
  });
}
