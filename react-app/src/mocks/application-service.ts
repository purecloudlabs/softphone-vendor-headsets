import JabraNativeService from "../library/services/vendor-implementations/jabra/jabra-native/jabra-native";
import { JabraNativeCommands } from "../library/services/vendor-implementations/jabra/jabra-native/jabra-native-commands";

const EVENTS = {
    JABRA_EVENT: 'jabraEvent',
};

export default class ApplicationService {
    constructor() {
        if (this.isHosted) {
            const assetURL = window.location.origin + window.location.pathname;
            const initData = {
                assetURL,
                callback: this.callback.bind(this),
                supportsTerminationRequest: true,
                supportsUnifiedPreferences: true,
            };

        (window as any)._HostedContextFunctions.register(initData);
        }
    }

    get isHosted(): boolean {
        return !!(window as any)._HostedContextFunctions;
    }

    callback(obj: { msg: string, event: string, value: boolean, hidInput: string }): void {
        const msg = obj.msg;
        if (msg === 'JabraEvent') {
            const jabra = JabraNativeService.getInstance({ logger: console });
            const eventName = obj.event;
            const value = obj.value;
            const hidInput = obj.hidInput;
            console.log(
                `Jabra event received. ID: ${hidInput}, Name: ${eventName}, Value: ${value}`
            );
            jabra.handleJabraEvent({ eventName, value, hidInput });
        }
    }

    requestDesktopPromise(cmd: { cmd: string }) {
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
        return (resolve, reject): void => {
        /* eslint-enable */
            try {
                const sCmd = JSON.stringify(cmd);
                (window as any).cefQuery({
                    request: sCmd,
                    persistent: false,
                    onSuccess: response => {
                        try {
                            const obj = JSON.parse(response);
                            resolve(obj);
                        } catch (e) {
                            resolve({});
                        }
                    },
                    onFailure: response => {
                        reject(response);
                    },
                });
            } catch (e) {
                console.error('Error requesting desktop promise', e);
                reject();
            }
        };
    }

    sendJabraEventToDesktop(deviceID: string, event: JabraNativeCommands, value: boolean): void {
        ((window as any)._HostedContextFunctions as any).sendEventToDesktop(
            EVENTS.JABRA_EVENT,
            {
                deviceID,
                event,
                value,
            }
        );
    }

    /* TODO: Investigate purpose */
    requestJabraDevices(): any {
        return this.requestDesktopPromise({ cmd: 'requestJabraDevices' });
    }

    /* TODO: Investigate purpose */
    supportsJabra(): boolean {
        return true;
    }
}