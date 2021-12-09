import { JabraNativeCommands } from './vendor-implementations/jabra/jabra-native/jabra-native-commands';

// TODO: This is just a shell for now to make things build
const requestDesktopPromise = (cmd) => {
  return (resolve, reject) => {
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
      })
    } catch (e) {
      console.error('Error requesting desktop promise', e);
      reject();
    }
  }
}

const hostedContext = {
  isHosted: (): boolean => {
    return !!(window as any)._HostedContextFunctions;
  },
  supportsJabra: (): boolean => {
    return true;
  },
  sendJabraEventToDesktop: (deviceId: string, event: JabraNativeCommands, value: boolean): void => {
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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  off: (eventName: string, handler: (...params: any[]) => void): null => {
    return null;
  },
  on: (eventName: string, handler: (...params: any[]) => void): null => {
    return null;
  },
  /* eslint-enable */
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

  callback(obj: { msg: string, event: string, value: boolean, hidInput: string }): void {
    const msg = obj.msg;
    if (msg === 'JabraEvent') {
      const eventName = obj.event;
      const value = obj.value;
      const hidInput = obj.hidInput;
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