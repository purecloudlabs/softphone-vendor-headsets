import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import DeviceInfo from "../../../types/device-info";
import {
    IApi,
    EasyCallControlFactory,
    CallControlFactory,
    IMultiCallControl,
    SignalType,
    ICallControl,
    ErrorType,
    init,
    RequestedBrowserTransport,
    webHidPairing,
    IDevice
} from '@gnaudio/jabra-js';
import { CallInfo } from "../../..";
import { Subscription, BehaviorSubject } from "rxjs";
import { first, skip } from 'rxjs/operators';

export default class JabraService extends VendorImplementation {
    private static instance: JabraService;
    private headsetEventSubscription: Subscription;
    private deviceListSubscription: Subscription;
    static connectTimeout = 5000;

    isConnecting = false;
    isActive = false;
    devices: Map<string, DeviceInfo>;
    activeDeviceId: string = null;
    isMuted = false;
    isHeld = false;
    version: string = null;
    _connectDeferred: any; // { resolve: Function, reject: Function }
    device = null;
    jabraSdk: Promise<IApi>;
    easyCallControlFactory: EasyCallControlFactory;
    callControlFactory: CallControlFactory;
    multiCallControl: IMultiCallControl;
    callControl: ICallControl;
    ongoingCalls = 0;
    callLock = false;

    private constructor(config: ImplementationConfig) {
        super(config);
        this.vendorName = 'Jabra';
        this.devices = new Map<string, DeviceInfo>();
        this.jabraSdk = this.initializeJabraSdk();
    }

    deviceLabelMatchesVendor(label: string): boolean {
        return label.toLowerCase().includes('jabra');
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
        this.headsetEventSubscription = callControl.deviceSignals.subscribe((signal) => {
            if (!this.callLock) {
                this.logger.debug('Currently not in possession of the Call Lock; Cannot react to Device Actions');
                return;
            }

            switch (SignalType[signal.type]) {
                case 'HOOK_SWITCH':
                    if (signal.value) {
                        callControl.offHook(true);
                        callControl.ring(false);
                        this.deviceAnsweredCall({name: 'CallOffHook', code: signal.type});
                    } else {
                        callControl.mute(false);
                        callControl.hold(false);
                        callControl.offHook(false);
                        this.deviceEndedCall({name: 'CallOnHook', code: signal.type});
                        try {
                            callControl.releaseCallLock();
                        } catch({message, type}) {
                            this.logger.info(message, type);
                        } finally {
                            this.callLock = false;
                        }
                    }
                    break;
                case 'FLASH':
                case 'ALT_HOLD':
                    this.isHeld = !this.isHeld;
                    callControl.hold(this.isHeld);
                    this.deviceHoldStatusChanged(this.isHeld, { name: this.isHeld ? 'OnHold' : 'ResumeCall', code: signal.type });
                    break;
                case 'PHONE_MUTE':
                    this.isMuted = !this.isMuted;
                    callControl.mute(this.isMuted);
                    this.deviceMuteChanged(this.isMuted, { name: this.isMuted ? 'CallMuted' : 'CallUnmuted', code: signal.type });
                    break;
                case 'REJECT_CALL':
                    callControl.offHook(false);
                    callControl.ring(false);
                    this.deviceRejectedCall(null);
                    try {
                        callControl.releaseCallLock();
                    } catch({message, type}) {
                        this.logger.info(message, type);
                    } finally {
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
            try {
                this.callLock = await this.callControl.takeCallLock();
            } catch ({message, type}) {
                if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
                    this.logger.info(message);
                    this.callControl.ring(true);
                } else {
                    this.logger.error(type, message);
                }
            } finally {
                if (this.callLock) {
                    this.callControl.ring(true);
                }
            }
        }
    }

    async answerCall(): Promise<void> {
        if (!this.callLock) {
            return;
        }
        this.callControl.offHook(true);
    }

    async outgoingCall(): Promise<void> {
        try {
            this.callLock = await this.callControl.takeCallLock();
            if (this.callLock) {
                this.callControl.offHook(true);
                return Promise.resolve();
            }
        } catch({message, type}) {
            if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
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

        try {
            if (!this.callLock) {
                this.callControl.offHook(false);
            } else {
                this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions')
            }
            this.callControl.releaseCallLock();
        } catch ({message, type}) {
            if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
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
            if (this.callLock) {
                this.callControl.offHook(false);
            } else {
                this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions')
            }
            this.callControl.releaseCallLock();
            return;
        } catch ({message, type}) {
            if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
                this.logger.info(message);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            this.callLock = false;
            this.resetState();
        }
    }

    async connect(deviceLabel: string): Promise<void> {
        this.isConnecting = true;
        const jabraSdk = await this.jabraSdk;
        this.callControlFactory = this.createCallControlFactory(jabraSdk);
        const findDevice = (device: IDevice) => {
            return deviceLabel.includes(device?.name?.toLowerCase());
        }
        const device = await new Promise<IDevice>((resolve, reject) => {
            let device = (jabraSdk.deviceList as BehaviorSubject<IDevice[]>).getValue().find(findDevice);
            // jabraSdk.deviceList.forEach(device => console.log(device));
            jabraSdk.deviceList.pipe(skip(1)).forEach(device => console.log(device));
            if (device) {
                return resolve(device);
            }

            const waiter = setTimeout(reject, 30000);
            this.requestWebHidPermissions(webHidPairing);
            jabraSdk.deviceList
                .pipe(
                    first((devices: IDevice[]) => !!devices.length)
                )
                .subscribe(async (devices) => {
                    device = devices.find(findDevice);
                    clearTimeout(waiter);
                    resolve(device);
                });
            }).catch(() => this.logger.error('Timed out waiting for Jabra device'));

        if (!device) {
            this.isConnecting = false;
            this.logger.error('The selected device was not granted WebHID permissions');
            return;
        }

        this.callControl = await this.callControlFactory.createCallControl(device);
        this._processEvents(this.callControl);
        this.isConnecting = false;
        this.isConnected = true;
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

    async disconnect(): Promise<void> {
        this.headsetEventSubscription && this.headsetEventSubscription.unsubscribe();
        this.deviceListSubscription && this.deviceListSubscription.unsubscribe();
        this.isConnecting = false;
        this.isConnected = false;
    }
}