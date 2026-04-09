import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import DeviceInfo from '../../../types/device-info';
import { CallInfo } from '../../../types/call-info';
import { UpdateReasons } from '../../../types/headset-states';
import CcSdk, { CallState, SdkEvent } from '@hp/call-control-sdk';

const defaultAppName = 'genesys-cloud-headset-library';

export default class HpService extends VendorImplementation {
  private static instance: HpService;
  vendorName = 'Hp';
  pluginName: string;
  config: ImplementationConfig;
  pendingDeviceLabel: string | null = null;
  connectionTimer: any = null;
  callControlSdk = new CcSdk();
  ccsdkRegistered = false;
  incomingConversationId: string;
  activeConversationIds: Array<string>;
  heldConversationIds: Array<string>;
  _deviceInfo: DeviceInfo;
  _device = null;

  private constructor (config: ImplementationConfig) {
    super(config);
    this.config = config;
    this.pluginName = config.appName || defaultAppName;

    this._deviceInfo = null;
    this.pendingDeviceLabel = null;
    this.incomingConversationId = null;
    this.activeConversationIds = [];
    this.heldConversationIds = [];
  }

  deviceLabelMatchesVendor (label: string): boolean {
    // includes vendor name or vendorId (chrome only)
    const lowerLabel = label.toLowerCase();
    return ['plantronics', 'plt', 'poly', '(047f:', '(095d:', '(03f0:'].some(searchVal => lowerLabel.includes(searchVal));
  }

  static getInstance (config: ImplementationConfig): HpService {
    if (!HpService.instance || config.createNew) {
      HpService.instance = new HpService(config);
    }

    return HpService.instance;
  }

  get deviceName (): string | undefined {
    return this._deviceInfo?.ProductName;
  }

  get deviceInfo (): DeviceInfo {
    return this._deviceInfo;
  }

  get isDeviceAttached (): boolean {
    return !!this.deviceInfo;
  }

