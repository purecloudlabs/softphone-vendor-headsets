import HeadsetService from '../../react-app/src/library/services/headset';
import { VendorImplementation } from '../../react-app/src/library/services/vendor-implementations/vendor-implementation';
import PlantronicsService from '../../react-app/src/library/services/vendor-implementations/plantronics/plantronics';
import SennheiserService from '../../react-app/src/library/services/vendor-implementations/sennheiser/sennheiser';
import JabraChromeService from '../../react-app/src/library/services/vendor-implementations/jabra/jabra-chrome/jabra-chrome';
import JabraNativeService from '../../react-app/src/library/services/vendor-implementations/jabra/jabra-native/jabra-native';
import { CallInfo } from '../../react-app/src/library/types/call-info';
import ApplicationService from '../../react-app/src/library/services/application';
import { EventInfo, VendorEvent } from '../../react-app/src/library/types/headset-events';
import JabraService from '../../react-app/src/library/services/vendor-implementations/jabra/jabra';
import 'regenerator-runtime';
import { BroadcastChannel } from 'broadcast-channel';
import { IApi, IDevice, init, RequestedBrowserTransport, webHidPairing } from '@gnaudio/jabra-js';
import { BehaviorSubject } from 'rxjs';

jest.mock('broadcast-channel');

const initializeSdk = async (subject) => {
  const sdk = await init({
    appId: 'softphone-vendor-headsets-test',
    appName: 'Softphone Headset Library Test',
    transport: RequestedBrowserTransport.WEB_HID
  });
  sdk.deviceList = subject.asObservable() as any;
  return sdk;
}

