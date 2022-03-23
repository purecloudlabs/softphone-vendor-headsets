import JabraService from './jabra'
import DeviceInfo from '../../../types/device-info';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import {
    CallControlFactory,
    DeviceType,
    ErrorType,
    IApi,
    ICallControlSignal,
    IConnection,
    IDevice,
    IHidUsage,
    init,
    RequestedBrowserTransport
} from '@gnaudio/jabra-js';
import { BroadcastChannel } from 'broadcast-channel';
import 'regenerator-runtime';
import { mockLogger } from '../../../test-utils.test';

jest.mock('broadcast-channel');

const testDevice1: DeviceInfo = {
    deviceName: 'Test Device 1',
    ProductName: 'Super Headset',
    headsetType: 'Wireless',
};
const testDevice2: DeviceInfo = {
    deviceName: 'Test Device 2',
    ProductName: 'Yellow Headset',
    headsetType: 'Wired with buttons',
};
const testDevice3: DeviceInfo = {
    deviceName: 'Test Device 3',
    ProductName: 'Bluetooth Bannana',
    headsetType: 'Looks like a fruit',
};

const flushPromises = () => Promise.resolve();

function populateDevices(service: JabraService): void {
    service.devices.set(testDevice1.deviceName, testDevice1);
    service.devices.set(testDevice2.deviceName, testDevice2);
    service.devices.set(testDevice3.deviceName, testDevice3);
}

const createMockCallControl = (deviceSignalsObservable: Observable<ICallControlSignal>) => {
    return {
        device: jest.fn(),
        onDisconnect: jest.fn(),
        deviceSignals: deviceSignalsObservable,
        takeCallLock: jest.fn(),
        releaseCallLock: jest.fn(),
        offHook: jest.fn(),
        ring: jest.fn(),
        mute: jest.fn(),
        hold: jest.fn()
    }
}

const exceptionWithType = (message, type) => {
    const error = new Error();
    error.message = message;
    (error as any).type = type;
    return error;
};

const initializeSdk = async (subject) => {
    const sdk = await init({
        appId: 'softphone-vendor-headsets-test',
        appName: 'Softphone Headset Library Test',
        transport: RequestedBrowserTransport.CHROME_EXTENSION_WITH_WEB_HID_FALLBACK
    });
    const deviceList = [
        {
            id: 123 as any,
            name: 'Test Label 123',
            vendorId: 2830,
            productId: 3648,
            serialNumber: '123456789',
            currentConnections: [{
                hidChannel: {
                    descriptor: [{
                        reportSize: 1,
                        reportType: 1,
                        usage: 23,
                        usagePage: 65344,
                        valueType: "absolute"
                    } as IHidUsage] as IHidUsage[],
                } as any,
                type: 2
            } as IConnection] as IConnection[],
            type: 255 as DeviceType,
            browserLabel: 'Test Label 123:3648',
        } as IDevice,
        {
            name: 'Definitely not this'
        } as IDevice
    ] as IDevice[]
    sdk.deviceList = subject.asObservable() as any;
    subject.next(deviceList);
    return sdk;
}

const resetJabraService = (service: JabraService) => {
    service.isConnecting = false;
    service.isConnected = false;
    service.isActive = false;
    service.devices = new Map<string, DeviceInfo>();
    service.activeDeviceId = null;
    service.logger = mockLogger;
    service._connectDeferred = null;
}

