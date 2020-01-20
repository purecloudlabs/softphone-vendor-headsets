import Implementation from './vendor-implementations/Implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraChromeService from './vendor-implementations/jabra/jabra-chrome';
import JabraNativeService from './vendor-implementations/jabra/jabra-native';
import ApplicationService from './application';

export default class HeadsetService {
  private static instance: HeadsetService;
  private plantronics: Implementation = PlantronicsService.getInstance();
  private jabraChrome: Implementation = JabraChromeService.getInstance();
  private jabraNative: Implementation = JabraNativeService.getInstance();
  private sennheiser: Implementation = SennheiserService.getInstance();
  private application: ApplicationService = ApplicationService.getInstance();

  private selectedImplementation: Implementation;
  private implementations: Implementation[] = [];
  
  private constructor() {
    this.initImplementations();
    this.selectedImplementation = this.implementations[0];  // Arbitrarily chosen
    // this._handleActiveMicChange(); // TODO
  }

  static getInstance () {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService();
    }

    return HeadsetService.instance;
  }

  private initImplementations () {
    const implementations: Implementation[] = [];
    if (this.application.hostedContext.supportsJabra()) {
      if (this.application.hostedContext.isHosted()) {
        implementations.push(this.jabraNative);
      } else {
        implementations.push(this.jabraChrome);
      }
    }
    implementations.push(this.plantronics);
    implementations.push(this.sennheiser);
  }

  // TODO
  // private _handleActiveMicChange: observer('implementations.[]', 'webrtc.defaultMicrophone', function () {
  //   const label = this.get('webrtc.defaultMicrophone.label');

  //   const newImplementation = label && this.get('implementations').find((implementation) => implementation.deviceLabelMatchesVendor(label));

  //   this.changeImplementation(newImplementation);
  // }),

  // if possible, this should return information about the device
  // if not possible, return { deviceInfo: null }
  changeImplementation (implementation: Implementation): void {
    if (implementation === this.selectedImplementation) {
      return;
    }

    if (this.selectedImplementation) {
      this.selectedImplementation.disconnect();
    }

    this.selectedImplementation = implementation;

    if (implementation) {
      implementation.connect();
    }

    // this.trigger('implementationChanged', implementation); // TODO: trigger
  }

  // possible options: conversationId, contactName
  incomingCall (callInfo, hasOtherActiveCalls): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No vendor headset connected [incomingCall]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.incomingCall({callInfo, hasOtherActiveCalls});
  }

  // possible options: conversationId, contactName
  outgoingCall (callInfo): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No vendor headset connected [outgoingCall]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.outgoingCall(callInfo);
  }

  answerCall (conversationId): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No vendor headset connected [answerCall]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.answerCall(conversationId);
  }

  setMute (value): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No venddor headset connected [setMute]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.setMute(value);
  }

  setHold (conversationId, value): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No vendor headset connected [setHold]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.setHold(conversationId, value);
  }

  endCall (conversationId, hasOtherActiveCalls): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No vendor headset connected [endCall]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.endCall(conversationId, hasOtherActiveCalls);
  }

  endAllCalls (): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      // Logger.info('Headset: No vendor headset connected [endAllCalls]'); // TODO: Logger
      return Promise.resolve();
    }

    return this.selectedImplementation.endAllCalls();
  }

  // triggerDeviceAnsweredCall () {
  //   Logger.info('Headset: device answered the call');
  //   this.trigger('deviceAnsweredCall');
  // },

  // triggerDeviceRejectedCall (conversationId) {
  //   Logger.info('Headset: device rejected the call');
  //   this.trigger('deviceRejectedCall', conversationId);
  // },

  // triggerDeviceEndedCall () {
  //   Logger.info('Headset: device ended the call');
  //   this.trigger('deviceEndedCall');
  // },

  // triggerDeviceMuteStatusChanged (isMuted) {
  //   Logger.info('Headset: device mute status changed', isMuted);
  //   this.trigger('deviceMuteStatusChanged', isMuted);
  // },

  // triggerDeviceHoldStatusChanged (holdRequested, toggle) {
  //   Logger.info('Headset: device hold status changed', holdRequested);
  //   this.trigger('deviceHoldStatusChanged', holdRequested, toggle);
  // },

  // triggerDefaultHeadsetChanged (deviceInfo, isRetry) {
  //   Logger.info('Headset: headset device changed', deviceInfo);
  //   const microphones = this.get('webrtc.microphoneList').filter((device) => deviceInfo.deviceIds.includes(device.deviceId));
  //   const outputDevices = this.get('webrtc.outputDeviceList').filter((device) => deviceInfo.deviceIds.includes(device.deviceId));

  //   if (!microphones.length) {
  //     if (isRetry) {
  //       return Logger.error(new Error('Failed to find headset device'));
  //     }

  //     this.logger.warn('Failed to find vendor headset device, will try again after browser devicechange event');

  //     this.get('webrtc').one('deviceListsUpdated', () => {
  //       this.triggerDefaultHeadsetChanged(deviceInfo, true);
  //     });
  //     return;
  //   }

  //   this.get('webrtc').one('defaultDeviceChange', () => {
  //     this.trigger('headsetChanged', deviceInfo);
  //   });
  //   this.get('webrtc').updateDefaultDevices({microphone: microphones[0], outputDevice: outputDevices[0]});
  // }
}