  async sdkEventHandler (sdkEvent: SdkEvent): Promise<any> {
    this.logger.debug('sdkEventHandler', SdkEvent[sdkEvent]);

    switch (sdkEvent) {
    case SdkEvent.CONNECT_SUCCESS:
      this.isConnected = true;
      this.changeConnectionStatus({ isConnected: true, isConnecting: false });
      this._deviceInfo = {
        ProductName: this._device.name,
        deviceName: this._device.name,
        attached: true,
      };
      this.logger.info('CCSDK connected');
      break;

    case SdkEvent.DISCONNECT:
    case SdkEvent.CONNECT_FAILED:
      this.isConnected = false;
      this._deviceInfo = null;
      this.changeConnectionStatus({ isConnected: false, isConnecting: false });
      this.logger.info('CCSDK disconnected');
      return;

    case SdkEvent.ANSWER:
      this.logger.info('CCSDK call answered', SdkEvent[SdkEvent.ANSWER]);
      if (this.incomingConversationId) {
        if (!this.activeConversationIds.includes(this.incomingConversationId)) {
          this.activeConversationIds.push(this.incomingConversationId);
        }
        this.deviceAnsweredCall({
          name: SdkEvent[sdkEvent],
          code: sdkEvent,
          conversationId: this.incomingConversationId,
        });
        this.incomingConversationId = null;
      }
      break;

    case SdkEvent.REJECT:
      {
        if (!this.incomingConversationId) {
          this.logger.warn('No incoming conversation to reject');
          return;
        }
        this.deviceRejectedCall({
          name: SdkEvent[sdkEvent],
          code: sdkEvent,
          conversationId: this.incomingConversationId,
        });
        this.incomingConversationId = null;
      }
      break;

    case SdkEvent.TERMINATE:
      {
        const activeConversationId = this.activeConversationIds.pop();
        if (!activeConversationId) {
          this.logger.warn('No active conversation to terminate');
          return;
        }
        this.deviceEndedCall({
          name: SdkEvent[sdkEvent],
          code: sdkEvent,
          conversationId: activeConversationId,
        });
      }
      break;

    case SdkEvent.HOLD:
      {
        const activeConversationId = this.activeConversationIds.pop();
        if (!activeConversationId) {
          this.logger.warn('No active conversation to hold');
          return;
        }
        this.heldConversationIds.push(activeConversationId);
        this.deviceHoldStatusChanged({
          holdRequested: true,
          name: SdkEvent[sdkEvent],
          code: sdkEvent,
          conversationId: activeConversationId,
        });
      }
      break;

    case SdkEvent.RESUME:
      {
        const heldConversationId = this.heldConversationIds.pop();
        if (!heldConversationId) {
          this.logger.warn('No held conversation to resume');
          return;
        }
        this.activeConversationIds.push(heldConversationId);
        this.deviceHoldStatusChanged({
          holdRequested: false,
          name: SdkEvent[sdkEvent],
          code: sdkEvent,
          conversationId: heldConversationId,
        });
      }
      break;

    case SdkEvent.FLASH:
      {
        const activeConversationId = this.activeConversationIds.pop();
        if (this.heldConversationIds.length==0 && !activeConversationId && !this.incomingConversationId) {
          this.logger.warn('No held, active, or incoming conversation to flash');
          return;
        }
        if (activeConversationId) {
          /* Add this to the end of the stack to simulate a round robin if doing flash with multiple active calls */
          this.heldConversationIds = [activeConversationId].concat(this.heldConversationIds);
          this.deviceHoldStatusChanged({
            holdRequested: true,
            name: SdkEvent[sdkEvent],
            code: sdkEvent,
            conversationId: activeConversationId,
          });
        }
        if (this.incomingConversationId) {
          this.activeConversationIds.push(this.incomingConversationId);
          this.deviceAnsweredCall({
            name: SdkEvent[sdkEvent],
            code: sdkEvent,
            conversationId: this.incomingConversationId,
          });
          this.incomingConversationId = null;
        } else if (this.activeConversationIds.length == 0 && (this.heldConversationIds.length > 1 || !activeConversationId)) {
          /* Ensure there are no active calls before resuming a held call, and either resuming a previous held call.
           * if activeConverstationId is not null then we just held the call above so we only resume if there was more
           * than one held call when activeConversationId is non null.*/
          const heldConversationId = this.heldConversationIds.pop();
          this.activeConversationIds.push(heldConversationId);
          this.deviceHoldStatusChanged({
            holdRequested: false,
            name: SdkEvent[sdkEvent],
            code: sdkEvent,
            conversationId: heldConversationId,
          });
        }
      }
      break;

    case SdkEvent.MUTE:
    case SdkEvent.UNMUTE:
      {
        let activeConversationId: string;
        if (this.activeConversationIds.length < 1) {
          this.logger.warn('No active call to mute or unmute.');
        } else {
          activeConversationId = this.activeConversationIds[0];
        }
        this.deviceMuteChanged({
          isMuted: sdkEvent == SdkEvent.MUTE,
          name: SdkEvent[sdkEvent],
          code: sdkEvent,
          conversationId: activeConversationId,
        });
        this.callControlSdk.setMuteState(sdkEvent == SdkEvent.MUTE);
      }
      return;

    default:
      this.logger.info('An unhandled headset event has occurred', { name: SdkEvent[sdkEvent], code: sdkEvent });
      this.deviceEventLogs({ name: SdkEvent[sdkEvent], code: sdkEvent });
      return;
    }

    this.updateCcsdkCallState();
  }

