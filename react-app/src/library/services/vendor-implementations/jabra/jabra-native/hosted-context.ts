/* istanbul ignore file */
import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { JabraDeviceEvent, JabraHeadsetEvent } from "./types";

interface EmittedHostedEvents {
    JabraEvent: JabraHeadsetEvent,
    JabraDeviceAttached: JabraDeviceEvent
}

export default class HostedContext extends (EventEmitter as { new(): StrictEventEmitter<EventEmitter, EmittedHostedEvents> }){
    source: any;
    hostedContext: any = {
      _isHosted: null,
      isHosted: () => {
        return this.hostedContext._isHosted;
      },
      callback: (obj) => {
        const msg = obj.msg;
        if (msg === 'JabraEvent') {
          const eventName = obj.event;
          const value = obj.value;
          const hidInput = obj.hidInput;

          console.log(`Jabra event received: id: ${hidInput} name: ${eventName} value: ${value}`);

          this.emitEvent('JabraEvent', obj);
        } else {
          this.emitEvent('JabraDeviceAttached', obj);
        }
      },
      requestDesktopPromise (cmd) {
        try {
          const sCmd = JSON.stringify(cmd);
          (window as any).cefQuery({
            request: sCmd,
            persistent: false,
            onSuccess: function (response) {
              try {
                const obj = JSON.parse(response);
                return Promise.resolve(obj);
              } catch (e) {
                return Promise.resolve({});
              }
            },
            onFailure: function (response) {
              return Promise.reject(response);
            }
          });
        } catch (e) {
          console.error('Error requesting desktop promise', e);
          return Promise.reject();
        }
      },
      // Send a Jabra event to the desktop.
      // deviceID - ID of the device
      // event - 'offhook', 'hold', 'mute', ringer'
      // value - true or false
      sendJabraEventToDesktop (deviceID, event, value) {
        (window as any)._HostedContextFunctions.sendEventToDesktop('jabraEvent', {
          deviceID,
          event,
          value
        });
      },
      requestJabraDevices () {
        return this.requestDesktopPromise({ cmd: 'requestJabraDevices' });
      },
      _supportsJabra () {
        return true;
      }
    }

    constructor () {
      super();
      const eventEmitter = new EventEmitter();
      Object.keys((eventEmitter as any).__proto__).forEach((name) => {
        this[name] = eventEmitter[name];
      });
      this.source = this.hostedContext;
      if ((window as any)._HostedContextFunctions) {
        if ((window as any)?.Orgspan) {
          this.source = (window as any).Orgspan.serviceFor('application').get('hostedContext');
        } else {
          const assertURL = window.location.origin + window.location.pathname;
          const initData = {
            assertURL,
            callback: this.hostedContext.callback.bind(this.hostedContext),
            supportsTerminationRequest: true,
            supportsUnifiedPreferences: true
          };
          (window as any)._HostedContextFunctions.register(initData);
        }
      }
    }

    private emitEvent (eventName, eventBody) {
      this.emit(eventName, eventBody);
    }
}
