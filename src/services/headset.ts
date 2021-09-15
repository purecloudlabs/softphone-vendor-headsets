import { Observable, BehaviorSubject, Subject } from 'rxjs';
import Implementation from './vendor-implementations/Implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraChromeService from './vendor-implementations/jabra/jabra-chrome/jabra-chrome';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import ApplicationService from './application';
import { HeadsetEvent, HeadsetEventName } from '../models/headset-event';
import CallInfo from '../models/call-info';

export default class HeadsetService {
  private static instance: HeadsetService;

  public plantronics: Implementation;
  public jabraChrome: Implementation;
  public jabraNative: Implementation;
  public sennheiser: Implementation;

  public application: ApplicationService;
  public selectedImplementation: Implementation;
  private _implementations: Implementation[];

  private $headsetEvents: BehaviorSubject<HeadsetEvent>;
  public headsetEvents: Observable<HeadsetEvent>;
  public logHeadsetEvents: boolean;
  private logger: any;

  private constructor(config: any) {
    this.$headsetEvents = new BehaviorSubject<HeadsetEvent>({eventName: '' as HeadsetEventName, eventData: {}});
    this.headsetEvents = this.$headsetEvents.asObservable();

    this.application = ApplicationService.getInstance();
    this.selectedImplementation = this.implementations[0]; // Using the first just because it's the first
    this.logHeadsetEvents = false;
    this.logger = config?.logger || console;
    this.plantronics = PlantronicsService.getInstance({logger: this.logger});
    this.jabraChrome = JabraChromeService.getInstance({logger: this.logger});
    this.jabraNative = JabraNativeService.getInstance({logger: this.logger});
    this.sennheiser = SennheiserService.getInstance({logger: this.logger});
  }

  static getInstance(config: any) {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService(config);
    }

    return HeadsetService.instance;
  }

  get implementations(): Implementation[] {
    const implementations: Implementation[] = [];
    if (this.application.hostedContext.supportsJabra()) {
      implementations.push(
        this.application.hostedContext.isHosted()
        ? this.jabraNative
        : this.jabraChrome);
    }
    implementations.push(this.plantronics);
    implementations.push(this.sennheiser);

    this._implementations = implementations;
    return this._implementations;
  }

  getHeadSetEventsSubject = () => {
    return this.$headsetEvents;
  }

  // TODO: this function
  // _handleActiveMicChange: observer('implementations.[]', 'webrtc.defaultMicrophone', function () {
  //   const label = this.get('webrtc.defaultMicrophone.label');

  //   const newImplementation = label && this.get('implementations').find((implementation) => implementation.deviceLabelMatchesVendor(label));

  //   this.changeImplementation(newImplementation);
  // }),

  // if possible, this should return information about the device
  // if not possible, return { deviceInfo: null }
  changeImplementation(implementation: Implementation): void {
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

    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.IMPLEMENTATION_CHANGED, implementation)
    );
  }

  // possible options: conversationId, contactName
  incomingCall(callInfo: CallInfo, hasOtherActiveCalls?): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [incomingCall]'); // TODO: Logger
      return Promise.resolve();
    }
    return service.incomingCall({ callInfo, hasOtherActiveCalls });
  }

  // possible options: conversationId, contactName
  outgoingCall(callInfo: CallInfo): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [outgoingCall]'); // TODO: Logger
      return Promise.resolve();
    }

    return service.outgoingCall(callInfo);
  }

  answerCall(conversationId: string): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [answerCall]'); // TODO: Logger
      return Promise.resolve();
    }
    return service.answerCall(conversationId);
  }

  setMute(value): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No venddor headset connected [setMute]'); // TODO: Logger
      return Promise.resolve();
    }
    return service.setMute(value);
  }

  setHold(conversationId: string, value): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [setHold]'); // TODO: Logger
      return Promise.resolve();
    }
    return service.setHold(conversationId, value);
  }

  endCall(conversationId, hasOtherActiveCalls?): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [endCall]'); // TODO: Logger
      return Promise.resolve();
    }
    return service.endCall(conversationId, hasOtherActiveCalls);
  }

  endAllCalls(): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [endAllCalls]'); // TODO: Logger
      return Promise.resolve();
    }

    return this.selectedImplementation.endAllCalls();
  }

  triggerDeviceAnsweredCall(eventInfo) {
    this.logger.info('Headset: device answered the call'); // TODO: Logger
    this.$headsetEvents.next(new HeadsetEvent(HeadsetEventName.DEVICE_ANSWERED_CALL, eventInfo));
  }

  triggerDeviceRejectedCall(conversationId) {
    this.logger.info('Headset: device rejected the call'); // TODO: Logger
    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.DEVICE_REJECTED_CALL, conversationId)
    );
  }

  triggerDeviceEndedCall(eventInfo) {
    this.logger.info('Headset: device ended the call'); // TODO: Logger
    this.$headsetEvents.next(new HeadsetEvent(HeadsetEventName.DEVICE_ENDED_CALL, eventInfo));
  }

  triggerDeviceMuteStatusChanged(isMuted: boolean, eventInfo) {
    debugger;
    this.logger.info('Headset: device mute status changed: ', isMuted); // TODO: Logger
    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.DEVICE_MUTE_STATUS_CHANGED, eventInfo)
    );
  }

  triggerDeviceHoldStatusChanged({ holdRequested, toggle }, eventInfo) {
    this.logger.info('Headset: device hold status changed', holdRequested); // TODO: Logger
    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.DEVICE_HOLD_STATUS_CHANGED, eventInfo)
    ); // TODO: { holdRequested, toggle } is a change; needs to be refleceted or communicated in the API reference
  }

  /* This function has no functional purpose in a real life example
  * It is here to help log all events in the call process at least for Plantronics
  */
  triggerDeviceLogs(eventInfo) {
    this.$headsetEvents.next(
      new HeadsetEvent('loggableEvent' as HeadsetEventName, eventInfo)
    )
  }

  get connectionStatus(): string {
    if (this.selectedImplementation?.errorCode) {
      this.logger.error('An error has occurred while trying to establish a connection',
        this.selectedImplementation?.errorCode
      );
      return `Error occurred while establishing connection`;
      // return `dummy.connectionStatus.error`
    } else if (this.selectedImplementation?.isConnecting) {
      return `Implementation Connecting`;
      // return `dummy.connectionStatus.connecting`;
    } else if (this.selectedImplementation?.isConnected) {
      return `Implementation Connected & Running`;
      // return `dummy.connectionStatus.connected`;
    } else {
      return `Implementation is not Running`
      // return `dummy.connectionStatus.notRunning`;
    }
  }

  // triggerDefaultHeadsetChanged (deviceInfo, isRetry) {
  //   // Logger.info('Headset: headset device changed', deviceInfo); // TODO: Logger
  //   const microphones = this.get('webrtc.microphoneList').filter((device) => deviceInfo.deviceIds.includes(device.deviceId));
  //   const outputDevices = this.get('webrtc.outputDeviceList').filter((device) => deviceInfo.deviceIds.includes(device.deviceId));

  //   if (!microphones.length) {
  //     if (isRetry) {
  //       // return Logger.error(new Error('Failed to find headset device'));// TODO: Logger
  //     }

  //     // this.logger.warn('Failed to find vendor headset device, will try again after browser devicechange event');// TODO: Logger

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
