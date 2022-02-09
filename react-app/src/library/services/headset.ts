import { Observable, BehaviorSubject } from 'rxjs';
import { VendorImplementation, ImplementationConfig } from './vendor-implementations/vendor-implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraService from './vendor-implementations/jabra/jabra';
import JabraChromeService from './vendor-implementations/jabra/jabra-chrome/jabra-chrome';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import ApplicationService from './application';
import { ConsumedHeadsetEvents } from '../types/consumed-headset-events';
import { CallInfo } from '../types/call-info';
import { EventInfo, VendorConversationIdEvent, VendorEvent, HoldEventInfo, MutedEventInfo } from '../types/emitted-headset-events';
// import { webHidPairing, init, IApi, RequestedBrowserTransport } from '@gnaudio/jabra-js';
export default class HeadsetService {
  private static instance: HeadsetService;

  plantronics: VendorImplementation;
  jabraChrome: VendorImplementation;
  jabraNative: VendorImplementation;
  jabra: VendorImplementation;
  sennheiser: VendorImplementation;
  application: ApplicationService;
  selectedImplementation: VendorImplementation;
  headsetEvents$: Observable<ConsumedHeadsetEvents>;
  // jabraSdk: Promise<IApi>;

  private _headsetEvents$: BehaviorSubject<ConsumedHeadsetEvents>;
  private _implementations: VendorImplementation[] = [];
  private logger: any;

  private constructor(config: ImplementationConfig) {
    // super();
    //TODO: Just a temporary typing for testing purposes
    this._headsetEvents$ = new BehaviorSubject<ConsumedHeadsetEvents | any>({
      event: '',
      payload: {}
    });
    this.headsetEvents$ = this._headsetEvents$.asObservable();

    this.application = ApplicationService.getInstance();
    this.selectedImplementation = this.implementations[0]; // Using the first just because it's the first
    this.logger = config?.logger || console;
    // this.jabraSdk = this.initializeJabraSdk();
    this.plantronics = PlantronicsService.getInstance({ logger: this.logger });
    this.jabraChrome = JabraChromeService.getInstance({ logger: this.logger });
    this.jabraNative = JabraNativeService.getInstance({ logger: this.logger });
    this.jabra = JabraService.getInstance({ logger: this.logger });
    this.sennheiser = SennheiserService.getInstance({ logger: this.logger });

    [this.plantronics, this.jabraChrome, this.jabraNative, this.sennheiser, this.jabra]
      .forEach(implementation => this.subscribeToHeadsetEvents(implementation));
  }

  static getInstance(config: ImplementationConfig): HeadsetService {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService(config);
    }

