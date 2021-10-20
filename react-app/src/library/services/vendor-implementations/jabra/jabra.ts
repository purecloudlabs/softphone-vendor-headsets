import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import DeviceInfo from "../../../types/device-info";
import { JabraCommands } from './jabra-commands';
// import { JabraRequestedEvents } from './jabra-requested-events';
import { timedPromise } from "../../../utils";
// import { EventTranslation } from './jabra-event-translation';
import { v4 } from 'uuid';
import { EventTranslation } from "./jabra-chrome/jabra-chrome-event-translation";
import { onInputReport } from "./webHidHelpers";

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
    listOfActions = [];

    private constructor(config: ImplementationConfig) {
        super(config);
        this.vendorName = 'Jabra';
        this.devices = new Map<string, DeviceInfo>();

        //TODO: Prompt user to select device
        const button = document.createElement('button');
        button.addEventListener('click', this.requestJabraDevice);
        const root = document.getElementById('root');
        root.appendChild(button);
        // button.click()
        // this.requestJabraDevice();
    }

    async requestJabraDevice() {
        [this.device] = await (navigator as any).hid.requestDevice({ filters: [{ vendorId: jabraVendorId }]});
        if (!this.device) {
            console.log('No selection was made');
            return;
        }

        await this.device.open();
        if (!this.device.opened) {
            console.log('Unable to open device');
            return;
        } else {
            console.log('Opened device');
        }

        this.device.oninputreport = (event) => {
            this.listOfActions = onInputReport(event);
            this.handleActions();
        }
        console.log(this.device);
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

    deviceLabelMatchesVendor(label: string): boolean {
        return label.toLowerCase().includes('jabra');
    }

    _getHeadsetIntoVanillaState(): void {
        this.setHold(null, false);
        this.setMute(false);
    }

    _sendCmd(cmd: JabraCommands) {
        this.logger.debug('sending jabra event', { cmd });
        window.postMessage(
            {
                direction: outgoingMessageName,
                requestId: v4(),
                apiClientId: clientId,
                message: cmd
            },
            '*'
        );
    }

    _messageHandler(event): void {
        if(
            event.source === window &&
            event.data.direction &&
            event.data.direction === incomingMessageName
        ) {
            this.logger.debug('Incoming jabra event', event.data);

            if (this.logHeadsetEvents) {
                this.logger.info(event.data.message);
            }

            if (event.data.message.startsWith(JabraCommands.GetVersion)) {
                const version = event.data.message.substring(JabraCommands.GetVersion + 1);
                this.logger.info(`jabra version: ${version}`);
                this.version = version;
            }

            if (this.isConnecting) {
                if (event.data.error !== null && event.data.error !== undefined) {
                    this._handleDeviceConnectionFailure(event.data.error);
                } else {
                    this._handleDeviceConnect();
                }
            } else {
                if (event.data.message.startsWith(JabraCommands.GetDevices)) {
                    this._handleGetDevices(
                        event.data.message.substring(JabraCommands.GetDevices.length + 1)
                    );
                    return;
                }

                if (event.data.message.startsWith(JabraCommands.GetActiveDevice)) {
                    this._handleGetActiveDevice(
                        event.data.message.substring(JabraCommands.GetActiveDevice.length + 1)
                    );
                    return;
                }

                const translatedEvent = EventTranslation[event.data.message];
                if (!translatedEvent) {
                    this.logger.info('Jabra event unknown or not handled', { event: event.data.message });
                    return;
                }

                this._processEvent(translatedEvent);
            }
        }
    }

    _processEvent(eventTranslation) {
        switch(eventTranslation) {
            case 'Mute':
                this.setMute(true);
                this.deviceMuteChanged(true);
                break;
            case 'Unmute':
                this.setMute(false);
                this.deviceMuteChanged(false);
                break;
            case 'AcceptCall':
                this.deviceAnsweredCall();
                break;
            case 'TerminateCall':
                this._getHeadsetIntoVanillaState();
                this.deviceEndedCall();
                break;
            case 'IgnoreCall':
                this.deviceRejectedCall(null);
                break;
            case 'Flash':
                this.deviceHoldStatusChanged(null, true);
                break;
            case 'Attached':
                this._deviceAttached();
                break;
            case 'Detached':
                this._deviceDetached();
                break;
            default:
                this.logger.info('Unknown Jabra event: ', eventTranslation);
        }
    }

    handleActions() {
        
    }

    onInputReport(event) {
        console.log('onInputReport event => ', event);
        console.log('**** ARRAY BUFFER ****', event.data.getUint8(0));
        let reportId = event.reportId;
        let reportData = event.data;

        if (reportData === 7) {
            this.isMuted = !this.isMuted;
        }
    }

    setMute(value: boolean): Promise<void> {
        // this._sendCmd(JabraCommands[value ? 'Mute' : 'Unmute']);
        return Promise.resolve();
    }

    setHold(conversationId: string, value: boolean): Promise<void> {
        // this._sendCmd(JabraCommands[value ? 'Hold' : 'Resume']);
        return Promise.resolve();
    }

    incomingCall(opts: any): Promise<void> {
        if (opts && !opts.hasOtherActiveCalls) {
            // this._sendCmd(JabraCommands.Ring);
        }
        return Promise.resolve();
    }

    answerCall(): Promise<void> {
        // this._sendCmd(JabraCommands.OffHook);
        return Promise.resolve();
    }

    outgoingCall(): Promise<void> {
        // this._sendCmd(JabraCommands.Offhook);
        return Promise.resolve();
    }

    //Since answerCall and outgoingCall are identical, I combined them
    //into one function; Use this for answerCall and outgoingCall
    offHookCommand(): Promise<void> {
        // this._sendCmd(JabraCommands.OffHook);
        return Promise.resolve();
    }

    endCall(conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
        if (hasOtherActiveCalls) {
            return Promise.resolve();
        }

        this._getHeadsetIntoVanillaState();
        // this._sendCmd(JabraCommands.OnHook);
        return Promise.resolve();
    }

    endAllCalls(): Promise<void> {
        // this._sendCmd(JabraCommands.OnHook);
        return Promise.resolve();
    }

    _deviceAttached(): void {
        // this._sendCmd(JabraCommands.GetActiveDevice);
        // this._sendCmd(JabraCommands.GetDevices);
    }

    _deviceDetached() {
        this.devices = null;
        this.activeDeviceId = null;

        // this._sendCmd(JabraCommands.GetActiveDevice);
        // this._sendCmd(JabraCommands.GetDevices);
    }

    connect(): Promise<any> {
        this.isConnecting = true;
        const connectionPromise = new Promise((resolve, reject) => {
            this._connectDeferred = { resolve, reject };
            // this._sendCmd(JabraCommands.GetVersion);
        });

        const connectionError = new Error('Jabra connection request timed out');
        return timedPromise(
            connectionPromise,
            JabraService.connectTimeout,
            connectionError
        ).catch(err => {
            this.isConnected = false;
            this.isConnecting = false;
            this.logger.info(err);
        });
    }

    async _handleDeviceConnect() {
        if (this._connectDeferred) {
            // this._sendCmd(JabraCommands.GetActiveDevice);
            // this._sendCmd(JabraCommands.GetDevices);
            this.isConnecting = false;
            this.isConnected = true;
            this._connectDeferred.resolve();
            this._connectDeferred = null;
        } else {
            this.logger.warn(new Error('_handleDeviceConnect called but there is no pending connection'));
        }
    }

    disconnect(): Promise<void> {
        this.isConnecting = false;
        this.isConnected = false;
        return Promise.resolve();
    }

    _handleDeviceConnectionFailure(err) {
        if (this._connectDeferred) {
            this._connectDeferred.reject(err);
            this._connectDeferred = null;
        } else {
            this.logger.warn(
                new Error('_handleDeviceConnectionFailure was called but there is no pending connection')
            )
        }
    }

    _handleGetDevices(deviceList) {
        this.logger.debug('device list', deviceList);
        const items = deviceList.split(',');
        const deviceMap = new Map<string, DeviceInfo>();

        for (let i = 0; i < items.length; i += 2) {
            const deviceId = items[i];
            const deviceName = items[i + 1];
            deviceMap.set(deviceId, { deviceId, deviceName });
        }

        this.devices = deviceMap;
    }

    _handleGetActiveDevice(activeDeviceId: string) {
        this.logger.debug('active device info', activeDeviceId);
        this.activeDeviceId = activeDeviceId;
    }

    //TODO: Handle reports sent from headsets (oninputreport)
    //TODO: Handle reports sent to headsets (sendReport)
}