describe('JabraService', () => {
    let jabraService: JabraService;
    let jabraSdk: Promise<IApi>;
    const subject = new ReplaySubject<IDevice[]>(1);
    // const deviceSignalsSubject = new Subject<ICallControlSignal>();
    // const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
    Object.defineProperty(window.navigator, 'hid', { get: () => ({
        getDevices: () => { return [] }
    })});
    Object.defineProperty(window.navigator, 'locks', { get: () => ({})});
    (window as any).BroadcastChannel = BroadcastChannel;
    beforeEach(async () => {
        jabraSdk = initializeSdk(subject);
        jabraService = JabraService.getInstance({ logger: console, createNew: true });
        resetJabraService(jabraService);
    })

    afterEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
    })

    describe('instantiation', () => {
        it('should be a singleton', () => {
            const jabraService2 = JabraService.getInstance({ logger: console });

            expect(jabraService).not.toBeFalsy();
            expect(jabraService2).not.toBeFalsy();
            expect(jabraService).toBe(jabraService2);
        });
        it('should have the correct vendorName', () => {
            expect(jabraService.vendorName).toEqual('Jabra');
        });
    });

    describe('various functions', () => {
        it('deviceLabelMatchesVendor', () => {
            let result;
            result = jabraService.deviceLabelMatchesVendor('Test Jabra Label');
            expect(result).toBe(true);

            result = jabraService.deviceLabelMatchesVendor('Something totally different');
            expect(result).toBe(false);
        })
        it('resets the state', () => {
            const setMuteSpy = jest.spyOn(jabraService, 'setMute');
            const setHoldSpy = jest.spyOn(jabraService, 'setHold');
            jabraService.resetState();
            expect(setMuteSpy).toHaveBeenCalledWith(false);
            expect(setHoldSpy).toHaveBeenCalledWith(null, false);
        })
    })

    describe('initial connection', () => {
        beforeEach(() => {
            resetJabraService(jabraService);
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        })
        it('should set the proper values while trying to connect; successfuly connect', async () => {
            const processEventsSpy = jest.spyOn(jabraService, '_processEvents');
            const deviceSignalsSubject = new Subject<ICallControlSignal>();
            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            const callControlFactorySpy = jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            );
            const testLabel = 'test label 123';
            jabraService.jabraSdk = jabraSdk;
            await jabraService.connect(testLabel);
            jest.runAllTimers();
            await flushPromises();
            await flushPromises();
            await flushPromises();
            expect(callControlFactorySpy).toHaveBeenCalled();
            expect(processEventsSpy).toHaveBeenCalledWith(callControl);
            expect(jabraService.isConnected).toBe(true);
            expect(jabraService.isConnecting).toBe(false);
        })
        it('should set the proper values while trying to connect; failed to connect', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();
            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            );
            const deviceConnectionStatusChangedSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            const requestWebHidPermissionsSpy = jest.spyOn(jabraService, 'requestWebHidPermissions');
            const testLabel = 'test label 456';
            jabraService.jabraSdk = jabraSdk;
            await jabraService.connect(testLabel);
            jest.runAllTimers();
            await flushPromises();
            jest.runOnlyPendingTimers();
            await flushPromises();
            await flushPromises();
            expect(requestWebHidPermissionsSpy).toHaveBeenCalled();
            expect(deviceConnectionStatusChangedSpy).toHaveBeenCalled();
            expect(jabraService.isConnecting).toBe(false);
            expect(errorLoggerSpy).toHaveBeenCalled();
        });
        it('should set the proper values while trying to connect; failed initial connection, populated afterwards', async () => {
            const testDevices = [
                {
                    id: 123 as any,
                    name: 'Test Label 123',
                    vendorId: 2830,
                    productId: 3648,
                    serialNumber: '123456789',
                    currentConnections: [{
                        hidChannel: {
                            descriptor: [{
                                reportSize: 1,
                                reportType: 1,
                                usage: 23,
                                usagePage: 65344,
                                valueType: "absolute"
                            } as IHidUsage] as IHidUsage[],
                        } as any,
                        type: 2
                    } as IConnection] as IConnection[],
                    type: 255 as DeviceType,
                    browserLabel: 'Test Label 123:3648',
                } as IDevice,
                {
                    name: 'Definitely not this'
                } as IDevice,
                {
                    id: 456 as any,
                    name: 'Test Label 456'
                } as IDevice
            ] as IDevice[]
            const processEventsSpy = jest.spyOn(jabraService, '_processEvents');
            const deviceSignalsSubject = new Subject<ICallControlSignal>();
            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            );
            const deviceConnectionStatusChangedSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
            const requestWebHidPermissionsSpy = jest.spyOn(jabraService, 'requestWebHidPermissions');
            const testLabel = 'test label 456';
            jabraService.jabraSdk = jabraSdk;
            await jabraService.connect(testLabel);
            jest.advanceTimersByTime(2100);
            await flushPromises();
            subject.next(testDevices);
            await flushPromises();
            await flushPromises();
            // await flushPromises();
            expect(requestWebHidPermissionsSpy).toHaveBeenCalled();
            expect(processEventsSpy).toHaveBeenCalledWith(callControl);
            expect(deviceConnectionStatusChangedSpy).toHaveBeenCalledWith({ isConnected:true, isConnecting: false });
            expect(jabraService.isConnecting).toBe(false);
            expect(jabraService.isConnected).toBe(true);
        })
        it('should have an instance of a CallControlFactory after calling the createCallControlFactory function', async () => {
            const testLabel = 'test label 123';
            jabraService.jabraSdk = jabraSdk;
            await jabraService.connect(testLabel);
            await flushPromises();
            expect(jabraService.callControlFactory instanceof CallControlFactory).toBe(true);
        })
    });
    describe('processEvents', () => {
        it('properly handles answer call events passed in from headset', async () => {
            jabraService.callLock = true;
            const deviceAnsweredCallSpy = jest.spyOn(jabraService, 'deviceAnsweredCall');            // const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            deviceSignalsSubject.next({ type: 32, value: true} as any)
            expect(callControl.offHook).toHaveBeenCalledWith(true);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceAnsweredCallSpy).toHaveBeenCalled();
        });
        it('properly handles end call events passed in from headset with a successful callLock release', async () => {
            jabraService.callLock = true;
            const deviceEndedCallSpy = jest.spyOn(jabraService, 'deviceEndedCall');
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            deviceSignalsSubject.next({ type: 32, value: false} as any)
            expect(callControl.mute).toHaveBeenCalledWith(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(deviceEndedCallSpy).toHaveBeenCalled();
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
        });
        it('properly handles end call events passed in from headset with a failed callLock release', async () => {
            jabraService.callLock = true;
            const deviceEndedCallSpy = jest.spyOn(jabraService, 'deviceEndedCall');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            const exceptionWithType = (message, type) => {
                const error = new Error();
                error.message = message;
                (error as any).type = type;
                return error;
            }

            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
            });

            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            deviceSignalsSubject.next({ type: 32, value: false } as any)
            expect(callControl.mute).toHaveBeenCalledWith(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(deviceEndedCallSpy).toHaveBeenCalled();
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!');
        });
        it('properly logs an error that is not related to call lock during end call flow', async () => {
            jabraService.callLock = true;
            const deviceEndedCallSpy = jest.spyOn(jabraService, 'deviceEndedCall');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            const exceptionWithType = (message, type) => {
                const error = new Error();
                error.message = message;
                (error as any).type = type;
                return error;
            }

            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Something went terribly wrong', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            deviceSignalsSubject.next({ type: 32, value: false} as any);
            expect(callControl.mute).toHaveBeenCalledWith(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(deviceEndedCallSpy).toHaveBeenCalled();
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'Something went terribly wrong');
        })
        it('properly handles hold call events passed in from headset', async () => {
            jabraService.callLock = true;
            const deviceHoldStatusChangedSpy = jest.spyOn(jabraService, 'deviceHoldStatusChanged');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            deviceSignalsSubject.next({ type: 33, value: true} as any);
            expect(jabraService.isHeld).toBe(true);
            expect(callControl.hold).toHaveBeenCalledWith(true);
            expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(true, { code: 33, name: 'OnHold' });

            deviceSignalsSubject.next({ type: 35, value: true } as any);
            expect(jabraService.isHeld).toBe(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(false, { code: 35, name: 'ResumeCall' });
        });
        it('properly handles mute call events passed in from headset', async () => {
            jabraService.callLock = true;
            const deviceMuteChangedSpy = jest.spyOn(jabraService, 'deviceMuteChanged');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            deviceSignalsSubject.next({ type: 47, value: true} as any);
            expect(jabraService.isMuted).toBe(true);
            expect(callControl.mute).toHaveBeenCalledWith(true);
            expect(deviceMuteChangedSpy).toHaveBeenCalledWith(true, { code: 47, name: 'CallMuted'} );

            deviceSignalsSubject.next({ type: 47, value: true } as any);
            expect(jabraService.isMuted).toBe(false);
            expect(callControl.mute).toHaveBeenCalledWith(false);
            expect(deviceMuteChangedSpy).toHaveBeenCalledWith(false, { code: 47, name: 'CallUnmuted'} );
        });
        it('properly handles reject call events passed in from headset with a successful callLock release', async () => {
            jabraService.callLock = true;
            jabraService.incomingConversationId = 'convoId1234';

            const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            deviceSignalsSubject.next({ type: 65533, value: true} as any);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceRejectedCallSpy).toHaveBeenCalledWith('convoId1234');
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
        });
        it('properly handles reject call events passed in from headset with a failed callLock release', async () => {
            jabraService.callLock = true;
            jabraService.incomingConversationId = 'convoId1234';

            const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            const exceptionWithType = (message, type) => {
                const error = new Error();
                error.message = message;
                (error as any).type = type;
                return error;
            }

            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
            });

            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            deviceSignalsSubject.next({ type: 65533, value: true } as any);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceRejectedCallSpy).toHaveBeenCalledWith('convoId1234');
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!');
        });
        it('properly logs an error that is not related to call lock during reject call flow', async () => {
            jabraService.callLock = true;
            jabraService.incomingConversationId = 'convoId1234';

            const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            const exceptionWithType = (message, type) => {
                const error = new Error();
                error.message = message;
                (error as any).type = type;
                return error;
            }

            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Something went terribly wrong', ErrorType.UNEXPECTED_ERROR);
            });

            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            deviceSignalsSubject.next({ type: 65533, value: true } as any);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceRejectedCallSpy).toHaveBeenCalledWith('convoId1234');
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'Something went terribly wrong');
        });
        it('properly logs a debug message if we do not have the callLock by the time we start the subscribing to processEvents', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            jabraService._processEvents(callControl as any);

            jabraService.callLock = false;

            const debugLoggerSpy = jest.spyOn(jabraService.logger, 'debug');
            deviceSignalsSubject.next({ type: 32, value: true} as any);
            expect(debugLoggerSpy).toHaveBeenCalledWith('Currently not in possession of the Call Lock; Cannot react to Device Actions');
        })
    });

    describe('setMute', () => {
        it('properly sends the event to the headset and updates the state', async () => {
            jabraService.callLock = true;
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;
            jabraService.setMute(true);
            expect(jabraService.isMuted).toBe(true);
            expect(callControl.mute).toHaveBeenCalledWith(true);

            jabraService.setMute(false);
            expect(jabraService.isMuted).toBe(false);
            expect(callControl.mute).toHaveBeenCalledWith(false);
        })
        it('does not do anything if we dont own the callLock', () => {
            jabraService.callLock = false;
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;
            const muteResult = jabraService.setMute(true);
            expect(jabraService.isMuted).toBe(false);
            expect(callControl.mute).not.toHaveBeenCalled();
            expect(muteResult).resolves.toBe(undefined);
        })
    })
    describe('setHold', () => {
        it('properly sends the event to the headset and updates the state', () => {
            jabraService.callLock = true;
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;
            jabraService.setHold('123', true);
            expect(jabraService.isHeld).toBe(true);
            expect(callControl.hold).toHaveBeenCalledWith(true);

            jabraService.setHold('123', false);
            expect(jabraService.isHeld).toBe(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
        })
        it('does not do anything if we dont own the callLock', () => {
            jabraService.callLock = false;
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;
            const holdResult = jabraService.setHold('123', true);
            expect(jabraService.isHeld).toBe(false);
            expect(callControl.hold).not.toHaveBeenCalled();
            expect(holdResult).resolves.toBe(undefined);
        })
    })
    describe('disconnect', () => {
        it('resets two connected flags after disconnecting', () => {
            jabraService.isConnected = true;
            jabraService.isConnecting = true;
            const headsetEventSubscriptionSpy = jest.spyOn(jabraService['headsetEventSubscription'], 'unsubscribe');
            jabraService.disconnect();
            expect(headsetEventSubscriptionSpy).toHaveBeenCalled();
            expect(jabraService.isConnecting).toBe(false);
            expect(jabraService.isConnected).toBe(false);
        })

    })
    describe('answerCall', () => {
        it('sends answer call event to headset', () => {
            jabraService.callLock = true;
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;
            jabraService.answerCall();
            expect(callControl.offHook).toHaveBeenCalledWith(true);
        })
        it('does not do anything if we dont own the callLock', () => {
            jabraService.callLock = false;
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;
            const answerCallResult = jabraService.answerCall();
            expect(callControl.offHook).not.toHaveBeenCalled();
            expect(answerCallResult).resolves.toBe(undefined);
        })
    })
    describe('incomingCall', () => {
        it('sends ring event based on flags after properly taking callLock', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const callInfo = {
                conversationId: '123',
                contactName: 'Lee Moriarty'
            }
            callControl.takeCallLock.mockResolvedValue(true);
            await jabraService.incomingCall(callInfo);
            expect(jabraService.callLock).toBe(true);
            expect(callControl.ring).toHaveBeenCalledWith(true);
        })
        it('sends ring event based on flags after already having callLock', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const callInfo = {
                conversationId: '456',
                contactName: 'Adam Cole'
            };
            callControl.takeCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to take the call lock, but it is already held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            await jabraService.incomingCall(callInfo);
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to take the call lock, but it is already held!');
            expect(callControl.ring).toHaveBeenCalledWith(true);
        })
        it('handles unexpected error, unrelated to callLock', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const callInfo = {
                conversationId: '789',
                contactName: 'Gene Ween'
            };
            callControl.takeCallLock.mockImplementation(() => {
                throw exceptionWithType('An actual error', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            await jabraService.incomingCall(callInfo);
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'An actual error');
            expect(callControl.ring).not.toHaveBeenCalled();
        })
    })
    describe('outgoingCall', () => {
        it('sends offHook event after properly taking callLock', async() => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            callControl.takeCallLock.mockResolvedValue(true);
            await jabraService.outgoingCall();
            expect(jabraService.callLock).toBe(true);
            expect(callControl.offHook).toHaveBeenCalledWith(true);
        })
        it('sends ring event while already in possession of callLock', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            callControl.takeCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to take the call lock, but it is already held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            await jabraService.outgoingCall();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to take the call lock, but it is already held!');
            expect(callControl.offHook).toHaveBeenCalledWith(true);
        })
        it('handles unexpected error, unrelated to callLock', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            callControl.takeCallLock.mockImplementation(() => {
                throw exceptionWithType('An actual error', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            await jabraService.outgoingCall();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'An actual error');
            expect(callControl.offHook).not.toHaveBeenCalled();
        })
    })
    describe('rejectCall', () => {
        it('properly sends ring events and releases call lock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            jabraService.callLock = true;
            const jabraRejectCall = jabraService.rejectCall();
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
            expect(jabraRejectCall).resolves.toReturn();
        })
        it('prints out message if not in possession of callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            const jabraRejectCall = jabraService.rejectCall();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Currently not in possession of the Call Lock; Cannot react to Device Actions');
            expect(callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
            expect(jabraRejectCall).resolves.toReturn();
        })
        it('properly handles flow when in possession of callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            jabraService.rejectCall();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!')
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
        })
        it('properly handles error unrelated callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Something much worse', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            jabraService.rejectCall();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'Something much worse');
        })
    })
    describe('endCall', () => {
        it('properly sends offHook events and releases call lock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            jabraService.callLock = true;
            const jabraEndCalls = jabraService.endCall('123', false);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
            expect(jabraEndCalls).resolves.toReturn();
        })
        it('properly resolves if another call is already in place', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const jabraEndCalls = jabraService.endCall('123', true);
            expect(jabraEndCalls).resolves.toReturn();
            expect(callControl.offHook).not.toHaveBeenCalled();
        })
        it('prints out message if not in possession of callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            const jabraEndCalls = jabraService.endCall('123', false);
            expect(infoLoggerSpy).toHaveBeenCalledWith('Currently not in possession of the Call Lock; Cannot react to Device Actions');
            expect(callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
            expect(jabraEndCalls).resolves.toReturn();
        })
        it('properly handles flow when in possession of callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            jabraService.endCall('123', false);
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!')
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
        })
        it('properly handles error unrelated callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Something much worse', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            jabraService.endCall('123', false);
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'Something much worse');
        })
    })
    describe('endAllCall', () => {
        it('properly sends offHook events and releases call lock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            jabraService.callLock = true;
            const jabraEndCalls = jabraService.endAllCalls();
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
            expect(jabraEndCalls).resolves.toReturn();
        })
        it('prints out message if not in possession of callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            const jabraEndCalls = jabraService.endAllCalls();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Currently not in possession of the Call Lock; Cannot react to Device Actions');
            expect(callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
            expect(jabraEndCalls).resolves.toReturn();
        })
        it('properly handles flow when in possession of callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            jabraService.endAllCalls();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!')
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
        })
        it('properly handles error unrelated callLock', () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();

            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

            jabraService.callControl = callControl as any;

            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Something much worse', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            jabraService.endAllCalls();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'Something much worse');
        })
    })
    describe('deviceInfo', () => {
        it('should return null if activeDeviceId is null', () => {
            jabraService.devices.set(testDevice1.deviceName, testDevice1);
            jabraService.activeDeviceId = null;
            const result = jabraService.deviceInfo;
            expect(result).toBeNull();
        })
        it('should return null if there are no devices registered', () => {
            jabraService.activeDeviceId = 'foobar';
            const result = jabraService.deviceInfo;
            expect(result).toBeNull();
        });
        it('should return a device when it is registered and matches the activeDeviceId', () => {
            jabraService.activeDeviceId = testDevice1.deviceName;
            jabraService.devices.set(testDevice1.deviceName, testDevice1);
            jabraService.devices.set(testDevice2.deviceName, testDevice2);

            const result: DeviceInfo = jabraService.deviceInfo;

            expect(result).toBe(testDevice1);
        });
    })
    describe('deviceName', () => {
        it('should return the deviceName of the active device', () => {
            populateDevices(jabraService);
            jabraService.activeDeviceId = testDevice1.deviceName;
            expect(jabraService.deviceName).toEqual(testDevice1.deviceName);
        });
    });
    describe('isDeviceAttached', () => {
        it('should return true if the the device is in the devices list is the activeDeviceId', () => {
            populateDevices(jabraService);
            jabraService.activeDeviceId = testDevice1.deviceName;
            expect(jabraService.isDeviceAttached).toEqual(true);
        });
        it('should return false if the the device is NOT in the devices list is the activeDeviceId', () => {
            populateDevices(jabraService);
            jabraService.activeDeviceId = 'Imaginary Device';
            expect(jabraService.isDeviceAttached).toEqual(false);
        });
    });
    describe('isSupported', () => {
        it('should return true if proper values are met', () => {
            expect(jabraService.isSupported()).toBe(true);
        })
        it('should return false if proper values are not met', () => {
            Object.defineProperty(window, '_HostedContextFunctions', { get: () => true });
            expect(jabraService.isSupported()).toBe(false);
        })
    })
    describe('isDeviceInList', () => {
        it('should return false if device is undefined', () => {
            expect(jabraService.isDeviceInList(undefined, 'Test Label 123')).toBe(false);
        })
        it('should return false if name within device is undefined', () => {
            const testDevice = {
                type: "Test",
                id: '123'
            };
            expect(jabraService.isDeviceInList(testDevice as any, 'Test Label 123')).toBe(false);
        })
        it('should return true if all expected values are present and the label matches', () => {
            const testDevice = {
                type: "Test",
                id: '123',
                name: 'Test Label 123'
            };
            expect(jabraService.isDeviceInList(testDevice as any, 'test label 123')).toBe(true);
        })
    })
})