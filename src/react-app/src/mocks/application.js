const EVENTS = {
    JABRA_EVENT: 'jabraEvent'
};

const HostedContext = {
    _isHosted: null,

    isHosted () {
        return this._isHosted;
    },

    callback (obj) {
        const msg = obj.msg;
        if (msg === 'JabraEvent') {
            let eventName = obj.event;
            let value = obj.value;
            let hidInput = obj.hidInput;
            // Logger.log(`Jabra event received. ID: ${hidInput}, Name: ${eventName}, Value: ${value}`);
            // JabraEvent({eventName, value, hidInput});
        }
    },

    requestDesktopPromise (cmd) {
        return (resolve, reject) => {
            try {
                let sCmd = JSON.stringify(cmd);
                window.cefQuery({
                    request: sCmd,
                    persistent: false,
                    onSuccess: (response) => {
                        try {
                            let obj = JSON.parse(response);
                            resolve(obj);
                        } catch (e) {
                            resolve({});
                        }
                    },
                    onFailure: (response) => {
                        reject(response);
                    }
                });
            } catch (e) {
                Logger.error('Error requesting desktop promise', e);
                reject();
            }
        }
    },

    sendJabraEventToDesktop (deviceID, event, value) {
        window._HostedContextFunctions.sendEventToDesktop(EVENTS.JABRA_EVENT, {
            deviceID,
            event,
            value
        });
    },

    /* TODO: Investigate purpose */
    requestJabraDevices () {
        return this.requestDesktopPromise({ cmd: 'requestJabraDevices' });
    },

    /* TODO: Investigate purpose */
    supportsJabra () {
        return true;
    }
};

const ApplicationService = () => {
    const hostedContext = HostedContext;
    hostedContext._isHosted = !!window._HostedContextFunctions;

    if (hostedContext._isHosted) {
        const assetURL = window.location.origin + window.location.pathname;
        const initData = {
            assetURL,
            callback: hostedContext.callback.bind(hostedContext),
            supportsTerminationRequest: true,
            supportsUnifiedPreferences: true
        };

        window._HostedContextFunctions.register(initData);
    }
}

export default ApplicationService;