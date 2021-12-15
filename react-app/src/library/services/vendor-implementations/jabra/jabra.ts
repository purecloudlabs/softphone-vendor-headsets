import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import DeviceInfo from "../../../types/device-info";
// import { timedPromise } from "../../../utils";
// import { v4 } from 'uuid';
import {
    IApi,
    EasyCallControlFactory,
    CallControlFactory,
    IMultiCallControl,
    SignalType,
    ICallControl,
    ErrorType,
    IDevice,
    webHidPairing
} from '@gnaudio/jabra-js';
import { CallInfo } from "../../..";
import { BehaviorSubject } from "rxjs";
import { filter, first } from 'rxjs/operators';

// const incomingMessageName = 'jabra-headset-extension-from-content-script';
// const outgoingMessageName = 'jabra-headset-extension-from-content-script';
// const clientId = v4();
// const jabraVendorId = '0x0b0e';

export default class JabraService extends VendorImplementation {
    private static instance: JabraService;
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
    jabraSdk: IApi;
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
        callControl.deviceSignals.subscribe((signal) => {
            if (this.callLock) {
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
            } else {
                this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions');
            }
        })
    }

    setMute(value: boolean): Promise<void> {
        if (this.callLock) {
            this.isMuted = value;
            this.callControl.mute(value);
        }
        return Promise.resolve();
    }

    setHold(conversationId: string, value: boolean): Promise<void> {
        if (this.callLock) {
            this.isHeld = value;
            this.callControl.hold(value);
        }
        return Promise.resolve();
    }

    async incomingCall(callInfo: CallInfo): Promise<void> {
        // if (opts && !opts.hasOtherActiveCalls) {
        if (callInfo) {
            try {
                this.callLock = await this.callControl.takeCallLock();
                return Promise.resolve();
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

    answerCall(): Promise<void> {
        if (this.callLock) {
            this.callControl.offHook(true);
        }
        return Promise.resolve();
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

    endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
        if (hasOtherActiveCalls) {
            return Promise.resolve();
        }

        try {
            if (this.callLock) {
                this.callControl.offHook(false);
            } else {
                this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions')
            }
            this.callControl.releaseCallLock();
            return Promise.resolve();
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

    endAllCalls(): Promise<void> {
        try {
            if (this.callLock) {
                this.callControl.offHook(false);
            } else {
                this.logger.info('Currently not in possession of the Call Lock; Cannot react to Device Actions')
            }
            this.callControl.releaseCallLock();
            return Promise.resolve();
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

    // _deviceAttached(): void {
    //     // this._sendCmd(JabraCommands.GetActiveDevice);
    //     // this._sendCmd(JabraCommands.GetDevices);
    // }

    // _deviceDetached() {
        //     this.devices = null;
        //     this.activeDeviceId = null;

        //     // this._sendCmd(JabraCommands.GetActiveDevice);
        //     // this._sendCmd(JabraCommands.GetDevices);
        // }

    async connect(deviceLabel: string): Promise<void> {
        this.isConnecting = true;
        this.jabraSdk = await this.config.externalSdk;
        this.callControlFactory = this.createCallControlFactory(this.jabraSdk);

        const findDevice = (device: IDevice) => deviceLabel.includes(device?.name?.toLowerCase());


        const device = await new Promise<IDevice>((resolve, reject) => {
            let device = ((this.jabraSdk.deviceList as unknown) as BehaviorSubject<IDevice[]>).value.find(findDevice);

            if (device) {
                return resolve(device);
            }

            const waiter = setTimeout(reject, 30000);
            this.requestWebHidPermissions(webHidPairing);
            this.jabraSdk.deviceList
                .pipe(
                    first(devices => !!devices.length)
                )
                .subscribe(async (devices) => {
                    device = devices.find(findDevice);
                    clearTimeout(waiter);
                    resolve(device);
                });
        }).catch(() => console.error('timed out waiting for jabra device'));
    
        if (!device) {
            this.isConnecting = false;
            console.error('whoops no device');
            return;
        }

        this.callControl = await this.callControlFactory.createCallControl(device);
        this._processEvents(this.callControl);
        this.isConnecting = false;
        this.isConnected = true;
    }

    createCallControlFactory (sdk: IApi): CallControlFactory {
        return new CallControlFactory(sdk);
    }

    // async _handleDeviceConnect() {
    //     if (this._connectDeferred) {
    //         // this._sendCmd(JabraCommands.GetActiveDevice);
    //         // this._sendCmd(JabraCommands.GetDevices);
    //         this.isConnecting = false;
    //         this.isConnected = true;
    //         this._connectDeferred.resolve();
    //         this._connectDeferred = null;
    //     } else {
    //         this.logger.warn(new Error('_handleDeviceConnect called but there is no pending connection'));
    //     }
    // }

    disconnect(): Promise<void> {
        this.isConnecting = false;
        this.isConnected = false;
        return Promise.resolve();
    }

    // _handleDeviceConnectionFailure(err) {
    //     if (this._connectDeferred) {
    //         this._connectDeferred.reject(err);
    //         this._connectDeferred = null;
    //     } else {
    //         this.logger.warn(
    //             new Error('_handleDeviceConnectionFailure was called but there is no pending connection')
    //         )
    //     }
    // }

    // _handleGetDevices(deviceList) {
    //     this.logger.debug('device list', deviceList);
    //     const items = deviceList.split(',');
    //     const deviceMap = new Map<string, DeviceInfo>();

    //     for (let i = 0; i < items.length; i += 2) {
    //         const deviceId = items[i];
    //         const deviceName = items[i + 1];
    //         deviceMap.set(deviceId, { deviceId, deviceName });
    //     }

    //     this.devices = deviceMap;
    // }

    // _handleGetActiveDevice(activeDeviceId: string) {
    //     this.logger.debug('active device info', activeDeviceId);
    //     this.activeDeviceId = activeDeviceId;
    // }
}