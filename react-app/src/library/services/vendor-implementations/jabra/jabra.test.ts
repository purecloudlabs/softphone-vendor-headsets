import JabraService from './jabra'
import DeviceInfo from '../../../types/device-info';
import { mockLogger } from '../../test-utils';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {
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

jest.mock('broadcast-channel');

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
    service.isActive = false;
    service.devices = new Map<string, DeviceInfo>();
    service.activeDeviceId = null;
    service.logger = mockLogger;
    service._connectDeferred = null;
}

describe('JabraService', () => {
    let jabraService: JabraService;
    let jabraSdk: Promise<IApi>;
    const subject = new BehaviorSubject<IDevice[]>([]);
    const deviceSignalsSubject = new Subject<ICallControlSignal>();
    const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
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
        jest.useRealTimers();
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
            // jest.clearAllTimers();
            jest.useFakeTimers();
        })
        it('should set the proper values while trying to connect', async () => {
            const deviceSignalsSubject = new Subject<ICallControlSignal>();
            const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
            const callControlFactorySpy = jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            )
            jabraService.jabraSdk = jabraSdk;
            const testLabel = 'test label 123';
            const processEventsSpy = jest.spyOn(jabraService, '_processEvents');
            await jabraService.connect(testLabel);
            jest.runAllTimers();
            await Promise.resolve();
            await Promise.resolve();
            expect(callControlFactorySpy).toHaveBeenCalled();
            expect(processEventsSpy).toHaveBeenCalledWith(callControl);
            expect(jabraService.isConnecting).toBe(false);
            expect(jabraService.isConnected).toBe(true);
        })
    });
    describe('processEvents', () => {
        beforeEach(async () => {
            jabraService.callLock = true;
            const callControlFactorySpy = jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            );
            const testLabel = 'test label 123';
            await jabraService.connect(testLabel);
        });
        it('properly handles answer call events passed in from headset', async () => {
            const deviceAnsweredCallSpy = jest.spyOn(jabraService, 'deviceAnsweredCall');

            deviceSignalsSubject.next({ type: 32, value: true} as any)
            expect(callControl.offHook).toHaveBeenCalledWith(true);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceAnsweredCallSpy).toHaveBeenCalled();
        });
        it('properly handles end call events passed in from headset with a successful callLock release', async () => {
            const deviceEndedCallSpy = jest.spyOn(jabraService, 'deviceEndedCall');

            deviceSignalsSubject.next({ type: 32, value: false} as any)
            expect(callControl.mute).toHaveBeenCalledWith(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(deviceEndedCallSpy).toHaveBeenCalled();
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
        });
        it('properly handles end call events passed in from headset with a failed callLock release', async () => {
            const deviceEndedCallSpy = jest.spyOn(jabraService, 'deviceEndedCall');

            callControl.releaseCallLock.mockImplementation(() => {
                throw new Error('Trying to release the call lock, but it is not held!');
            });

            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            deviceSignalsSubject.next({ type: 32, value: false } as any)
            expect(callControl.mute).toHaveBeenCalledWith(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(deviceEndedCallSpy).toHaveBeenCalled();
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!', undefined);
        });
        it('properly handles hold call events passed in from headset', () => {
            const deviceHoldStatusChangedSpy = jest.spyOn(jabraService, 'deviceHoldStatusChanged');

            deviceSignalsSubject.next({ type: 33, value: true} as any);
            expect(jabraService.isHeld).toBe(true);
            expect(callControl.hold).toHaveBeenCalledWith(true);
            expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(true, { code: 33, name: 'OnHold' });

            deviceSignalsSubject.next({ type: 35, value: true } as any);
            expect(jabraService.isHeld).toBe(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
            expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(false, { code: 35, name: 'ResumeCall' });
        });
        it('properly handles mute call events passed in from headset', () => {
            const deviceMuteChangedSpy = jest.spyOn(jabraService, 'deviceMuteChanged');

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
            const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

            deviceSignalsSubject.next({ type: 65533, value: true} as any);
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceRejectedCallSpy).toHaveBeenCalledWith(null);
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(jabraService.callLock).toBe(false);
        });
        it('properly handles reject call events passed in from headset with a failed callLock release', async () => {
            const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

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
            expect(callControl.offHook).toHaveBeenCalledWith(false);
            expect(callControl.ring).toHaveBeenCalledWith(false);
            expect(deviceRejectedCallSpy).toHaveBeenCalledWith(null);
            expect(await callControl.releaseCallLock).toHaveBeenCalled();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
        });
    });

    describe('setMute', () => {
        it('properly sends the event to the headset and updates the state', () => {
            jabraService.callLock = true;

            const jabraSetMute = jabraService.setMute(true);
            expect(jabraService.isMuted).toBe(true);
            expect(callControl.mute).toHaveBeenCalledWith(true);
            expect(jabraSetMute).resolves.toReturn();

            jabraService.setMute(false);
            expect(jabraService.isMuted).toBe(false);
            expect(callControl.mute).toHaveBeenCalledWith(false);
        })
    })
    describe('setHold', () => {
        it('properly sends the event to the headset and updates the state', () => {
            jabraService.callLock = true;

            const jabraSetHold = jabraService.setHold('123', true);
            expect(jabraService.isHeld).toBe(true);
            expect(callControl.hold).toHaveBeenCalledWith(true);
            expect(jabraSetHold).resolves.toReturn();

            jabraService.setHold('123', false);
            expect(jabraService.isHeld).toBe(false);
            expect(callControl.hold).toHaveBeenCalledWith(false);
        })
    })
    describe('disconnect', () => {
        it('resets two connected flags after disconnecting', () => {
            const jabraDisconnect = jabraService.disconnect();
            expect(jabraService.isConnecting).toBe(false);
            expect(jabraService.isConnected).toBe(false);
            expect(jabraDisconnect).resolves.toReturn();
        })

    })
    describe('answerCall', () => {
        it('sends answer call event to headset', () => {
            jabraService.callLock = true;

            const jabraAnswerCall = jabraService.answerCall();
            expect(callControl.offHook).toHaveBeenCalledWith(true);
            expect(jabraAnswerCall).resolves.toReturn();
        })
    })
    describe('incomingCall', () => {
        beforeEach(async () => {
            const callControlFactorySpy = jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            );
            const testLabel = 'test label 123';
            await jabraService.connect(testLabel);
            jabraService.callLock = false;
        })
        it('sends ring event based on flags after properly taking callLock', async () => {
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
        beforeEach(async () => {
            jabraService.callLock = false;
            const callControlFactorySpy = jest.spyOn(jabraService, 'createCallControlFactory').mockReturnValue(
                {
                    createCallControl: async () => {
                        return callControl;
                    }
                } as any
            );
            const testLabel = 'test label 123';
            await jabraService.connect(testLabel);        })
        it('sends offHook event after properly taking callLock', async() => {
            callControl.takeCallLock.mockResolvedValue(true);
            await jabraService.outgoingCall();
            expect(jabraService.callLock).toBe(true);
            expect(callControl.offHook).toHaveBeenCalledWith(true);
        })
        it('sends ring event while already in possession of callLock', async () => {
            callControl.takeCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to take the call lock, but it is already held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            await jabraService.outgoingCall();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to take the call lock, but it is already held!');
            expect(callControl.offHook).toHaveBeenCalledWith(true);
        })
        it('handles unexpected error, unrelated to callLock', async () => {
            callControl.takeCallLock.mockImplementation(() => {
                throw exceptionWithType('An actual error', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            await jabraService.outgoingCall();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'An actual error');
            expect(callControl.offHook).not.toHaveBeenCalled();
        })
    })
    describe('endCall', () => {
        it('properly sends offHook events and releases call lock', () => {
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
            const jabraEndCalls = jabraService.endCall('123', true);
            expect(jabraEndCalls).resolves.toReturn();
            expect(callControl.offHook).not.toHaveBeenCalled();
        })
        it('prints out message if not in possession of callLock', () => {
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
            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Trying to release the call lock, but it is not held!', ErrorType.SDK_USAGE_ERROR);
            });
            const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
            const resetStateSpy = jest.spyOn(jabraService, 'resetState');
            const jabraEndCalls = jabraService.endAllCalls();
            expect(infoLoggerSpy).toHaveBeenCalledWith('Trying to release the call lock, but it is not held!')
            expect(jabraService.callLock).toBe(false);
            expect(resetStateSpy).toHaveBeenCalled();
        })
        it('properly handles error unrelated callLock', () => {
            jabraService.callLock = true;
            callControl.releaseCallLock.mockImplementation(() => {
                throw exceptionWithType('Something much worse', ErrorType.UNEXPECTED_ERROR);
            });
            const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
            jabraService.endAllCalls();
            expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'Something much worse');
        })
    })
})