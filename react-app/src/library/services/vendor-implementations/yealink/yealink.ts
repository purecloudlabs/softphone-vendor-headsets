import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import { CallInfo } from '../../..';
import DeviceInfo from "../../../types/device-info";
import { isCefHosted } from "../../../utils";

export default class YealinkService extends VendorImplementation {
  private static instance: YealinkService;

  private pendingConversationId: string;
  private activeConversationId: string;

  private _deviceInfo: DeviceInfo = null;
  private activeDevice: any;
  private offhookFlag = 0b1;
  private muteFlag = 0b10;
  private ringFlag = 0b100;
  private holdFlag = 0b1000;

  private callState = 0;
  private recCallState = 0;
  private recMuteFlag = 0b100;
  private recReject = 0x40;

  private isHold = false;

  private inputReportReportId = 0;

  private constructor (config: ImplementationConfig) {
    super(config);
    this.vendorName = 'Yealink';
  }

  static getInstance (config: ImplementationConfig): YealinkService {
    if (!YealinkService.instance) {
      YealinkService.instance = new YealinkService(config);
    }

    return YealinkService.instance;
  }

  get deviceInfo (): DeviceInfo {
    return this._deviceInfo;
  }

  isSupported (): boolean {
    return (window.navigator as any).hid && !isCefHosted();
  }

  deviceLabelMatchesVendor (label: string): boolean {
    const lowerLabel = label.toLowerCase();
    return ['yealink', '(6993:'].some(searchVal => lowerLabel.includes(searchVal));
  }

  async connect (originalDeviceLabel: string): Promise<void> {
    if (!this.isConnecting) {
      this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    }
    const deviceLabel = originalDeviceLabel.toLowerCase();

    const deviceList = await (window.navigator as any).hid.getDevices();
    deviceList.forEach(device => {
      if (!this.activeDevice) {
        if (deviceLabel.includes(device ?.productName ?.toLowerCase())) {
          for (const collection of device.collections) {
            if (collection.usage === 0x0005 &&
              collection.usagePage === 0x000B) {
              this.activeDevice = device;
              if (collection.inputReports.length !== 0) {
                this.inputReportReportId = collection.inputReports[0].reportId;
              }
              break;
            }
          }
        }
      }
    });

    if (!this.activeDevice) {
      try {
        this.activeDevice = await new Promise((resolve, reject) => {
          const waiter = setTimeout(reject, 30000);
          this.requestWebHidPermissions(async () => {
            const filters = [{ usage: 0x0005, usagePage: 0x000B }];
            await (window.navigator as any).hid.requestDevice({ filters });
            clearTimeout(waiter);
            const deviceLists = await (window.navigator as any).hid.getDevices();
            let bFind = false;
            deviceLists.forEach(device => {
              if (deviceLabel.includes(device?.productName?.toLowerCase())) {
                for (const collection of device.collections) {
                  if (collection.usage === 0x0005
                    && collection.usagePage === 0x000B) {
                    bFind = true;
                    if (collection.inputReports.length !== 0) {
                      this.inputReportReportId = collection.inputReports[0].reportId;
                    }
                    resolve(device);
                    break;
                  }
                }
              }
            });
            if (!bFind) {
              reject();
            }
          });
        });
      } catch (error) {
        this.isConnecting && this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
        this.logger.error('The selected device was not granted WebHID permissions');
        return;
      }
    }

    if (!this.activeDevice.opened) {
      await this.activeDevice.open();
    }

    console.log(`get device reportId ${this.inputReportReportId}`);
    this.activeDevice.addEventListener("inputreport", event => {
      if (event.reportId !== this.inputReportReportId) {
        return;
      }
      const value = event.data.getUint8(0);

      this.processBtnPress(value);
    });
    this._deviceInfo = {
      ProductName: this.activeDevice.productName,
    };

    if (this.isConnecting && !this.isConnected) {
      this.changeConnectionStatus({ isConnected: true, isConnecting: false });
    }
  }

