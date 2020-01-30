import { JabraNativeCommands } from './vendor-implementations/jabra/jabra-native/jabra-native-commands';

// TODO: This is just a shell for now to make things build
const hostedContext = {
  isHosted: () => {
    return true;
  },
  supportsJabra: () => {
    return true;
  },
  sendJabraEventToDesktop: (deviceId: string, cmd: JabraNativeCommands, value: any) => {
    return null;
  },
  requestJabraDevices: (): Promise<any> => {
    return Promise.resolve({});
  },
  off: (eventName: string, handler: Function): void => {
    return null;
  },
  on: (eventName: string, handler: Function): void => {
    return null;
  },
};

export default class ApplicationService {
  static instance: ApplicationService;
  public hostedContext = hostedContext;

  private constructor() {}

  static getInstance(): ApplicationService {
    if (!this.instance) {
      this.instance = new ApplicationService();
    }

    return this.instance;
  }
}
