import { Observable, Subject } from 'rxjs';
import { VendorImplementation, ImplementationConfig } from './vendor-implementations/vendor-implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraService from './vendor-implementations/jabra/jabra';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import { ConsumedHeadsetEvents } from '../types/consumed-headset-events';
import { CallInfo } from '../types/call-info';
import { EventInfo, VendorConversationIdEvent, VendorEvent, HoldEventInfo, MutedEventInfo } from '../types/emitted-headset-events';
import { isCefHosted } from '../utils';
export default class HeadsetService {
  private static instance: HeadsetService;

  plantronics: VendorImplementation;
  jabraNative: VendorImplementation;
  jabra: VendorImplementation;
  sennheiser: VendorImplementation;
  selectedImplementation: VendorImplementation;
  headsetEvents$: Observable<ConsumedHeadsetEvents>;

  private _headsetEvents$: Subject<ConsumedHeadsetEvents>;
  private logger: any;

  private constructor(config: ImplementationConfig) {
    this._headsetEvents$ = new Subject<ConsumedHeadsetEvents>();
    this.headsetEvents$ = this._headsetEvents$.asObservable();

    this.logger = config?.logger || console;
    this.plantronics = PlantronicsService.getInstance({ logger: this.logger });
    this.jabraNative = JabraNativeService.getInstance({ logger: this.logger });
    this.jabra = JabraService.getInstance({ logger: this.logger });
    this.sennheiser = SennheiserService.getInstance({ logger: this.logger });
    
    [this.plantronics, this.jabra, this.jabraNative, this.sennheiser].forEach(implementation => this.subscribeToHeadsetEvents(implementation));
    this.selectedImplementation = this.implementations[0]; // Using the first just because it's the first
  }

  static getInstance(config: ImplementationConfig): HeadsetService {
    if (!HeadsetService.instance) {
      HeadsetService.instance = new HeadsetService(config);
    }

    return HeadsetService.instance;
  }

  get implementations(): VendorImplementation[] {
    const implementations = [
      this.sennheiser,
      this.plantronics,
      this.jabra,
      this.jabraNative
    ].filter((impl) => impl.isSupported());

    return implementations;
  }

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

  private performActionIfConnected (actionName: string, perform: (impl: VendorImplementation) => Promise<any>) {
    const impl = this.selectedImplementation;
    if (!impl || !impl.isConnected) {
      this.logger.info(`Headset: No vendor headset connected [${actionName}]`);
      return Promise.resolve();
    }

    return perform(impl);
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
    return this.performActionIfConnected('outgoingCall', (service) => service.outgoingCall(callInfo));
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

  handleDeviceAnsweredCall(event: VendorEvent<EventInfo>): void {
    console.log('event answered Call -> ', event);
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    this.logger.info('Headset: device answered the call');
    this._headsetEvents$.next({ event: 'deviceAnsweredCall', payload: { ...event.body }});
  }

  handleDeviceRejectedCall(event: VendorConversationIdEvent): void {
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
    this.logger.info('Headset: device mute status changed: ', event.body.isMuted);
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

  retryConnection(): void {
    this.selectedImplementation.connect();
  }
}