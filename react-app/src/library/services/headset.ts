import { Observable, Subject } from 'rxjs';
import { VendorImplementation, ImplementationConfig } from './vendor-implementations/vendor-implementation';
import CyberAcousticsService from './vendor-implementations/CyberAcoustics/CyberAcoustics';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraService from './vendor-implementations/jabra/jabra';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import YealinkService from './vendor-implementations/yealink/yealink';
import VBetService from './vendor-implementations/vbet/vbet';
import { CallInfo } from '../types/call-info';
import { VendorEvent, HoldEventInfo, MutedEventInfo, EventInfoWithConversationId } from '../types/emitted-headset-events';
import { WebHidPermissionRequest } from '..';
import { ConsumedHeadsetEvents, HeadsetEvents, DeviceConnectionStatus } from '../types/consumed-headset-events';
import { HeadsetState, HeadsetStateRecord, UpdateReasons } from '../types/headset-states';

type StateProps = Partial<HeadsetState>;
type StateCompareProps = { conversationId: string; state: StateProps };

const REMOVE_WAIT = 2000;

export default class HeadsetService {
  private static instance: HeadsetService;

  plantronics: VendorImplementation;
  jabraNative: VendorImplementation;
  jabra: VendorImplementation;
  sennheiser: VendorImplementation;
  yealink: VendorImplementation;
  vbet:VendorImplementation;
  cyberAcoustics: VendorImplementation;
  selectedImplementation: VendorImplementation;
  headsetEvents$: Observable<ConsumedHeadsetEvents>;

  private headsetConversationStates: { [conversationId: string]: HeadsetStateRecord } = {};
  private _headsetEvents$: Subject<ConsumedHeadsetEvents>;
  private logger: any;

  private constructor (config: ImplementationConfig) {
    this._headsetEvents$ = new Subject<ConsumedHeadsetEvents>();
    this.headsetEvents$ = this._headsetEvents$.asObservable();

    this.logger = config.logger || console;
    this.plantronics = PlantronicsService.getInstance({ logger: this.logger, appName: config.appName });
    this.jabraNative = JabraNativeService.getInstance({ logger: this.logger });
    this.jabra = JabraService.getInstance({ logger: this.logger });
    this.sennheiser = SennheiserService.getInstance({ logger: this.logger });
    this.yealink = YealinkService.getInstance({ logger: this.logger });
    this.vbet = VBetService.getInstance({ logger: this.logger });
    this.cyberAcoustics = CyberAcousticsService.getInstance({ logger: this.logger });

    [this.plantronics, this.jabra, this.jabraNative, this.sennheiser, this.yealink, this.vbet, this.cyberAcoustics].forEach(implementation => this.subscribeToHeadsetEvents(implementation));
  }

  static getInstance (config: ImplementationConfig): HeadsetService {
    if (!HeadsetService.instance || config.createNew) {
      HeadsetService.instance = new HeadsetService(config);
    }

    return HeadsetService.instance;
  }

  get implementations (): VendorImplementation[] {
    const implementations = [
      this.sennheiser,
      this.plantronics,
      this.jabra,
      this.jabraNative,
      this.yealink,
      this.vbet,
      this.cyberAcoustics
    ].filter((impl) => impl.isSupported());

    return implementations;
  }

  private isDifferentState (props: StateCompareProps): boolean {
    const state = this.headsetConversationStates[props.conversationId];

    // different if there's no state or any of the provided state props don't match
    return !state || Object.entries(props.state).some(([key, value]) => state[key] !== value);
  }

  private updateHeadsetState (props: StateCompareProps, opts = { expectExistingConversation: true }): boolean {
    if (this.isDifferentState(props)) {
      const state = this.headsetConversationStates[props.conversationId];
      if (!state) {
        if (opts.expectExistingConversation) {
          this.logger.warn('updateHeadsetState has no existing state for provided conversationId.', { conversationId: props.conversationId });
        }
        return false;
      }
      Object.assign(state, props.state);
      return true;
    }

    return false;
  }

