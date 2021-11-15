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

    callback(obj: any) {
        const msg = obj.msg;
        if (msg === 'JabraEvent') {
            let eventName = obj.event;
            let value = obj.value;
            let hidInput = obj.hidInput;
            console.log(
                `Jabra event received. ID: ${hidInput}, Name: ${eventName}, Value: ${value}`
            );
            // JabraEvent({eventName, value, hidInput});
        }
    }

    requestDesktopPromise(cmd) {
        return (resolve, reject) => {
            try {
                let sCmd = JSON.stringify(cmd);
                (window as any).cefQuery({
                    request: sCmd,
                    persistent: false,
                    onSuccess: response => {
                        try {
                            let obj = JSON.parse(response);
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

    sendJabraEventToDesktop(deviceID, event, value) {
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
    requestJabraDevices() {
        return this.requestDesktopPromise({ cmd: 'requestJabraDevices' });
    }

    /* TODO: Investigate purpose */
    supportsJabra() {
        return true;
    }
}