    return HeadsetService.instance;
  }

  get implementations(): VendorImplementation[] {
    if (this._implementations.find((implementation) => implementation)) {
      return this._implementations;
    }

    const implementations: VendorImplementation[] = [];
    if (this.application.hostedContext.supportsJabra()) {
      implementations.push(
        // this.application.hostedContext.isHosted() ? this.jabraNative : this.jabraChrome
        this.application.hostedContext.isHosted() ? this.jabraNative : this.jabra
      );
    }
    implementations.push(this.plantronics);
    implementations.push(this.sennheiser);

    this._implementations = implementations;
    return this._implementations;
  }

  getHeadSetEventsSubject = (): BehaviorSubject<ConsumedHeadsetEvents> => {
    return this._headsetEvents$;
  };

  private subscribeToHeadsetEvents (implementation: VendorImplementation) {
    implementation.on('deviceAnsweredCall', this.handleDeviceAnsweredCall.bind(this));
    implementation.on('deviceRejectedCall', this.handleDeviceRejectedCall.bind(this));
    implementation.on('deviceEndedCall', this.handleDeviceEndedCall.bind(this));
    implementation.on('deviceMuteChanged', this.handleDeviceMuteStatusChanged.bind(this));
    implementation.on('deviceHoldStatusChanged', this.handleDeviceHoldStatusChanged.bind(this));
    implementation.on('deviceEventLogs', this.handleDeviceLogs.bind(this));
    implementation.on('deviceConnectionStatusChanged', this.handleDeviceConnectionStatusChanged.bind(this));
    implementation.on('webHidPermissionRequested' as any, (payload: any) => {
      console.log('**** Debug Headset WebHID Event ****');
      this._headsetEvents$.next({ event: 'webHidPermissionRequested' as any, payload })
    });
  }

  activeMicChange(newMicLabel: string): void {
    const implementation = this.implementations.find((implementation) => implementation.deviceLabelMatchesVendor(newMicLabel));
    if (implementation) {
      this.changeImplementation(implementation, newMicLabel);
    } else if (this.selectedImplementation) {
      this.selectedImplementation.disconnect();
    }
  }

  async changeImplementation(implementation: VendorImplementation | null, deviceLabel: string): Promise<void> {
    if (implementation === this.selectedImplementation) {
      return;
    }

    if (this.selectedImplementation) {
      this.selectedImplementation.disconnect();
    }

    this.selectedImplementation = implementation;

    if (implementation) {
      implementation.connect(deviceLabel);
    }

    this._headsetEvents$.next({ event: 'implementationChanged', payload: implementation});
  }

  // possible options: conversationId, contactName
  incomingCall(callInfo: CallInfo, hasOtherActiveCalls?: boolean): Promise<any> {
    this.logger.info('Inside incomingCall of headset library');
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [incomingCall]');
      return Promise.resolve();
    }
    return service.incomingCall(callInfo, hasOtherActiveCalls);
  }

  // possible options: conversationId, contactName
  outgoingCall(callInfo: CallInfo): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [outgoingCall]');
      return Promise.resolve();
    }

    return service.outgoingCall(callInfo);
  }

  answerCall(conversationId: string): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [answerCall]');
      return Promise.resolve();
    }
    return service.answerCall(conversationId);
  }

  setMute(value: boolean): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No venddor headset connected [setMute]');
      return Promise.resolve();
    }
    return service.setMute(value);
  }

  setHold(conversationId: string, value: boolean): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [setHold]');
      return Promise.resolve();
    }
    return service.setHold(conversationId, value);
  }

  endCall(conversationId: string, hasOtherActiveCalls?: boolean): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [endCall]');
      return Promise.resolve();
    }
    return service.endCall(conversationId, hasOtherActiveCalls);
  }

  endAllCalls(): Promise<any> {
    const service = this.selectedImplementation;
    if (!service || !service.isConnected) {
      this.logger.info('Headset: No vendor headset connected [endAllCalls]');
      return Promise.resolve();
    }

    return this.selectedImplementation.endAllCalls();
  }

  handleDeviceAnsweredCall(event: VendorEvent<EventInfo>): void | undefined {
    console.log('event answered Call -> ', event);
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device answered the call');
    this._headsetEvents$.next({ event: 'deviceAnsweredCall', payload: { ...event.body }});
  }

  handleDeviceRejectedCall(event: VendorConversationIdEvent): void | undefined {
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device rejected the call');
    this._headsetEvents$.next({ event: 'deviceRejectedCall', payload: { conversationId: event.body.conversationId }});
  }

  handleDeviceEndedCall(event: VendorEvent<EventInfo>): void {
    this.logger.info('Headset: device ended the call');
    this._headsetEvents$.next({ event: 'deviceEndedCall', payload: { ...event.body } });
    this._headsetEvents$.next({ event: 'loggableEvent', payload: { ...event.body } });
  }

  handleDeviceMuteStatusChanged(event: VendorEvent<MutedEventInfo>): void {
    this.logger.info('Headset: device mute status changed: ', event?.body?.isMuted);
    this._headsetEvents$.next({ event: 'deviceMuteStatusChanged', payload: { ...event.body }});
  }

  handleDeviceHoldStatusChanged(event: VendorEvent<HoldEventInfo>): void {
    this.logger.info('Headset: device hold status changed', event?.body?.holdRequested);
    this._headsetEvents$.next({ event: 'deviceHoldStatusChanged', payload: { ...event.body }}); // TODO: { holdRequested, toggle } is a change; needs to be refleceted or communicated in the API reference
  }

  handleDeviceConnectionStatusChanged(event: VendorEvent<any>): void {
    this._headsetEvents$.next({ event: 'deviceConnectionStatusChanged', payload: { ...event.body }});
  }

  /* This function has no functional purpose in a real life example
   * It is here to help log all events in the call process at least for Plantronics
   */
  // handleDeviceLogs(eventInfo: { vendor: VendorImplementation, body: { name: string, code: string, event: any }}): void {
  handleDeviceLogs(eventInfo: VendorEvent<any>): void {
    this._headsetEvents$.next({ event: 'loggableEvent', payload: { ...eventInfo.body }});
  }

  get connectionStatus(): string {
    if (this.selectedImplementation?.errorCode) {
      this.logger.error(
        'An error has occurred while trying to establish a connection',
        this.selectedImplementation?.errorCode
      );
      return `Error`
    } else if (this.selectedImplementation?.isConnecting) {
      return `Checking`;
    } else if (this.selectedImplementation?.isConnected) {
      return `Running`;
    } else {
      return `Not Running`;
    }
  }

  showRetry(): boolean {
    if (this.selectedImplementation.disableRetry) {
      return false;
    }

    return this.selectedImplementation
      && !this.selectedImplementation.isConnected
      && !this.selectedImplementation.isConnecting;
  }

  retryConnection(): void {
    this.selectedImplementation.connect();
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