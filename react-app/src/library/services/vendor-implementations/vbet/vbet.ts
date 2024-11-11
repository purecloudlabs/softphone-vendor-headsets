import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import { CallInfo } from '../../..';
import DeviceInfo from '../../../types/device-info';
import { isCefHosted } from '../../../utils';
import { webhidConsent, IDevice, DeviceSignalType, findDevice } from '@vbet/webhid-sdk';

export default class VBetService extends VendorImplementation {
  private static instance: VBetService;

  private activeConversationId: string;
  private pendingConversationId: string;

  private _deviceInfo: DeviceInfo | null = null;
  private activeDevice: IDevice | null = null;
  vendorName = 'VBet';

  static getInstance (config: ImplementationConfig): VBetService {
    if (!VBetService.instance) {
      VBetService.instance = new VBetService(config);
    }
    return VBetService.instance;
  }

  get deviceInfo (): DeviceInfo {
    return this._deviceInfo;
  }

  isSupported (): boolean {
    return (window.navigator as any).hid && !isCefHosted();
  }

  deviceLabelMatchesVendor (label: string): boolean {
    const lowerLabel = label.toLowerCase();
    return ['vt', '340b'].some((searchVal) => lowerLabel.includes(searchVal));
  }

  async connect (originalDeviceLabel: string): Promise<void> {
    if (!this.isConnecting) {
      this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    }
    try {
      const dev = await findDevice(originalDeviceLabel);
      if (dev) {
        this.activeDevice = dev;
      } else {
        const dev = await new Promise<IDevice>((resolve, reject) => {
          const productId = this.deductProductId(originalDeviceLabel);
          const waiter = setTimeout(()=>reject('The selected device was not granted WebHID permissions'), 30000);
          this.requestWebHidPermissions(() => {
            webhidConsent({
              productId: productId ? productId : undefined,
            })
              .then((res) => {
                resolve(res);
                clearTimeout(waiter);
              })
              .catch((err) => {
                reject(err);
              });
          });
        });
        this.activeDevice = dev;
      }
    } catch (error) {
      this.isConnecting &&
        this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
      this.logger.error(error);
      return;
    }

    this._deviceInfo = {
      ProductName: this.activeDevice.productName,
    };

    this.activeDevice.subscribe(this.processBtnPress);
    
    this.changeConnectionStatus({ isConnected: true, isConnecting: false });
  }

  processBtnPress = (signal:DeviceSignalType):void => {
    switch (signal) {
    case DeviceSignalType.ACCEPT_CALL:
      if (this.pendingConversationId) {
        this.answerCall(this.pendingConversationId);
        this.deviceAnsweredCall({
          name: 'OffHook',
          conversationId: this.activeConversationId,
        });
      } else {
        this.logger.error('No call to be answered');
      }
      break;
    case DeviceSignalType.END_CALL:
      if (this.activeConversationId) {
        const id = this.activeConversationId;
        this.endCall(id);
        this.deviceEndedCall({
          name: 'OnHook',
          conversationId: id,
        });
      } else {
        this.logger.error('No call to be terminated');
      }
      break;
    case DeviceSignalType.MUTE_CALL:
    case DeviceSignalType.UNMUTE_CALL:
      if (this.activeConversationId) {
        this.setMute(signal===DeviceSignalType.MUTE_CALL);
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
          conversationId: this.activeConversationId,
        });
      } else {
        this.logger.error('No call to be muted');
      }
      break;
    case DeviceSignalType.REJECT_CALL:
      if (this.pendingConversationId) {
        this.rejectCall(this.pendingConversationId);
        this.deviceRejectedCall({
          name: 'Reject',
          conversationId: this.pendingConversationId,
        });
      } else {
        this.logger.error('No call to be rejected');
      }
      break;
    }
  }

  async disconnect (): Promise<void> {
    this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    this.activeDevice && this.activeDevice.unsubscribe();
    this.activeDevice = null;
    this._deviceInfo = null;
    this.isMuted = false;
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.activeDevice.ring();
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.activeConversationId = callInfo.conversationId;
    this.activeDevice.offHook();
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if (this.pendingConversationId === conversationId || autoAnswer) {
      this.activeConversationId = conversationId;
      this.pendingConversationId = '';
      this.activeDevice.offHook();
    } else {
      this.logger.error('no call to be answered');
    }
  }

  async rejectCall (conversationId: string): Promise<void> {
    if (conversationId === this.pendingConversationId) {
      this.pendingConversationId = '';
      this.activeDevice.onHook();
    } else {
      this.logger.error('no call to be rejected');
    }
  }

  async endCall (conversationId: string): Promise<void> {
    if (conversationId === this.activeConversationId) {
      this.activeConversationId = '';
      this.pendingConversationId = '';
      this.activeDevice.onHook();
    } else {
      this.logger.error('no call to be ended');
    }
  }

  async endAllCalls (): Promise<void> {
    this.activeConversationId = '';
    this.pendingConversationId = '';
    this.activeDevice.onHook();
  }

  async setMute (value: boolean): Promise<void> {
    this.isMuted = value;
    this.isMuted ? this.activeDevice.muteOn() : this.activeDevice.muteOff();
  }
}
