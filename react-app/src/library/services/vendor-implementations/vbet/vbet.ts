import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import { CallInfo } from '../../..';
import DeviceInfo, { PartialHIDDevice } from '../../../types/device-info';
import { PartialInputReportEvent } from '../../../types/consumed-headset-events';
import { isCefHosted } from '../../../utils';

const HEADSET_USAGE = 0x0005;
const HEADSET_USAGE_PAGE = 0x000b;

export default class VBetService extends VendorImplementation {
  private static instance: VBetService;

  private pendingConversationId: string;
  private activeConversationId: string;

  private _deviceInfo: DeviceInfo = null;
  private activeDevice: any;
  private deviceCmds: any = null;
  private inputReportReportId: null | number = null;
  private lastByte = 0;
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
    return ['vt'].some((searchVal) => lowerLabel.includes(searchVal));
  }

  async connect (originalDeviceLabel: string): Promise<void> {
    if (!this.isConnecting) {
      this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    }
    const deviceLabel = originalDeviceLabel.toLowerCase();
    const deviceList = await (window.navigator as any).hid.getDevices();
    deviceList.forEach((device) => {
      if (!this.activeDevice) {
        if (deviceLabel.includes(device?.productName?.toLowerCase())) {
          for (const collection of device.collections) {
            if (collection.usage === HEADSET_USAGE && collection.usagePage === HEADSET_USAGE_PAGE) {
              if ([0x0001].includes(device.productId)){
                this.deviceCmds = {
                  ring: [0x2, 0x2, 0x1],
                  offHook: [0x2, 0x2, 0x3],
                  onHook: [0x2, 0x2, 0x0],
                  muteOn: [0x3, 0x1, 0x0],
                  muteOff: [0x3, 0x0, 0x0],
                };
              }
              else if ([0x0020].includes(device.productId)) {
                this.deviceCmds  = {
                  ring: [0x6, 0x1, 0x0],
                  offHook: [0x6, 0x2, 0x0],
                  onHook: [0x6, 0x0, 0x0],
                  muteOn: [0x3, 0x1, 0x0],
                  muteOff: [0x3, 0x0, 0x0],
                };
              }
              else {
                this.deviceCmds  = {
                  ring: [0x6, 0x1, 0x0],
                  offHook: [0x6, 0x2, 0x0],
                  onHook: [0x6, 0x0, 0x0],
                  muteOn: [0x5, 0x12, 0x0],
                  muteOff: [0x5, 0x2, 0x0],
                };
              }
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
            const filters = [{ usage: HEADSET_USAGE, usagePage: HEADSET_USAGE_PAGE }];
            await (window.navigator as any).hid.requestDevice({ filters });
            clearTimeout(waiter);
            const deviceLists: PartialHIDDevice[] = await (
              window.navigator as any
            ).hid.getDevices();
            let bFind = false;
            deviceLists.forEach((device) => {
              if (deviceLabel.includes(device?.productName?.toLowerCase())) {
                for (const collection of device.collections) {
                  if (
                    collection.usage === HEADSET_USAGE &&
                    collection.usagePage === HEADSET_USAGE_PAGE
                  ) {
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
        this.isConnecting &&
          this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
        this.logger.error('The selected device was not granted WebHID permissions');
        return;
      }
    }

    if (!this.activeDevice.opened) {
      await this.activeDevice.open();
    }

    this.logger.debug(`get device reportId ${this.inputReportReportId}`);
    this.activeDevice.addEventListener('inputreport', (event: PartialInputReportEvent) => {
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
    if([0x0001].includes(this.activeDevice.productId)){
      switch (value) {
      case 0x04:
        this.answerCall();
        if (this.activeConversationId) {
          this.deviceAnsweredCall({
            name: 'OffHook',
            conversationId: this.activeConversationId,
          });
        }
        break;
      case 0x10:
      case 0x11:
        this.deviceRejectedCall({
          name: 'Reject',
          conversationId: this.pendingConversationId,
        });
        this.rejectCall();
        break;
      case 0x00:
        this.sendOpToDevice('onHook');
        if (this.activeConversationId) {
          this.deviceEndedCall({
            name: 'OnHook',
            conversationId: this.activeConversationId,
          });
        }
        break;
      case 0x0c:
        this.isMuted = !this.isMuted;
        this.setMute(this.isMuted);
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
          conversationId: this.activeConversationId,
        });
        break;
      }
    } else if ([0x0020].includes(this.activeDevice.productId)){
      switch (value) {
      case 0x01:
        if (this.lastByte !== 0x09) {
          this.answerCall();
          if (this.activeConversationId) {
            this.deviceAnsweredCall({
              name: 'OffHook',
              conversationId: this.activeConversationId,
            });
          }
        }
        break;
      case 0x00:
        if (this.lastByte === 0x08) {
          this.isMuted = !this.isMuted;
          this.setMute(this.isMuted);
          this.deviceMuteChanged({
            isMuted: this.isMuted,
            name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
            conversationId: this.activeConversationId,
          });
        } else {
          this.sendOpToDevice('onHook');
          if (this.activeConversationId) {
            this.deviceEndedCall({
              name: 'OnHook',
              conversationId: this.activeConversationId,
            });
          }
        }
        break;
      case 0x14:
        this.isMuted = !this.isMuted;
        this.setMute(this.isMuted);
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
          conversationId: this.activeConversationId,
        });
        break;
      }
    }else{  
      //tet
    }
    this.lastByte = value;
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    await this.sendOpToDevice('ring');
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    await this.sendOpToDevice('offHook');
  }

  async answerCall (): Promise<void> {
    if (this.pendingConversationId) {
      this.activeConversationId = this.pendingConversationId;
      this.pendingConversationId = null;
    }
    await this.sendOpToDevice('offHook');
  }

  async rejectCall (): Promise<void> {
    this.pendingConversationId = null;
    await this.sendOpToDevice('onHook');
  }

  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (hasOtherActiveCalls) {
      return;
    }
    if (conversationId === this.activeConversationId) {
      this.activeConversationId = null;
    }
    await this.sendOpToDevice('onHook');
  }

  async endAllCalls (): Promise<void> {
    this.activeConversationId = null;
    await this.sendOpToDevice('onHook');
  }

  async setMute (value: boolean): Promise<void> {
    if (value) {
      this.sendOpToDevice('muteOn');
    } else {
      this.sendOpToDevice('muteOff');
    }
  }

  async sendOpToDevice (value: 'ring'|'onHook'|'offHook'|'muteOn'|'muteOff'): Promise<void> {
    if (!this.activeDevice || this.inputReportReportId === 0) {
      this.logger.error('do not have active device');
      return;
    }
    const data = new Uint8Array(this.deviceCmds[value]);
    this.logger.debug(`send to dev ${value}`);
    await this.activeDevice.sendReport(data[0], data.slice(1, data.length));
  }
}