describe('HeadsetService', () => {
  let plantronics: VendorImplementation;
  let sennheiser: VendorImplementation;
  let jabraNative: VendorImplementation;
  let jabraChrome: VendorImplementation;
  let jabra: VendorImplementation;
  let headsetService: HeadsetService;
  let application: ApplicationService;
  let jabraSdk: Promise<IApi>;
  let config: any = { logger: console};
  const subject = new BehaviorSubject<IDevice[]>([]);

  beforeEach(() => {
    jabraSdk = initializeSdk(subject);
    application = ApplicationService.getInstance();
    plantronics = PlantronicsService.getInstance({...config, vendorName: 'Plantronics'});
    sennheiser = SennheiserService.getInstance({...config, vendorName: 'Sennheiser'});
    jabraNative = JabraNativeService.getInstance({...config, vendorName: 'JabraNative'});
    jabraChrome = JabraChromeService.getInstance({...config, vendorName: 'JabraChrome'});
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
    jabraNative = null;
    jabraChrome = null;
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
  });

  describe('initImplementations', () => {
    it('should include an implementation for plantronics upon instantiation', () => {
      headsetService = HeadsetService.getInstance(config);
      const filteredImplementations = headsetService.implementations.filter(
        i => i instanceof PlantronicsService
      );

      expect(filteredImplementations.length).toEqual(1);
      expect(filteredImplementations[0]).toBe(plantronics);
    });
    it('should include an implementation for sennheiser upon instantiation', () => {
      headsetService = HeadsetService.getInstance(config);
      const filteredImplementations = headsetService.implementations.filter(
        i => i instanceof SennheiserService
      );

      expect(filteredImplementations.length).toEqual(1);
      expect(filteredImplementations[0]).toBe(sennheiser);
    });
    it('should return the same implementations if some already exist', () => {
      headsetService = HeadsetService.getInstance(config);
      const expectedArray = [jabra, plantronics, sennheiser];
      expect(headsetService.implementations).toStrictEqual(expectedArray);
      Object.defineProperty(headsetService, '_implementations', { value: [undefined, undefined, undefined] });
    });
    it('should include an implementation for jabra-native upon instantiation if the application context is hosted and supports jabra', async () => {
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => true);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementation(() => true);
      headsetService = HeadsetService.getInstance(config);
      // console.log(headsetService.implementations);
      const filteredImplementations = await headsetService.implementations.filter(
        i => i instanceof JabraNativeService
      );

      expect(filteredImplementations.length).toEqual(1);
      expect(filteredImplementations[0]).toBe(jabraNative);
      Object.defineProperty(headsetService, '_implementations', { value: [undefined, undefined, undefined] });
    });
    it('should not include any jabra implementations if jabra is not supported', () => {
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => false);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementationOnce(() => true);
      headsetService = HeadsetService.getInstance(config);

      const filteredImplementations = headsetService.implementations.filter(
        i => i instanceof JabraNativeService || i instanceof JabraChromeService || i instanceof JabraService
      );

      expect(filteredImplementations.length).toEqual(0);
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
      'should trigger implementationChanged event when clearing the implementation', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('implementationChanged');
          expect(event.payload).toBeNull();
          done();
        })
        headsetService.selectedImplementation = plantronics;
        headsetService.changeImplementation(null, '');
      }
    );
    it('should handle a Jabra device that has not yet been connected to WebHID', async () => {
      const emitEventCallback = jest.fn();
      headsetService.on('jabraPermissionRequested', emitEventCallback);
      await headsetService.changeImplementation(jabra, 'absolutely not');
      expect(emitEventCallback).toHaveBeenCalledWith({
        webHidPairing: webHidPairing
      })
    })
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

      expect(plantronics.incomingCall).toHaveBeenCalledWith({ callInfo, hasOtherActiveCalls });
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
      const value = 'on';
      plantronics.isConnected = true;

      headsetService.setMute(value);

      expect(plantronics.setMute).toHaveBeenCalledWith(value);
    });
    it('shouldnot call setMute on the selected implmenetation when the implementation is not connected', () => {
      const value = 'on';
      plantronics.isConnected = false;

      headsetService.setMute(value);

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
      const value = 'on';
      plantronics.isConnected = true;

      headsetService.setHold(conversationId, value);

      expect(plantronics.setHold).toHaveBeenCalledWith(conversationId, value);
    });
    it('should not call setHold on the selected implmenetation when the implementation is not connected', () => {
      const conversationId = '1234';
      const value = 'on';
      plantronics.isConnected = false;

      headsetService.setHold(conversationId, value);

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
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {;
        const result = headsetService.handleDeviceAnsweredCall({vendor: {} as VendorImplementation, body: {name: 'AcceptCall', code: '1', event: {}}});
        expect(result).toBeUndefined();
      }
    );
    it(
      'should send a headset event of type DEVICE_ANSWERED_CALL', (done) => {
        headsetService.headsetEvents$.subscribe((event) => {
          expect(event.event).toBe('deviceAnsweredCall');
          expect(event.payload).toStrictEqual(testEvent.body);
          done();
        });
        headsetService.selectedImplementation = plantronics
        const testEvent = {vendor: plantronics, body: {name: 'AcceptCall', code: '1', event: {}}}
        headsetService.handleDeviceAnsweredCall(testEvent as VendorEvent<EventInfo>);
      }
    );
  });

  describe('triggerDeviceRejectedCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        const result = headsetService.handleDeviceRejectedCall({vendor: {} as VendorImplementation, body: {conversationId: 'a1b2c3'}});
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
        headsetService.handleDeviceRejectedCall(testEvent);
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
        headsetService.handleDeviceEndedCall(testEvent);
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
        headsetService.handleDeviceMuteStatusChanged(testEvent);
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
        headsetService.handleDeviceHoldStatusChanged(testEvent);
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
      const testEvent = {vendor: 'plantronics', body: { name: 'CallRinging', code: 7, event: {} }};
      headsetService.handleDeviceLogs(testEvent);
    })
  });

  describe('get connectionStatus', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    })
    it('should return the correct translation string depending on proper flags', () => {
      headsetService.selectedImplementation = plantronics;

      expect(headsetService.connectionStatus).toBe(`dummy.connectionStatus.notRunning`);

      headsetService.selectedImplementation.isConnected = true;
      expect(headsetService.connectionStatus).toBe(`dummy.connectionStatus.connected`);

      headsetService.selectedImplementation.isConnecting = true;
      expect(headsetService.connectionStatus).toBe(`dummy.connectionStatus.connecting`);

      headsetService.selectedImplementation.errorCode = 'Error';
      expect(headsetService.connectionStatus).toBe(`dummy.connectionStatus.error`);
    });
  });

  describe('external mic change', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
      Object.defineProperty(headsetService, '_implementations', { value: [undefined, undefined, undefined] });
    })
    it('should check a values label to determine which microphone is selected', () => {
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => true);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementationOnce(() => false);
      const changeImplementationSpy = jest.spyOn(headsetService, 'changeImplementation');
      const disconnectSpy = jest.spyOn(sennheiser, 'disconnect');

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
    })
  })
});
