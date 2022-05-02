import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import DeviceInfo from "../../../types/device-info";
import {
    IApi,
    CallControlFactory,
    SignalType,
    ICallControl,
    ErrorType,
    init,
    RequestedBrowserTransport,
    webHidPairing,
    IDevice
} from '@gnaudio/jabra-js';
import { CallInfo } from "../../..";
import { Subscription, firstValueFrom, Observable, TimeoutError } from "rxjs";
import { defaultIfEmpty, filter, first, map, timeout } from 'rxjs/operators';
import { isCefHosted } from "../../../utils";

export default class JabraService extends VendorImplementation {
    private static instance: JabraService;
    private headsetEventSubscription: Subscription;
    static connectTimeout = 5000;

    isActive = false;
    devices: Map<string, DeviceInfo>;
    activeDeviceId: string = null;
    isMuted = false;
    isHeld = false;
    version: string = null;
    _connectDeferred: any; // { resolve: Function, reject: Function }
    device = null;
    jabraSdk: IApi;
    callControlFactory: CallControlFactory;
    callControl: ICallControl;
    ongoingCalls = 0;
    callLock = false;
    pendingConversationId: string;
    activeConversationId: string;

    private constructor(config: ImplementationConfig) {
        super(config);
        this.vendorName = 'Jabra';
        this.devices = new Map<string, DeviceInfo>();
    }

    isSupported(): boolean {
        return (window.navigator as any).hid && !isCefHosted();
    }

    deviceLabelMatchesVendor(label: string): boolean {
        const lowerLabel = label.toLowerCase();
        if (['jabra'].some(searchVal => lowerLabel.includes(searchVal))) {
            return true;
        }
        return false;
    }

    static getInstance(config: ImplementationConfig): JabraService {
        if (!JabraService.instance) {
            JabraService.instance = new JabraService(config);
        }

        return JabraService.instance;
    }

    get deviceInfo(): DeviceInfo {
        if (this.activeDeviceId === null || this.devices.size === 0) {
            return null;
        }

        return this.devices.get(this.activeDeviceId);
    }

    get deviceName(): string {
        return this.deviceInfo.deviceName;
    }

    get isDeviceAttached(): boolean {
        return !!this.deviceInfo;
    }

    resetState(): void {
        this.setHold(null, false);
        this.setMute(false);
    }

    async _processEvents(callControl: ICallControl): Promise<void> {
        this.headsetEventSubscription = callControl.deviceSignals.subscribe(async (signal) => {
            if (!this.callLock) {
                this.logger.debug('Currently not in possession of the Call Lock; Cannot react to Device Actions');
                return;
            }

            switch (SignalType[signal.type]) {
                case 'HOOK_SWITCH':
                    if (signal.value) {
                        callControl.offHook(true);
                        callControl.ring(false);
                        this.activeConversationId = this.pendingConversationId;
                        this.deviceAnsweredCall({name: 'CallOffHook', code: signal.type, conversationId: this.pendingConversationId});
                    } else {
                        callControl.mute(false);
                        callControl.hold(false);
                        callControl.offHook(false);
                        this.deviceEndedCall({name: 'CallOnHook', code: signal.type, conversationId: this.activeConversationId});
                        try {
                            callControl.releaseCallLock();
                        } catch({message, type}) {
                            if (this.checkForCallLockError(message, type)) {
                                this.logger.info(message);
                            } else {
                                this.logger.error(type, message);
                            }
                        } finally {
                            this.activeConversationId = null;
                            this.callLock = false;
                        }
                    }
                    break;
                case 'FLASH':
                case 'ALT_HOLD':
                    this.isHeld = !this.isHeld;
                    callControl.hold(this.isHeld);
                    this.deviceHoldStatusChanged({
                        holdRequested: this.isHeld,
                        name: this.isHeld ? 'OnHold' : 'ResumeCall',
                        code: signal.type,
                        conversationId: this.activeConversationId
                    });
                    break;
                case 'PHONE_MUTE':
                    this.isMuted = !this.isMuted;
                    callControl.mute(this.isMuted);
                    this.deviceMuteChanged({
                        isMuted: this.isMuted,
                        name: this.isMuted ? 'CallMuted' : 'CallUnmuted',
                        code: signal.type,
                        conversationId: this.activeConversationId
                    });
                    break;
                case 'REJECT_CALL':
                    callControl.ring(false);
                    this.deviceRejectedCall({name: SignalType[signal.type], conversationId: this.pendingConversationId});
                    try {
                        callControl.releaseCallLock();
                    } catch({message, type}) {
                        if (this.checkForCallLockError(message, type)) {
                            this.logger.info(message);
                        } else {
                            this.logger.error(type, message)
                        }
                    } finally {
                        this.pendingConversationId = null;
                        this.callLock = false;
                    }
            }
        })
    }

    async setMute(value: boolean): Promise<void> {
        if (!this.callLock) {
            return;
        }
        this.isMuted = value;
        this.callControl.mute(value);
    }

    async setHold(conversationId: string, value: boolean): Promise<void> {
        if (!this.callLock) {
            return;
        }
        this.isHeld = value;
        this.callControl.hold(value);
    }

    async incomingCall(callInfo: CallInfo): Promise<void> {
        if (callInfo) {
            this.pendingConversationId = callInfo.conversationId;
            try {
                this.callLock = await this.callControl.takeCallLock();
                if (this.callLock) {
                    this.callControl.ring(true);
                    return Promise.resolve();
                }
            } catch ({message, type}) {
                if (this.checkForCallLockError(message, type)) {
                    this.logger.info(message);
                    this.callControl.ring(true);
                } else {
                    this.logger.error(type, message);
                }
            }
        }
    }

