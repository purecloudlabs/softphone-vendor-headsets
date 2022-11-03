import YealinkService from './yealink';

const mackTestDevName = 'Test Yealink Dev';
const mackReportId = 0x02;
let mackEventReportId = mackReportId;

const mackDeviceList0 = [];
const mackDeviceList1 = [{
  open : jest.fn(),
  close : jest.fn(),
  sendReport : jest.fn(),
  addEventListener : jest.fn((name, callback) => {callback({
    reportId : mackEventReportId,
    data : {
      getUint8 : jest.fn()
    }
  });}),

  productName : mackTestDevName,
  collections : [{
    usage : 0x0005,
    usagePage : 0x000B,
    inputReports : [{
      reportId : mackReportId
    }]
  }]
}];

const mackDeviceList2 = [{
  open : jest.fn(),
  close : jest.fn(),
  addEventListener : jest.fn((name, callback) => {callback({
    reportId : mackEventReportId,
    data : {
      getUint8 : jest.fn()
    }
  });}),

  productName : mackTestDevName,
  collections : [{
    usage : 0,
    usagePage : 0,
  }]
}];

const mackDeviceList3 = [{
  open : jest.fn(),
  close : jest.fn(),
  addEventListener : jest.fn((name, callback) => {callback({
    reportId : mackEventReportId,
    data : {
      getUint8 : jest.fn()
    }
  });}),

  productName : mackTestDevName,
  collections : [{
    usage : 0x0005,
    usagePage : 0x000B,
    inputReports : []
  }]
}];

const mackDeviceList4 = [{
  open : jest.fn(),
  close : jest.fn(),
  addEventListener : jest.fn((name, callback) => {callback({
    reportId : mackEventReportId,
    data : {
      getUint8 : jest.fn()
    }
  });}),

  opened: true,

  productName : mackTestDevName,
  collections : [{
    usage : 0x0005,
    usagePage : 0x000B,
    inputReports : []
  }]
}];

const mackRecOffhookFlag = 0b1;
const mackRecHoldFlag = 0b1000;
const mackRecMuteFlag = 0b100;
const mackRecReject = 0x40;

