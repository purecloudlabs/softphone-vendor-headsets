import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import { CallInfo } from '../../..';
import DeviceInfo, { PartialHIDDevice } from "../../../types/device-info";
import { PartialInputReportEvent } from '../../../types/consumed-headset-events';
import { isCefHosted } from "../../../utils";

// Import the Poly | HP WebHID SDK
import { PolyHPWebHIDSDK } from "./polyhpwebhid"

export default class PolyHPService extends VendorImplementation {
    private static instance: PolyHPService;

    private pendingConversationId: string;
    private activeConversationId: string;

    private _deviceInfo: DeviceInfo = null;

    private callState = 0;
    private recCallState = 0;

    private isHold = false;

    vendorName = 'PolyHP';

    private poly$: PolyHPWebHIDSDK = new PolyHPWebHIDSDK()

    static getInstance(config: ImplementationConfig): PolyHPService {
        if (!PolyHPService.instance) {
            PolyHPService.instance = new PolyHPService(config);
            PolyHPService.instance.subscribePolyWebHIDEvents();
        }

        return PolyHPService.instance;
    }

    get deviceInfo(): DeviceInfo {
        return this._deviceInfo;
    }

    isSupported(): boolean {
        return (window.navigator as any).hid && !isCefHosted();
    }

    deviceLabelMatchesVendor(label: string): boolean {
        const lowerLabel = label.toLowerCase();
        return ['plantronics', 'plt', 'poly', '(047f:', '(095d:', '(03f0:'].some(searchVal => lowerLabel.includes(searchVal));
    }

    async connect(originalDeviceLabel: string): Promise<void> {
        if (!this.isConnecting) {
            this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
        }

        // try to connect to device by device label (mic name), otherwise request hid.request (user choose device)
        if (!await this.poly$.connectByDeviceLabel(originalDeviceLabel)) {
            try {
                await new Promise(async (resolve, reject) => {
                    const waiter = setTimeout(reject, 30000);
                    this.requestWebHidPermissions(async () => {
                        if (await this.poly$.connectByUserRequest()) {
                            clearTimeout(waiter);
                            resolve(this.poly$.device());
                        }
                        else {
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

        this._deviceInfo = {
            ProductName: this.poly$.device().productName,
        };

        if (this.isConnecting && !this.isConnected) {
            this.changeConnectionStatus({ isConnected: true, isConnecting: false });
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected || this.isConnecting) {
            this.changeConnectionStatus({ isConnected: false, isConnecting: false });
        }
        this.poly$.disconnect();
    }

    // Implement the PolyWebHIDSDK EventEmitter events
    // in order to be informed about headset events
    private subscribePolyWebHIDEvents() {
        // Sync these event states to the softphone...
        this.poly$.event().on('OnHold', () => {
            //this.isHold = this.poly$.ledhold;
            this.isHold = true;
            this.poly$.setHold(this.isHold);
            this.deviceHoldStatusChanged({ // then tell the app about it
                holdRequested: this.isHold,
                name: this.isHold ? 'OnHold' : 'ResumeCall',
                conversationId: this.activeConversationId,
            });
        })
        this.poly$.event().on('ResumeCall', () => {
            //this.isHold = this.poly$.ledhold;
            this.isHold = false;
            this.poly$.setHold(this.isHold);
            this.deviceHoldStatusChanged({ // then tell the app about it
                holdRequested: this.isHold,
                name: this.isHold ? 'OnHold' : 'ResumeCall',
                conversationId: this.activeConversationId,
            });
        })
        this.poly$.event().on('OffHook', () => {
            /* USE CASE: call answer */
            if (this.pendingConversationId) {
                this.activeConversationId = this.pendingConversationId;
                this.pendingConversationId = null;
            }
            if (this.activeConversationId) {
                this.deviceAnsweredCall({
                    name: 'OffHook',
                    conversationId: this.activeConversationId,
                });
            }
            else {
                this.logger.debug(`activeConversationId is empty`);
            }
        })
        this.poly$.event().on('Reject', () => {
            this.deviceRejectedCall({
                name: 'Reject',
                conversationId: this.pendingConversationId,
            });
        })
        this.poly$.event().on('OnHook', () => {
            if (this.activeConversationId) {
                this.deviceEndedCall({
                    name: 'OnHook',
                    conversationId: this.activeConversationId,
                });
            }
            else {
                this.logger.debug(`activeConversationId is empty`);
            }
        })
        this.poly$.event().on('CallMuted', () => {
            this.isMuted = this.poly$.ledmute;
            this.deviceMuteChanged({
                isMuted: this.isMuted,
                name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
                conversationId: this.activeConversationId,
            });
        })
        this.poly$.event().on('CallUnmuted', () => {
            this.isMuted = this.poly$.ledmute;
            this.deviceMuteChanged({
                isMuted: this.isMuted,
                name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
                conversationId: this.activeConversationId,
            });
        })
        // TODO add events for connected, failed webhid etc. and integrate those into the Genesys framework's connect Promise with 30s timeout
    }

    async incomingCall(callInfo: CallInfo): Promise<void> {
        if (callInfo) {
            this.pendingConversationId = callInfo.conversationId;
            this.poly$.incomingCall();
        }
    }

    async outgoingCall(callInfo: CallInfo): Promise<void> {
        this.pendingConversationId = callInfo.conversationId;
        this.poly$.answerCall();
    }

    async answerCall(): Promise<void> {
        if (this.pendingConversationId) {
            this.activeConversationId = this.pendingConversationId;
            this.pendingConversationId = null;
        }
        this.poly$.answerCall();
    }

    async rejectCall(): Promise<void> {
        this.pendingConversationId = null;
        this.poly$.rejectCall();
    }

    async endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
        if (hasOtherActiveCalls) {
            return;
        }

        if (conversationId === this.activeConversationId) {
            this.activeConversationId = null;
        }
        this.poly$.endCall();
    }

    async endAllCalls(): Promise<void> {
        this.activeConversationId = null;
        this.poly$.endCall();
    }

    async setMute(value: boolean): Promise<void> {
        this.poly$.setMute(value);
    }

    async setHold(conversationId: string, value: boolean): Promise<void> {
        // set hold reminder on headset
        this.poly$.setHold(value);
    }
}
