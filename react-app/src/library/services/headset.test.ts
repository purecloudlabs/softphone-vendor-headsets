import HeadsetService from './headset';
import { VendorImplementation } from './vendor-implementations/vendor-implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import { CallInfo } from '../types/call-info';
import { EventInfoWithConversationId, VendorEvent } from '../types/emitted-headset-events';
import JabraService from './vendor-implementations/jabra/jabra';
import 'regenerator-runtime';
import { BroadcastChannel } from 'broadcast-channel';
import { HeadsetEvents } from '../types/consumed-headset-events';
import { WebHidPermissionRequest } from '..';
import { filter } from 'rxjs';

jest.mock('broadcast-channel');

describe('HeadsetService', () => {
  let plantronics: VendorImplementation;
  let sennheiser: VendorImplementation;
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let jabraNative: VendorImplementation;
  let jabra: VendorImplementation;
  let headsetService: HeadsetService;
  const config: any = { logger: console };

  beforeEach(() => {
    headsetService = HeadsetService.getInstance({ ...config, createNew: true });
    plantronics = PlantronicsService.getInstance({ ...config, vendorName: 'Plantronics' });
    sennheiser = SennheiserService.getInstance({ ...config, vendorName: 'Sennheiser' });
    jabraNative = JabraNativeService.getInstance({ ...config, vendorName: 'JabraNative' });
    /* eslint-enable */
    jabra = JabraService.getInstance({ ...config, vendorName: 'Jabra' });

    jest.spyOn(sennheiser, 'connect').mockResolvedValue(true);
    jest.spyOn(plantronics, 'connect').mockResolvedValue(true);
    jest.spyOn(sennheiser, 'disconnect').mockResolvedValue(true);
    jest.spyOn(plantronics, 'disconnect').mockResolvedValue(true);
  });

  afterEach(() => {
    headsetService = null;
    plantronics = null;
    sennheiser = null;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    jabraNative = null;
    /* eslint-enable */
    jabra = null;
    jest.resetAllMocks();
    jest.resetModules();
  });

  describe('instantiation', () => {
    it('should be a singleton', () => {
      headsetService = HeadsetService.getInstance(config);
      const headsetService2 = HeadsetService.getInstance(config);

      expect(headsetService).not.toBeFalsy();
      expect(headsetService2).not.toBeFalsy();
      expect(headsetService).toBe(headsetService2);
    });

    it('should fallback to console logger', () => {
      headsetService = HeadsetService.getInstance({ createNew: true, logger: null });

      expect(headsetService['logger']).toBe(console);
    });
  });

  describe('implementations', () => {
    it ('should only include implementations that are supported', () => {
      headsetService = HeadsetService.getInstance(config);
      [headsetService['plantronics'], headsetService['sennheiser'], headsetService['jabra'], headsetService['jabraNative']]
        .forEach((impl) => {
          impl.isSupported = jest.fn().mockReturnValue(true);
        });

      headsetService['_implementations'] = [];
      
      expect(headsetService.implementations.length).toBe(4);

      [headsetService['jabra'], headsetService['jabraNative']].forEach((impl) => (impl.isSupported as jest.Mock).mockReturnValue(false));
      headsetService['_implementations'] = [];

      expect(headsetService.implementations.length).toBe(2);
    });
  });

  describe('changeImplementation', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it('should do nothing if the implementation passed in is the current implementation', () => {
      headsetService.selectedImplementation = sennheiser;
      jest.spyOn(sennheiser, 'disconnect');

      headsetService.changeImplementation(sennheiser, 'test label');

      expect(sennheiser.disconnect).not.toHaveBeenCalled();
    });
    it('should change the selected implementation to what was passed in', async () => {
      headsetService.selectedImplementation = sennheiser;
      await headsetService.changeImplementation(plantronics, 'test label');
      expect(headsetService.selectedImplementation).toBe(plantronics);
    });
    it('should call disconnect on the old implementation, and connect on the new implementation', async () => {
      jest.spyOn(sennheiser, 'disconnect');
      jest.spyOn(plantronics, 'connect');
      headsetService.selectedImplementation = sennheiser;

      await headsetService.changeImplementation(plantronics, 'test label');

      expect(sennheiser.disconnect).toHaveBeenCalled();
      expect(plantronics.connect).toHaveBeenCalled();
    });

    it('should trigger implementationChanged event for new implementation', (done) => {
      headsetService.headsetEvents$.subscribe((event) => {
        expect(event.event).toBe('implementationChanged');
        expect(event.payload).toStrictEqual(plantronics);
        expect(event.payload instanceof VendorImplementation).toBe(true);
        done();
      });
      headsetService.selectedImplementation = sennheiser;
      headsetService.changeImplementation(plantronics, 'test label');
    });

    it('should trigger implementationChanged event when clearing the implementation', done => {
      headsetService.headsetEvents$.subscribe(value => {
        expect(value.event).toBe('implementationChanged');
        expect(value.payload).toBeNull();
        done();
      });
      headsetService.selectedImplementation = plantronics;
      headsetService.changeImplementation(null, '');
    });
  });

  describe('incomingCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'incomingCall').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should call incomingCall on the selected implementation when the implementation is connected', () => {
      const callInfo: CallInfo = { conversationId: '1234', contactName: 'CM Punk' };
      const hasOtherActiveCalls = false;
      plantronics.isConnected = true;

      headsetService.incomingCall(callInfo, hasOtherActiveCalls);

      expect(plantronics.incomingCall).toHaveBeenCalledWith(callInfo, hasOtherActiveCalls);
    });

    it('shouldnot call incomingCall on the selected implmenetation when the implementation is not connected', () => {
      const callInfo: CallInfo = { conversationId: '4321', contactName: 'Bryan Danielson' };
      const hasOtherActiveCalls = false;
      plantronics.isConnected = false;

      headsetService.incomingCall(callInfo, hasOtherActiveCalls);

      expect(plantronics.incomingCall).not.toHaveBeenCalled();
    });
  });

  describe('outgoingCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'outgoingCall').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should call outgoingCall on the selected implementation when the implementation is connected', () => {
      const callInfo: CallInfo = { conversationId: '4567', contactName: 'Adam Cole' };
      plantronics.isConnected = true;

      headsetService.outgoingCall(callInfo);

      expect(plantronics.outgoingCall).toHaveBeenCalledWith(callInfo);
    });

    it('shouldnot call outgoingCall on the selected implmenetation when the implementation is not connected', () => {
      const callInfo: CallInfo = { conversationId: '7654', contactName: 'Marc Spector' };
      plantronics.isConnected = false;

      headsetService.outgoingCall(callInfo);

      expect(plantronics.outgoingCall).not.toHaveBeenCalled();
    });
  });

  describe('answerCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'answerCall').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
    it('should do nothing if already in the expected state', async () => {
      const conversationId = 'convoId241123';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          offHook: true,
          muted: false,
          held: true,
          ringing: false,
          conversationId
        }
      };

      await headsetService.answerCall(conversationId, false);

      expect(plantronics.answerCall).not.toHaveBeenCalled();
    });

    it('should call answerCall on the selected implementation when the implementation is connected', () => {
      const conversationId = 'convoId123';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: false,
          muted: false,
          held: false,
          ringing: true,
          conversationId: 'convoId123'
        }
      };
      headsetService.answerCall(conversationId, false);

      expect(plantronics.answerCall).toHaveBeenCalledWith(conversationId);
    });
    it('should not call answerCall on the selected implmenetation when the implementation is not connected', () => {
      const conversationId = '1234';
      plantronics.isConnected = false;

      headsetService.answerCall(conversationId, false);

      expect(plantronics.answerCall).not.toHaveBeenCalled();
    });
    it('should set a headsetConversationStates value if auto answer', () => {
      const conversationId = '1234';
      plantronics.isConnected = true;

      headsetService.answerCall(conversationId, true);

      expect(headsetService["headsetConversationStates"][conversationId]).toStrictEqual({
        conversationId,
        held: false,
        muted: false,
        offHook: true,
        ringing: false
      });

      expect(plantronics.answerCall).toHaveBeenCalledWith(conversationId);
    });
  });

  describe('rejectCall', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'rejectCall').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.useRealTimers();
    });
    it('should do nothing if already in expected state', async () => {
      const conversationId = 'convoId12523';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          offHook: false,
          muted: false,
          held: false,
          ringing: false,
          conversationId
        }
      };

      await headsetService.rejectCall(conversationId);

      expect(plantronics.rejectCall).not.toHaveBeenCalled();
    });

    it('should not delete the headset state if there is no removeTimer', async () => {
      const conversationId = 'convoId12523';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          offHook: false,
          muted: false,
          held: false,
          ringing: true,
          conversationId
        }
      };

      await headsetService.rejectCall(conversationId);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();

      delete headsetService['headsetConversationStates'][conversationId].removeTimer;
      jest.advanceTimersByTime(3000);

      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();
    });

    it('should delete the headset state if there is removeTimer', async () => {
      const conversationId = 'convoId12523';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          offHook: false,
          muted: false,
          held: false,
          ringing: true,
          conversationId
        }
      };

      await headsetService.rejectCall(conversationId);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();

      jest.advanceTimersByTime(3000);

      expect(headsetService['headsetConversationStates'][conversationId]).toBeFalsy();
    });

    it('should call rejectCall on the selected implementation when the implementation is connected', () => {
      const conversationId = 'convoId123';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: false,
          muted: false,
          held: false,
          ringing: true,
          conversationId: 'convoId123'
        }
      };

      headsetService.rejectCall(conversationId);

      expect(plantronics.rejectCall).toHaveBeenCalledWith(conversationId);
      expect(headsetService['headsetConversationStates']['convoId123'].removeTimer).toBeDefined();
      jest.advanceTimersByTime(2500);
      expect(headsetService['headsetConversationStates']).toStrictEqual({});
    });
    it('should not call rejectCall on the selected implmenetation when the implementation is not connected', () => {
      const conversationId = '1234';
      plantronics.isConnected = false;

      headsetService.rejectCall(conversationId);

      expect(plantronics.rejectCall).not.toHaveBeenCalled();
    });
  });

  describe('setMute', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'setMute').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
    it('should do nothing if all calls are muted', async () => {
      const conversationId = 'convoId123';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          offHook: true,
          muted: true,
          held: true,
          ringing: false,
          conversationId
        }
      };

      await headsetService.setMute(true);

      expect(plantronics.setMute).not.toHaveBeenCalled();
    });
    it('should call setMute on the selected implementation when the implementation is connected', () => {
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: false,
          muted: false,
          held: false,
          ringing: true,
          conversationId: 'convoId123'
        }
      };

      headsetService.setMute(true);

      expect(plantronics.setMute).toHaveBeenCalledWith(true);
      expect(headsetService['headsetConversationStates']['convoId123'].muted).toBe(true);
    });

    it('shouldnot call setMute on the selected implmenetation when the implementation is not connected', () => {
      plantronics.isConnected = false;

      headsetService.setMute(true);

      expect(plantronics.setMute).not.toHaveBeenCalled();
    });
  });

  describe('setHold', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'setHold').mockResolvedValue(null);
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
    it('should do nothing if already in expected state', async () => {
      const conversationId = 'convoId123';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          offHook: true,
          muted: false,
          held: true,
          ringing: false,
          conversationId
        }
      };

      await headsetService.setHold(conversationId, true);

      expect(plantronics.setHold).not.toHaveBeenCalled();
    });
    it('should call setHold on the selected implementation when the implementation is connected', () => {
      const conversationId = 'convoId123';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: 'convoId123'
        }
      };

      headsetService.setHold(conversationId, true);

      expect(plantronics.setHold).toHaveBeenCalledWith(conversationId, true);
    });

    it('should not call setHold on the selected implmenetation when the implementation is not connected', () => {
      const conversationId = '1234';
      plantronics.isConnected = false;

      headsetService.setHold(conversationId, true);

      expect(plantronics.setHold).not.toHaveBeenCalled();
    });
  });

  describe('endCall', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'endCall').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.resetAllMocks();
    });
    it('should do nothing if already in expected state', async () => {
      const conversationId = 'myconvoId5';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          conversationId,
          held: false,
          muted: false,
          offHook: false,
          ringing: false,
          removeTimer: 12525
        }
      };
      const timeoutSpy = jest.spyOn(window, 'setTimeout');
      headsetService.endCall(conversationId, false);
      expect(timeoutSpy).not.toHaveBeenCalled();
      timeoutSpy.mockRestore();
    });

    it('should delete headset state after time', async () => {
      const conversationId = 'myconvoId5';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          conversationId,
          held: false,
          muted: false,
          offHook: true,
          ringing: false,
        }
      };

      await headsetService.endCall(conversationId, false);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();

      jest.advanceTimersByTime(3000);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeFalsy();
    });

    it('should not delete headset state after time if there is no removeTimer', async () => {
      const conversationId = 'myconvoId5';
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          conversationId,
          held: false,
          muted: false,
          offHook: true,
          ringing: false,
        }
      };
      await headsetService.endCall(conversationId, false);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();
      delete headsetService['headsetConversationStates'][conversationId].removeTimer;

      jest.advanceTimersByTime(3000);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();
    });
    it('should call endCall on the selected implementation when the implementation is connected', () => {
      const conversationId = 'convoId123';
      const hasOtherActiveCalls = false;
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: 'convoId123'
        }
      };

      headsetService.endCall(conversationId, hasOtherActiveCalls);

      expect(plantronics.endCall).toHaveBeenCalledWith(conversationId, hasOtherActiveCalls);
      expect(headsetService['headsetConversationStates']['convoId123'].removeTimer).toBeDefined();
      jest.advanceTimersByTime(2500);
      expect(headsetService['headsetConversationStates']).toStrictEqual({});
    });

    it('shouldnot call endCall on the selected implmenetation when the implementation is not connected', () => {
      const conversationId = '1234';
      const hasOtherActiveCalls = false;
      plantronics.isConnected = false;

      headsetService.endCall(conversationId, hasOtherActiveCalls);

      expect(plantronics.endCall).not.toHaveBeenCalled();
    });
  });

  describe('endAllCalls', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'endAllCalls').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.resetAllMocks();
    });
    it('should not setTimeout if there is already a remove timer', async () => {
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'myConvoId': {
          conversationId: 'myConvoId',
          held: false,
          muted: false,
          offHook: true,
          ringing: false,
          removeTimer: 12525
        }
      };

      const timeoutSpy = jest.spyOn(window, 'setTimeout');
      await headsetService.endAllCalls();
      expect(timeoutSpy).not.toHaveBeenCalled();
      timeoutSpy.mockRestore();
    });

    it('should not delete if theres no remove timer', async () => {
      plantronics.isConnected = true;
      const conversationId = 'myConvoId15521';
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          conversationId,
          held: false,
          muted: false,
          offHook: true,
          ringing: false,
        }
      };

      await headsetService.endAllCalls();
      delete headsetService['headsetConversationStates'][conversationId].removeTimer;
      jest.advanceTimersByTime(3000);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeTruthy();
    });
    it('should delete headset state', async () => {
      plantronics.isConnected = true;
      const conversationId = 'myConvoId151';
      headsetService['headsetConversationStates'] = {
        [conversationId]: {
          conversationId,
          held: false,
          muted: false,
          offHook: true,
          ringing: false,
        }
      };

      await headsetService.endAllCalls();
      jest.advanceTimersByTime(3000);
      expect(headsetService['headsetConversationStates'][conversationId]).toBeFalsy();
    });
    it('should call endAllCalls on the selected implementation when the implementation is connected', () => {
      plantronics.isConnected = true;
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: 'convoId123'
        },
        'convoId456': {
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: 'convoId456'
        },
        'convoId789': {
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: 'convoId789'
        }
      };
      headsetService.endAllCalls();
      Object.keys(headsetService['headsetConversationStates']).forEach((key) => {
        expect(headsetService['headsetConversationStates'][key].removeTimer).toBeDefined();
      });
      expect(plantronics.endAllCalls).toHaveBeenCalled();
      jest.advanceTimersByTime(2500);
      expect(headsetService['headsetConversationStates']).toStrictEqual({});
    });

    it('shouldnot call endAllCalls on the selected implmenetation when the implementation is not connected', () => {
      plantronics.isConnected = false;
      headsetService.endAllCalls();
      expect(plantronics.endAllCalls).not.toHaveBeenCalled();
    });
  });

  describe('triggerDeviceAnsweredCall', () => {
    Object.defineProperty(window.navigator, 'hid', { get: () => ({
      getDevices: () => { return []; }
    }) });
    Object.defineProperty(window.navigator, 'locks', { get: () => ({}) });
    (window as any).BroadcastChannel = BroadcastChannel;

    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        const result = headsetService['handleDeviceAnsweredCall']({ vendor: {} as VendorImplementation, body: { name: 'AcceptCall', code: '1', event: {}, conversationId: 'myconvo' } });
        expect(result).toBeUndefined();
      }
    );

    it(
      'should send a headset event of type DEVICE_ANSWERED_CALL', (done) => {
        const testEvent = { vendor: plantronics, body: { name: 'AcceptCall', code: '1', conversationId: 'convoId123', event: {} } };
        headsetService['headsetConversationStates'] = {
          [testEvent.body.conversationId]: {
            offHook: false,
            muted: false,
            held: false,
            ringing: true,
            conversationId: testEvent.body.conversationId
          }
        };
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceAnsweredCall');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });

        headsetService.selectedImplementation = plantronics;
        headsetService['handleDeviceAnsweredCall'](testEvent as VendorEvent<EventInfoWithConversationId>);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toStrictEqual({
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: testEvent.body.conversationId
        });
      }
    );
  });

  describe('triggerDeviceRejectedCall', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      headsetService = HeadsetService.getInstance(config);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        const result = headsetService['handleDeviceRejectedCall']({ vendor: {} as VendorImplementation, body: { name: 'CallRejected', conversationId: 'a1b2c3' } });
        expect(result).toBeUndefined();
      }
    );

    it(
      'should send a headset event of type DEVICE_REJECTED_CALL', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceRejectedCall');
          expect(event.payload).toStrictEqual({ conversationId: 'a1b2c3', name: 'callrejected' });
          done();
        });
        headsetService.selectedImplementation = plantronics;
        const testEvent = { vendor: plantronics, body: { name: 'callrejected', conversationId: 'a1b2c3' } };
        headsetService['headsetConversationStates'] = {
          [testEvent.body.conversationId]: {
            offHook: false,
            muted: false,
            held: false,
            ringing: true,
            conversationId: testEvent.body.conversationId
          }
        };
        headsetService['handleDeviceRejectedCall'](testEvent);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toMatchObject({
          offHook: false,
          muted: false,
          held: false,
          ringing: false,
          conversationId: testEvent.body.conversationId
        });
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toHaveProperty('removeTimer');
        jest.advanceTimersByTime(3100);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toBeFalsy();
      }
    );
    it('should do nothing if already in expected state', () => {
      headsetService.selectedImplementation = plantronics;
      const testEvent = { vendor: plantronics, body: { name: 'callrejected', conversationId: 'a1b2c3' } };
      headsetService['headsetConversationStates'] = {
        [testEvent.body.conversationId]: {
          offHook: false,
          muted: false,
          held: false,
          ringing: false,
          conversationId: testEvent.body.conversationId
        }
      };
      const timeoutSpy = jest.spyOn(window, 'setTimeout');
      headsetService['handleDeviceRejectedCall'](testEvent);
      expect(timeoutSpy).not.toHaveBeenCalled();
      timeoutSpy.mockRestore();
    });
  });

  describe('triggerDeviceEndedCall', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      headsetService = HeadsetService.getInstance(config);
      jest.resetAllMocks();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it(
      'should send a headset event of type DEVICE_ENDED_CALL', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceEndedCall');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });
        const testEvent = { vendor: {} as VendorImplementation, body: { name: 'TerminateCall', code: '2', event: {}, conversationId: 'convo421' } };
        headsetService['headsetConversationStates'] = {
          [testEvent.body.conversationId]: {
            offHook: true,
            muted: false,
            held: false,
            ringing: false,
            conversationId: testEvent.body.conversationId
          }
        };
        headsetService['handleDeviceEndedCall'](testEvent);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toMatchObject({
          offHook: false,
          muted: false,
          held: false,
          ringing: false,
          conversationId: testEvent.body.conversationId
        });
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toHaveProperty('removeTimer');
        jest.advanceTimersByTime(3100);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toBeFalsy();
      }
    );

    it('should do nothing if already in expected state', async () => {
      const testEvent = { vendor: {} as VendorImplementation, body: { name: 'TerminateCall', code: '2', event: {}, conversationId: 'convo421' } };
      headsetService['headsetConversationStates'] = {
        [testEvent.body.conversationId]: {
          conversationId: testEvent.body.conversationId,
          held: false,
          muted: false,
          offHook: false,
          ringing: false,
          removeTimer: 12525
        }
      };
      const timeoutSpy = jest.spyOn(window, 'setTimeout');
      headsetService['handleDeviceEndedCall'](testEvent);
      expect(timeoutSpy).not.toHaveBeenCalled();
      timeoutSpy.mockRestore();
    });
  });

  describe('triggerDeviceMuteStatusChanged', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it(
      'should send a headset event of type DEVICE_MUTE_STATUS_CHANGED', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceMuteStatusChanged');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });
        const testEvent = { vendor: {} as VendorImplementation, body: { name: 'Mute', code: '12', event: {}, isMuted: true, conversationId: 'crazy88' } };
        headsetService['headsetConversationStates'] = {
          [testEvent.body.conversationId]: {
            offHook: true,
            muted: false,
            held: false,
            ringing: false,
            conversationId: testEvent.body.conversationId
          }
        };
        headsetService['handleDeviceMuteStatusChanged'](testEvent);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toStrictEqual({
          offHook: true,
          muted: true,
          held: false,
          ringing: false,
          conversationId: testEvent.body.conversationId
        });
      }
    );
    it('should do nothing if already in expected state', () => {
      const testEvent = { vendor: {} as VendorImplementation, body: { name: 'Mute', code: '12', event: {}, isMuted: true, conversationId: 'crazy88' } };
      const testObject = {
        offHook: true,
        muted: true,
        held: false,
        ringing: false,
        conversationId: testEvent.body.conversationId
      };
      headsetService['headsetConversationStates'] = {
        [testEvent.body.conversationId]: testObject
      };
      headsetService['handleDeviceMuteStatusChanged'](testEvent);
      expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toStrictEqual(testObject);
    });
  });

  describe('triggerDeviceHoldStatusChanged', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it(
      'should send a headset event of type DEVICE_HOLD_STATUS_CHANGED', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceHoldStatusChanged');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });
        const testEvent = { vendor: {} as VendorImplementation, body: { name: 'HoldCall', code: '3', event: {}, holdRequested: true, toggle: false, conversationId: 'convo41556' } };
        headsetService['headsetConversationStates'] = {
          [testEvent.body.conversationId]: {
            offHook: true,
            muted: false,
            held: false,
            ringing: false,
            conversationId: testEvent.body.conversationId
          }
        };
        headsetService['handleDeviceHoldStatusChanged'](testEvent);
        expect(headsetService['headsetConversationStates'][testEvent.body.conversationId]).toStrictEqual({
          offHook: true,
          muted: false,
          held: true,
          ringing: false,
          conversationId: testEvent.body.conversationId
        });
      }
    );
  });

  describe('handleWebHidPermissionRequested', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it(
      'should send a headset event of type webHidPermissionRequested', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe(HeadsetEvents.webHidPermissionRequested);
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });
        const testEvent: VendorEvent<WebHidPermissionRequest> = {
          vendor: {} as VendorImplementation,
          body: {
            callback: () => { return; }
          }
        };
        headsetService['handleWebHidPermissionRequested'](testEvent);
      }
    );
  });

  describe('triggerDeviceLogs', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it('should send the "loggableEvent" event to the observable', (done) => {
      headsetService.headsetEvents$.subscribe((event) => {
        expect(event.event).toBe('loggableEvent');
        expect(event.payload).toStrictEqual(testEvent.body);
        done();
      });
      const testEvent = { vendor: plantronics, body: { name: 'CallRinging', code: 7, event: {} } };
      headsetService['handleDeviceLogs'](testEvent);
    });
  });

  describe('external mic change', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it('should check a values label to determine which microphone is selected', async () => {
      const changeImplementationSpy = jest.spyOn(headsetService, 'changeImplementation');
      const disconnectSpy = jest.spyOn(sennheiser, 'disconnect');
      headsetService['jabra'].isSupported = jest.fn().mockReturnValue(true);
      headsetService['plantronics'].isSupported = jest.fn().mockReturnValue(true);
      headsetService['sennheiser'].isSupported = jest.fn().mockReturnValue(true);

      headsetService.activeMicChange('jabra');
      expect(changeImplementationSpy).toHaveBeenCalledWith(jabra, 'jabra');

      headsetService.activeMicChange('plantronics test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(plantronics, 'plantronics test');
      headsetService.activeMicChange('plt test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(plantronics, 'plt test');

      headsetService.activeMicChange('sennheiser test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser, 'sennheiser test');
      headsetService.activeMicChange('senn test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser, 'senn test');
      await headsetService.activeMicChange('epos test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser, 'epos test');

      headsetService.selectedImplementation = sennheiser;

      headsetService.activeMicChange(undefined);
      expect(headsetService.selectedImplementation).toBeNull();
      expect(disconnectSpy).toHaveBeenCalled();

      headsetService.activeMicChange('test test');
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should not clear if there is no active vendor', () => {
      const spy = headsetService['clearSelectedImplementation'] = jest.fn();
      
      headsetService.selectedImplementation = null;
      // should not find a selectable vendor
      headsetService.activeMicChange('bose');
      
      expect(spy).not.toHaveBeenCalled();
    });

    it('should clear if no new vendor', () => {
      const spy = headsetService['clearSelectedImplementation'] = jest.fn();
      headsetService.selectedImplementation = {} as any;

      // should not find a selectable vendor
      headsetService.activeMicChange('bose');
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('clearSelectedImplementation', () => {
    it('should only emit an event if there is a selected implementation', () => {
      headsetService.selectedImplementation = null;
      
      const spy = jest.fn();
      headsetService.headsetEvents$
        .pipe(
          filter((event) => event.event === HeadsetEvents.implementationChanged)
        ).subscribe(spy);

      headsetService['clearSelectedImplementation']();

      expect(spy).not.toHaveBeenCalled();

      headsetService.selectedImplementation = { disconnect: jest.fn() } as any;
      headsetService['clearSelectedImplementation']();
      expect(spy).toHaveBeenCalled();
      expect(headsetService.selectedImplementation).toBeNull();
    });
  });

  describe('retryConnection', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });

    it('should reject if not connected', async () => {
      headsetService.selectedImplementation = null;

      await expect(() => headsetService.retryConnection('Test Label')).rejects.toThrow('No active headset');
    });

    it('should call connect', async () => {
      const impl = {
        connect: jest.fn().mockResolvedValue(null)
      };

      headsetService.selectedImplementation = impl as any;
      await headsetService.retryConnection('Test Label');

      expect(impl.connect).toHaveBeenCalledWith('Test Label');
    });
  });

  describe('connectionStatus', () => {
    it('should return proper connection status', () => {
      headsetService.selectedImplementation = plantronics;
      headsetService.selectedImplementation.isConnected = true;
      expect(headsetService.connectionStatus()).toBe('running');

      headsetService.selectedImplementation.isConnecting = true;
      headsetService.selectedImplementation.isConnected = false;
      expect(headsetService.connectionStatus()).toBe('checking');

      headsetService.selectedImplementation.isConnecting = false;
      expect(headsetService.connectionStatus()).toBe('notRunning');

      headsetService.selectedImplementation = null;
      expect(headsetService.connectionStatus()).toBe('noVendor');
    });
  });

  describe('isDifferentState', () => {
    it('should return the negated value of state after finding a value in this.headsetConversationStates', () => {
      headsetService['headsetConversationStates'] = {
        'convoId123': {
          offHook: true,
          muted: false,
          held: false,
          ringing: false,
          conversationId: 'convoId123'
        }
      };

      expect(headsetService['isDifferentState']({ conversationId: 'convoId123', state: {} })).toBe(false);
    });

    it('should check the passed in state if no state is pulled from this.headsetConversationStates', () => {
      const testState = {
        offHook: true,
        muted: false,
        held: false,
        ringing: false,
        conversationId: 'convoId123'
      };
      expect(headsetService['isDifferentState']({ conversationId: '828256', state: testState })).toStrictEqual(true);
    });
  });

  describe('updateHeadsetState', () => {
    it('should return false if the isDifferentState returns false, meaning the states are the same', () => {
      headsetService['isDifferentState'] = jest.fn().mockReturnValueOnce(false);
      expect(headsetService['updateHeadsetState']({ conversationId: 'convoId123', state: {} })).toBe(false);
    });
  });

  describe('connectionStatus', () => {
    it('should return proper connection status', () => {
      headsetService.selectedImplementation = plantronics;
      headsetService.selectedImplementation.isConnected = true;
      expect(headsetService.connectionStatus()).toBe('running');

      headsetService.selectedImplementation.isConnecting = true;
      headsetService.selectedImplementation.isConnected = false;
      expect(headsetService.connectionStatus()).toBe('checking');

      headsetService.selectedImplementation.isConnecting = false;
      expect(headsetService.connectionStatus()).toBe('notRunning');

      headsetService.selectedImplementation = null;
      expect(headsetService.connectionStatus()).toBe('noVendor');
    });
  });
});