  deviceIsSupported (params: { micLabel: string }): boolean {
    if (!params.micLabel) {
      return false;
    }

    const implementation = this.implementations.find((implementation) => {
      return implementation.deviceLabelMatchesVendor(params.micLabel);
    });
    return !!implementation;
  }

  activeMicChange (newMicLabel: string, changeReason?: UpdateReasons): void {
    this.logger.info('Attempting to change the active mic', { newMicLabel, changeReason });
    if (newMicLabel) {
      const implementation = this.implementations.find((implementation) => implementation.deviceLabelMatchesVendor(newMicLabel));
      if (implementation) {
        this.logger.info('Associated implementation was found, changing vendor', implementation);
        this.changeImplementation(implementation, newMicLabel);
      } else if (this.selectedImplementation) {
        this.logger.info('Associated implementation was not found but selectedImplementation existed, clearing selected implementation', this.selectedImplementation);
        this.clearSelectedImplementation(changeReason);
      }
    } else {
      this.clearSelectedImplementation(changeReason);
    }
  }

  async changeImplementation (implementation: VendorImplementation | null, deviceLabel: string): Promise<void> {
    if (implementation === this.selectedImplementation) {
      this.logger.info('Requested implementation and selected implementation are the same, not changing anything');
      return;
    }

    if (this.selectedImplementation) {
      this.logger.info('Selected implementation was present, disconnecting selected implementation');
      // remove headsetStates associated with implementation
      this.headsetConversationStates = {};

      await this.selectedImplementation.disconnect();
    }

    this.selectedImplementation = implementation;

    this._headsetEvents$.next({ event: HeadsetEvents.implementationChanged, payload: implementation });

    if (implementation) {
      await implementation.connect(deviceLabel);
    }
  }

  async incomingCall (callInfo: CallInfo, hasOtherActiveCalls?: boolean): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    this.headsetConversationStates[callInfo.conversationId] = {
      conversationId: callInfo.conversationId,
      held: false,
      muted: false,
      offHook: false,
      ringing: true
    };

