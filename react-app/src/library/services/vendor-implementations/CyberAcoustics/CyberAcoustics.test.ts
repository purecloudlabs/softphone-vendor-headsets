
import CyberAcousticsService from './CyberAcoustics';
import { PartialHIDDevice } from '../../../types/device-info';
import { CallInfo } from '../../..';
//import { PartialInputReportEvent } from '../../../types/consumed-headset-events';

const HEADSET_USAGE = 0x0005;
const HEADSET_USAGE_PAGE = 0x000B;


const micMuteFlag = 0x04;


const testProductId = 0xAA55;

const testCallInfo: CallInfo = {
  conversationId: 'test',
  contactName: 'John Doe' 
};

const muteButtonToggle = 0x13;
const JLmuteButtonToggle = 0x0203;

// call states
const CALL_IDLE      = 'callIdle';
const CALL_INCOMING  = 'callIncoming';
const CALL_ANSWERING = 'callAnswering';
const CALL_REJECTING = 'callRejecting';
const CALL_ACTIVE    = 'callActive';
const CALL_END       = 'callEnd';

// CAStateEvents
const ca_st_event_hooksw_on = 0;
const ca_st_event_answerConfirm = 1;
const ca_st_event_incomingCall = 2;
const ca_st_event_callEnd = 3;
const ca_st_event_hooksw_off = 5;
const ca_st_event_busy = 6;
const ca_st_event_call_answer = 7;

// CADeviceEvents
const ca_dev_event_hooksw_on   = 0x01;
const ca_dev_event_hooksw_off  = 0x00;
const ca_dev_event_busy        = 0x02;
const ca_dev_event_ans_confirm = 0x02;



const mackTestDevName = 'CyberAcoustics Emulation';
const mackReportId = 0x03;
const mackEventReportId = mackReportId;

const mackDeviceList0 = [];

const mackDeviceList1 = [{
  open: jest.fn(),
  close: jest.fn(),
  //sendReport: jest.fn(),
  sendReport: jest.fn((reportId, data) => {
    console.log(`Mock sendReport called with reportId: ${reportId} and data: ${data}`);
  }),
 
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),
  productName: mackTestDevName,
  productId: testProductId,
  opened: true,

  collections: [
    {
      usage: HEADSET_USAGE,
      usagePage: HEADSET_USAGE_PAGE,
      inputReports: [{ reportId: 3 }],
      outputReports: [{ reportId: 3 }] 
    }
  ]
}];



const mackDeviceList1_notOpen = [{
  open: jest.fn(),
  close: jest.fn(),
  //sendReport: jest.fn(),
  sendReport: jest.fn((reportId, data) => {
    console.log(`Mock sendReport called with reportId: ${reportId} and data: ${data}`);
  }),
 
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),
  productName: mackTestDevName,
  productId:  testProductId,
  opened: false,

  collections: [
    {
      usage: HEADSET_USAGE,
      usagePage: HEADSET_USAGE_PAGE,
      inputReports: [{ reportId: 3 }],
      outputReports: [{ reportId: 3 }] 
    }
  ]

}];

const mackDeviceList2 = [{
  open: jest.fn(),
  close: jest.fn(),
  //sendReport: jest.fn(),
  sendReport: jest.fn((reportId, data) => {
    console.log(`Mock sendReport called with reportId: ${reportId} and data: ${data}`);
  }),
 
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),
  productName: mackTestDevName,
  productId:  testProductId,
  opened: false,

  collections: [
    {
      usage: 0,
      usagePage: 0,
      inputReports: [{ reportId: 3 }],
      outputReports: [{ reportId: 3 }] 
    }
  ]

}];

