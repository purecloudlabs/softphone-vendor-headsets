import JabraService from './jabra';
import DeviceInfo from '../../../types/device-info';
import { Observable, Subject, ReplaySubject, BehaviorSubject } from 'rxjs';
import {
  CallControlFactory,
  DeviceType,
  ErrorType,
  IApi,
  ICallControlSignal,
  IConnection,
  IDevice,
  IHidUsage,
} from '@gnaudio/jabra-js';
import { BroadcastChannel } from 'broadcast-channel';
import 'regenerator-runtime';
import { MockJabraSdk } from './mock-jabra-sdk';

jest.mock('broadcast-channel');

const flushPromises = () => Promise.resolve();

const exceptionWithType = (message, type) => {
  const error = new Error();
  error.message = message;
  (error as any).type = type;
  return error;
};

const createMockCallControl = (deviceSignalsObservable: Observable<ICallControlSignal>) => {
  return {
    device: jest.fn(),
    onDisconnect: jest.fn(),
    deviceSignals: deviceSignalsObservable,
    takeCallLock: jest.fn().mockResolvedValue(null),
    releaseCallLock: jest.fn(),
    offHook: jest.fn(),
    ring: jest.fn(),
    mute: jest.fn(),
    hold: jest.fn(),
  };
};

const mockDevice1 = {
  id: 123 as any,
  name: 'Test Label 123',
  vendorId: 2830,
  productId: 3648,
  serialNumber: '123456789'
};

const mockDevice2 = {
  id: 456 as any,
  name: 'Test Label 456',
  vendorId: 2831,
  productId: 3649,
  serialNumber: '1234567891'
};

const initializeSdk = async (subject?: Subject<IDevice[]>) => {
  if (!subject) {
    const deviceList = [
      mockDevice1
    ] as IDevice[];
    subject = new BehaviorSubject(deviceList);
  }
  return new MockJabraSdk(subject)
};