    return implementation.incomingCall(callInfo, hasOtherActiveCalls);
  }

  async outgoingCall (callInfo: CallInfo): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    this.headsetConversationStates[callInfo.conversationId] = {
      conversationId: callInfo.conversationId,
      held: false,
      muted: false,
      offHook: true,
      ringing: false
    };

    return implementation.outgoingCall(callInfo);
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    if (!autoAnswer) {
      const expectedStatePostAction: Partial<HeadsetState> = {
        ringing: false,
        offHook: true
      };

      if (this.updateHeadsetState({ conversationId, state: expectedStatePostAction })) {
        return implementation.answerCall(conversationId);
      }
    } else {
      this.headsetConversationStates[conversationId] = {
        conversationId: conversationId,
        held: false,
        muted: false,
        offHook: true,
        ringing: false
      };

      return implementation.answerCall(conversationId, autoAnswer);
    }
  }

  async rejectCall (conversationId: string, expectExistingConversation = true): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    const expectedStatePostAction: Partial<HeadsetState> = {
      ringing: false
    };

    if (this.updateHeadsetState({ conversationId, state: expectedStatePostAction }, { expectExistingConversation })) {
      const headsetState = this.headsetConversationStates[conversationId];
      headsetState.removeTimer = this.setRemoveTimer(conversationId);
      return implementation.rejectCall(conversationId);
    }
  }

  async setMute (value: boolean): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    if (Object.values(this.headsetConversationStates).some(headsetState => headsetState.muted !== value)) {
      Object.values(this.headsetConversationStates).forEach(headsetState => headsetState.muted = value);
      return implementation.setMute(value);
    }
  }

  async setHold (conversationId: string, value: boolean): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    const expectedStatePostAction: Partial<HeadsetState> = {
      held: value
    };

    if (this.updateHeadsetState({ conversationId, state: expectedStatePostAction })) {
      return implementation.setHold(conversationId, value);
    }
  }

  async endCall (conversationId: string, hasOtherActiveCalls?: boolean): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    const expectedStatePostAction: Partial<HeadsetState> = {
      offHook: false
    };

    if (this.updateHeadsetState({ conversationId, state: expectedStatePostAction })) {
      const headsetState = this.headsetConversationStates[conversationId];
      headsetState.removeTimer = this.setRemoveTimer(conversationId);
      return implementation.endCall(conversationId, hasOtherActiveCalls);
    }
  }

  async endAllCalls (): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (!implementation) {
      return;
    }

    Object.values(this.headsetConversationStates).forEach((headsetState) => {
      if (!headsetState.removeTimer) {
        headsetState.removeTimer = this.setRemoveTimer(headsetState.conversationId);
      }
    });

    return implementation.endAllCalls();
  }

  retryConnection (micLabel: string): Promise<void> {
    if (!this.selectedImplementation) {
      return Promise.reject(new Error('No active headset implementation'));
    }

    return this.selectedImplementation.connect(micLabel);
  }

  connectionStatus (): DeviceConnectionStatus {
    if (this.selectedImplementation) {
      if (!this.selectedImplementation.isConnected && !this.selectedImplementation.isConnecting) {
        return 'notRunning';
      }
      return this.selectedImplementation.isConnected ? 'running' : 'checking';
    }
    return 'noVendor';
  }

  resetHeadsetStateForCall (conversationId: string): Promise<any> {
    const implementation = this.getConnectedImpl();
    if (implementation) {
      return implementation.resetHeadsetStateForCall(conversationId);
    } else {
      this.logger.info('No active implementation, headset state does not require a reset');
    }
  }

  private getConnectedImpl (): VendorImplementation {
    const impl = this.selectedImplementation;
    if (!impl || !impl.isConnected) {
      return null;
    }

    return impl;
  }

  private subscribeToHeadsetEvents (implementation: VendorImplementation) {
    implementation.on(HeadsetEvents.deviceAnsweredCall, this.handleDeviceAnsweredCall.bind(this));
    implementation.on(HeadsetEvents.deviceRejectedCall, this.handleDeviceRejectedCall.bind(this));
    implementation.on(HeadsetEvents.deviceEndedCall, this.handleDeviceEndedCall.bind(this));
    implementation.on(HeadsetEvents.deviceMuteStatusChanged, this.handleDeviceMuteStatusChanged.bind(this));
    implementation.on(HeadsetEvents.deviceHoldStatusChanged, this.handleDeviceHoldStatusChanged.bind(this));
    implementation.on(HeadsetEvents.deviceEventLogs, this.handleDeviceLogs.bind(this));
    implementation.on(HeadsetEvents.deviceConnectionStatusChanged, this.handleDeviceConnectionStatusChanged.bind(this));
    implementation.on(HeadsetEvents.webHidPermissionRequested, this.handleWebHidPermissionRequested.bind(this));
  }

  private clearSelectedImplementation (clearReason?: UpdateReasons): void {
    this.logger.info('Attempting to clear the selected vendor', { selectedImplementation: this.selectedImplementation, clearReason });
    if (!this.selectedImplementation) {
      return;
    }

    this.selectedImplementation.disconnect(clearReason);
    this._headsetEvents$.next({ event: HeadsetEvents.implementationChanged, payload: null });
    this.selectedImplementation = null;
    this.handleDeviceConnectionStatusChanged();
  }

  private setRemoveTimer (conversationId) {
    return setTimeout(() => {
      // we are using the removeTimer to make sure this is actually slated for removal.
      // if we get a new incoming call for example, it will replace the current state which is slated for
      // removal and we don't want to remove it if it's a new/updated state
      if (this.headsetConversationStates[conversationId].removeTimer) {
        delete this.headsetConversationStates[conversationId];
      }
    }, REMOVE_WAIT);
  }

  private handleDeviceAnsweredCall (event: VendorEvent<EventInfoWithConversationId>): void {
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    const expectedStatePostAction: Partial<HeadsetState> = {
      ringing: false,
      offHook: true
    };

    this.updateHeadsetState({ conversationId: event.body.conversationId, state: expectedStatePostAction });

    this.logger.info('Headset: device answered the call');
    this._headsetEvents$.next({ event: HeadsetEvents.deviceAnsweredCall, payload: { ...event.body } });
  }

  private handleDeviceRejectedCall (event: VendorEvent<EventInfoWithConversationId>): void {
    if (event.vendor !== this.selectedImplementation) {
      return;
    }

    const expectedStatePostAction: Partial<HeadsetState> = {
      ringing: false
    };
    const conversationId = event.body.conversationId;
    if (this.updateHeadsetState({ conversationId, state: expectedStatePostAction })) {
      const headsetState = this.headsetConversationStates[conversationId];
      headsetState.removeTimer = this.setRemoveTimer(conversationId);
    }

    this.logger.info('Headset: device rejected the call');
    this._headsetEvents$.next({ event: HeadsetEvents.deviceRejectedCall, payload: { ...event.body } });
  }

  private handleDeviceEndedCall (event: VendorEvent<EventInfoWithConversationId>): void {
    this.logger.info('Headset: device ended the call');

    const expectedStatePostAction: Partial<HeadsetState> = {
      offHook: false
    };

    const conversationId = event.body.conversationId;

    if (this.updateHeadsetState({ conversationId, state: expectedStatePostAction })) {
      const headsetState = this.headsetConversationStates[conversationId];
      headsetState.removeTimer = this.setRemoveTimer(conversationId);
    }

    this._headsetEvents$.next({ event: HeadsetEvents.deviceEndedCall, payload: { ...event.body } });
  }

  private handleDeviceMuteStatusChanged (event: VendorEvent<MutedEventInfo>): void {
    this.logger.info('Headset: device mute status changed: ', event.body.isMuted);
    if (Object.values(this.headsetConversationStates).some(headsetState => headsetState.muted !== event.body.isMuted)) {
      Object.values(this.headsetConversationStates).forEach(headsetState => headsetState.muted = event.body.isMuted);
    }
    this._headsetEvents$.next({ event: HeadsetEvents.deviceMuteStatusChanged, payload: { ...event.body } });
  }

  private handleDeviceHoldStatusChanged (event: VendorEvent<HoldEventInfo>): void {
    this.logger.info('Headset: device hold status changed', event.body.holdRequested);

    const expectedStatePostAction: Partial<HeadsetState> = {
      held: event.body.holdRequested
    };
    const conversationId = event.body.conversationId;
    this.updateHeadsetState({ conversationId, state: expectedStatePostAction });

    this._headsetEvents$.next({ event: HeadsetEvents.deviceHoldStatusChanged, payload: { ...event.body } });
  }

  private handleDeviceConnectionStatusChanged (): void {
    this._headsetEvents$.next({ event: HeadsetEvents.deviceConnectionStatusChanged, payload: this.connectionStatus() });
  }

  private handleWebHidPermissionRequested (event: VendorEvent<WebHidPermissionRequest>): void {
    this.logger.debug('Requesting Webhid Permissions');
    this._headsetEvents$.next({ event: HeadsetEvents.webHidPermissionRequested, payload: { ...event.body } });
  }

  /* This function has no functional purpose in a real life example
   * It is here to help log all events in the call process at least for Plantronics
   */
  private handleDeviceLogs (eventInfo: VendorEvent<any>): void {
    this._headsetEvents$.next({ event: HeadsetEvents.loggableEvent, payload: { ...eventInfo.body } });
  }
}