  async disconnect (): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    }  
    if (this.activeDevice) {
      this.activeDevice.close();
      this.activeDevice = null;
      this._deviceInfo = null;
      this.inputReportReportId = 0;
    }
  }

  processBtnPress (value: number): void {
    if (!this.activeDevice) {
      this.logger.error('do not have active device');
      return;
    }  
    console.log(`User pressed button ${value}. local ${this.recCallState}`);
    const changeFlag = value ^ this.recCallState;
    if (changeFlag === 0) {
      return;
    }
    if (value !== 0
      && (this.callState & (~this.muteFlag)) === 0) {
      console.log(`Not talking, ignore key`);
      return;
    }
    this.recCallState = value;  
    if (changeFlag & this.offhookFlag) {
      if (value & this.offhookFlag) {
        this.answerCall();
        if (this.activeConversationId) {
          this.deviceAnsweredCall({
            name: 'OffHook',
            conversationId: this.activeConversationId,
          });
        }
        else {
          console.log(`activeConversationId is empty`);
        }
      } else if (!this.isHold) {
        this.sendOpToDevice(this.isMuted ? this.muteFlag : 0);
        if (this.activeConversationId) {
          this.deviceEndedCall({
            name: 'OnHook',
            conversationId: this.activeConversationId,
          });
        }
        else {
          console.log(`activeConversationId is empty`);
        }
        this.activeConversationId = null;
      }
    } else if (changeFlag & this.recMuteFlag) {
      if (value & this.recMuteFlag) {
        this.setMute(!this.isMuted);
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
          conversationId: this.activeConversationId,
        });
      }
    } else if (changeFlag & this.holdFlag) {
      if (value & this.holdFlag) {
        this.setHold(null, !this.isHold);
        this.deviceHoldStatusChanged({
          holdRequested: this.isHold,
          name: this.isHold ? 'OnHold' : 'ResumeCall',
          conversationId: this.activeConversationId,
        });
      }
    } else if (changeFlag & this.recReject) {
      if (value & this.recReject) {
        this.deviceRejectedCall({
          name: 'Reject',
          conversationId: this.pendingConversationId,
        });
        this.rejectCall();
      }
    }
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    if (callInfo) {
      this.pendingConversationId = callInfo.conversationId;
      const val = this.isMuted ? this.muteFlag : 0;
      this.sendOpToDevice(val | this.ringFlag);
    }
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    this.sendOpToDevice(this.offhookFlag);
  }

  async answerCall (): Promise<void> {
    if (this.pendingConversationId) {
      this.activeConversationId = this.pendingConversationId;
      this.pendingConversationId = null;
    }
    const val = this.isMuted ? this.muteFlag : 0;
    this.sendOpToDevice(val | this.offhookFlag);
  }

  async rejectCall (): Promise<void> {
    this.pendingConversationId = null;
    this.sendOpToDevice(this.isMuted ? this.muteFlag : 0);
  }

  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (hasOtherActiveCalls) {
      return;
    }

    if (conversationId === this.activeConversationId) {
      this.activeConversationId = null;
    }
    // keep mute state
    this.sendOpToDevice(this.isMuted ? this.muteFlag : 0);
  }

  async endAllCalls (): Promise<void> {
    this.activeConversationId = null;
    this.sendOpToDevice(this.isMuted ? this.muteFlag : 0);
  }

  async setMute (value: boolean): Promise<void> {
    if (value) {
      this.sendOpToDevice(this.callState | this.muteFlag);
    } else {
      this.sendOpToDevice(this.callState & (~this.muteFlag));
    }
  }

  async setHold (conversationId: string, value: boolean): Promise<void> {
    if (value) {
      const setValue = this.callState & (~this.offhookFlag);
      this.sendOpToDevice(setValue | this.holdFlag);
    } else {
      const setValue = this.callState & (~this.holdFlag);
      this.sendOpToDevice(setValue | this.offhookFlag);
    }
  }

  async sendOpToDevice (value: number): Promise<void> {
    if (!this.activeDevice || this.inputReportReportId === 0) {
      this.logger.error('do not have active device');
      return;
    }

    if (value & this.holdFlag) {
      this.isHold = true;
    } else {
      this.isHold = false;
    }

    if (value & this.muteFlag) {
      this.isMuted = true;
    } else {
      this.isMuted = false;
    }

    this.logger.info(`send to dev ${value}`);
    this.callState = value;
    await this.activeDevice.sendReport(this.inputReportReportId, new Uint8Array([value]));
  }
}