describe('JabraService', () => {
  let jabraService: JabraService;
  let origInitializeSdk: any;
  let jabraSdk: IApi;
  const subject = new ReplaySubject<IDevice[]>(1);
  Object.defineProperty(window.navigator, 'hid', {
    get: () => ({
      getDevices: () => {
        return [];
      },
    }),
  });
  Object.defineProperty(window.navigator, 'locks', { get: () => ({}) });
  (window as any).BroadcastChannel = BroadcastChannel;
  
  beforeEach(() => {
    jabraService = JabraService.getInstance({ logger: console, createNew: true });
    origInitializeSdk = jabraService.initializeJabraSdk;
    jabraService.initializeJabraSdk = initializeSdk as any;
  });

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
    });

    it('resets the state', () => {
      const setMuteSpy = jest.spyOn(jabraService, 'setMute');
      const setHoldSpy = jest.spyOn(jabraService, 'setHold');
      jabraService.resetState();
      expect(setMuteSpy).toHaveBeenCalledWith(false);
      expect(setHoldSpy).toHaveBeenCalledWith(null, false);
    });
  });

  describe('initial connection', () => {
    it('should use existing jabraSdk and connect', async () => {
      jabraService.jabraSdk = await initializeSdk() as any;
      const deviceSignalsSubject = new Subject<ICallControlSignal>();
      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService.callControlFactory = {
        createCallControl: async () => {
          return callControl;
        }
      } as any;

      const testLabel = 'test label 123';

      const initSdkSpy = jabraService['initializeJabraSdk'] = jest.fn();
      await jabraService.connect(testLabel);
      expect(initSdkSpy).not.toHaveBeenCalled();
      expect(jabraService.isConnected).toBe(true);
      expect(jabraService.isConnecting).toBe(false);
    });

    it('should init jabra sdk and connect', async () => {
      const processEventsSpy = jest.spyOn(jabraService, '_processEvents');
      const deviceSignalsSubject = new Subject<ICallControlSignal>();
      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      const callControlFactorySpy = jest
        .spyOn(jabraService, 'createCallControlFactory')
        .mockReturnValue({
          createCallControl: async () => {
            return callControl;
          },
        } as any);
      const testLabel = 'test label 123';

      await jabraService.connect(testLabel);
      expect(callControlFactorySpy).toHaveBeenCalled();
      expect(processEventsSpy).toHaveBeenCalledWith(callControl);
      expect(jabraService.isConnected).toBe(true);
      expect(jabraService.isConnecting).toBe(false);
    });

    it('should do nothing if trying to connect', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jabraService.isConnecting = true;

      await jabraService.connect('someDevice');

      expect(statusChangeSpy).not.toHaveBeenCalled();
    });

    it('should connect with previouslyConnectedDevice', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jest.spyOn(jabraService, 'getPreviouslyConnectedDevice').mockResolvedValue(mockDevice2 as any);

      const callControl = createMockCallControl(new Subject<ICallControlSignal>().asObservable());
      jest
        .spyOn(jabraService, 'createCallControlFactory')
        .mockReturnValue({
          createCallControl: async () => {
            return callControl;
          },
        } as any);

      await jabraService.connect(mockDevice2.name);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('should connect with webhidRequest', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jest.spyOn(jabraService, 'getPreviouslyConnectedDevice').mockResolvedValue(null);
      const webhidSpy = jest.spyOn(jabraService, 'getDeviceFromWebhid').mockResolvedValue(mockDevice2 as any);

      const callControl = createMockCallControl(new Subject<ICallControlSignal>().asObservable());
      jest
        .spyOn(jabraService, 'createCallControlFactory')
        .mockReturnValue({
          createCallControl: async () => {
            return callControl;
          },
        } as any);

      await jabraService.connect(mockDevice2.name);
      expect(webhidSpy).toHaveBeenCalled()
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('should fail to connect and set statuses accordingly', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jest.spyOn(jabraService, 'getPreviouslyConnectedDevice').mockResolvedValue(null);
      const callControlSpy = jest.fn();
      const callControl = createMockCallControl(new Subject<ICallControlSignal>().asObservable());
      jest
        .spyOn(jabraService, 'createCallControlFactory')
        .mockReturnValue({
          createCallControl: callControl
        } as any);

      const webhidSpy = jest.spyOn(jabraService, 'getDeviceFromWebhid').mockRejectedValue({});

      await jabraService.connect(mockDevice2.name);
      expect(webhidSpy).toHaveBeenCalled()
      expect(callControlSpy).not.toHaveBeenCalled()
      expect(statusChangeSpy).lastCalledWith({ isConnected: false, isConnecting: false });
    });
  });

  describe('processEvents', () => {
    it('properly handles answer call events passed in from headset', async () => {
      jabraService.callLock = true;
      const deviceAnsweredCallSpy = jest.spyOn(jabraService, 'deviceAnsweredCall'); // const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);

      deviceSignalsSubject.next({ type: 32, value: true } as any);
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

      deviceSignalsSubject.next({ type: 32, value: false } as any);
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
      };

      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to release the call lock, but it is not held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });

      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      deviceSignalsSubject.next({ type: 32, value: false } as any);
      expect(callControl.mute).toHaveBeenCalledWith(false);
      expect(callControl.hold).toHaveBeenCalledWith(false);
      expect(callControl.offHook).toHaveBeenCalledWith(false);
      expect(deviceEndedCallSpy).toHaveBeenCalled();
      expect(await callControl.releaseCallLock).toHaveBeenCalled();
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to release the call lock, but it is not held!'
      );
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
      };

      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType('Something went terribly wrong', ErrorType.UNEXPECTED_ERROR);
      });
      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      deviceSignalsSubject.next({ type: 32, value: false } as any);
      expect(callControl.mute).toHaveBeenCalledWith(false);
      expect(callControl.hold).toHaveBeenCalledWith(false);
      expect(callControl.offHook).toHaveBeenCalledWith(false);
      expect(deviceEndedCallSpy).toHaveBeenCalled();
      expect(await callControl.releaseCallLock).toHaveBeenCalled();
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        ErrorType.UNEXPECTED_ERROR,
        'Something went terribly wrong'
      );
    });

    it('properly handles hold call events passed in from headset', async () => {
      jabraService.callLock = true;
      const deviceHoldStatusChangedSpy = jest.spyOn(jabraService, 'deviceHoldStatusChanged');

      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);
      jabraService.activeConversationId = 'myConvo5521';

      deviceSignalsSubject.next({ type: 33, value: true } as any);
      expect(jabraService.isHeld).toBe(true);
      expect(callControl.hold).toHaveBeenCalledWith(true);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({
        holdRequested: true,
        code: 33,
        name: 'OnHold',
        conversationId: jabraService.activeConversationId
      });

      deviceSignalsSubject.next({ type: 35, value: true } as any);
      expect(jabraService.isHeld).toBe(false);
      expect(callControl.hold).toHaveBeenCalledWith(false);
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith({
        holdRequested: false,
        code: 35,
        name: 'ResumeCall',
        conversationId: jabraService.activeConversationId
      });
    });

    it('properly handles mute call events passed in from headset', async () => {
      jabraService.callLock = true;
      const deviceMuteChangedSpy = jest.spyOn(jabraService, 'deviceMuteChanged');

      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);
      jabraService.activeConversationId = 'myConvo555521';

      deviceSignalsSubject.next({ type: 47, value: true } as any);
      expect(jabraService.isMuted).toBe(true);
      expect(callControl.mute).toHaveBeenCalledWith(true);
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith({
        isMuted: true,
        code: 47,
        name: 'CallMuted',
        conversationId: jabraService.activeConversationId
      });

      deviceSignalsSubject.next({ type: 47, value: true } as any);
      expect(jabraService.isMuted).toBe(false);
      expect(callControl.mute).toHaveBeenCalledWith(false);
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith({
        isMuted: false,
        code: 47,
        name: 'CallUnmuted',
        conversationId: jabraService.activeConversationId
      });
    });

    it('properly handles reject call events passed in from headset with a successful callLock release', async () => {
      jabraService.callLock = true;
      const conversationId = 'convoId1234';
      jabraService.pendingConversationId = conversationId;

      const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);

      deviceSignalsSubject.next({ type: 65533, value: true } as any);
      expect(callControl.ring).toHaveBeenCalledWith(false);
      expect(deviceRejectedCallSpy).toHaveBeenCalledWith({ conversationId, name: 'REJECT_CALL' });
      expect(await callControl.releaseCallLock).toHaveBeenCalled();
      expect(jabraService.callLock).toBe(false);
    });

    it('properly handles reject call events passed in from headset with a failed callLock release', async () => {
      jabraService.callLock = true;
      const conversationId = 'convoId124234';
      jabraService.pendingConversationId = conversationId;

      const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);

      const exceptionWithType = (message, type) => {
        const error = new Error();
        error.message = message;
        (error as any).type = type;
        return error;
      };

      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to release the call lock, but it is not held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });

      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      deviceSignalsSubject.next({ type: 65533, value: true } as any);
      expect(callControl.ring).toHaveBeenCalledWith(false);
      expect(deviceRejectedCallSpy).toHaveBeenCalledWith({conversationId, name: 'REJECT_CALL'});
      expect(await callControl.releaseCallLock).toHaveBeenCalled();
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to release the call lock, but it is not held!'
      );
    });

    it('properly logs an error that is not related to call lock during reject call flow', async () => {
      jabraService.callLock = true;
      const conversationId = 'convoId1524';
      jabraService.pendingConversationId = conversationId;

      const deviceRejectedCallSpy = jest.spyOn(jabraService, 'deviceRejectedCall');

      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);

      const exceptionWithType = (message, type) => {
        const error = new Error();
        error.message = message;
        (error as any).type = type;
        return error;
      };

      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType('Something went terribly wrong', ErrorType.UNEXPECTED_ERROR);
      });

      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      deviceSignalsSubject.next({ type: 65533, value: true } as any);
      expect(callControl.ring).toHaveBeenCalledWith(false);
      expect(deviceRejectedCallSpy).toHaveBeenCalledWith({ conversationId, name: 'REJECT_CALL' });
      expect(await callControl.releaseCallLock).toHaveBeenCalled();
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        ErrorType.UNEXPECTED_ERROR,
        'Something went terribly wrong'
      );
    });

    it('properly logs a debug message if we do not have the callLock by the time we start the subscribing to processEvents', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService._processEvents(callControl as any);

      jabraService.callLock = false;

      const debugLoggerSpy = jest.spyOn(jabraService.logger, 'debug');
      deviceSignalsSubject.next({ type: 32, value: true } as any);
      expect(debugLoggerSpy).toHaveBeenCalledWith(
        'Currently not in possession of the Call Lock; Cannot react to Device Actions'
      );
    });
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
    });

    it('does not do anything if we dont own the callLock', () => {
      jabraService.callLock = false;
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;
      const muteResult = jabraService.setMute(true);
      expect(jabraService.isMuted).toBe(false);
      expect(callControl.mute).not.toHaveBeenCalled();
      expect(muteResult).resolves.toBe(undefined);
    });
  });

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
    });
    
    it('does not do anything if we dont own the callLock', () => {
      jabraService.callLock = false;
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;
      const holdResult = jabraService.setHold('123', true);
      expect(jabraService.isHeld).toBe(false);
      expect(callControl.hold).not.toHaveBeenCalled();
      expect(holdResult).resolves.toBe(undefined);
    });
  });

  describe('disconnect', () => {
    it('resets two connected flags after disconnecting', async () => {
      jabraService.isConnected = true;
      jabraService.isConnecting = true;
      const unsubscribeSpy = jest.fn();
      jabraService['headsetEventSubscription'] = {
        unsubscribe: unsubscribeSpy
      } as any;
      await jabraService.disconnect();
      expect(unsubscribeSpy).toHaveBeenCalled();
      expect(jabraService.isConnecting).toBe(false);
      expect(jabraService.isConnected).toBe(false);
    });

    it('should only change connection status if connecting or connected', async () => {
      const connectionSpy = jabraService['changeConnectionStatus'] = jest.fn();
      jabraService.isConnected = false;
      jabraService.isConnecting = false;
      jabraService['headsetEventSubscription'] = {
        unsubscribe: jest.fn()
      } as any;
      await jabraService.disconnect();

      expect(connectionSpy).not.toHaveBeenCalled();

      jabraService.isConnected = true;
      await jabraService.disconnect();
      expect(connectionSpy).toHaveBeenCalled();

      jabraService.isConnected = false;
      jabraService.isConnecting = false;
      await jabraService.disconnect();
      expect(connectionSpy).toHaveBeenCalled();
    });
  });

  describe('answerCall', () => {
    it('sends answer call event to headset', () => {
      jabraService.callLock = true;
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;
      jabraService.answerCall();
      expect(callControl.offHook).toHaveBeenCalledWith(true);
    });

    it('does not do anything if we dont own the callLock', () => {
      jabraService.callLock = false;
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;
      const answerCallResult = jabraService.answerCall();
      expect(callControl.offHook).not.toHaveBeenCalled();
      expect(answerCallResult).resolves.toBe(undefined);
    });
  });

  describe('incomingCall', () => {
    it('sends ring event based on flags after properly taking callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const callInfo = {
        conversationId: '123',
        contactName: 'Lee Moriarty',
      };
      callControl.takeCallLock.mockResolvedValue(true);
      await jabraService.incomingCall(callInfo);
      expect(jabraService.callLock).toBe(true);
      expect(callControl.ring).toHaveBeenCalledWith(true);
    });

    it('should do nothing if no calllock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;
      callControl.takeCallLock.mockResolvedValue(false);

      const callInfo = {
        conversationId: '123',
        contactName: 'Lee Moriarty',
      };
      await jabraService.incomingCall(callInfo);
      expect(jabraService.callLock).toBe(false);
      expect(callControl.ring).not.toHaveBeenCalled();
    });

    it('sends ring event based on flags after already having callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const callInfo = {
        conversationId: '456',
        contactName: 'Adam Cole',
      };
      callControl.takeCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to take the call lock, but it is already held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });
      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      await jabraService.incomingCall(callInfo);
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to take the call lock, but it is already held!'
      );
      expect(callControl.ring).toHaveBeenCalledWith(true);
    });

    it('handles unexpected error, unrelated to callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const callInfo = {
        conversationId: '789',
        contactName: 'Gene Ween',
      };
      callControl.takeCallLock.mockImplementation(() => {
        throw exceptionWithType('An actual error', ErrorType.UNEXPECTED_ERROR);
      });
      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.incomingCall(callInfo);
      expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'An actual error');
      expect(callControl.ring).not.toHaveBeenCalled();
    });
  });

  describe('outgoingCall', () => {
    it('sends offHook event after properly taking callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      jabraService.callControl = callControl as any;

      callControl.takeCallLock.mockResolvedValue(true);
      await jabraService.outgoingCall({ conversationId: 'myconvoid1' });
      expect(jabraService.callLock).toBe(true);
      expect(callControl.offHook).toHaveBeenCalledWith(true);
    });

    it('does nothing if callLock is false', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());
      callControl.takeCallLock.mockResolvedValue(false);
      jabraService.callControl = callControl as any;

      await jabraService.outgoingCall({ conversationId: 'myconvoid2' });
      expect(jabraService.callLock).toBe(false);
      expect(jabraService.activeConversationId).toBeFalsy()
      expect(callControl.offHook).not.toHaveBeenCalled();
    });

    it('sends ring event while already in possession of callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      callControl.takeCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to take the call lock, but it is already held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });
      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      await jabraService.outgoingCall({ conversationId: 'myconvoid2' });
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to take the call lock, but it is already held!'
      );
      expect(callControl.offHook).toHaveBeenCalledWith(true);
    });

    it('handles unexpected error, unrelated to callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      callControl.takeCallLock.mockImplementation(() => {
        throw exceptionWithType('An actual error', ErrorType.UNEXPECTED_ERROR);
      });
      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.outgoingCall({ conversationId: 'myconvoid3' });
      expect(errorLoggerSpy).toHaveBeenCalledWith(ErrorType.UNEXPECTED_ERROR, 'An actual error');
      expect(callControl.offHook).not.toHaveBeenCalled();
    });
  });

  describe('rejectCall', () => {
    it('properly sends ring events and releases call lock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      jabraService.callLock = true;
      await jabraService.rejectCall();
      expect(callControl.ring).toHaveBeenCalledWith(false);
      expect(callControl.releaseCallLock).toHaveBeenCalled();
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

    it('prints out message if not in possession of callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      await jabraService.rejectCall();
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Currently not in possession of the Call Lock; Cannot react to Device Actions'
      );
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

    it('properly handles flow when in possession of callLock', () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      jabraService.callLock = true;
      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to release the call lock, but it is not held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });
      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      jabraService.rejectCall();
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to release the call lock, but it is not held!'
      );
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

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
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        ErrorType.UNEXPECTED_ERROR,
        'Something much worse'
      );
    });
  });

  describe('endCall', () => {
    it('properly sends offHook events and releases call lock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();
      jabraService.activeConversationId = '123';

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      jabraService.callLock = true;
      await jabraService.endCall('123', false);
      expect(callControl.offHook).toHaveBeenCalledWith(false);
      expect(callControl.releaseCallLock).toHaveBeenCalled();
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
      expect(jabraService.activeConversationId).toBeNull();
    });

    it('properly resolves if another call is already in place', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      await jabraService.endCall('123', true);
      expect(callControl.offHook).not.toHaveBeenCalled();
    });

    it('prints out message if not in possession of callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      await jabraService.endCall('123', false);
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Currently not in possession of the Call Lock; Cannot react to Device Actions'
      );
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

    it('properly handles flow when in possession of callLock', () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      jabraService.callLock = true;
      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to release the call lock, but it is not held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });
      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      jabraService.endCall('123', false);
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to release the call lock, but it is not held!'
      );
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

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
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        ErrorType.UNEXPECTED_ERROR,
        'Something much worse'
      );
    });
  });

  describe('endAllCall', () => {
    it('properly sends offHook events and releases call lock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      jabraService.callLock = true;
      await jabraService.endAllCalls();
      expect(callControl.offHook).toHaveBeenCalledWith(false);
      expect(callControl.releaseCallLock).toHaveBeenCalled();
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

    it('prints out message if not in possession of callLock', async () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      await jabraService.endAllCalls();
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Currently not in possession of the Call Lock; Cannot react to Device Actions'
      );
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

    it('properly handles flow when in possession of callLock', () => {
      const deviceSignalsSubject = new Subject<ICallControlSignal>();

      const callControl = createMockCallControl(deviceSignalsSubject.asObservable());

      jabraService.callControl = callControl as any;

      jabraService.callLock = true;
      callControl.releaseCallLock.mockImplementation(() => {
        throw exceptionWithType(
          'Trying to release the call lock, but it is not held!',
          ErrorType.SDK_USAGE_ERROR
        );
      });
      const infoLoggerSpy = jest.spyOn(jabraService.logger, 'info');
      const resetStateSpy = jest.spyOn(jabraService, 'resetState');
      jabraService.endAllCalls();
      expect(infoLoggerSpy).toHaveBeenCalledWith(
        'Trying to release the call lock, but it is not held!'
      );
      expect(jabraService.callLock).toBe(false);
      expect(resetStateSpy).toHaveBeenCalled();
    });

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
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        ErrorType.UNEXPECTED_ERROR,
        'Something much worse'
      );
    });
  });

  describe('deviceInfo', () => {
    it('should return _deviceInfo', () => {
      const device: DeviceInfo = {
        ProductName: 'myJabra',
        deviceId: '123',
        attached: true,
      }
      jabraService._deviceInfo = device;

      expect(jabraService.deviceInfo).toBe(device);
    });
  });

  describe('deviceName', () => {
    it('should return the deviceName of the active device', () => {
      const device: DeviceInfo = {
        ProductName: 'myJabra',
        deviceName: 'myJabraName',
        deviceId: '123',
        attached: true,
      }
      jabraService._deviceInfo = device;

      expect(jabraService.deviceName).toBe(device.deviceName);
    });

    it('should return falsey value if no deviceInfo', () => {
      jabraService._deviceInfo = null;

      expect(jabraService.deviceName).toBeUndefined();
    });
  });

  describe('isDeviceAttached', () => {
    it('should return true if there is deviceInfo', () => {
      const device: DeviceInfo = {
        ProductName: 'myJabra',
        deviceName: 'myJabraName',
        deviceId: '123',
        attached: true,
      }
      jabraService._deviceInfo = device;
      expect(jabraService.isDeviceAttached).toEqual(true);
    });

    it('should return false if no deviceInfo', () => {
      jabraService._deviceInfo = null;
      expect(jabraService.isDeviceAttached).toEqual(false);
    });
  });

  describe('isSupported', () => {
    it('should return true if proper values are met', () => {
      expect(jabraService.isSupported()).toBe(true);
    });

    it('should return false if proper values are not met', () => {
      Object.defineProperty(window, '_HostedContextFunctions', { get: () => true });
      expect(jabraService.isSupported()).toBe(false);
    });
  });

  describe('isDeviceInList', () => {
    it('should return false if device is undefined', () => {
      expect(jabraService.isDeviceInList(undefined, 'Test Label 123')).toBe(false);
    });

    it('should return false if name within device is undefined', () => {
      const testDevice = {
        type: 'Test',
        id: '123',
      };
      expect(jabraService.isDeviceInList(testDevice as any, 'Test Label 123')).toBe(false);
    });
    
    it('should return true if all expected values are present and the label matches', () => {
      const testDevice = {
        type: 'Test',
        id: '123',
        name: 'Test Label 123',
      };
      expect(jabraService.isDeviceInList(testDevice as any, 'test label 123')).toBe(true);
    });
  });

  describe('resetHeadsetState', () => {
    it('should handle reset being called without a callControl', async () => {
      await jabraService.resetHeadsetState();

      // if the above didn't blow up, we are happy
      expect(true).toBeTruthy();
    });

    it('should reset state if there is a callControl', async () => {
      const callControl = createMockCallControl(null as any);
      jabraService.callControl = callControl as any;

      await jabraService.resetHeadsetState();
      expect(callControl.hold).toHaveBeenCalledWith(false);
      expect(callControl.mute).toHaveBeenCalledWith(false);
      expect(callControl.offHook).toHaveBeenCalledWith(false);
    });
  });

  describe('getDeviceFromWebhid', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return matching value from deviceList', async () => {
      const sub = new BehaviorSubject([mockDevice1]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const requestSpy = jabraService.requestWebHidPermissions = jest.fn();

      const completionSpy = jest.fn();
      const devicePromise = jabraService.getDeviceFromWebhid(mockDevice2.name)
        .then((device) => {
          completionSpy();
          return device;
        });

      await flushPromises();
      expect(requestSpy).toHaveBeenCalled();
      expect(completionSpy).not.toBeCalled();

      sub.next([mockDevice1, mockDevice2]);

      const device = await devicePromise;
      expect(device).toBe(mockDevice2);
    });

    it('should timeout after 30 seconds', async () => {
      jest.useFakeTimers();

      const sub = new BehaviorSubject([mockDevice1]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const requestSpy = jabraService.requestWebHidPermissions = jest.fn();

      const devicePromise = jabraService.getDeviceFromWebhid(mockDevice2.name);

      await flushPromises();
      expect(requestSpy).toHaveBeenCalled();

      jest.advanceTimersByTime(30100);

      await expect(devicePromise).rejects.toThrow('not granted WebHID permissions');
    });

    it('should log random error', async () => {
      const sub = new BehaviorSubject([mockDevice1]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const requestSpy = jabraService.requestWebHidPermissions = jest.fn();

      const devicePromise = jabraService.getDeviceFromWebhid(mockDevice2.name);

      await flushPromises();
      expect(requestSpy).toHaveBeenCalled();
      
      sub.error(new Error('random error'))

      await expect(devicePromise).rejects.toThrow('random error')
    })
  });
  
  describe('getPreviouslyConnectedDevice', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return matching value from deviceList', async () => {
      const sub = new BehaviorSubject([]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const completionSpy = jest.fn();
      const devicePromise = jabraService.getPreviouslyConnectedDevice(mockDevice2.name)
        .then((device) => {
          completionSpy();
          return device;
        });

      await flushPromises();
      expect(completionSpy).not.toBeCalled();

      sub.next([mockDevice1, mockDevice2]);

      const device = await devicePromise;
      expect(device).toBe(mockDevice2);
    });

    it('should return null', async () => {
      const sub = new BehaviorSubject([mockDevice1]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const completionSpy = jest.fn();
      const devicePromise = jabraService.getPreviouslyConnectedDevice(mockDevice2.name)
        .then((device) => {
          completionSpy();
          return device;
        });

      await flushPromises();
      expect(completionSpy).not.toBeCalled();

      sub.next([mockDevice1, mockDevice2]);

      const device = await devicePromise;
      expect(device).toBeNull();
    });

    it('should timeout after 3 seconds', async () => {
      jest.useFakeTimers();

      const sub = new BehaviorSubject([]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const devicePromise = jabraService.getPreviouslyConnectedDevice(mockDevice2.name);

      await flushPromises();

      jest.advanceTimersByTime(3100);

      const device = await devicePromise;
      expect(device).toBeFalsy();
    });

    it('should log random error', async () => {
      const sub = new BehaviorSubject([]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const devicePromise = jabraService.getPreviouslyConnectedDevice(mockDevice2.name);

      await flushPromises();
      
      sub.error(new Error('random error'))

      await expect(devicePromise).rejects.toThrow('random error')
    });
  });
});
