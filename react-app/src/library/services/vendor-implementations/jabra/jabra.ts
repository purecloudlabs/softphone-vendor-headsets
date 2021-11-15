import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import DeviceInfo from "../../../types/device-info";
import { timedPromise } from "../../../utils";
import { v4 } from 'uuid';
import {
    IApi,
    EasyCallControlFactory,
    CallControlFactory,
    IMultiCallControl,
    SignalType,
    ICallControl,
    ErrorType
} from '@gnaudio/jabra-js';

const incomingMessageName = 'jabra-headset-extension-from-content-script';
const outgoingMessageName = 'jabra-headset-extension-from-content-script';
const clientId = v4();
const jabraVendorId = '0x0b0e';

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
    ongoingCalls: number = 0;
    callLock: boolean = false;

    private constructor(config: ImplementationConfig) {
        super(config);
        this.vendorName = 'Jabra';
        this.devices = new Map<string, DeviceInfo>();
    }

    deviceLabelMatchesVendor(label: string): boolean {
        return label.toLowerCase().includes('jabra');
    }

    static getInstance(config: ImplementationConfig) {
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

    async _processEvents(callControl: ICallControl) {
        callControl.deviceSignals.subscribe(async (signal) => {
            if (this.callLock) {
                switch (SignalType[signal.type]) {
                    case 'HOOK_SWITCH':
                        if (signal.value) {
                            callControl.offHook(true);
                            callControl.ring(false);
                            this.deviceAnsweredCall();
                        } else {
                            callControl.mute(false);
                            callControl.hold(false);
                            callControl.offHook(false);
                            this.deviceEndedCall();
                            try {
                                await callControl.releaseCallLock();
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
                        this.deviceHoldStatusChanged(this.isHeld);
                        break;
                    case 'PHONE_MUTE':
                        this.isMuted = !this.isMuted;
                        callControl.mute(this.isMuted);
                        this.deviceMuteChanged(this.isMuted);
                        break;
                    case 'REJECT_CALL':
                        callControl.offHook(false);
                        callControl.ring(false);
                        this.deviceRejectedCall(null);
                        try {
                            await callControl.releaseCallLock();
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

    async incomingCall(opts: any): Promise<void> {
        // if (opts && !opts.hasOtherActiveCalls) {
        if (opts) {
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
                return Promise.resolve();
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
        } catch({message, type}) {
            if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
                this.logger.info(message);
                this.callControl.offHook(true);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            if (this.callLock) {
                this.callControl.offHook(true);
                return Promise.resolve();
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
        } catch ({message, type}) {
            if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
                this.logger.info(message);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            this.callLock = false;
            this.resetState();
            return Promise.resolve();
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
        } catch ({message, type}) {
            if (type === ErrorType.SDK_USAGE_ERROR && (message as string).includes('call lock')) {
                this.logger.info(message);
            } else {
                this.logger.error(type, message);
            }
        } finally {
            this.callLock = false;
            this.resetState();
            return Promise.resolve();
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

    async connect(deviceLabel): Promise<any> {
        this.isConnecting = true;
        this.jabraSdk = await this.config.externalSdk;
        this.callControlFactory = this.createCallControlFactory(this.jabraSdk);
        this.jabraSdk.deviceList.subscribe(async (devices) => {
            if (devices.length > 0) {
                const connectedDevice = devices.find((device) => deviceLabel.includes(device?.name?.toLowerCase()));
                this.callControl = await this.callControlFactory.createCallControl(connectedDevice);
                this._processEvents(this.callControl);
                this.isConnecting = false;
                this.isConnected = true;
            } else {
                this.isConnecting = false;
            }
        })
    }

    createCallControlFactory (sdk) {
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