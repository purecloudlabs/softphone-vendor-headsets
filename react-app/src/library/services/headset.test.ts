import HeadsetService from './headset';
import { VendorImplementation } from './vendor-implementations/vendor-implementation';
import PlantronicsService from './vendor-implementations/plantronics/plantronics';
import SennheiserService from './vendor-implementations/sennheiser/sennheiser';
import JabraNativeService from './vendor-implementations/jabra/jabra-native/jabra-native';
import { CallInfo } from '../types/call-info';
import { EventInfo, VendorEvent } from '../types/emitted-headset-events';
import JabraService from './vendor-implementations/jabra/jabra';
import 'regenerator-runtime';
import { BroadcastChannel } from 'broadcast-channel';
import { HeadsetEvents } from '../types/consumed-headset-events';
import { WebHidPermissionRequest } from '..';

jest.mock('broadcast-channel');

describe('HeadsetService', () => {
  let plantronics: VendorImplementation;
  let sennheiser: VendorImplementation;
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let jabraNative: VendorImplementation;
  let jabra: VendorImplementation;
  let headsetService: HeadsetService;
  // let jabraSdk: Promise<IApi>;
  const config: any = { logger: console};

  beforeEach(() => {
    // jabraSdk = initializeSdk(subject);
    headsetService = HeadsetService.getInstance({ ...config, createNew: true });
    plantronics = PlantronicsService.getInstance({...config, vendorName: 'Plantronics'});
    sennheiser = SennheiserService.getInstance({...config, vendorName: 'Sennheiser'});
    jabraNative = JabraNativeService.getInstance({...config, vendorName: 'JabraNative'});
    /* eslint-enable */
    jabra = JabraService.getInstance({...config, vendorName: 'Jabra'});

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
    it('should change the selected implementation to what was passed in', () => {
      headsetService.selectedImplementation = sennheiser;
      headsetService.changeImplementation(plantronics, 'test label');
      expect(headsetService.selectedImplementation).toBe(plantronics);
    });
    it('should call disconnect on the old implementation, and connect on the new implementation', () => {
      jest.spyOn(sennheiser, 'disconnect');
      jest.spyOn(plantronics, 'connect');
      headsetService.selectedImplementation = sennheiser;

      headsetService.changeImplementation(plantronics, 'test label');

      expect(sennheiser.disconnect).toHaveBeenCalled();
      expect(plantronics.connect).toHaveBeenCalled();
    });
    it('should trigger implementationChanged event for new implementation', (done) => {
      headsetService.headsetEvents$.subscribe((event) => {
        expect(event.event).toBe('implementationChanged');
        expect(event.payload).toStrictEqual(plantronics);
        expect(event.payload instanceof VendorImplementation).toBe(true);
        done();
      })
      headsetService.selectedImplementation = sennheiser;
      headsetService.changeImplementation(plantronics, 'test label');
    })
    it(
      'should trigger implementationChanged event when clearing the implementation', done => {
        headsetService.headsetEvents$.subscribe(value => {
          expect(value.event).toBe('implementationChanged');
          expect(value.payload).toBeNull();
          done();
        })
        headsetService.selectedImplementation = plantronics;
        headsetService.changeImplementation(null, '');
      }
    );
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
    it('should call answerCall on the selected implementation when the implementation is connected', () => {
      const conversationId = '1234';
      plantronics.isConnected = true;

      headsetService.answerCall(conversationId);

      expect(plantronics.answerCall).toHaveBeenCalledWith(conversationId);
    });
    it('shouldnot call answerCall on the selected implmenetation when the implementation is not connected', () => {
      const conversationId = '1234';
      plantronics.isConnected = false;

      headsetService.answerCall(conversationId);

      expect(plantronics.answerCall).not.toHaveBeenCalled();
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
    it('should call setMute on the selected implementation when the implementation is connected', () => {
      plantronics.isConnected = true;

      headsetService.setMute(true);

      expect(plantronics.setMute).toHaveBeenCalledWith(true);
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
    it('should call setHold on the selected implementation when the implementation is connected', () => {
      const conversationId = '1234';
      plantronics.isConnected = true;

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
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'endCall').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });
    afterEach(() => {
      jest.resetAllMocks();
    });
    it('should call endCall on the selected implementation when the implementation is connected', () => {
      const conversationId = '1234';
      const hasOtherActiveCalls = false;
      plantronics.isConnected = true;

      headsetService.endCall(conversationId, hasOtherActiveCalls);

      expect(plantronics.endCall).toHaveBeenCalledWith(conversationId, hasOtherActiveCalls);
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
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(plantronics, 'endAllCalls').mockResolvedValue({});
      headsetService.selectedImplementation = plantronics;
    });
    afterEach(() => {
      jest.resetAllMocks();
    });
    it('should call endAllCalls on the selected implementation when the implementation is connected', () => {
      plantronics.isConnected = true;
      headsetService.endAllCalls();
      expect(plantronics.endAllCalls).toHaveBeenCalled();
    });
    it('shouldnot call endAllCalls on the selected implmenetation when the implementation is not connected', () => {
      plantronics.isConnected = false;
      headsetService.endAllCalls();
      expect(plantronics.endAllCalls).not.toHaveBeenCalled();
    });
  });

  describe('triggerDeviceAnsweredCall', () => {
    Object.defineProperty(window.navigator, 'hid', { get: () => ({
      getDevices: () => { return [] }
    })});
    Object.defineProperty(window.navigator, 'locks', { get: () => ({})});
    (window as any).BroadcastChannel = BroadcastChannel
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        const result = headsetService['handleDeviceAnsweredCall']({vendor: {} as VendorImplementation, body: {name: 'AcceptCall', code: '1', event: {}}});
        expect(result).toBeUndefined();
      }
    );
    it(
      'should send a headset event of type DEVICE_ANSWERED_CALL', (done) => {
        const testEvent = {vendor: plantronics, body: {name: 'AcceptCall', code: '1', event: {}}}
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceAnsweredCall');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        })


        headsetService.selectedImplementation = plantronics
        headsetService['handleDeviceAnsweredCall'](testEvent as VendorEvent<EventInfo>);
      }
    );
  });

  describe('triggerDeviceRejectedCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        const result = headsetService['handleDeviceRejectedCall']({vendor: {} as VendorImplementation, body: {conversationId: 'a1b2c3'}});
        expect(result).toBeUndefined();
      }
    );
    it(
      'should send a headset event of type DEVICE_REJECTED_CALL', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceRejectedCall');
          expect(event.payload).toStrictEqual({ conversationId: 'a1b2c3' });
          done();
        });
        headsetService.selectedImplementation = plantronics;
        const testEvent = {vendor: plantronics, body: {conversationId: 'a1b2c3'}}
        headsetService['handleDeviceRejectedCall'](testEvent);
      }
    );
  });

  describe('triggerDeviceEndedCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should send a headset event of type DEVICE_ENDED_CALL', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceEndedCall');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
          expect(event.event).toBe('loggableEvent');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });
        const testEvent = {vendor: {} as VendorImplementation, body: {name: 'TerminateCall', code: '2', event: {}}}
        headsetService['handleDeviceEndedCall'](testEvent);
      }
    );
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
        const testEvent = {vendor: {} as VendorImplementation, body: { name: 'Unmute', code: '12', event: {}, isMuted: false}}
        headsetService['handleDeviceMuteStatusChanged'](testEvent);
      }
    );
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
        const testEvent = {vendor: {} as VendorImplementation, body: {name: 'HoldCall', code: '3', event: {}, holdRequested: true, toggle: false}}
        headsetService['handleDeviceHoldStatusChanged'](testEvent);
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
      const testEvent = {vendor: plantronics, body: { name: 'CallRinging', code: 7, event: {} }};
      headsetService['handleDeviceLogs'](testEvent);
    })
  });

  describe('external mic change', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it('should check a values label to determine which microphone is selected', () => {
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
      headsetService.activeMicChange('epos test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser, 'epos test');

      headsetService.activeMicChange('test test');
      expect(disconnectSpy).toHaveBeenCalled();
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
});