    async answerCall(): Promise<void> {
        if (!this.callLock) {
            return;
        }

        this.callControl.ring(false);
        this.callControl.offHook(true);
        this.activeConversationId = this.pendingConversationId;
        this.pendingConversationId = null;
    }

    async rejectCall(): Promise<void> {
        try {
            if (!this.callLock) {
                return this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions');
            }
            this.callControl.ring(false);
            this.callControl.releaseCallLock();
        } catch ({message, type}) {
            if (this.checkForCallLockError(message, type)) {
                this.logger.info(message);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            this.pendingConversationId = null
            this.callLock = false;
            this.resetState();
        }
    }

    async outgoingCall(callInfo: CallInfo): Promise<void> {
        try {
            this.callLock = await this.callControl.takeCallLock();
            // this.pendingConversationId = callInfo.conversationId;
            this.activeConversationId = callInfo.conversationId;
            if (this.callLock) {
                this.callControl.offHook(true);
                return Promise.resolve();
            }
        } catch({message, type}) {
            if (this.checkForCallLockError(message, type)) {
                this.logger.info(message);
                this.callControl.offHook(true);
            } else {
                this.logger.error(type, message);
            }
        }
    }

    async endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
        if (hasOtherActiveCalls) {
            return;
        }

        if (conversationId === this.activeConversationId) {
            this.activeConversationId = null;
        }

        try {
            if (!this.callLock) {
                return this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions')
            }
            this.callControl.offHook(false);
            this.callControl.releaseCallLock();
        } catch ({message, type}) {
            if (this.checkForCallLockError(message, type)) {
                this.logger.info(message);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            this.callLock = false;
            this.resetState();
        }
    }

    async endAllCalls(): Promise<void> {
        try {
            if (!this.callLock) {
                return this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions')
            }
            this.activeConversationId = null;
            this.callControl.offHook(false);
            this.callControl.releaseCallLock();
        } catch ({message, type}) {
            if (this.checkForCallLockError(message, type)) {
                this.logger.info(message);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            this.callLock = false;
            this.resetState();
        }
    }

    isDeviceInList (device: IDevice, deviceLabel: string): boolean {
        return deviceLabel.includes(device?.name?.toLowerCase());
    }


    async connect(originalDeviceLabel: string): Promise<void> {
        if (this.isConnecting) {
            return;
        }

        this.changeConnectionStatus({isConnected: this.isConnected, isConnecting: true});
        if (!this.jabraSdk) {
            this.jabraSdk = await this.initializeJabraSdk();
            this.callControlFactory = this.createCallControlFactory(this.jabraSdk);
        }

        const deviceLabel = originalDeviceLabel.toLocaleLowerCase();

        let selectedDevice = await this.getPreviouslyConnectedDevice(deviceLabel);
        if (!selectedDevice) {
            try {
                selectedDevice = await this.getDeviceFromWebhid(deviceLabel);
            } catch (e) {
                this.isConnecting && this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
                return;
            }
        }

        this.callControl = await this.callControlFactory.createCallControl(selectedDevice);
        await this.resetHeadsetState();
        this._processEvents(this.callControl);
        if (this.isConnecting && !this.isConnected) {
            this.changeConnectionStatus({ isConnected: true, isConnecting: false });
        }        
    }

    async getPreviouslyConnectedDevice (deviceLabel: string): Promise<IDevice> {
        // we want to wait for up to 2 events or timeout after 2 seconds
        const waitForDevice: Observable<IDevice> = this.jabraSdk.deviceList
            .pipe(
                defaultIfEmpty(null),
                first((devices: IDevice[]) => !!devices.length),
                map((devices: IDevice[]) => {
                    return devices.find(device => this.isDeviceInList(device, deviceLabel));
                }),
                filter(device => !!device),
                timeout(3000)
            );

        return firstValueFrom(waitForDevice)
            .catch(err => {
                if (err instanceof TimeoutError) {
                    return null;
                }
            });
    }

    async getDeviceFromWebhid (deviceLabel: string): Promise<IDevice> {
        return new Promise((resolve, reject) => {
            this.requestWebHidPermissions(webHidPairing);

            this.jabraSdk.deviceList
                .pipe(
                    map((devices: IDevice[]) => devices.find(device => this.isDeviceInList(device, deviceLabel))),
                    filter(device => !!device),
                    first(),
                    timeout(10000)
                ).subscribe({
                    next: (device: IDevice) => {
                        resolve(device)
                    },
                    error: (err) => {
                        if (err instanceof TimeoutError) {
                            err = new Error('The selected device was not granted WebHID permissions');
                        }
                        this.logger.error(err);
                        reject(err)
                    }
                });
        });
    }

    async initializeJabraSdk(): Promise<IApi> {
        return await init({
            appId: 'softphone-vendor-headsets',
            appName: 'Softphone Headset Library',
            transport: RequestedBrowserTransport.CHROME_EXTENSION_WITH_WEB_HID_FALLBACK
        });
    }

    createCallControlFactory (sdk: IApi): CallControlFactory {
        return new CallControlFactory(sdk);
    }

    checkForCallLockError(message: unknown, type: unknown): boolean {
        return (type as ErrorType === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock'));
    }

    async resetHeadsetState (): Promise<void> {
        if (!this.callControl) {
            return;
        }

        await this.callControl.takeCallLock();
        this.callControl.hold(false);
        this.callControl.mute(false);
        this.callControl.offHook(false);
        this.callControl.releaseCallLock();
    }

    async disconnect(): Promise<void> {
        this.headsetEventSubscription && this.headsetEventSubscription.unsubscribe();
        (this.isConnected || this.isConnecting) && this.changeConnectionStatus({isConnected: false, isConnecting: false});
    }
}