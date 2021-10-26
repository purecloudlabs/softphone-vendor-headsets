import HeadsetService from '../../react-app/src/library/services/headset';
import { VendorImplementation } from '../../react-app/src/library/services/vendor-implementations/vendor-implementation';
import PlantronicsService from '../../react-app/src/library/services/vendor-implementations/plantronics/plantronics';
import SennheiserService from '../../react-app/src/library/services/vendor-implementations/sennheiser/sennheiser';
import JabraChromeService from '../../react-app/src/library/services/vendor-implementations/jabra/jabra-chrome/jabra-chrome';
import JabraNativeService from '../../react-app/src/library/services/vendor-implementations/jabra/jabra-native/jabra-native';
import { HeadsetEventName } from '../../react-app/src/library/types/headset-event';
import CallInfo from '../../react-app/src/library/types/call-info';
import ApplicationService from '../../react-app/src/library/services/application';
import { EventInfo, VendorEvent } from '../../react-app/src/library/types/headset-events';

describe('HeadsetService', () => {
  let plantronics: VendorImplementation;
  let sennheiser: VendorImplementation;
  let jabraNative: VendorImplementation;
  let jabraChrome: VendorImplementation;
  let headsetService: HeadsetService;
  let application: ApplicationService;
  let config: any = { logger: console};

  beforeEach(() => {
    application = ApplicationService.getInstance();
    plantronics = PlantronicsService.getInstance({...config, vendorName: 'Plantronics'});
    sennheiser = SennheiserService.getInstance({...config, vendorName: 'Sennheiser'});
    jabraNative = JabraNativeService.getInstance({...config, vendorName: 'JabraNative'});
    jabraChrome = JabraChromeService.getInstance({...config, vendorName: 'JabraChrome'});

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
    it('should include an implementation for jabra-chrome upon instantiation if the application context is not hosted and supports jabra', () => {
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => true);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementationOnce(() => false);
      headsetService = HeadsetService.getInstance(config);

      const implementations = headsetService.implementations;
      const filteredImplementations = implementations.filter(i => i instanceof JabraChromeService);

      expect(filteredImplementations.length).toEqual(1);
      expect(filteredImplementations[0]).toBe(jabraChrome);
    });
    it('should include an implementation for jabra-native upon instantiation if the application context is hosted and supports jabra', () => {
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => true);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementationOnce(() => true);
      headsetService = HeadsetService.getInstance(config);

      const filteredImplementations = headsetService.implementations.filter(
        i => i instanceof JabraNativeService
      );

      expect(filteredImplementations.length).toEqual(1);
      expect(filteredImplementations[0]).toBe(jabraNative);
    });
    it('should not include any jabra implementations if jabra is not supported', () => {
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => false);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementationOnce(() => true);
      headsetService = HeadsetService.getInstance(config);

      const filteredImplementations = headsetService.implementations.filter(
        i => i instanceof JabraNativeService || i instanceof JabraChromeService
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

      headsetService.changeImplementation(sennheiser);

      expect(sennheiser.disconnect).not.toHaveBeenCalled();
    });
    it('should change the selected implementation to what was passed in', () => {
      headsetService.selectedImplementation = sennheiser;
      headsetService.changeImplementation(plantronics);
      expect(headsetService.selectedImplementation).toBe(plantronics);
    });
    it('should call disconnect on the old implementation, and connect on the new implementation', () => {
      jest.spyOn(sennheiser, 'disconnect');
      jest.spyOn(plantronics, 'connect');
      headsetService.selectedImplementation = sennheiser;

      headsetService.changeImplementation(plantronics);

      expect(sennheiser.disconnect).toHaveBeenCalled();
      expect(plantronics.connect).toHaveBeenCalled();
    });
    it(
      'should trigger implementationChanged event for new implementation', () => {
        headsetService.selectedImplementation = sennheiser;
        headsetService.changeImplementation(plantronics);

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventData).toBeTruthy();
        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.IMPLEMENTATION_CHANGED);
        expect(headsetEventSubject.eventData instanceof VendorImplementation).toBe(true);
        expect(headsetEventSubject.eventData).toBe(plantronics);
      }
    );
    it(
      'should trigger implementationChanged event when clearing the implementation', () => {
        headsetService.selectedImplementation = plantronics;
        headsetService.changeImplementation(null);

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventData).toBeNull();
        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.IMPLEMENTATION_CHANGED);
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
      const callInfo: CallInfo = new CallInfo('1234', 'fred');
      const hasOtherActiveCalls = false;
      plantronics.isConnected = true;

      headsetService.incomingCall(callInfo, hasOtherActiveCalls);

      expect(plantronics.incomingCall).toHaveBeenCalledWith({ callInfo, hasOtherActiveCalls });
    });
    it('shouldnot call incomingCall on the selected implmenetation when the implementation is not connected', () => {
      const callInfo: CallInfo = new CallInfo('1234', 'fred');
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
      const callInfo: CallInfo = new CallInfo('1234', 'fred');
      plantronics.isConnected = true;

      headsetService.outgoingCall(callInfo);

      expect(plantronics.outgoingCall).toHaveBeenCalledWith(callInfo);
    });
    it('shouldnot call outgoingCall on the selected implmenetation when the implementation is not connected', () => {
      const callInfo: CallInfo = new CallInfo('1234', 'fred');
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
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        headsetService.handleDeviceAnsweredCall({vendor: {} as VendorImplementation, body: {name: 'AcceptCall', code: '1', event: {}}});
        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();
        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.IMPLEMENTATION_CHANGED);
      }
    );
    it(
      'should send a headset event of type DEVICE_ANSWERED_CALL', () => {
        headsetService.selectedImplementation = plantronics
        headsetService.handleDeviceAnsweredCall({vendor: plantronics, body: {name: 'AcceptCall', code: '1', event: {}}} as VendorEvent<EventInfo>);

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.DEVICE_ANSWERED_CALL);
      }
    );
  });

  describe('triggerDeviceRejectedCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should return nothing if the selected implementation does not match the vendor passed in from the event', () => {
        headsetService.handleDeviceRejectedCall({vendor: {} as VendorImplementation, body: {conversationId: 'a1b2c3'}});
        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();
        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.DEVICE_ANSWERED_CALL);
      }
    );
    it(
      'should send a headset event of type DEVICE_REJECTED_CALL', () => {
        headsetService.selectedImplementation = plantronics
        headsetService.handleDeviceRejectedCall({vendor: plantronics, body: {conversationId: 'a1b2c3'}});

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.DEVICE_REJECTED_CALL);
      }
    );
  });

  describe('triggerDeviceEndedCall', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should send a headset event of type DEVICE_ENDED_CALL', () => {
        headsetService.handleDeviceEndedCall({vendor: {} as VendorImplementation, body: {name: 'TerminateCall', code: '2', event: {}}});

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.DEVICE_ENDED_CALL);
      }
    );
  });

  describe('triggerDeviceMuteStatusChanged', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should send a headset event of type DEVICE_MUTE_STATUS_CHANGED', () => {
        headsetService.handleDeviceMuteStatusChanged({vendor: {} as VendorImplementation, isMuted: false, body: { name: 'Unmute', code: '12', event: {}}});

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.DEVICE_MUTE_STATUS_CHANGED);
      }
    );
  });

  describe('triggerDeviceHoldStatusChanged', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it(
      'should send a headset event of type DEVICE_HOLD_STATUS_CHANGED', () => {
        headsetService.handleDeviceHoldStatusChanged({vendor: {} as VendorImplementation, holdRequested: true, toggle: false, body: {name: 'HoldCall', code: '3', event: {}}});

        const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

        expect(headsetEventSubject.eventName).toEqual(HeadsetEventName.DEVICE_HOLD_STATUS_CHANGED);
      }
    );
  });

  describe('triggerDeviceLogs', () => {
    beforeEach(() => {
      headsetService = HeadsetService.getInstance(config);
    });
    it('should send the "loggableEvent" event to the observable', () => {
      headsetService.handleDeviceLogs({name: 'CallRinging', code: 7, event: {}});

      const headsetEventSubject = headsetService.getHeadSetEventsSubject().getValue();

      expect(headsetEventSubject.eventName).toEqual('loggableEvent');
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
    })
    it('should check a values label to determine which microphone is selected', () => {
      headsetService = HeadsetService.getInstance(config);
      jest.spyOn(application.hostedContext, 'supportsJabra').mockImplementationOnce(() => true);
      jest.spyOn(application.hostedContext, 'isHosted').mockImplementationOnce(() => false);
      const changeImplementationSpy = jest.spyOn(headsetService, 'changeImplementation');
      const disconnectSpy = jest.spyOn(sennheiser, 'disconnect');

      headsetService.handleActiveMicChange('jabra');
      expect(changeImplementationSpy).toHaveBeenCalledWith(jabraChrome);

      headsetService.handleActiveMicChange('plantronics test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(plantronics);
      headsetService.handleActiveMicChange('plt test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(plantronics);

      headsetService.handleActiveMicChange('sennheiser test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser);
      headsetService.handleActiveMicChange('senn test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser);
      headsetService.handleActiveMicChange('epos test');
      expect(changeImplementationSpy).toHaveBeenCalledWith(sennheiser);

      headsetService.handleActiveMicChange('test test');
      expect(disconnectSpy).toHaveBeenCalled();
    })
  })
});