  async connect (originalDeviceLabel: string): Promise<any> {
    !this.isConnecting && this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });

    try {
      if (!this.ccsdkRegistered) {
        this.ccsdkRegistered = await this.callControlSdk.registerEventHandler(this.sdkEventHandler.bind(this));
        this.logger.debug('CCSDK Registered', this.ccsdkRegistered);
      }

      await this.callControlSdk.disconnectHeadset();

      const deviceLabel = originalDeviceLabel.toLocaleLowerCase();
      this._device = await this.getPreviouslyConnectedDevice(deviceLabel);

      if (this._device != null) {
        let validConnect = false;
        validConnect = await this.callControlSdk.connectHeadset(this._device);
        this.logger.debug('connect Headset validConnect', validConnect);
        if (!validConnect) {
          this.pendingDeviceLabel = null;
          this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: false });
          return;
        } else {
          this.pendingDeviceLabel = deviceLabel;
        }
      }
      else {
        this.logger.debug('No previously connected device found for ', deviceLabel);
        try {
          this._device = await this.getDeviceFromWebhid();
        } catch (e) {
          this.isConnecting &&
            this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
          return;
        }
      }

      this.logger.info('Device found', this._device);
    }
    finally
    {
      this.isConnecting && this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
      this.connectionTimer = setTimeout(() => {
        if (this.isConnecting) {
          this.pendingDeviceLabel = null;
          this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
        }
      }, 30000);
    }
  }

  async getPreviouslyConnectedDevice (deviceLabel: string): Promise<any> {
    const allowedHIDDevices = await (window.navigator as any).hid.getDevices();
    for (const device of allowedHIDDevices) {
      let productName = device?.productName?.toLowerCase();
      if (productName) {
        if (productName.includes('/')) {
          productName = productName.split('/')[0].trim();
        }
        if (deviceLabel.includes(productName)) {
          return device;
        }
      }
    }
    return null;
  }

  async webHidPairing (): Promise<any> {
    // Done this way in order to validate the device label
    // If this is the way we go, then perhaps the filters should be defined in ccsdk
    const deviceFilters = [{ "vendorId": 0x047f }, { "vendorId": 0x095d }, { "vendorId": 0x03f0 }];

    let devices;
    try {
      devices = await (window.navigator as any).hid.requestDevice({ filters: deviceFilters });
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
      }
    } catch (error) {
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
      }
      this.logger.error('webHidPairing: Device request failed or timed out', error);
      this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: false });
      this.pendingDeviceLabel = null;
      return Promise.reject(error);
    }

    const headset = devices[0];
    let productName = headset?.productName?.toLowerCase();
    if (productName && productName.includes('/')) {
      productName = productName.split('/')[0].trim();
    }

    if (!headset) {
      this.logger.warn('webHidPairing: No headset found');
      this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    } else if (this.pendingDeviceLabel && productName && !this.pendingDeviceLabel.includes(productName)) {
      this.logger.error('webHidPairing: Device label does not match', this.pendingDeviceLabel, headset.productName);
      this.pendingDeviceLabel = null;
      this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: false });
      const err = new Error('The selected device was not granted WebHID permissions');
      this.logger.error(err);
      return Promise.reject(err);
    } else {
      let validConnect = false;
      validConnect = await this.callControlSdk.connectHeadset(headset);
      this._device = headset;
      if (!validConnect) {
        this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: false });
      } else {
        !this.isConnecting && this.changeConnectionStatus({ isConnected: false, isConnecting: true });
      }
    }

    this.pendingDeviceLabel = null;
  }

  async getDeviceFromWebhid (): Promise<any> {
    this.requestWebHidPermissions(this.webHidPairing.bind(this));
  }

  async disconnect (clearReason?: UpdateReasons): Promise<any> {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
    }
    if (!this.isConnected) {
      return;
    }

    if (clearReason !== 'alternativeClient') {
      await this.callControlSdk.disconnectHeadset();
    }

    this._deviceInfo = null;
    this.isConnected && this.changeConnectionStatus({ isConnected: false, isConnecting: this.isConnecting });
  }

  async updateCcsdkCallState (): Promise<void> {
    let callState = CallState.IDLE;
    let remainingActiveCalls = false;
    let remainingHeldCalls = false;

    remainingActiveCalls = this.activeConversationIds.length > 0;
    remainingHeldCalls = this.heldConversationIds.length > 0;

    if (this.incomingConversationId != null) {
      callState = CallState.INCOMING;
      if (remainingActiveCalls) {
        callState = CallState.ACTIVE_AND_INCOMING;
      }
    } else if (remainingActiveCalls) {
      callState = CallState.ACTIVE;
      if (remainingHeldCalls) {
        callState = CallState.ACTIVE_AND_HELD;
      }
    } else if (remainingHeldCalls) {
      callState = CallState.HELD;
    }

    this.callControlSdk.setCallState(callState);
    this.logger.info('CCSDK Call State Updated to:', CallState[callState]);
  }

  removeConversationId (conversationId: string): void {
    if (this.activeConversationIds.length > 0) {
      this.activeConversationIds = this.activeConversationIds.filter(id => id !== conversationId);
    }
    if (this.heldConversationIds.length > 0) {
      this.heldConversationIds = this.heldConversationIds.filter(id => id !== conversationId);
    }
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.logger.info('Inside incomingCall of selected implementation (Plantronics/Poly)');

    if (!callInfo || !callInfo.conversationId) {
      throw new Error('Must provide conversationId');
    }

    if (this.incomingConversationId != null) {
      const message = `Incoming call for conversationId ${callInfo.conversationId} while another call is pending with conversationId ${this.incomingConversationId}`;
      this.logger.warn(message);
    }

    this.incomingConversationId = callInfo.conversationId;
    this.updateCcsdkCallState();
  }

  async outgoingCall (callInfo: CallInfo): Promise<any> {
    if (!callInfo || !callInfo.conversationId) {
      throw new Error('Must provide conversationId');
    }
    this.logger.info('Outgoing call for conversationId:', callInfo.conversationId, ' contactName', callInfo.contactName);

    if (!this.activeConversationIds.includes(callInfo.conversationId)) {
      this.activeConversationIds.push(callInfo.conversationId);
    }

    this.updateCcsdkCallState();
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<any> {
    this.logger.info('Answering call for conversationId:', conversationId, ' auto', autoAnswer);
    if (autoAnswer) {
      await this.incomingCall({ conversationId });
    }

    if (!this.activeConversationIds.includes(conversationId)) {
      this.activeConversationIds.push(conversationId);
    }

    this.incomingConversationId = null;
    this.updateCcsdkCallState();
  }

  async rejectCall (conversationId: string): Promise<any> {
    this.logger.info('Rejecting call for conversationId:', conversationId);
    this.incomingConversationId = null;
    this.removeConversationId(conversationId);
    this.updateCcsdkCallState();
  }

  async endCall (conversationId: string): Promise<any> {
    this.logger.info('End call for conversationId:', conversationId);
    if (!conversationId) {
      this.logger.error('conversationId is invalid');
    }

    if (!this.activeConversationIds || this.activeConversationIds.length === 0) {
      const message = `End call requested for conversationId ${conversationId} but no active call is present`;
      this.logger.info(message);
    }

    this.removeConversationId(conversationId);
    this.updateCcsdkCallState();
  }

  async endAllCalls (): Promise<void> {
    this.logger.info('End all calls');
    this.activeConversationIds = [];
    this.heldConversationIds = [];
    this.incomingConversationId = null;
    this.updateCcsdkCallState();
  }

  async setMute (value: boolean): Promise<any> {
    this.logger.info('setMute to:', value);
    this.callControlSdk.setMuteState(value);
  }

  async setHold (conversationId: string, value: boolean): Promise<any> {
    this.logger.info('setHold', conversationId, value);

    this.removeConversationId(conversationId);
    if (value) {
      this.heldConversationIds.push(conversationId);
    } else {
      this.activeConversationIds.push(conversationId);
    }
    this.updateCcsdkCallState();
  }
}