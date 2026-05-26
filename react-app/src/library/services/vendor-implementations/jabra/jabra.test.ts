import { IDevice } from '@gnaudio/jabra-js';
import { BroadcastChannel } from 'broadcast-channel';
import 'regenerator-runtime';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import DeviceInfo from '../../../types/device-info';
import JabraService from './jabra';
import { MockJabraSdk } from './mock-jabra-sdk';

jest.mock('broadcast-channel');

const flushPromises = () => Promise.resolve();

const createMockEasyCallControl = () => {
  return {
    startCall: jest.fn().mockResolvedValue(undefined),
    endCall: jest.fn().mockResolvedValue(undefined),
    signalIncomingCall: jest.fn().mockReturnValue(new Promise(() => { /* never resolves */ })),
    acceptIncomingCall: jest.fn().mockResolvedValue(undefined),
    rejectIncomingCall: jest.fn(),
    mute: jest.fn().mockResolvedValue(undefined),
    unmute: jest.fn(),
    hold: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    teardown: jest.fn(),
    muteState: new Subject(),
    holdState: new Subject(),
    ongoingCalls: new Subject(),
    swapRequest: new Subject(),
    onDisconnect: new Subject(),
    ringState: new Subject(),
    device: { name: 'Mock Jabra' },
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
    const deviceList = [mockDevice1] as IDevice[];
    subject = new BehaviorSubject(deviceList);
  }
  return new MockJabraSdk(subject);
};

