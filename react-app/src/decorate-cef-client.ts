import { EventEmitter } from 'events';

export default function () {
  if (!(window as any)._HostedContextFunctions) {
    return;
  }

  const fakeApplicationService = new ApplicationService();

  const Orgspan = {
    getService: (name) => {
      if (name !== 'application') {
        throw new Error('Only the application service is mocked');
      }

      return fakeApplicationService;
    },
  };

  (window as any).Orgspan = Orgspan;
}

class ApplicationService {
  hostedContext = new HostedContext();

  get(property: string) {
    if (property.includes('.')) {
      throw new Error('can only fetch top-level properties');
    }

    return this[property];
  }
}

class HostedContext extends EventEmitter {
  _supportsJabra?: boolean;
  _isHosted?: boolean;

  constructor() {
    super();
    const assetURL = window.location.origin + window.location.pathname;
    const initData = {
      assetURL,
      callback: this.cefCallback.bind(this),
      supportsTerminationRequest: true,
      supportsUnifiedPreferences: true,
    };
    var appInfo = (window as any)._HostedContextFunctions.register(initData);
    this._supportsJabra = appInfo.supportsJabra;
    this._isHosted = true;
  }

  supportsJabra(): boolean {
    return !!this._supportsJabra;
  }

  isHosted(): boolean {
    return !!this._isHosted;
  }

  cefCallback(obj) {
    var msg = obj.msg;

    if (msg === 'JabraEvent') {
      let eventName = obj.event; //Mute, Hold, OffHook, ...
      let value = obj.value; //true or false
      let hidInput = obj.hidInput; //Raw int value of input, useful if eventName is not recognized.
      console.debug(
        'Jabra event received: id: ' + hidInput + ' name:' + eventName + ' value: ' + value
      );
      this.emit('JabraEvent', { eventName, value, hidInput });
    } else if (msg === 'JabraDeviceAttached') {
      let attached = obj.attached; //true if attached, false if detached
      let deviceName = obj.deviceName; //Name of device when attached, empty string when detached
      let deviceId = obj.deviceId; //ID of device
      console.debug(
        'Jabra device-attached received: id: ' +
          deviceId +
          ' name:' +
          deviceName +
          ' attached: ' +
          attached
      );
      this.emit('JabraDeviceAttached', { deviceName, deviceId, attached });
    }
  }
}
