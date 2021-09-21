import { Observable, BehaviorSubject } from 'rxjs';
import { VendorImplementation } from './vendor-implementations/vendor-implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraChromeService from './vendor-implementations/jabra/jabra-chrome/jabra-chrome';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import ApplicationService from './application';
import { HeadsetEvent, HeadsetEventName } from '../types/headset-event';
import CallInfo from '../types/call-info';
import { VendorConversationIdEvent, VendorEvent, VendorEventWithInfo, VendorHoldEvent, VendorMutedEvent } from '../types/headset-events';

export default class HeadsetService {
  private static instance: HeadsetService;

  plantronics: VendorImplementation;
  jabraChrome: VendorImplementation;
  jabraNative: VendorImplementation;
  sennheiser: VendorImplementation;
  application: ApplicationService;
  selectedImplementation: VendorImplementation;
  headsetEvents: Observable<HeadsetEvent>;
  logHeadsetEvents: boolean;

  private $headsetEvents: BehaviorSubject<HeadsetEvent>;
  private _implementations: VendorImplementation[];
  private logger: any;

  private constructor(config: any) {
    this.$headsetEvents = new BehaviorSubject<HeadsetEvent>({
      eventName: '' as HeadsetEventName,
      eventData: {},
    });
    this.headsetEvents = this.$headsetEvents.asObservable();

    this.application = ApplicationService.getInstance();
    this.selectedImplementation = this.implementations[0]; // Using the first just because it's the first
    this.logHeadsetEvents = false;
    this.logger = config?.logger || console;
    this.plantronics = PlantronicsService.getInstance({ logger: this.logger });
    this.jabraChrome = JabraChromeService.getInstance({ logger: this.logger });
    this.jabraNative = JabraNativeService.getInstance({ logger: this.logger });
    this.sennheiser = SennheiserService.getInstance({ logger: this.logger });

    [this.plantronics, this.jabraChrome, this.jabraNative, this.sennheiser]
      .forEach(implementation => this.subscribeToHeadsetEvents(implementation));
  }

  static getInstance(config: any) {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService(config);
    }

    return HeadsetService.instance;
  }

  get implementations(): VendorImplementation[] {
    const implementations: VendorImplementation[] = [];
    if (this.application.hostedContext.supportsJabra()) {
      implementations.push(
        this.application.hostedContext.isHosted() ? this.jabraNative : this.jabraChrome
      );
    }
    implementations.push(this.plantronics);
    implementations.push(this.sennheiser);

    this._implementations = implementations;
    return this._implementations;
  }

  getHeadSetEventsSubject = () => {
    return this.$headsetEvents;
  };

  private subscribeToHeadsetEvents (implementation: VendorImplementation) {
    implementation.on('deviceAnsweredCall', this.handleDeviceAnsweredCall.bind(this));
    implementation.on('deviceRejectedCall', this.handleDeviceRejectedCall.bind(this));
    implementation.on('deviceEndedCall', this.handleDeviceEndedCall.bind(this));
    implementation.on('deviceMuteChanged', this.handleDeviceMuteStatusChanged.bind(this));
    implementation.on('deviceHoldStatusChanged', this.handleDeviceHoldStatusChanged.bind(this));
    implementation.on('deviceEventLogs', this.handleDeviceLogs.bind(this))
  }

  // TODO: this function
  // _handleActiveMicChange: observer('implementations.[]', 'webrtc.defaultMicrophone', function () {
  //   const label = this.get('webrtc.defaultMicrophone.label');

  //   const newImplementation = label && this.get('implementations').find((implementation) => implementation.deviceLabelMatchesVendor(label));

  //   this.changeImplementation(newImplementation);
  // }),

  // if possible, this should return information about the device
  // if not possible, return { deviceInfo: null }
  changeImplementation(implementation: VendorImplementation): void {
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

  handleDeviceAnsweredCall(event: VendorEventWithInfo) {
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device answered the call'); // TODO: Logger
    this.$headsetEvents.next(new HeadsetEvent(HeadsetEventName.DEVICE_ANSWERED_CALL, event.body));
  }

  handleDeviceRejectedCall(event: VendorConversationIdEvent) {
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device rejected the call'); // TODO: Logger
    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.DEVICE_REJECTED_CALL, event.body.conversationId)
    );
  }

  handleDeviceEndedCall(event: VendorEventWithInfo) {
    this.logger.info('Headset: device ended the call'); // TODO: Logger
    this.$headsetEvents.next(new HeadsetEvent(HeadsetEventName.DEVICE_ENDED_CALL, event.body));
  }

  handleDeviceMuteStatusChanged(event: VendorMutedEvent) {
    this.logger.info('Headset: device mute status changed: ', event.isMuted); // TODO: Logger
    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.DEVICE_MUTE_STATUS_CHANGED, event.body)
    );
  }

  handleDeviceHoldStatusChanged(event: VendorHoldEvent) {
    this.logger.info('Headset: device hold status changed', event.holdRequested); // TODO: Logger
    this.$headsetEvents.next(
      new HeadsetEvent(HeadsetEventName.DEVICE_HOLD_STATUS_CHANGED, event.body)
    ); // TODO: { holdRequested, toggle } is a change; needs to be refleceted or communicated in the API reference
  }

  /* This function has no functional purpose in a real life example
   * It is here to help log all events in the call process at least for Plantronics
   */
  handleDeviceLogs(eventInfo) {
    this.$headsetEvents.next(new HeadsetEvent('loggableEvent' as HeadsetEventName, eventInfo));
  }

  get connectionStatus(): string {
    if (this.selectedImplementation?.errorCode) {
      this.logger.error(
        'An error has occurred while trying to establish a connection',
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
      return `Implementation is not Running`;
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
