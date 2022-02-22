// import { Observable, BehaviorSubject } from 'rxjs';
import { Observable, Subject } from 'rxjs';
import { VendorImplementation, ImplementationConfig } from './vendor-implementations/vendor-implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraService from './vendor-implementations/jabra/jabra';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import ApplicationService from './application';
import { ConsumedHeadsetEvents } from '../types/consumed-headset-events';
import { CallInfo } from '../types/call-info';
import { EventInfo, VendorConversationIdEvent, VendorEvent, HoldEventInfo, MutedEventInfo } from '../types/emitted-headset-events';
export default class HeadsetService {
  private static instance: HeadsetService;

  plantronics: VendorImplementation;
  jabraNative: VendorImplementation;
  jabra: VendorImplementation;
  sennheiser: VendorImplementation;
  application: ApplicationService;
  selectedImplementation: VendorImplementation;
  headsetEvents$: Observable<ConsumedHeadsetEvents>;

  private _headsetEvents$: Subject<ConsumedHeadsetEvents>;
  private _implementations: VendorImplementation[] = [];
  private logger: any;

  private constructor(config: ImplementationConfig) {
    // super();
    //TODO: Just a temporary typing for testing purposes
    // this._headsetEvents$ = new BehaviorSubject<ConsumedHeadsetEvents>(null);
    this._headsetEvents$ = new Subject<ConsumedHeadsetEvents>();
    this.headsetEvents$ = this._headsetEvents$.asObservable();

    this.application = ApplicationService.getInstance();
    this.selectedImplementation = this.buildImplementationsArray()[0]; // Using the first just because it's the first
    this.logger = config?.logger || console;
    this.plantronics = PlantronicsService.getInstance({ logger: this.logger });
    this.jabraNative = JabraNativeService.getInstance({ logger: this.logger });
    this.jabra = JabraService.getInstance({ logger: this.logger });
    this.sennheiser = SennheiserService.getInstance({ logger: this.logger });

    [this.plantronics, this.jabraNative, this.sennheiser, this.jabra]
      .forEach(implementation => this.subscribeToHeadsetEvents(implementation));
  }

  static getInstance(config: ImplementationConfig): HeadsetService {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService(config);
    }

    return HeadsetService.instance;
  }

  buildImplementationsArray(): VendorImplementation[] {
    if (this._implementations.find((implementation) => implementation)) {
      return this._implementations;
    }

    const implementations: VendorImplementation[] = [];
    if (this.application.hostedContext.supportsJabra()) {
      implementations.push(
        // this.application.hostedContext.isHosted() ? this.jabraNative : this.jabraChrome
        this.application.hostedContext.isHosted() ? this.jabraNative : this.jabra
        // this.jabra
      );
    }
    implementations.push(this.plantronics);
    implementations.push(this.sennheiser);

    this._implementations = implementations;
    return this._implementations;
  }

  getHeadSetEventsSubject = (): Subject<ConsumedHeadsetEvents> => {
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
      this.logger.debug('Requesting Webhid Permissions');
      this._headsetEvents$.next({ event: 'webHidPermissionRequested' as any, payload })
    });
  }

  activeMicChange(newMicLabel: string): void {
    const implementation = this.buildImplementationsArray().find((implementation) => implementation.deviceLabelMatchesVendor(newMicLabel));
    if (implementation) {
      this.changeImplementation(implementation, newMicLabel);
    } else if (this.selectedImplementation) {
      this.selectedImplementation.disconnect();
    }
  }

  private performActionIfConnected(actionName: string, perform: (impl: VendorImplementation) => Promise<any>) {
    const impl = this.selectedImplementation;
    if(!impl || !impl.isConnected) {
      this.logger.info(`Headset: No vendor headset connected [${actionName}]`);
      return Promise.resolve();
    }

    return perform(impl);
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

  incomingCall(callInfo: CallInfo, hasOtherActiveCalls?: boolean): Promise<any> {
    return this.performActionIfConnected('incomingCall', (implementation) => implementation.incomingCall(callInfo, hasOtherActiveCalls));
  }

  outgoingCall(callInfo: CallInfo): Promise<any> {
    return this.performActionIfConnected('outgoingCall', (implementation) => implementation.outgoingCall(callInfo));
  }

  answerCall(conversationId: string): Promise<any> {
    return this.performActionIfConnected('answerCall', (implementation) => implementation.answerCall(conversationId));
  }

  setMute(value: boolean): Promise<any> {
    return this.performActionIfConnected('setMute', (implementation) => implementation.setMute(value));
  }

  setHold(conversationId: string, value: boolean): Promise<any> {
    return this.performActionIfConnected('setHold', (implementation) => implementation.setHold(conversationId, value));
  }

  endCall(conversationId: string, hasOtherActiveCalls?: boolean): Promise<any> {
    return this.performActionIfConnected('endCall', (implementation) => implementation.endCall(conversationId, hasOtherActiveCalls));
  }

  endAllCalls(): Promise<any> {
    return this.performActionIfConnected('endAllCalls', (implementation) => implementation.endAllCalls());
  }

  private handleDeviceAnsweredCall(event: VendorEvent<EventInfo>): void {
    console.log('event answered Call -> ', event);
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device answered the call');
    this._headsetEvents$.next({ event: 'deviceAnsweredCall', payload: { ...event.body }});
  }

  private handleDeviceRejectedCall(event: VendorConversationIdEvent): void {
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device rejected the call');
    this._headsetEvents$.next({ event: 'deviceRejectedCall', payload: { conversationId: event.body.conversationId }});
  }

  private handleDeviceEndedCall(event: VendorEvent<EventInfo>): void {
    this.logger.info('Headset: device ended the call');
    this._headsetEvents$.next({ event: 'deviceEndedCall', payload: { ...event.body } });
    // this._headsetEvents$.next({ event: 'loggableEvent', payload: { ...event.body } });
  }

  private handleDeviceMuteStatusChanged(event: VendorEvent<MutedEventInfo>): void {
    this.logger.info('Headset: device mute status changed: ', event.body.isMuted);
    this._headsetEvents$.next({ event: 'deviceMuteStatusChanged', payload: { ...event.body }});
  }

  private handleDeviceHoldStatusChanged(event: VendorEvent<HoldEventInfo>): void {
    this.logger.info('Headset: device hold status changed', event.body.holdRequested);
    this._headsetEvents$.next({ event: 'deviceHoldStatusChanged', payload: { ...event.body }});
  }

  private handleDeviceConnectionStatusChanged(event: VendorEvent<any>): void {
    this._headsetEvents$.next({ event: 'deviceConnectionStatusChanged', payload: { ...event.body }});
  }

  /* This function has no functional purpose in a real life example
   * It is here to help log all events in the call process at least for Plantronics
   */
  // handleDeviceLogs(eventInfo: { vendor: VendorImplementation, body: { name: string, code: string, event: any }}): void {
  private handleDeviceLogs(eventInfo: VendorEvent<any>): void {
    this._headsetEvents$.next({ event: 'loggableEvent', payload: { ...eventInfo.body }});
  }

  retryConnection(): void {
    this.selectedImplementation.connect();
  }
}