describe('JabraService', () => {
  let jabraService: JabraService;
  (window.navigator as any) = { ...(window.navigator as any), hid: {
    getDevices: jest.fn().mockResolvedValue([])
  } };
  Object.defineProperty(window.navigator, 'locks', { get: () => ({}) });
  (window as any).BroadcastChannel = BroadcastChannel;

  beforeEach(() => {
    jabraService = JabraService.getInstance({ logger: console, createNew: true });
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
      expect(jabraService.deviceLabelMatchesVendor('Test Jabra Label')).toBe(true);
      expect(jabraService.deviceLabelMatchesVendor('Something totally different')).toBe(false);
    });

    it('clears mute and hold flags when the active call ends', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'flagged', isMuted: true, isHeld: true };
      jabraService.isMuted = true;
      jabraService.isHeld = true;

      await jabraService.endCall('flagged', false);

      expect(jabraService.activeCall).toBeNull();
      expect(jabraService.isMuted).toBe(false);
      expect(jabraService.isHeld).toBe(false);
    });
  });

  describe('initial connection', () => {
    it('should use existing jabraSdk and connect', async () => {
      jabraService.jabraSdk = await initializeSdk() as any;
      const createEccSpy = jest.spyOn(jabraService, 'createEasyCallControl')
        .mockResolvedValue(createMockEasyCallControl() as any);

      const testLabel = 'test label 123';
      const initSdkSpy = jabraService['initializeJabraSdk'] = jest.fn();
      await jabraService.connect(testLabel);
      expect(initSdkSpy).not.toHaveBeenCalled();
      expect(createEccSpy).toHaveBeenCalled();
      expect(jabraService.isConnected).toBe(true);
      expect(jabraService.isConnecting).toBe(false);
    });

    it('should init jabra sdk and connect', async () => {
      const createEccSpy = jest.spyOn(jabraService, 'createEasyCallControl')
        .mockResolvedValue(createMockEasyCallControl() as any);
      const testLabel = 'test label 123';

      await jabraService.connect(testLabel);
      expect(createEccSpy).toHaveBeenCalled();
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
      jest.spyOn(jabraService, 'deviceHasPermissions').mockResolvedValue(true);
      jest.spyOn(jabraService, 'createEasyCallControl').mockResolvedValue(createMockEasyCallControl() as any);

      await jabraService.connect(mockDevice2.name);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('should attempt to connect with previouslyConnectedDevice but timeout', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jest.spyOn(jabraService, 'createEasyCallControl').mockResolvedValue(createMockEasyCallControl() as any);
      jest.useFakeTimers();
      jest.spyOn(jabraService, 'deviceHasPermissions').mockResolvedValue(true);
      await jabraService.connect(mockDevice2.name);
      await flushPromises();
      jest.advanceTimersByTime(15005);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('should connect with webhidRequest', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jest.spyOn(jabraService, 'getPreviouslyConnectedDevice').mockResolvedValue(null);
      const webhidSpy = jest.spyOn(jabraService, 'getDeviceFromWebhid').mockResolvedValue(mockDevice2 as any);
      jest.spyOn(jabraService, 'createEasyCallControl').mockResolvedValue(createMockEasyCallControl() as any);

      await jabraService.connect(mockDevice2.name);
      expect(webhidSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('should fail to connect and set statuses accordingly', async () => {
      const statusChangeSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jest.spyOn(jabraService, 'getPreviouslyConnectedDevice').mockResolvedValue(null);
      const webhidSpy = jest.spyOn(jabraService, 'getDeviceFromWebhid').mockRejectedValue({});

      await jabraService.connect(mockDevice2.name);
      expect(webhidSpy).toHaveBeenCalled();
      expect(statusChangeSpy).lastCalledWith({ isConnected: false, isConnecting: false });
    });
  });

  describe('setMute', () => {
    it('properly sends the event to the headset and updates the state', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'active-call', isMuted: false, isHeld: false };

      await jabraService.setMute(true);
      expect(jabraService.isMuted).toBe(true);
      expect(mockEcc.mute).toHaveBeenCalled();

      await jabraService.setMute(false);
      expect(jabraService.isMuted).toBe(false);
      expect(mockEcc.unmute).toHaveBeenCalled();
    });

    it('does not do anything if there is no active call', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = null;

      await jabraService.setMute(true);
      expect(jabraService.isMuted).toBe(false);
      expect(mockEcc.mute).not.toHaveBeenCalled();
    });
  });

  describe('setHold', () => {
    it('properly sends the event to the headset and updates the state', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'active-call', isMuted: false, isHeld: false };

      await jabraService.setHold('123', true);
      expect(jabraService.isHeld).toBe(true);
      expect(mockEcc.hold).toHaveBeenCalled();

      await jabraService.setHold('123', false);
      expect(jabraService.isHeld).toBe(false);
      expect(mockEcc.resume).toHaveBeenCalled();
    });

    it('does not do anything if there is no active call', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = null;

      await jabraService.setHold('123', true);
      expect(jabraService.isHeld).toBe(false);
      expect(mockEcc.hold).not.toHaveBeenCalled();
    });
  });

  describe('answerCall', () => {
    it('calls acceptIncomingCall when the pending call was already signaled (no prior active)', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.pendingCall = { conversationId: '1234', isOutbound: false, isSignaled: true };

      await jabraService.answerCall('1234');
      expect(mockEcc.acceptIncomingCall).toHaveBeenCalled();
      expect(mockEcc.startCall).not.toHaveBeenCalled();
      expect(jabraService.activeCall?.conversationId).toBe('1234');
      expect(jabraService.pendingCall).toBeNull();
    });

    it('uses endCall+startCall for call-waiting path (active exists, pending not signaled)', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      jabraService.pendingCall = { conversationId: 'B', isOutbound: false, isSignaled: false };

      await jabraService.answerCall('B');

      expect(mockEcc.endCall).toHaveBeenCalled();
      expect(mockEcc.startCall).toHaveBeenCalled();
      expect(mockEcc.acceptIncomingCall).not.toHaveBeenCalled();
      expect(jabraService.activeCall?.conversationId).toBe('B');
      expect(jabraService.pendingCall).toBeNull();
    });

    it('uses startCall only when no prior active and no signaled pending', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      // No pendingCall, no activeCall — fallback path with the arg directly
      await jabraService.answerCall('arg-only');

      expect(mockEcc.startCall).toHaveBeenCalled();
      expect(mockEcc.endCall).not.toHaveBeenCalled();
      expect(mockEcc.acceptIncomingCall).not.toHaveBeenCalled();
      expect(jabraService.activeCall?.conversationId).toBe('arg-only');
    });

    it('logs debug when the call-waiting endCall fails (cleanup)', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.endCall.mockRejectedValue(new Error('endCall boom'));
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      jabraService.pendingCall = { conversationId: 'B', isOutbound: false, isSignaled: false };
      const debugSpy = jest.spyOn(jabraService.logger, 'debug');

      await jabraService.answerCall('B');

      expect(debugSpy).toHaveBeenCalledWith('answerCall: endCall cleanup', expect.any(Error));
      // startCall still runs so the new call comes up
      expect(mockEcc.startCall).toHaveBeenCalled();
      expect(jabraService.activeCall?.conversationId).toBe('B');
    });

    it('does nothing if easyCallControl is not available', async () => {
      jabraService.easyCallControl = null;
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.answerCall('1234');
      expect(warnSpy).toHaveBeenCalledWith('EasyCallControl not available; cannot answer call');
    });

    it('answerCall with autoAnswer sets pending call state and uses startCall (no SDK signal yet)', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;

      await jabraService.answerCall('1234', true);
      // autoAnswer sets isSignaled: false → call-waiting path: startCall, not acceptIncomingCall
      expect(mockEcc.startCall).toHaveBeenCalled();
      expect(mockEcc.acceptIncomingCall).not.toHaveBeenCalled();
      expect(jabraService.activeCall?.conversationId).toBe('1234');
    });

    it('handles error from acceptIncomingCall (signaled path)', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.acceptIncomingCall.mockRejectedValue(new Error('No incoming call pending'));
      jabraService.easyCallControl = mockEcc as any;
      jabraService.pendingCall = { conversationId: '789', isOutbound: false, isSignaled: true };

      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.answerCall('789');
      expect(errorLoggerSpy).toHaveBeenCalledWith('Failed to answer call', expect.any(Error));
    });
  });

  describe('incomingCall', () => {
    it('calls signalIncomingCall and sets pending state with isSignaled=true', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;

      const callInfo = { conversationId: '123', contactName: 'Lee Moriarty' };
      await jabraService.incomingCall(callInfo);
      expect(mockEcc.signalIncomingCall).toHaveBeenCalledWith(120000);
      expect(jabraService.pendingCall?.conversationId).toBe('123');
      expect(jabraService.pendingCall?.isOutbound).toBe(false);
      expect(jabraService.pendingCall?.isSignaled).toBe(true);
    });

    it('defers signalIncomingCall when an active call exists (call-waiting)', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      const infoSpy = jest.spyOn(jabraService.logger, 'info');

      await jabraService.incomingCall({ conversationId: 'B', contactName: 'Caller B' });

      expect(mockEcc.signalIncomingCall).not.toHaveBeenCalled();
      expect(jabraService.pendingCall?.conversationId).toBe('B');
      expect(jabraService.pendingCall?.isSignaled).toBe(false);
      expect(infoSpy).toHaveBeenCalledWith(
        'incomingCall: active call exists; deferring headset ring until it ends',
        expect.objectContaining({ activeConversationId: 'A', incomingConversationId: 'B' })
      );
    });

    it('does nothing if easyCallControl is not available', async () => {
      jabraService.easyCallControl = null;
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.incomingCall({ conversationId: '123', contactName: 'Test' });
      expect(warnSpy).toHaveBeenCalledWith('EasyCallControl not available; cannot handle incoming call');
    });

    it('emits deviceAnsweredCall when signalIncomingCall resolves true', async () => {
      const deviceAnsweredSpy = jest.spyOn(jabraService, 'deviceAnsweredCall');
      const mockEcc = createMockEasyCallControl();
      mockEcc.signalIncomingCall.mockResolvedValue(true);
      jabraService.easyCallControl = mockEcc as any;

      await jabraService.incomingCall({ conversationId: '456', contactName: 'Adam Cole' });
      await Promise.resolve();
      await Promise.resolve();
      expect(deviceAnsweredSpy).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: '456' })
      );
      expect(jabraService.activeCall?.conversationId).toBe('456');
    });

    it('emits deviceRejectedCall when signalIncomingCall resolves false', async () => {
      const deviceRejectedSpy = jest.spyOn(jabraService, 'deviceRejectedCall');
      const mockEcc = createMockEasyCallControl();
      mockEcc.signalIncomingCall.mockResolvedValue(false);
      jabraService.easyCallControl = mockEcc as any;

      await jabraService.incomingCall({ conversationId: '789', contactName: 'Gene Ween' });
      await Promise.resolve();
      await Promise.resolve();
      expect(deviceRejectedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: '789' })
      );
      expect(jabraService.pendingCall).toBeNull();
    });

    it('ends previous active call when signalIncomingCall resolves true with active present (race-case)', async () => {
      const deviceAnsweredSpy = jest.spyOn(jabraService, 'deviceAnsweredCall');
      const deviceEndedSpy = jest.spyOn(jabraService, 'deviceEndedCall');
      const mockEcc = createMockEasyCallControl();
      // Hold the signalIncomingCall promise so we can simulate a race: set
      // activeCall AFTER signalIncomingCall is in flight but BEFORE it resolves.
      let resolveSignal!: (v: boolean) => void;
      mockEcc.signalIncomingCall.mockReturnValue(new Promise<boolean>((r) => { resolveSignal = r; }));
      jabraService.easyCallControl = mockEcc as any;

      await jabraService.incomingCall({ conversationId: 'B', contactName: 'Caller B' });
      // Simulate a race where an active call appeared between signal-time and resolution
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      resolveSignal(true);
      await flushPromises();
      await flushPromises();

      expect(deviceEndedSpy).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'A' }));
      expect(deviceAnsweredSpy).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'B' }));
      expect(jabraService.activeCall?.conversationId).toBe('B');
    });
  });

  describe('outgoingCall', () => {
    it('calls startCall on easyCallControl and sets state', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;

      await jabraService.outgoingCall({ conversationId: 'myconvoid1' });
      expect(mockEcc.startCall).toHaveBeenCalled();
      expect(jabraService.activeCall?.conversationId).toBe('myconvoid1');
    });

    it('does nothing if easyCallControl is not available', async () => {
      jabraService.easyCallControl = null;
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.outgoingCall({ conversationId: 'myconvoid2' });
      expect(warnSpy).toHaveBeenCalled();
      expect(jabraService.activeCall).toBeFalsy();
    });

    it('does nothing if already in an active call', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'existing-call', isMuted: false, isHeld: false };

      await jabraService.outgoingCall({ conversationId: 'new-call' });
      expect(mockEcc.startCall).not.toHaveBeenCalled();
    });

    it('handles error from startCall', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.startCall.mockRejectedValue(new Error('device locked'));
      jabraService.easyCallControl = mockEcc as any;

      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.outgoingCall({ conversationId: 'myconvoid3' });
      expect(errorLoggerSpy).toHaveBeenCalledWith('Failed to start outgoing call', expect.any(Error));
    });
  });

  describe('rejectCall', () => {
    it('calls rejectIncomingCall when the pending call was signaled', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.pendingCall = { conversationId: 'convo123', isOutbound: false, isSignaled: true };

      await jabraService.rejectCall();
      expect(mockEcc.rejectIncomingCall).toHaveBeenCalled();
      expect(jabraService.pendingCall).toBeNull();
    });

    it('only clears local state when the pending call was not signaled (call-waiting)', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      jabraService.pendingCall = { conversationId: 'B', isOutbound: false, isSignaled: false };
      const infoSpy = jest.spyOn(jabraService.logger, 'info');

      await jabraService.rejectCall();

      expect(mockEcc.rejectIncomingCall).not.toHaveBeenCalled();
      expect(jabraService.pendingCall).toBeNull();
      // Active call is not disturbed
      expect(jabraService.activeCall?.conversationId).toBe('A');
      expect(infoSpy).toHaveBeenCalledWith(
        'rejectCall: pending was not signaled to headset, clearing locally',
        { conversationId: 'B' }
      );
    });

    it('returns early when there is no pending call', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      const infoSpy = jest.spyOn(jabraService.logger, 'info');

      await jabraService.rejectCall();

      expect(mockEcc.rejectIncomingCall).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith('rejectCall: no pending call to reject');
    });

    it('does nothing if easyCallControl is not available', async () => {
      jabraService.easyCallControl = null;
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.rejectCall();
      expect(warnSpy).toHaveBeenCalledWith('EasyCallControl not available; cannot reject call');
    });

    it('handles error from rejectIncomingCall', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.rejectIncomingCall.mockImplementation(() => { throw new Error('No incoming call'); });
      jabraService.easyCallControl = mockEcc as any;
      jabraService.pendingCall = { conversationId: 'convo123', isOutbound: false, isSignaled: true };

      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.rejectCall();
      expect(errorLoggerSpy).toHaveBeenCalledWith('Failed to reject call', expect.any(Error));
    });
  });

  describe('endCall', () => {
    it('calls endCall on easyCallControl and clears state', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: '123', isMuted: false, isHeld: false };

      await jabraService.endCall('123', false);
      expect(mockEcc.endCall).toHaveBeenCalled();
      expect(jabraService.activeCall).toBeNull();
    });

    it('properly resolves if another call is already in place', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;

      await jabraService.endCall('123', true);
      expect(mockEcc.endCall).not.toHaveBeenCalled();
    });

    it('does nothing if easyCallControl is not available', async () => {
      jabraService.easyCallControl = null;
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.endCall('123', false);
      expect(warnSpy).toHaveBeenCalledWith('EasyCallControl not available; cannot end call');
    });

    it('handles error from endCall', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.endCall.mockRejectedValue(new Error('Something went wrong'));
      jabraService.easyCallControl = mockEcc as any;

      const errorLoggerSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.endCall('123', false);
      expect(errorLoggerSpy).toHaveBeenCalledWith('Failed to end call', expect.any(Error));
    });
  });

  describe('endAllCalls', () => {
    it('calls endCall on easyCallControl and clears state', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'active123', isMuted: false, isHeld: false };

      await jabraService.endAllCalls();
      expect(mockEcc.endCall).toHaveBeenCalled();
      expect(jabraService.activeCall).toBeNull();
    });

    it('does nothing if easyCallControl is not available', async () => {
      jabraService.easyCallControl = null;
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.endAllCalls();
      expect(warnSpy).toHaveBeenCalledWith('EasyCallControl not available; cannot end all calls');
    });

    it('handles error from endCall gracefully', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.endCall.mockRejectedValue(new Error('Something went wrong'));
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'active-call', isMuted: false, isHeld: false };

      // Should not throw — errors are handled internally
      await jabraService.endAllCalls();
      expect(jabraService.activeCall).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('tears down easyCallControl and resets state', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      jabraService.activeCall = { conversationId: 'testId123', isMuted: false, isHeld: false };
      jabraService.isConnected = true;

      await jabraService.disconnect();
      expect(mockEcc.teardown).toHaveBeenCalled();
      expect(jabraService.activeCall).toBeNull();
      expect(jabraService.isConnected).toBe(false);
    });

    it('should only change connection status if connecting or connected', async () => {
      const connectionSpy = jest.spyOn(jabraService, 'changeConnectionStatus');
      jabraService.isConnected = false;
      jabraService.isConnecting = false;

      await jabraService.disconnect();
      expect(connectionSpy).not.toHaveBeenCalled();

      jabraService.isConnected = true;
      await jabraService.disconnect();
      expect(connectionSpy).toHaveBeenCalled();
    });

    it('handles teardown failure gracefully', async () => {
      const mockEcc = createMockEasyCallControl();
      mockEcc.teardown.mockImplementation(() => { throw new Error('teardown failed'); });
      jabraService.easyCallControl = mockEcc as any;
      jabraService.isConnected = true;

      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      await jabraService.disconnect();
      expect(warnSpy).toHaveBeenCalledWith('disconnect: EasyCallControl teardown failed', expect.any(Error));
      expect(jabraService.isConnected).toBe(false);
    });

    it('unsubscribes from all ECC observables on disconnect', async () => {
      const mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
      // Populate subscriptions by wiring up the ECC handlers
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);
      const subs = jabraService['eccSubscriptions'];
      expect(subs.length).toBeGreaterThan(0);
      const unsubSpies = subs.map((s) => jest.spyOn(s, 'unsubscribe'));

      await jabraService.disconnect();

      unsubSpies.forEach((spy) => expect(spy).toHaveBeenCalled());
      expect(jabraService['eccSubscriptions']).toHaveLength(0);
    });
  });

  describe('deviceInfo', () => {
    it('should return _deviceInfo', () => {
      const device: DeviceInfo = { ProductName: 'myJabra', deviceId: '123', attached: true };
      jabraService._deviceInfo = device;
      expect(jabraService.deviceInfo).toBe(device);
    });
  });

  describe('deviceName', () => {
    it('should return the deviceName of the active device', () => {
      const device: DeviceInfo = { ProductName: 'myJabra', deviceName: 'myJabraName', deviceId: '123', attached: true };
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
      jabraService._deviceInfo = { ProductName: 'myJabra', deviceName: 'myJabraName', deviceId: '123', attached: true };
      expect(jabraService.isDeviceAttached).toEqual(true);
    });

    it('should return false if no deviceInfo', () => {
      jabraService._deviceInfo = null;
      expect(jabraService.isDeviceAttached).toEqual(false);
    });
  });

  describe('resetHeadsetStateForCall', () => {
    it('should call the rejectCall function', () => {
      jabraService.easyCallControl = createMockEasyCallControl() as any;
      const rejectSpy = jest.spyOn(jabraService, 'rejectCall');
      jabraService.resetHeadsetStateForCall();
      expect(rejectSpy).toHaveBeenCalled();
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
      expect(jabraService.isDeviceInList({ type: 'Test', id: '123' } as any, 'Test Label 123')).toBe(false);
    });

    it('should return true if all expected values are present and the label matches', () => {
      expect(jabraService.isDeviceInList({ type: 'Test', id: '123', name: 'Test Label 123' } as any, 'test label 123')).toBe(true);
    });
  });

  describe('getDeviceFromWebhid', () => {
    afterEach(() => { jest.useRealTimers(); });

    it('should return matching value from deviceList', async () => {
      const sub = new BehaviorSubject([mockDevice1]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;
      const requestSpy = jabraService.requestWebHidPermissions = jest.fn();

      const completionSpy = jest.fn();
      const devicePromise = jabraService.getDeviceFromWebhid(mockDevice2.name).then((device) => { completionSpy(); return device; });

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
      jabraService.requestWebHidPermissions = jest.fn();

      const devicePromise = jabraService.getDeviceFromWebhid(mockDevice2.name);
      await flushPromises();
      jest.advanceTimersByTime(30100);
      await expect(devicePromise).rejects.toThrow('not granted WebHID permissions');
    });

    it('rethrows non-timeout errors unchanged', async () => {
      jabraService.jabraSdk = { deviceList: throwError(() => new Error('webhid kaboom')) } as any;
      jabraService.requestWebHidPermissions = jest.fn();
      await expect(jabraService.getDeviceFromWebhid('whatever')).rejects.toThrow('webhid kaboom');
    });
  });

  describe('deviceHasPermissions', () => {
    Object.defineProperty(window.navigator, 'hid', {
      get: () => ({ getDevices: () => [{ productName: 'test-device' } as any] })
    });

    it('should return true if passed in label exists in getDevices', async () => {
      const result = await jabraService.deviceHasPermissions('test-device');
      expect(result).toBe(true);
    });
  });

  describe('getPreviouslyConnectedDevice', () => {
    afterEach(() => { jest.useRealTimers(); });

    it('should return matching value from deviceList', async () => {
      const sub = new BehaviorSubject([]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const completionSpy = jest.fn();
      const devicePromise = jabraService.getPreviouslyConnectedDevice(mockDevice2.name).then((device) => { completionSpy(); return device; });

      await flushPromises();
      expect(completionSpy).not.toBeCalled();

      sub.next([mockDevice1, mockDevice2]);
      const device = await devicePromise;
      expect(device).toBe(mockDevice2);
    });

    it('should return null on timeout', async () => {
      const sub = new BehaviorSubject([mockDevice1]);
      jabraService.jabraSdk = await initializeSdk(sub as any) as any;

      const device = await jabraService.getPreviouslyConnectedDevice(mockDevice2.name);
      expect(device).toBeNull();
    });

    it('should rethrow non-timeout / non-empty errors', async () => {
      jabraService.jabraSdk = { deviceList: throwError(() => new Error('boom')) } as any;
      await expect(jabraService.getPreviouslyConnectedDevice('whatever')).rejects.toThrow('boom');
    });
  });

  describe('ECC observable handlers', () => {
    let mockEcc: ReturnType<typeof createMockEasyCallControl>;

    beforeEach(() => {
      mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
    });

    it('logs ring state changes', () => {
      const infoSpy = jest.spyOn(jabraService.logger, 'info');
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);
      (mockEcc.ringState as Subject<any>).next(true);
      expect(infoSpy).toHaveBeenCalledWith('ECC ringState changed', { ringing: true });
    });

    it('emits deviceEndedCall when ongoingCalls drops to 0 with an active call', () => {
      const deviceEndedSpy = jest.spyOn(jabraService, 'deviceEndedCall');
      jabraService.activeCall = { conversationId: 'live', isMuted: false, isHeld: false };
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      (mockEcc.ongoingCalls as Subject<any>).next(0);
      expect(deviceEndedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'CallOnHook', conversationId: 'live' })
      );
      expect(jabraService.activeCall).toBeNull();
    });

    it('ignores ongoingCalls events that do not drop to 0 or when no active call', () => {
      const deviceEndedSpy = jest.spyOn(jabraService, 'deviceEndedCall');
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      // No active call → ignored even if count drops to 0
      (mockEcc.ongoingCalls as Subject<any>).next(0);
      expect(deviceEndedSpy).not.toHaveBeenCalled();

      // Active call present but count > 0 → ignored (multi-call SDK; we only react to 0)
      jabraService.activeCall = { conversationId: 'live', isMuted: false, isHeld: false };
      (mockEcc.ongoingCalls as Subject<any>).next(1);
      expect(deviceEndedSpy).not.toHaveBeenCalled();
    });

    it('auto-rings a deferred pending call when ongoingCalls drops to 0', () => {
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      jabraService.pendingCall = { conversationId: 'B', isOutbound: false, isSignaled: false };
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      (mockEcc.ongoingCalls as Subject<any>).next(0);

      expect(mockEcc.signalIncomingCall).toHaveBeenCalledWith(120000);
      // The handler marks isSignaled=true so subsequent active-end events don't re-ring.
      expect(jabraService.pendingCall?.isSignaled).toBe(true);
    });

    it('does not auto-ring when pending was already signaled', () => {
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      jabraService.pendingCall = { conversationId: 'B', isOutbound: false, isSignaled: true };
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      (mockEcc.ongoingCalls as Subject<any>).next(0);

      expect(mockEcc.signalIncomingCall).not.toHaveBeenCalled();
    });

    it('does not auto-ring when there is no pending call', () => {
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      (mockEcc.ongoingCalls as Subject<any>).next(0);

      expect(mockEcc.signalIncomingCall).not.toHaveBeenCalled();
    });

    it('suppresses deviceEndedCall when the consumer initiated the end (answerCall call-waiting branch)', () => {
      const deviceEndedSpy = jest.spyOn(jabraService, 'deviceEndedCall');
      jabraService.activeCall = { conversationId: 'A', isMuted: false, isHeld: false };
      // Simulate the state set by `answerCall` just before awaiting endCall().
      (jabraService as any).suppressNextOngoingCallsEnd = true;
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      (mockEcc.ongoingCalls as Subject<any>).next(0);

      expect(deviceEndedSpy).not.toHaveBeenCalled();
      expect(jabraService.activeCall).toBeNull();
      // Flag is consumed so subsequent headset-initiated ends still emit.
      expect((jabraService as any).suppressNextOngoingCallsEnd).toBe(false);
    });

    it('muteState handler ignores events with no active call or when state is unchanged', () => {
      const deviceMuteSpy = jest.spyOn(jabraService, 'deviceMuteChanged');
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      // First emission is the initial value — always skipped
      (mockEcc.muteState as Subject<any>).next(0); // MuteState.NOT_MUTED
      // Second emission with no active call → ignored
      (mockEcc.muteState as Subject<any>).next(1); // MuteState.MUTED
      expect(deviceMuteSpy).not.toHaveBeenCalled();

      // Active call with state matching current isMuted → also ignored
      jabraService.activeCall = { conversationId: 'live', isMuted: false, isHeld: false };
      (mockEcc.muteState as Subject<any>).next(0); // NOT_MUTED — matches current
      expect(deviceMuteSpy).not.toHaveBeenCalled();
    });

    it('holdState handler ignores events with no active call or when state is unchanged', () => {
      const deviceHoldSpy = jest.spyOn(jabraService, 'deviceHoldStatusChanged');
      jabraService['_subscribeToEccEvents'](jabraService.easyCallControl);

      // First emission is the initial value — always skipped
      (mockEcc.holdState as Subject<any>).next(0); // HoldState.NOT_ON_HOLD
      // Second emission with no active call → ignored
      (mockEcc.holdState as Subject<any>).next(1); // HoldState.ON_HOLD
      expect(deviceHoldSpy).not.toHaveBeenCalled();

      // Active call with state matching current isHeld → also ignored
      jabraService.activeCall = { conversationId: 'live', isMuted: false, isHeld: false };
      (mockEcc.holdState as Subject<any>).next(0); // NOT_ON_HOLD — matches current
      expect(deviceHoldSpy).not.toHaveBeenCalled();
    });
  });

  describe('error path coverage', () => {
    let mockEcc: ReturnType<typeof createMockEasyCallControl>;

    beforeEach(() => {
      mockEcc = createMockEasyCallControl();
      jabraService.easyCallControl = mockEcc as any;
    });

    it('setMute logs an error when easyCallControl.mute() rejects', async () => {
      mockEcc.mute.mockRejectedValue(new Error('mute boom'));
      jabraService.activeCall = { conversationId: 'c1', isMuted: false, isHeld: false };
      const errorSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.setMute(true);
      expect(errorSpy).toHaveBeenCalledWith('Failed to set mute', expect.any(Error));
    });

    it('setHold logs an error when easyCallControl.hold() rejects', async () => {
      mockEcc.hold.mockRejectedValue(new Error('hold boom'));
      jabraService.activeCall = { conversationId: 'c1', isMuted: false, isHeld: false };
      const errorSpy = jest.spyOn(jabraService.logger, 'error');
      await jabraService.setHold('c1', true);
      expect(errorSpy).toHaveBeenCalledWith('Failed to set hold', expect.any(Error));
    });

    it('incomingCall ignores a late signalIncomingCall resolution when pendingCall has changed', async () => {
      mockEcc.signalIncomingCall.mockResolvedValue(true);
      const deviceAnsweredSpy = jest.spyOn(jabraService, 'deviceAnsweredCall');
      const infoSpy = jest.spyOn(jabraService.logger, 'info');

      const incoming = jabraService.incomingCall({ conversationId: 'race-1', contactName: 'X' });
      // Simulate the call being cleared by another flow (e.g. endAllCalls) before .then fires
      jabraService.pendingCall = null;
      await incoming;
      await flushPromises();
      await flushPromises();

      expect(infoSpy).toHaveBeenCalledWith(
        'signalIncomingCall resolved but pendingCall changed; ignoring',
        expect.objectContaining({ accepted: true, incomingConversationId: 'race-1' })
      );
      expect(deviceAnsweredSpy).not.toHaveBeenCalled();
    });

    it('incomingCall logs an error when signalIncomingCall rejects', async () => {
      mockEcc.signalIncomingCall.mockRejectedValue(new Error('signal boom'));
      const errorSpy = jest.spyOn(jabraService.logger, 'error');

      await jabraService.incomingCall({ conversationId: 'fail-1', contactName: 'X' });
      await flushPromises();
      await flushPromises();

      expect(errorSpy).toHaveBeenCalledWith('signalIncomingCall failed', expect.any(Error));
      expect(jabraService.pendingCall).toBeNull();
    });

    it('endAllCalls rejects pending incoming call and logs debug on rejectIncomingCall failure', async () => {
      mockEcc.rejectIncomingCall.mockImplementation(() => { throw new Error('reject boom'); });
      jabraService.pendingCall = { conversationId: 'ring-1', isOutbound: false, isSignaled: true };
      const debugSpy = jest.spyOn(jabraService.logger, 'debug');

      await jabraService.endAllCalls();

      expect(mockEcc.rejectIncomingCall).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith('endAllCalls: rejectIncomingCall cleanup', expect.any(Error));
      expect(jabraService.pendingCall).toBeNull();
    });

    it('endAllCalls rejects pending incoming call when rejectIncomingCall succeeds', async () => {
      jabraService.pendingCall = { conversationId: 'ring-2', isOutbound: false, isSignaled: true };
      const infoSpy = jest.spyOn(jabraService.logger, 'info');

      await jabraService.endAllCalls();

      expect(mockEcc.rejectIncomingCall).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith('endAllCalls: rejected pending incoming call');
      expect(jabraService.pendingCall).toBeNull();
    });

    it('endAllCalls clears a deferred (unsignaled) pending call without calling the SDK', async () => {
      jabraService.pendingCall = { conversationId: 'ring-3', isOutbound: false, isSignaled: false };

      await jabraService.endAllCalls();

      expect(mockEcc.rejectIncomingCall).not.toHaveBeenCalled();
      expect(jabraService.pendingCall).toBeNull();
    });

    it('connect logs a warning when createEasyCallControl rejects and clears the instance', async () => {
      jabraService.jabraSdk = await initializeSdk() as any;
      jest.spyOn(jabraService, 'createEasyCallControl')
        .mockRejectedValue(new Error('factory boom'));
      jest.spyOn(jabraService as any, 'deviceHasPermissions').mockResolvedValue(true);
      jest.spyOn(jabraService, 'getPreviouslyConnectedDevice').mockResolvedValue(mockDevice1 as any);
      const warnSpy = jest.spyOn(jabraService.logger, 'warn');
      const errorSpy = jest.spyOn(jabraService.logger, 'error');

      await jabraService.connect(mockDevice1.name);

      expect(warnSpy).toHaveBeenCalledWith('Failed to create EasyCallControl instance.', expect.any(Error));
      expect(errorSpy).toHaveBeenCalledWith('EasyCallControl not available — headset will not function');
    });
  });
});