describe('YealinkService', () => {
  let yealinkService: YealinkService;
  let mackDeviceList = mackDeviceList0;
  let mackReqDeviceList = mackDeviceList0;

  Object.defineProperty(window.navigator, 'hid', {
    get: () => ({
      getDevices: () => {
        return mackDeviceList;
      },
      requestDevice: () => {
        mackDeviceList = mackReqDeviceList;
      }
    }),
  });

  beforeEach(() => {
    mackDeviceList = mackDeviceList0;
    mackReqDeviceList = mackDeviceList0;
    yealinkService = YealinkService.getInstance({ logger: console });
  });

  afterEach(() => {
    yealinkService = null;
    jest.restoreAllMocks();
  });

  describe('instantiation', () => {
    it('should be a singleton', () => {
    const yealinkService2 = YealinkService.getInstance({ logger: console });

    expect(yealinkService).not.toBeFalsy();
    expect(yealinkService2).not.toBeFalsy();
    expect(yealinkService).toBe(yealinkService2);
    });

    it('should have the correct vendorName', () => {
      expect(yealinkService.vendorName).toEqual('Yealink');
    });
  });

  describe('isSupported', () => {
    it('should return true if proper values are met', () => {
      expect(yealinkService.isSupported()).toBe(true);
    });

    it('should return false if proper values are not met', () => {
      Object.defineProperty(window, '_HostedContextFunctions', { get: () => true });
      expect(yealinkService.isSupported()).toBe(false);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    it('deviceLabelMatchesVendor', () => {
      let result;
      result = yealinkService.deviceLabelMatchesVendor('Test Yealink Label');
      expect(result).toBe(true);

      result = yealinkService.deviceLabelMatchesVendor('Test (6993:123) Label');
      expect(result).toBe(true);

      result = yealinkService.deviceLabelMatchesVendor('Something test');
      expect(result).toBe(false);
    });
  });

  describe('connect', () => {

    afterEach(() => {
      yealinkService.disconnect();
    })

    it('should connect with previouslyConnectedDevice', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      mackDeviceList = mackDeviceList1;
      
      await yealinkService.connect(mackTestDevName);

      const devName = yealinkService.deviceInfo;
      expect(devName.ProductName).toBe(mackTestDevName);
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('already have active device', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      mackDeviceList = mackDeviceList1;
      
      await yealinkService.connect(mackTestDevName);
      await yealinkService.connect(mackTestDevName);

      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('previouslyConnectedDevice device had opened', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      mackDeviceList = mackDeviceList4;
      
      await yealinkService.connect(mackTestDevName);

      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('device usage not match', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList0;
        callback();
      });
      mackDeviceList = mackDeviceList2;
      
      await yealinkService.connect(mackTestDevName);

      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('device inputReports is empty', async () => {
      yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList0;
        callback();
      });
      mackDeviceList = mackDeviceList3;
      
      await yealinkService.connect(mackTestDevName);

      expect(yealinkService.isConnected).toBe(true);
      expect(yealinkService.isConnecting).toBe(false);
    });

    it('previouslyConnectedDevice not have device', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList0;
        callback();
      });
      mackDeviceList = mackDeviceList1;
      
      await yealinkService.connect('test');

      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('connect success, but reportId error', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      mackDeviceList = mackDeviceList1;
      mackEventReportId = 0;
    
      await yealinkService.connect(mackTestDevName);
      mackEventReportId = mackReportId;
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });
  
    it('webhidRequest, 30s timeout, failed to connect', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      jest.useFakeTimers();
      const requestSpy = yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        jest.advanceTimersByTime(30100);
      });
        
      await yealinkService.connect(mackTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: true });
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('webhidRequest, connect success', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      const requestSpy = yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList1;
        callback();
      });
        
      await yealinkService.connect(mackTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: true, isConnecting: false });
    });

    it('webhidRequest, connect fail', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      const requestSpy = yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        callback();
      });
          
      await yealinkService.connect(mackTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, connect fail, device name error', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      const requestSpy = yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList1;
        callback();
      });
          
      await yealinkService.connect('test');
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, connect fail, device usage error', async () => {
      const statusChangeSpy = jest.spyOn(yealinkService, 'changeConnectionStatus');
      const requestSpy = yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList2;
        callback();
      });
          
      await yealinkService.connect(mackTestDevName);
      expect(requestSpy).toHaveBeenCalled();
      expect(statusChangeSpy).toHaveBeenCalledWith({ isConnected: false, isConnecting: false });
    });

    it('webhidRequest, device inputReports is empty', async () => {
      yealinkService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList3;
        callback();
      });
          
      await yealinkService.connect(mackTestDevName);
      expect(yealinkService.isConnected).toBe(true);
      expect(yealinkService.isConnecting).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('test disconnect', async () => {
      mackDeviceList = mackDeviceList1;
      yealinkService.isConnecting = true;
      await yealinkService.connect(mackTestDevName);
      await yealinkService.disconnect();
      expect(yealinkService.isConnecting).toBe(false);
      expect(yealinkService.isConnected).toBe(false);
    });
  });

  describe('processBtnPress', () => {
    beforeEach(async () => {
      mackDeviceList = mackDeviceList1;
      await yealinkService.connect(mackTestDevName);
    });

    afterEach(async () => {
      yealinkService.processBtnPress(0);
      await yealinkService.endAllCalls();
      await yealinkService.disconnect();
    })

    it('activeDevice is null', async () => {
      await yealinkService.disconnect();
      const ansFun = jest.spyOn(yealinkService, 'answerCall');
      yealinkService.processBtnPress(mackRecOffhookFlag);
      expect(ansFun).not.toHaveBeenCalled();
    });

    it('Not talking, ignore key', async () => {
      const ansFun = jest.spyOn(yealinkService, 'answerCall');
      yealinkService.processBtnPress(mackRecOffhookFlag);
      expect(ansFun).not.toHaveBeenCalled();
    });

    it('test offhook, activeConversationId is empty', async () => {
      const ansFun = jest.spyOn(yealinkService, 'answerCall');
      const devAnsFun = jest.spyOn(yealinkService, 'deviceAnsweredCall');
      //creat talk state
      await yealinkService.setHold('1', true);

      yealinkService.processBtnPress(mackRecOffhookFlag);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).not.toHaveBeenCalled();
    });

    it('test offhook, answer success', async () => {
      const ansFun = jest.spyOn(yealinkService, 'answerCall');
      const devAnsFun = jest.spyOn(yealinkService, 'deviceAnsweredCall');

      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);
      expect(ansFun).toHaveBeenCalled();
      expect(devAnsFun).toHaveBeenCalled();
    });

    it('test offhook, mute mode', async () => {
      const devEndFun = jest.spyOn(yealinkService, 'deviceEndedCall');

      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);
      await yealinkService.setMute(true);
      yealinkService.processBtnPress(0);
      await yealinkService.setMute(false);
      expect(devEndFun).toHaveBeenCalled();
    });

    it('test mute', async () => {
      const setMuteFun = jest.spyOn(yealinkService, 'setMute');
      const devMuteFun = jest.spyOn(yealinkService, 'deviceMuteChanged');

      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);

      yealinkService.processBtnPress(mackRecMuteFlag | mackRecOffhookFlag);
      yealinkService.processBtnPress(mackRecOffhookFlag);
      expect(setMuteFun).toHaveBeenCalledWith(true);
      expect(devMuteFun).toHaveBeenCalledWith({isMuted: true, name: 'CallMuted', conversationId: 'id'});
    });

    it('test unmute', async () => {
      const devMuteFun = jest.spyOn(yealinkService, 'deviceMuteChanged');

      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);
      await yealinkService.setMute(true);

      yealinkService.processBtnPress(mackRecMuteFlag | mackRecOffhookFlag);
      expect(devMuteFun).toHaveBeenCalledWith({isMuted: false, name: 'CallUnmuted', conversationId: 'id'});
    });

    it('test hold', async () => {
      const setHoldFun = jest.spyOn(yealinkService, 'setHold');
      const devHoldFun = jest.spyOn(yealinkService, 'deviceHoldStatusChanged');

      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);
      
      yealinkService.processBtnPress(mackRecHoldFlag | mackRecOffhookFlag);
      yealinkService.processBtnPress(mackRecOffhookFlag);
      expect(setHoldFun).toHaveBeenCalledWith(null, true);
      expect(devHoldFun).toHaveBeenCalledWith({holdRequested: true, name: 'OnHold', conversationId: 'id'});
    });

    it('test resume', async () => {
      const devHoldFun = jest.spyOn(yealinkService, 'deviceHoldStatusChanged');

      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);
      await yealinkService.setHold(null, true);

      yealinkService.processBtnPress(mackRecHoldFlag | mackRecOffhookFlag);
      expect(devHoldFun).toHaveBeenCalledWith({holdRequested: false, name: 'ResumeCall', conversationId: 'id'});
    });

    it('test rejectCall', async () => {
      const devRejectFun = jest.spyOn(yealinkService, 'deviceRejectedCall');
      const setRejectFun = jest.spyOn(yealinkService, 'rejectCall');

      await yealinkService.incomingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecReject);

      expect(devRejectFun).toHaveBeenCalledWith({name: 'Reject', conversationId: 'id'});
      expect(setRejectFun).toHaveBeenCalled();
    });

    it('ignore illegal key', async () => {
      const ansFun = jest.spyOn(yealinkService, 'answerCall');
      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(0x100);
      expect(ansFun).not.toHaveBeenCalled();
    });

  });

  describe('option with mute', () => {
    beforeEach(async () => {
      yealinkService.isMuted = true;
    });

    afterEach(async () => {
      yealinkService.isMuted = false;
      await yealinkService.endAllCalls();
    })

    it('incomingCall with mute', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn();

      await yealinkService.incomingCall({conversationId : 'id'});

      expect(devSendFun).toHaveBeenCalledWith(0b10 | 0b100);
    });

    it('answerCall with mute', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn((value: number): any => {});

      await yealinkService.answerCall();

      expect(devSendFun).toHaveBeenCalledWith(0b10 | 0b1);
    });

    it('rejectCall with mute', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn((value: number): any => {});

      await yealinkService.rejectCall();

      expect(devSendFun).toHaveBeenCalledWith(0b10);
    });

    it('endcall with mute', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn((value: number): any => {});

      await yealinkService.endCall(null, false);

      expect(devSendFun).toHaveBeenCalledWith(0b10);
    });
  });

  describe('incomingCall with null', () => {
    it('test incomingCall', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn();

      await yealinkService.incomingCall(null);

      expect(devSendFun).not.toHaveBeenCalled();
    });
  });

  describe('end call', () => {
    it('endcall with hasOtherActiveCalls', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn((value: number): any => {});

      await yealinkService.endCall(null, true);

      expect(devSendFun).not.toHaveBeenCalled();
    });

    it('test endcall', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn((value: number): any => {});

      await yealinkService.endCall(null, false);

      expect(devSendFun).toHaveBeenCalledWith(0);
    });

    it('test endcall with conversationId', async () => {
      const devSendFun = yealinkService.sendOpToDevice = jest.fn((value: number): any => {});
      mackDeviceList = mackDeviceList1;
      await yealinkService.connect(mackTestDevName);
      await yealinkService.outgoingCall({conversationId : 'id'});
      yealinkService.processBtnPress(mackRecOffhookFlag);
      await yealinkService.endCall('id', false);
      await yealinkService.disconnect();

      expect(devSendFun).toHaveBeenCalledWith(0);
    });
  });

});