const mackDeviceList3 = [{
  open: jest.fn(),
  close: jest.fn(),
  //sendReport: jest.fn(),
  sendReport: jest.fn((reportId, data) => {
    console.log(`Mock sendReport called with reportId: ${reportId} and data: ${data}`);
  }),
 
  addEventListener: jest.fn((name, callback) => {callback(
    {
      reportId: mackEventReportId,
      data: {
        getUint8: jest.fn()
      }
    });
  }),
  productName: mackTestDevName,
  productId:  testProductId,
  opened: false,

  collections: [
    {
      usage: HEADSET_USAGE,
      usagePage: HEADSET_USAGE_PAGE,
      inputReports: [],
      outputReports: [] 
    }
  ]

}];


// CyberAcousticsService tests
describe('CyberAcousticsService', () => {
  // instance of the service
  let cyberAcousticsService: CyberAcousticsService;
 
  // Mock device list for testing HID getDevice and
  // requestDevice
  let mackDeviceList = mackDeviceList0;
  let mackReqDeviceList = mackDeviceList0;

  // Overides for windows navigator Hid GetDevices 
  // and requestDevice()
  Object.defineProperty(window.navigator, 'hid', {
    get: () => ({
      getDevices: () => {
        return mackDeviceList;
      },
      requestDevice: () => {
        mackDeviceList = mackReqDeviceList;
        return mackReqDeviceList;
      }
    }),
  });

  beforeEach(() => {
    // init device lists and create instance
    mackDeviceList = mackDeviceList0;
    mackReqDeviceList = mackDeviceList0;
    cyberAcousticsService = CyberAcousticsService.getInstance({ logger: console });
  });

  afterEach(() => {
    cyberAcousticsService = null;
    jest.restoreAllMocks();
  });

  describe('Hid mock device init test', () => {
    it('Mock Device should not be undefined', async () => { 
      console.log("mock device init wrapper test");
      mackDeviceList = mackDeviceList1;
      let device = undefined;
      device = await cyberAcousticsService.HidMockDeviceInit(); 
      expect(device).not.toBeUndefined; 
      // debug code
      //cyberAcousticsService.SendCommandToDevice(0);
      //device.sendReport(0,0);

    });});
  
  
  describe('instantiation', () => {
    it('should be a singleton', () => {
      const cyberAcousticsService2 = CyberAcousticsService.getInstance({ logger: console });

      expect(cyberAcousticsService).not.toBeFalsy();
      expect(cyberAcousticsService).not.toBeFalsy();
      expect(cyberAcousticsService).toBe(cyberAcousticsService2);
    });

  });

  describe('isSupported', () => {
    it('should return true if proper values are met', () => {
      expect(cyberAcousticsService.isSupported()).toBe(true);
    });

    it('should return false if proper values are not met', () => {
      Object.defineProperty(window, '_HostedContextFunctions', { get: () => true });
      expect(cyberAcousticsService.isSupported()).toBe(false);
  
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    it('deviceLabelMatchesVendor', () => {
      let result;
      result = cyberAcousticsService.deviceLabelMatchesVendor('Foundever sp-2000');
      expect(result).toBe(true);

      result = cyberAcousticsService.deviceLabelMatchesVendor('ac-204enc');
      expect(result).toBe(true);

      result = cyberAcousticsService.deviceLabelMatchesVendor('Some other random device');
      expect(result).toBe(false);
    });
  });

  // connect

  describe('connect', () => {
    
    beforeEach( async () => {
      // create a device
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();  
     
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      const spyOnSelectDevice = jest.spyOn(cyberAcousticsService, 'selectDevice');
      cyberAcousticsService.isConnected = false;
      cyberAcousticsService.isConnecting = false;  
  });
    
    
    it('SHOULD NOT connect with bad device string', async () => { 
      
      cyberAcousticsService.requestWebHidPermissions = jest.fn((callback)=>{
        mackReqDeviceList = mackDeviceList1;
        callback();
      });
      
      cyberAcousticsService.activeDevice = null;
      cyberAcousticsService.connect('random device string');
      expect(cyberAcousticsService.activeDevice).toBeNull;
    }),
    
    // Previously connected device- already open 
    it('SHOULD connect with a good device string', async () => {     
      mackDeviceList = mackDeviceList1;
      cyberAcousticsService.activeDevice = null;
      cyberAcousticsService.connect('CyberAcoustics Emulation');
      expect(cyberAcousticsService.activeDevice).not.toBeNull;
  
    }),

    // Previously connected device- not open 
    it('SHOULD connect with a good device string', async () => {     
      mackDeviceList = mackDeviceList1_notOpen;
      cyberAcousticsService.activeDevice = null;
      cyberAcousticsService.connect('CyberAcoustics Emulation');
      expect(cyberAcousticsService.activeDevice).not.toBeNull;
  
    }),
    
    it('SHOULD NOT connect after calling requestWebHidPermissionS denied', async () => { 
    
  
      cyberAcousticsService.requestWebHidPermissions = jest.fn((callback)=>{
      
      mackReqDeviceList = mackDeviceList1_notOpen;
      callback();
   });
    //findme
    mackDeviceList = mackDeviceList2;    
    mackReqDeviceList = mackDeviceList1_notOpen;  
    cyberAcousticsService.activeDevice = null;
    cyberAcousticsService.connect('CyberAcoustics Emulation');
    expect(cyberAcousticsService.activeDevice).toBeNull;
  }),

  it('SHOULD connect after calling requestWebHidPermissions granted', async () => { 
      

    cyberAcousticsService.requestWebHidPermissions = jest.fn((callback)=>{
      
      mackReqDeviceList = mackDeviceList1;
      callback();
  });
    //findme
    mackDeviceList = mackDeviceList2;
    mackReqDeviceList = mackDeviceList1;  
    cyberAcousticsService.activeDevice = null;
    cyberAcousticsService.connect('CyberAcoustics Emulation');
    expect(cyberAcousticsService.activeDevice).not.toBeNull;
  }),

  
    it(`should not assign input or output reports if none found`, async () => {
      cyberAcousticsService.selectDevice( mackDeviceList3, "CyberAcoustics Emulation");
    }),

    it(`device name found but wrong usage page`, async () => {
      cyberAcousticsService.selectDevice( mackDeviceList2, "CyberAcoustics Emulation");
    }),


    it('should call changeConnectionStatus with false,false', async () => { 
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      cyberAcousticsService.connect('random device string');
      expect(spyOnchangeConnectionStatus.mock.calls).toEqual(
        [[{ "isConnected": false, "isConnecting": true}]] );
    }),

    it('should not callchangeConnectionStatus if already connecting', async () => { 
      cyberAcousticsService.isConnecting = true;
      cyberAcousticsService.connect('random device string');
      expect( cyberAcousticsService.changeConnectionStatus).not.toBeCalled;
    });

  });


  // event callbacks
  describe('disconnect', () => {
    
    beforeEach( async () => {
      // create a device
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();  
      
      cyberAcousticsService._currentCallState = CALL_ACTIVE;
      ////cyberAcousticsService.setCurrentCallState(CALL_ACTIVE);
      // disconnect- device should be null, etc...
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      cyberAcousticsService.isConnected = true;
      cyberAcousticsService.isConnecting = true;
      cyberAcousticsService.disconnect();      
   });
    
    //const CAProto = Object.getPrototypeOf(cyberAcousticsService);
    it('activeDevice should be null', async () => { 
      expect(cyberAcousticsService.activeDevice).toBeNull;
    }),
    
    it('_deviceInfo should be null', async () => { 
      expect(cyberAcousticsService.deviceInfo).toBeNull();

    }),

    it('currentCallState should be CALL_IDLE', async () => { 
      //expect(cyberAcousticsService.getCurrentCallState()).toBe(CALL_IDLE);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
    }),

    it('should call changeConnectionStatus with false,false', async () => { 
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      expect(spyOnchangeConnectionStatus.mock.calls).toEqual(
        [[{ "isConnected": false, "isConnecting": false }]]    );
    }),

    it('should not call changeConnectionStatus when not connected or connecting', async () => { 
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      expect(cyberAcousticsService.changeConnectionStatus).not.toBeCalled;
 
    })
  
    it('disconnect isConnected = false ', async () => { 
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      cyberAcousticsService.isConnected = false;
      cyberAcousticsService.isConnecting = true;
      cyberAcousticsService.disconnect();
      expect(cyberAcousticsService.changeConnectionStatus).not.toBeCalled;
    })
 
    it('disconnect isConnected = false, isConnecting false ', async () => { 
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      cyberAcousticsService.isConnected = false;
      cyberAcousticsService.isConnecting = false;
      cyberAcousticsService.disconnect();
      expect(cyberAcousticsService.changeConnectionStatus).not.toBeCalled;
    })
  
  });




  // incoming call
  describe('incomingCall', () => {
    it('should call ParseStateEvents with argument ca_st_event_incomingCall', async () => { 
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();        
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents');    
      cyberAcousticsService.incomingCall(testCallInfo);
      expect(spyOnParseStateEvents.mock.calls).toEqual(
        [[ca_st_event_incomingCall]]);      
    }),

    it('should set activeConversationId', async () => {
      expect(cyberAcousticsService._activeConversationId).toEqual(testCallInfo.conversationId);  
    })
  }); 
  // answerCall call 
  describe('answerCall', () => {
    it('should call ParseStateEvents with argument ca_st_event_call_answer', async () => { 
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();        
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents');    
      //cyberAcousticsService.answerCall(testCallInfo);
      cyberAcousticsService.answerCall(testCallInfo.conversationId, false);
      expect(spyOnParseStateEvents.mock.calls).toEqual(
        [[ca_st_event_call_answer]]);      
    })
    
    it('AutoAnswer should ParseStateEvents with ca_st_event_incomingCall,ca_st_event_call_answer ', async () => { 
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();        
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents');    
      
      cyberAcousticsService.answerCall(testCallInfo.conversationId, true);
      expect(spyOnParseStateEvents.mock.calls).toEqual(
        [[ca_st_event_incomingCall], [ca_st_event_call_answer]]);      
    })
  });

  // outgoing call
  describe('outgoingCall', () => {
    it('should set currentCallInfo', async () => { 
      
      cyberAcousticsService._currentCallState = CALL_IDLE;
      cyberAcousticsService.outgoingCall(testCallInfo);
      expect(cyberAcousticsService._currentCallInfo).toEqual(testCallInfo);
    })
  });
  
  // rejectCall call
  describe('rejectCall, endCall or endAllCalls', () => {
    it('should call ParseStateEvents with argument ca_st_event_callEnd', async () => { 
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();        
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents');    
      
      cyberAcousticsService.rejectCall();
      expect(spyOnParseStateEvents.mock.calls).toEqual(
        [[ca_st_event_callEnd]]);  
        
      jest.restoreAllMocks();  
      cyberAcousticsService.endCall(testCallInfo.conversationId, false);
      expect(spyOnParseStateEvents.mock.calls).toEqual(
        [[ca_st_event_callEnd]]);  
        
      jest.restoreAllMocks();  
      cyberAcousticsService.endAllCalls();
      expect(spyOnParseStateEvents.mock.calls).toEqual(
        [[ca_st_event_callEnd]]);   
    })
  
  });

  // setMute 
  describe('setMute true or false', () => {
    it('when called with true, should set global mute state true and call UpdateDeviceStatus with muteflag true', async () => { 
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();        
      const spyOnUpdateDeviceStatus = jest.spyOn(cyberAcousticsService, 'UpdateDeviceStatus');        
      cyberAcousticsService.setMute(true);
      expect(spyOnUpdateDeviceStatus.mock.calls).toEqual(
        [[micMuteFlag,true]]);      
      expect(cyberAcousticsService.isMuted).toEqual(true);  
    })

    it('when called with false, should set global mute state false and call UpdateDeviceStatus with muteflag false', async () => { 
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();        
      const spyOnUpdateDeviceStatus = jest.spyOn(cyberAcousticsService, 'UpdateDeviceStatus');        
      cyberAcousticsService.setMute(false);
      expect(spyOnUpdateDeviceStatus.mock.calls).toEqual(
        [[micMuteFlag,false]]);      
      expect(cyberAcousticsService.isMuted).toEqual(false);  
    })
  
  
  });

  // setHold 
  describe('setHold', () => {
    it('should set activeConversationId and global holding flag', async () => { 
      
      cyberAcousticsService.setHold('test', true);
      expect(cyberAcousticsService._activeConversationId).toEqual('test');
      expect(cyberAcousticsService.holdState).toEqual(true);
    
    
      cyberAcousticsService.setHold('anothertest', false);
      expect(cyberAcousticsService._activeConversationId).toEqual('anothertest');
      expect(cyberAcousticsService.holdState).toEqual(false);
    })
  });

  // handle deviceConnect
  describe('handleDeviceConnect', () => {
    
    beforeEach( async () => {
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();     
    });
    
    
    it('should set currentProductId & Product name from device', async () => {
      cyberAcousticsService.handleDeviceConnect();
      expect(cyberAcousticsService.deviceInfo.ProductName).toEqual(mackTestDevName)
    })

    it('should set currentCallState to CALL_IDLE', async () => {
      cyberAcousticsService.handleDeviceConnect();
      expect(cyberAcousticsService._currentCallState ).toBe(CALL_IDLE);
    })

    it('should set input and outport report ids', async () => {
      cyberAcousticsService.handleDeviceConnect();
      expect(cyberAcousticsService._headsetInputReportId ).toEqual(3);
      expect(cyberAcousticsService._headsetOutputReportId ).toEqual(3);
      expect(cyberAcousticsService._vendorInputReportId ).toEqual(4);
    })

    it('should call changeConnectionStatus with true,false', async () => { 
      const spyOnchangeConnectionStatus = jest.spyOn(cyberAcousticsService, 'changeConnectionStatus');
      cyberAcousticsService.handleDeviceConnect();
      expect(spyOnchangeConnectionStatus.mock.calls).toEqual(
        [[{"isConnected": true, "isConnecting": false}]]    )
    }),
  


    it('check call support by product id', async () => {
      
      let device = await cyberAcousticsService.HidMockDeviceInit();  
      cyberAcousticsService.activeDevice.productId = 0x04;
      cyberAcousticsService.handleDeviceConnect();
      expect(cyberAcousticsService._headsetInputReportId ).toEqual(3);
      expect(cyberAcousticsService._headsetOutputReportId ).toEqual(3);
      expect(cyberAcousticsService._vendorInputReportId ).toEqual(4);
    }),

    
    it('check call support by product id', async () => {
      
      let device = await cyberAcousticsService.HidMockDeviceInit();  
      cyberAcousticsService.activeDevice.productId = 0x18;
      cyberAcousticsService.handleDeviceConnect();
      expect(cyberAcousticsService._headsetInputReportId ).toEqual(3);
      expect(cyberAcousticsService._headsetOutputReportId ).toEqual(3);
      expect(cyberAcousticsService._vendorInputReportId ).toEqual(4);

    
    })

    
  });

  // handleInputReport 
  describe( 'handleInputReport', () => {
    it( 'should call the button press parser with the report id and value it received', async () => {
      
      const mockDataView = {
        buffer: new ArrayBuffer(2),  
        byteLength: 2,               
        getUint8: jest.fn((index) => {
          return 42;
        }),
      };
      
      const mockInputReportEvent = {
        reportId: 3,                              
        data: new DataView(mockDataView.buffer), 
      };
      
      cyberAcousticsService._handeledInputReportIds = 3;
      const spyOnhandleDeviceButtonPress = jest.spyOn( cyberAcousticsService, 'handleDeviceButtonPress');
      cyberAcousticsService.handleInputReport(mockInputReportEvent);
      
      expect(spyOnhandleDeviceButtonPress).toBeCalled;
      expect(spyOnhandleDeviceButtonPress.mock.calls).toEqual([[ 0, 3]])


      cyberAcousticsService._handeledInputReportIds = 0;
      //const spyOnhandleDeviceButtonPress = jest.spyOn( cyberAcousticsService, 'handleDeviceButtonPress');
      cyberAcousticsService.handleInputReport(mockInputReportEvent);
      
      expect(spyOnhandleDeviceButtonPress).not.toBeCalled;

      
    })
  });

  // handleDeviceButtonPress
  describe('handleDeviceButtonPress', () => {
      
    const set = 1;
    const clear = 0;
    
    beforeEach( async () => {
      mackDeviceList = mackDeviceList1;
      cyberAcousticsService._currentProductID = testProductId; 
      let device = await cyberAcousticsService.HidMockDeviceInit();  
      
    });
    
    it('should returnimmediately if no active device', async () => {
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      cyberAcousticsService.activeDevice = null;
      
      cyberAcousticsService.handleDeviceButtonPress(0,3);
      expect(spyOnParseStateEvents).not.toHaveBeenCalled();
    }),

    it('hook sw off should call ParseStateEvents with ca_dev_event_hooksw_off', async () => {   
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      cyberAcousticsService.handleDeviceButtonPress(ca_dev_event_hooksw_off,cyberAcousticsService._headsetInputReportId);

      expect(spyOnParseStateEvents).toHaveBeenCalled();
      expect(spyOnParseStateEvents.mock.calls).toEqual([[ca_st_event_hooksw_off]]); 
    }),
    
    it('hook sw on should call ParseStateEvents with ca_dev_event_hooksw_on', async () => {   
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      
      cyberAcousticsService._currentProductID = 0x04;
      cyberAcousticsService.handleDeviceButtonPress(ca_dev_event_hooksw_on,cyberAcousticsService._headsetInputReportId);

      expect(spyOnParseStateEvents).toHaveBeenCalled();
      expect(spyOnParseStateEvents.mock.calls).toEqual([[ca_st_event_hooksw_on]]); 
    }),

    it('if busy it should call ParseStateEvents with ca_dev_event_busy', async () => {   
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      cyberAcousticsService.handleDeviceButtonPress(ca_dev_event_busy, cyberAcousticsService._headsetInputReportId);

      expect(spyOnParseStateEvents.mock.calls).toEqual([[ca_st_event_busy]]); 
    }),


    it('if answer confirmed it should call ParseStateEvents with ca_st_event_answerConfirm', async () => {   
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      cyberAcousticsService.handleDeviceButtonPress( ca_dev_event_ans_confirm, cyberAcousticsService._vendorInputReportId);

      expect(spyOnParseStateEvents).toHaveBeenCalled();
      expect(spyOnParseStateEvents.mock.calls).toEqual([[ca_st_event_answerConfirm]]); 
    }),

    it('should do nothing if called with invalid reportID', async () => {   
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      cyberAcousticsService.handleDeviceButtonPress( ca_dev_event_ans_confirm, 42);

      expect(spyOnParseStateEvents).not.toHaveBeenCalled();
    }),

    it('should do nothing if called with invalid event', async () => {   
      const spyOnParseStateEvents = jest.spyOn(cyberAcousticsService, 'ParseStateEvents'); 
      cyberAcousticsService.handleDeviceButtonPress( 42, cyberAcousticsService._headsetInputReportId );

      expect(spyOnParseStateEvents).not.toHaveBeenCalled();
    }),


    it('should toggle global mute state when mute button pressed', async () => { 
      
      const spyOndeviceMuteChanged = jest.spyOn(cyberAcousticsService, 'deviceMuteChanged');
      // mute toggle button pressed
      // currently muted
      cyberAcousticsService.muteState = true;
      cyberAcousticsService.handleDeviceButtonPress(muteButtonToggle, cyberAcousticsService._headsetInputReportId);
      expect(cyberAcousticsService.muteState).toBe(false);
      
      expect(spyOndeviceMuteChanged).toBeCalled();
      expect(spyOndeviceMuteChanged.mock.calls).toEqual(
        [[{isMuted: cyberAcousticsService.muteState, name: cyberAcousticsService.muteState ? 'CallMuted' : 'CallUnmuted'}]] )
      
      // now unmuted- toggle back to muted 
      cyberAcousticsService.handleDeviceButtonPress(muteButtonToggle, cyberAcousticsService._headsetInputReportId);
      expect(cyberAcousticsService.muteState).toBe(true);

      //
      // alternate mute commands   
      // 
      cyberAcousticsService.muteState = true;
      cyberAcousticsService.handleDeviceButtonPress(JLmuteButtonToggle, cyberAcousticsService._headsetInputReportId);
      expect(cyberAcousticsService.muteState).toBe(false);

      
      // anc 304
      cyberAcousticsService._currentProductID = 0x18;
      cyberAcousticsService.muteState = true;
      cyberAcousticsService.handleDeviceButtonPress(0x05, cyberAcousticsService._headsetInputReportId);
      expect(cyberAcousticsService.muteState).toBe(false);  
    
  
      cyberAcousticsService.handleDeviceButtonPress(0x01, cyberAcousticsService._headsetInputReportId);
      expect(cyberAcousticsService.muteState).toBe(true);
      
      cyberAcousticsService._currentProductID = testProductId;  
      
    })


  });


  // Device Access
  describe('UpdateDeviceStatus should update the global hw state correctly', () => {
    
    const set = 1;
    const clear = 0;
    
    beforeEach( async () => {
       mackDeviceList = mackDeviceList1;
       let device = await cyberAcousticsService.HidMockDeviceInit();  
    });
    

    it('should set and clear bits correctly', async () => { 
      
      cyberAcousticsService._flagSupport = 0xff;

      console.log("Mock UpdateDeviceStatus");  
      cyberAcousticsService._deviceStatus = 0x00;
      cyberAcousticsService.UpdateDeviceStatus(0x08, set);
      expect (cyberAcousticsService._deviceStatus).toEqual(0x08);
      cyberAcousticsService._flagSupport = 0xff;
      cyberAcousticsService.UpdateDeviceStatus(0x01, set);
      expect (cyberAcousticsService._deviceStatus).toEqual(0x09);

      cyberAcousticsService.UpdateDeviceStatus(0x08, clear);
      expect (cyberAcousticsService._deviceStatus).toEqual(0x01);
      
      cyberAcousticsService.UpdateDeviceStatus(0x01, clear);
      expect (cyberAcousticsService._deviceStatus).toEqual(0x00);
    }),

    it('should send the command to the device', async () => { 
      expect (cyberAcousticsService.SendCommandToDevice).toBeCalled;
    })


  
    it('Should handle Word length commands', async () => { 
        cyberAcousticsService._JLCommandSet = true;
        cyberAcousticsService.SendCommandToDevice(0xAA55);
        //expect(cyberAcousticsService.currentCmdLo).toEqual(0x55);
        //expect(cyberAcousticsService.currentCmdLo).toEqual(0xAA);
      })
  
  });

  describe('State Machine', () => {
   
    beforeEach( async () => {
     
      mackDeviceList = mackDeviceList1;
      let device = await cyberAcousticsService.HidMockDeviceInit();  
    });
    
    // CALL_IDLE
    it('should transition CALL_IDLE->CALL_INCOMING on certain events', async () => { 
      console.log("Mock ParseStateEvents");
    
      cyberAcousticsService._currentCallState = CALL_IDLE;
      cyberAcousticsService.ParseStateEvents (ca_st_event_incomingCall);
   
      expect(cyberAcousticsService._currentCallState).toBe(CALL_INCOMING);
      expect(cyberAcousticsService.UpdateDeviceStatus).toBeCalled;
      expect (cyberAcousticsService.SendCommandToDevice).toBeCalled;
    }),

    it('should NOT transition FROM CALL_IDLE on certain events', async () => { 
      console.log("Mock ParseStateEvents");
      
      cyberAcousticsService._currentCallState = CALL_IDLE;
      cyberAcousticsService.ParseStateEvents (ca_st_event_hooksw_on);  
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
    }),
   
    it('should NOT transition FROM CALL_IDLE on certain events', async () => { 
      console.log("Mock ParseStateEvents");
      cyberAcousticsService._currentCallState = CALL_IDLE;
      cyberAcousticsService.ParseStateEvents (ca_st_event_call_answer);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
    }),
     
    // CALL_INCOMING
    it('should transition CALL_INCOMING->CALL_ANSWERING on certain events', async () => { 
      //cyberAcousticsService.setCurrentCallState(CALL_INCOMING);
      cyberAcousticsService._currentCallState = CALL_INCOMING;
      cyberAcousticsService.ParseStateEvents (ca_st_event_hooksw_on);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_ANSWERING);
      expect(cyberAcousticsService.ChangeCallState).toBeCalled;

      cyberAcousticsService._currentCallState = CALL_INCOMING;
      cyberAcousticsService.ParseStateEvents (ca_st_event_call_answer);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_ANSWERING);
      expect(cyberAcousticsService.ChangeCallState).toBeCalled;
    }),

    it('should transition CALL_INCOMING->CALL_REJECTING on certain events', async () => { 
      const spyOnChangecallstate = jest.spyOn(cyberAcousticsService, 'ChangeCallState');
      cyberAcousticsService._currentCallState = CALL_INCOMING;
      cyberAcousticsService.ParseStateEvents (ca_st_event_hooksw_off);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
      
      expect(cyberAcousticsService.ChangeCallState).toBeCalled;
      expect(spyOnChangecallstate).toHaveBeenCalledTimes(3);
      expect(spyOnChangecallstate.mock.calls).toEqual([
        [CALL_REJECTING], // First call
        [CALL_END],
        [CALL_IDLE]
      ]);
    }),
  
   
    it('should transition CALL_ANSWERING->CALL_ACTIVE on certain events', async () => { 
      cyberAcousticsService._currentCallState = CALL_ANSWERING;
      cyberAcousticsService.ParseStateEvents (ca_st_event_answerConfirm);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_ACTIVE);
      expect(cyberAcousticsService.ChangeCallState).toBeCalled;
    }),

    it('should transition CALL_ANSWERING->CALL_END->CALL_IDLE on certain events', async () => { 
      const spyOnChangecallstate = jest.spyOn(cyberAcousticsService, 'ChangeCallState');
      cyberAcousticsService._currentCallState = CALL_ANSWERING;
      cyberAcousticsService.ParseStateEvents (ca_st_event_callEnd);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
      expect(spyOnChangecallstate).toHaveBeenCalledTimes(2);
      expect(spyOnChangecallstate.mock.calls).toEqual([
        [CALL_END], // First call
        [CALL_IDLE]      
      ]);
    }),
  
    it('should transition CALL_ACTIVE->CALL_END->CALL_IDLE on certain events', async () => { 
      const spyOnChangecallstate = jest.spyOn(cyberAcousticsService, 'ChangeCallState');
      cyberAcousticsService._currentCallState = CALL_ACTIVE;
      cyberAcousticsService.ParseStateEvents (ca_st_event_callEnd);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
      expect(spyOnChangecallstate).toHaveBeenCalledTimes(2);
      expect(spyOnChangecallstate.mock.calls).toEqual([
        [CALL_END], // First call
        [CALL_IDLE]      
      ]);
      jest.restoreAllMocks();
      cyberAcousticsService._currentCallState = CALL_ACTIVE;
      cyberAcousticsService.ParseStateEvents (ca_st_event_busy);
      expect(cyberAcousticsService._currentCallState).toBe(CALL_IDLE);
      expect(spyOnChangecallstate).toHaveBeenCalledTimes(2);
      expect(spyOnChangecallstate.mock.calls).toEqual([
        [CALL_END], // First call
        [CALL_IDLE]      
      ]);
    
    
    })



  });


});
