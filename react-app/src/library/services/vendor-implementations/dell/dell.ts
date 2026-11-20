import { VendorImplementation, ImplementationConfig } from '../vendor-implementation';
import { CallInfo } from '../../../types/call-info';
import DeviceInfo from '../../../types/device-info';
import { PartialInputReportEvent } from '../../../types/consumed-headset-events';
import { checkWebHidSupport } from '../../../utils';

const VENDOR_ID = 0x413c;
//const PRODUCT_ID = 0xa53a;
const PRODUCT_IDS = [0xa53a, 0xa53c];
const HEADSET_USAGE_PAGE = 0x000b;
const HEADSET_USAGE = 0x0005;
const REPORT_ID = 0x05;

const offHookFlag = 1 << 0;
const muteFlag = 1 << 1;
const ringFlag = 1 << 2;
const holdFlag = 1 << 3;

/** WebHID adapter for the Dell Pro Wired Headset WH327. */
export default class DellService extends VendorImplementation {
  private static instance: DellService;
  private activeDevice: any = null;
  private _deviceInfo: DeviceInfo = null;
  private pendingConversationId: string = null;
  private activeConversationId: string = null;
  private isHeld = false;
  private previousMuteButton = false;
  private previousOffHook: boolean = null;

  vendorName = 'Dell';

  static getInstance (config: ImplementationConfig): DellService {
    if (!DellService.instance || config.createNew) {
      DellService.instance = new DellService(config);
    }
    return DellService.instance;
  }

  get deviceInfo (): DeviceInfo {
    return this._deviceInfo;
  }

  get isDeviceAttached (): boolean {
    return !!this.activeDevice;
  }

  isSupported (): boolean {
    return !!checkWebHidSupport(this.config, 'dell');
  }

  deviceLabelMatchesVendor (label: string): boolean {
    const normalized = (label || '').toLowerCase();
    return normalized.includes('wh327') || normalized.includes('dell pro wired headset') ||
      //normalized.includes('(413c:a53a');
      PRODUCT_IDS.some(productId => normalized.includes(`(413c:${productId.toString(16)}`));
  }

  async connect (deviceLabel: string): Promise<void> {
    if (!this.isConnecting) {
      this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    }

    try {
      const hid = (window.navigator as any).hid;
      let device = (await hid.getDevices()).find((candidate: any) => this.matchesDevice(candidate));
      if (!device) {
        device = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timed out waiting for Dell WH327 WebHID permission')), 30000);
          this.requestWebHidPermissions(async () => {
            try {
              //await hid.requestDevice({ filters: [{ vendorId: VENDOR_ID, productId: PRODUCT_ID }] });
              await hid.requestDevice({ filters: PRODUCT_IDS.map(productId => ({ vendorId: VENDOR_ID, productId })) });
              const authorizedDevices = await hid.getDevices();
              const selected = authorizedDevices.find((candidate: any) => this.matchesDevice(candidate));
              if (!selected) {
                throw new Error('Dell WH327 was not selected');
              }
              clearTimeout(timeout);
              resolve(selected);
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          });
        });
      }

      if (!device.opened) {
        await device.open();
      }
      this.activeDevice = device;
      this._deviceInfo = { ProductName: device.productName, deviceName: device.productName, attached: true };
      device.addEventListener('inputreport', this.handleInputReport);
      this.changeConnectionStatus({ isConnected: true, isConnecting: false });
    } catch (error) {
      this.logger.error('Failed to connect Dell WH327 headset', error);
      this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    }
  }

  async disconnect (): Promise<void> {
    const device = this.activeDevice;
    if (device) {
      device.removeEventListener('inputreport', this.handleInputReport);
      if (device.opened) {
        await device.close();
      }
    }
    this.activeDevice = null;
    this._deviceInfo = null;
    this.pendingConversationId = null;
    this.activeConversationId = null;
    this.isMuted = false;
    this.isHeld = false;
    this.previousMuteButton = false;
    this.previousOffHook = null;
    this.changeConnectionStatus({ isConnected: false, isConnecting: false });
  }

  private matchesDevice (device: any): boolean {
    //return device.vendorId === VENDOR_ID && device.productId === PRODUCT_ID &&
    return device.vendorId === VENDOR_ID && PRODUCT_IDS.includes(device.productId) &&
      device.collections?.some((collection: any) => collection.usagePage === HEADSET_USAGE_PAGE && collection.usage === HEADSET_USAGE &&
        collection.inputReports?.some((report: any) => report.reportId === REPORT_ID));
  }

  private handleInputReport = (event: PartialInputReportEvent): void => {
    if (event.reportId !== REPORT_ID) {
      return;
    }
    const value = event.data.getUint8(0);
    const offHook = (value & offHookFlag) !== 0;
    const mutePressed = (value & muteFlag) !== 0;

    if (offHook !== this.previousOffHook) {
      if (offHook && this.pendingConversationId) {
        const conversationId = this.pendingConversationId;
        this.answerCall(conversationId);
        this.deviceAnsweredCall({ name: 'OffHook', conversationId });
      } else if (!offHook && this.activeConversationId) {
        const conversationId = this.activeConversationId;
        this.endCall(conversationId);
        this.deviceEndedCall({ name: 'OnHook', conversationId });
      }
      this.previousOffHook = offHook;
    }

    if (mutePressed && !this.previousMuteButton && this.activeConversationId) {
      this.setMute(!this.isMuted);
      this.deviceMuteChanged({
        name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
        isMuted: this.isMuted,
        conversationId: this.activeConversationId,
      });
    }
    this.previousMuteButton = mutePressed;
  };

  private sendStateReport (): Promise<void> {
    if (!this.activeDevice?.opened) {
      return Promise.resolve();
    }
    let value = 0;
    if (this.activeConversationId) value |= offHookFlag;
    if (this.isMuted) value |= muteFlag;
    if (this.pendingConversationId) value |= ringFlag;
    if (this.isHeld) value |= holdFlag;
    this.previousOffHook = !!this.activeConversationId;
    return this.activeDevice.sendReport(REPORT_ID, new Uint8Array([value]));
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = callInfo.conversationId;
    await this.sendStateReport();
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.pendingConversationId = null;
    this.activeConversationId = callInfo.conversationId;
    await this.sendStateReport();
  }

  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    if (this.pendingConversationId === conversationId || autoAnswer) {
      this.activeConversationId = conversationId;
      this.pendingConversationId = null;
      await this.sendStateReport();
    }
  }

  async rejectCall (conversationId: string): Promise<void> {
    if (this.pendingConversationId === conversationId) {
      this.pendingConversationId = null;
      await this.sendStateReport();
    }
  }

  async endCall (conversationId: string): Promise<void> {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
      this.pendingConversationId = null;
      this.isHeld = false;
      await this.sendStateReport();
    }
  }

  async endAllCalls (): Promise<void> {
    this.activeConversationId = null;
    this.pendingConversationId = null;
    this.isHeld = false;
    await this.sendStateReport();
  }

  async setMute (value: boolean): Promise<void> {
    this.isMuted = value;
    await this.sendStateReport();
  }

  async setHold (_conversationId: string, value: boolean): Promise<void> {
    this.isHeld = value;
    await this.sendStateReport();
  }
}
