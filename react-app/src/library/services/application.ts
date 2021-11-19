import { JabraNativeCommands } from './vendor-implementations/jabra/jabra-native/jabra-native-commands';

// TODO: This is just a shell for now to make things build
const requestDesktopPromise = (cmd) => {
  return (resolve, reject) => {
    try {
      let sCmd = JSON.stringify(cmd);
      (window as any).cefQuery({
        request: sCmd,
        persistent: false,
        onSuccess: response => {
          try {
            let obj = JSON.parse(response);
            resolve(obj);
          } catch (e) {
            resolve({});
          }
        },
        onFailure: response => {
          reject(response);
        }
      })
    } catch (e) {
      console.error('Error requesting desktop promise', e);
      reject();
    }
  }
}

const hostedContext = {
  isHosted: () => {
    return !!(window as any)._HostedContextFunctions;
  },
  supportsJabra: () => {
    return true;
  },
  sendJabraEventToDesktop: (deviceId: string, event: JabraNativeCommands, value: any) => {
    (window as any)?._HostedContextFunctions?.sendEventToDesktop(
      'jabraEvent',
      {
        deviceId,
        event,
        value
      }
    )
  },
  // sendJabraEventToDesktop: (deviceId: string, cmd: JabraNativeCommands, value: any) => {
  //   return null;
  // },
  requestJabraDevices: async (): Promise<any> => {
    return await requestDesktopPromise({ cmd: 'requestJabraDevices' });
  },
  off: (eventName: string, handler: (...params: any[]) => void): null => {
    return null;
  },
  on: (eventName: string, handler: (...params: any[]) => void): null => {
    return null;
  },
};

export default class ApplicationService {
  static instance: ApplicationService;
  public hostedContext = hostedContext;

  private constructor() {
    if (hostedContext.isHosted) {
      const assetURL = window.location.origin + window.location.pathname;
      const initData = {
        assetURL,
        callback: this.callback.bind(this),
        supportsTerminationRequest: true,
        supportsUnifiedPreferences: true
      };
      (window as any)._HostedContextFunctions?.register(initData);
    }
  }

  callback(obj: any) {
    const msg = obj.msg;
    if (msg === 'JabraEvent') {
      let eventName = obj.event;
      let value = obj.value;
      let hidInput = obj.hidInput;
      console.log(
        `Jabra event received. ID: ${hidInput}, Name: ${eventName}, Value: ${value}`
      );
    }
  }

  static getInstance(): ApplicationService {
    if (!this.instance) {
      this.instance = new ApplicationService();
    }

    return this.instance;
  }
}