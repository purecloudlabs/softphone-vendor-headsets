import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import { CallInfo } from '../../..';
import DeviceInfo from '../../../types/device-info';
import { PartialInputReportEvent } from '../../../types/consumed-headset-events';
import { isCefHosted } from '../../../utils';

const HEADSET_USAGE = 0x0005;
const HEADSET_USAGE_PAGE = 0x000b;
const VENDOR_ID = 0x340b;
const BT100USeries = [0x0001];
const CMEDIASeries = [0x0020, 0x0022];
const DECTSeries = [0x0014];

export default class VBetService extends VendorImplementation {
  private static instance: VBetService;

  public pendingConversationId: string;
  public activeConversationId: string;

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
    return ['vt','340b'].some((searchVal) => lowerLabel.includes(searchVal));
  }

  setDeviceAttrs (pid: number): void {
    if (BT100USeries.includes(pid)) {
      this.deviceCmds = {
        ring: [0x2, 0x2, 0x1],
        offHook: [0x2, 0x2, 0x3],
        onHook: [0x2, 0x2, 0x0],
        muteOn: [0x3, 0x1, 0x0],
        muteOff: [0x3, 0x0, 0x0],
      };
      this.inputReportReportId = 0x08;
    } else if (CMEDIASeries.includes(pid)) {
      this.deviceCmds = {
        ring: [0x6, 0x1, 0x0],
        offHook: [0x6, 0x2, 0x0],
        onHook: [0x6, 0x0, 0x0],
        muteOn: [0x3, 0x1, 0x0],
        muteOff: [0x3, 0x0, 0x0],
      };
      this.inputReportReportId = 0x01;
    } else if (DECTSeries.includes(pid)) {
      this.deviceCmds = {
        ring: [0x2, 0x2, 0x2, 0x1],
        offHook: [0x2, 0x1, 0x0],
        onHook: [0x2, 0x0, 0x0],
        muteOn: [0x2, 0x2, 0x1],
        muteOff: [0x2, 0x2, 0x0],
        setMode: [0x2, 0x2, 0x2, 0x2, 0x2, 0x2, 0, 0],
      };
      this.inputReportReportId = 0x01;
    } else if (pid >= 0x0040 && pid <= 0x0083) {
      this.deviceCmds = {
        ring: [0x6, 0x1, 0x0],
        offHook: [0x6, 0x2, 0x0],
        onHook: [0x6, 0x0, 0x0],
        muteOn: [0x6, 0x4, 0x0],
        muteOff: [0x6, 0x5, 0x0],
      };
      this.inputReportReportId = 0x05;
    } else {
      this.logger.error('not recognized device');
    }
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
              this.setDeviceAttrs(device.productId);
              this.activeDevice = device;
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
            const filters = [{ usage: HEADSET_USAGE, usagePage: HEADSET_USAGE_PAGE, vendorId: VENDOR_ID }];
            await (window.navigator as any).hid.requestDevice({ filters });
            clearTimeout(waiter);
            const deviceList = await (window.navigator as any).hid.getDevices();
            let bFind = false;
            deviceList.forEach((device) => {
              if (deviceLabel.includes(device?.productName?.toLowerCase())) {
                for (const collection of device.collections) {
                  if (
                    collection.usage === HEADSET_USAGE &&
                    collection.usagePage === HEADSET_USAGE_PAGE
                  ) {
                    bFind = true;
                    this.setDeviceAttrs(device.productId);
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


    !this.activeDevice.opened && await this.activeDevice.open();


    this.logger.debug(`device input reportId ${this.inputReportReportId}`);
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
      await this.activeDevice.close();
      this.activeDevice = null;
      this._deviceInfo = null;
      this.inputReportReportId = 0;
      this.isMuted = false;
    }
  }

  async processBtnPress (value: number): Promise<void> {
    if (!this.activeDevice) {
      this.logger.error('do not have active device');
      return;
    }
    if (BT100USeries.includes(this.activeDevice.productId)) {
      switch (value) {
      case 0x04:
        await this.answerCallFromDevice();
        break;
      case 0x10:
        await this.rejectCallFromDevice();
        break;
      case 0x00:
        await this.endCallFromDevice();
        break;
      case 0x0c:
        await this.setMuteFromDevice(!this.isMuted);
        break;
      }
    }
    if (CMEDIASeries.includes(this.activeDevice.productId)) {
      switch (value) {
      case 0x01:
        this.lastByte !== 0x09 && await this.answerCallFromDevice();
        break;
      case 0x00:
        if (this.lastByte === 0x08) {
          await this.setMuteFromDevice(!this.isMuted);
        } else {
          await this.endCallFromDevice();
        }
        break;
      case 0x14:
        await this.setMuteFromDevice(!this.isMuted);
        break;
      }
    }
    if (this.activeDevice.productId >= 0x0040 && this.activeDevice.productId <= 0x0083) {
      switch (value) {
      case 0x20:
        await this.answerCallFromDevice();
        break;
      case 0x08:
        await this.rejectCallFromDevice();
        break;
      case 0x00:
        await this.endCallFromDevice();
        break;
      case 0x01:
        await this.setMuteFromDevice(false);
        break;
      case 0x05:
        await this.setMuteFromDevice(true);
        break;
      }
    }
    if (DECTSeries.includes(this.activeDevice.productId)) {
      switch (value) {
      case 0x02:
        await this.answerCallFromDevice();
        break;
      case 0x00:
        await this.endCallFromDevice();
        break;
      case 0x03:
        await this.setMuteFromDevice(true);
        break;
      case 0x04:
        await this.setMuteFromDevice(false);
        break;
      }
    }
    this.lastByte = value;
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    if (DECTSeries.includes(this.activeDevice.productId)) {
      await this.sendOpToDevice('setMode');
    }
    await this.sendOpToDevice('ring');
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    if (DECTSeries.includes(this.activeDevice.productId)) {
      await this.sendOpToDevice('setMode');
    }
    await this.sendOpToDevice('offHook');
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if(!conversationId){
      return;
    }else {
      if (autoAnswer) {
        await this.sendOpToDevice('ring');
        await this.sendOpToDevice('offHook');
      } else {
        await this.sendOpToDevice('offHook');
        this.pendingConversationId = null;
      }
      this.activeConversationId = conversationId;
    }
  }

  async answerCallFromDevice (): Promise<void> {
    await this.answerCall(this.pendingConversationId, false);
    if (this.activeConversationId) {
      this.deviceAnsweredCall({
        name: 'OffHook',
        conversationId: this.activeConversationId,
      });
    } else {
      this.logger.error('no call to be answered');
    }
  }

  async rejectCall (): Promise<void> {
    if (this.pendingConversationId) {
      this.pendingConversationId = null;
      await this.sendOpToDevice('onHook');
    } else {
      this.logger.error('no call to be rejected');
    }
  }

  async rejectCallFromDevice (): Promise<void> {
    this.deviceRejectedCall({
      name: 'Reject',
      conversationId: this.pendingConversationId,
    });
    await this.rejectCall();
  }

  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    if (hasOtherActiveCalls) {
      return;
    } else {
      if (conversationId === this.activeConversationId || this.pendingConversationId) {
        this.activeConversationId = null;
        this.pendingConversationId = null;
        await this.sendOpToDevice('onHook');
      } else {
        this.logger.error('no call to be ended');
      }
    }
  }

  async endCallFromDevice (): Promise<void> {
    if (this.activeConversationId || this.pendingConversationId) {
      await this.sendOpToDevice('onHook');
      this.deviceEndedCall({
        name: 'OnHook',
        conversationId: this.activeConversationId ? this.activeConversationId : this.pendingConversationId,
      });
      this.activeConversationId = null;
      this.pendingConversationId = null;
    } else {
      this.logger.error('no call to be ended');
    }
  }

  async endAllCalls (): Promise<void> {
    if (this.activeConversationId || this.pendingConversationId) {
      this.activeConversationId = null;
      this.pendingConversationId = null;
      await this.sendOpToDevice('onHook');
    }
  }

  async setMute (value: boolean): Promise<void> {
    if (value) {
      await this.sendOpToDevice('muteOn');
    } else {
      await this.sendOpToDevice('muteOff');
    }
    this.isMuted = value;
  }

  async setMuteFromDevice (value: boolean): Promise<void> {
    await this.setMute(value);
    this.deviceMuteChanged({
      isMuted: this.isMuted,
      name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
      conversationId: this.activeConversationId,
    });
  }

  async sendOpToDevice (
    value: 'ring' | 'onHook' | 'offHook' | 'muteOn' | 'muteOff' | 'setMode'
  ): Promise<void> {
    const data = new Uint8Array(this.deviceCmds[value]);
    this.logger.debug(`send to dev ${value}`);
    await this.activeDevice.sendReport(data[0], data.slice(1, data.length));
  }
}
