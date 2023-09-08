import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import { CallInfo } from '../../..';
import DeviceInfo, { PartialHIDDevice } from "../../../types/device-info";
import { PartialInputReportEvent } from '../../../types/consumed-headset-events';
import { isCefHosted } from "../../../utils";


const hookswFlag  = 0x01;
const micMuteFlag = 0x04;
const ringFlag    = 0x08;



const muteButtonToggle = 0x13;


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



export default class CyberAcousticsService extends VendorImplementation {
  private static instance: CyberAcousticsService;

  private activeConversationId: string;
  private _deviceInfo: DeviceInfo = null;
  private activeDevice: any;

  private currentProductID = null;
  private headsetOutputReportId = 3;
  private headsetInputReportId  = 3;                                     
  private vendorInputReportId   = 4;
  
  private currentState = 0x00;
  private isHolding = false;
  private currentlDeviceLabel: string;
  
  private currentCallInfo: CallInfo;
  private currentCallState = CALL_IDLE;
  private deviceStatus = 0;

  private gCmdBuf = new Uint8Array( [ 0x00, 0x00 ]);

  vendorName = 'CyberAcoustics';

  static getInstance (config: ImplementationConfig): CyberAcousticsService {
    if (!CyberAcousticsService.instance) {
      CyberAcousticsService.instance = new CyberAcousticsService(config);
    }
    return CyberAcousticsService.instance;
  }

  get deviceInfo (): DeviceInfo {   
    return this._deviceInfo;
  }

  // called to check if the WebHID interface is supported
  isSupported (): boolean {
    const supported: boolean  =  (window.navigator as any).hid && !isCefHosted();
    return supported;
  }


  deviceLabelMatchesVendor (label: string): boolean {
    this.logger.debug("CA: matchVendor");
    const lowerLabel = label.toLowerCase();
    return ['ac-204enc', 'foundever sp-2000'].some(searchVal => lowerLabel.includes(searchVal));
  }


  // Connect: Attempt to connect to the device
  async connect (originalDeviceLabel: string): Promise<void> {
    
    let bConnectSuccess = false;
    this.logger.debug("CA: Connect Attempt");

    this.currentlDeviceLabel = originalDeviceLabel;
    this.logger.debug(`CA Device String = ${originalDeviceLabel}`);
  
    if (!this.isConnecting) {
      this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: true });
    }
    
    // First try to see if this is a previously connected device- does not require 
    // WebHID permission dialog 
    const devList: PartialHIDDevice[] = await (window.navigator as any).hid.getDevices(); 
    this.SelectDevice(devList, originalDeviceLabel);

    if(this.activeDevice) {
      
      // Open the device  
      if (!this.activeDevice.opened) {
        await this.activeDevice.open();
      }
      if(this.activeDevice.opened) {   
      
        //SUCESSFUL connection! 
        bConnectSuccess = true;
        this.handleDeviceConnect();     
        this.logger.debug("CA: Connect SUCCESS- previously connected device"); 
      }
      else{
        this.logger.debug("CA: Connect FAIL- Failed connect to previously connected device"); 
      }
    }

    ////DEBUG CODE
    ////this.activeDevice.close();
    ////bConnectSuccess = false;
    ////
 
    if(!bConnectSuccess) {
      this.requestWebHidPermissions(async () => {  
        this.logger.debug("Requesting web HID permissions");
        const devList = await  (window.navigator as any).hid.requestDevice({
          filters: [
            {
              vendorId: 0x3391,
              //vendorId: 0x046D,
            },
          ],
        });
        
        this.SelectDevice(devList, originalDeviceLabel);
  
        if(this.activeDevice) {
          // Open the device
          if (!this.activeDevice.opened) {
            await this.activeDevice.open();
          }
        }
        
        if( this.activeDevice.opened ) {   
          //SUCESSFUL connection! 
          bConnectSuccess = true;
          this.handleDeviceConnect();     
          this.logger.debug("CA: Connect SUCCESS- from HIDWebPermission request "); 
        }
        else {
          // FAIL!!
          this.logger.debug("CA: Connect FAIL requesting WebHID permissions");
        }  
      });    
    }   
  }
  
  // Called when the device sends an input report
  private handleInputReport (event: PartialInputReportEvent) {
  
    const value = event.data.getUint8(0);
    const reportID = event.reportId;

    this.logger.debug(`CA Received Input Report #${event.reportId}. value =  ${value}`);
    
    // Process device input
    this.handleDeviceButtonPress(value, reportID);
  }

  // called on sucessful connect to do initialization work
  private async handleDeviceConnect ()
  {
    this._deviceInfo = {
      ProductName: this.activeDevice.productName,
    };

    this.handleInputReport = this.handleInputReport.bind(this);
    this.activeDevice.addEventListener('inputreport', this.handleInputReport);
    
    this.currentProductID = this.activeDevice.productId;
    this.logger.debug(`Product ID: 0x${this.currentProductID.toString(16)}`);

    this.currentCallState = CALL_IDLE;
    
    // This could potentially change with different products, but for now this is
    // constant across all products.
    this.headsetOutputReportId = 3;
    this.headsetInputReportId  = 3;                                     
    this.vendorInputReportId   = 4;
 
    this.changeConnectionStatus({ isConnected: true, isConnecting: false });
  }

  private SelectDevice (devList: PartialHIDDevice[], originalDeviceLabel : string) {
    this.logger.debug("CA: SelectDevice");
    const deviceLabel = originalDeviceLabel.toLowerCase();
    devList.forEach(device => {
      if (!this.activeDevice) {
        if (deviceLabel.includes(device?.productName?.toLowerCase())) {
          this.activeDevice = device;
          this.logger.debug("CA: SettingActive Device");
        }
      }
    });
  }

  async disconnect (): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      this.changeConnectionStatus({ isConnected: false, isConnecting: false });
    }
    if (this.activeDevice) {
      await this.activeDevice.close();
      this.activeDevice = null;
      this._deviceInfo = null;
      this.currentCallState = CALL_IDLE;
    }
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.logger.debug("CA: incomingCall");
    this.activeConversationId = callInfo.conversationId;   
    this.ParseStateEvents(ca_st_event_incomingCall);
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.logger.debug("CA: outgoingCall");
    this.currentCallInfo = callInfo;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
  async answerCall (): Promise<void> {  
    this.logger.debug("CA: Answer Call from UI");
    this.ParseStateEvents(ca_st_event_call_answer);  
    
  }
  
  async rejectCall (): Promise<void> {
    this.logger.debug("CA: rejectCall from UI");
    this.ParseStateEvents( ca_st_event_callEnd);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async endCall (conversationId: string, hasOtherActiveCalls: boolean): Promise<void> {
    this.logger.debug("CA: endCall from UI");
    this.ParseStateEvents( ca_st_event_callEnd);
  }

  async endAllCalls (): Promise<void> {
    this.logger.debug("CA: endAllCalls from UI");
    this.ParseStateEvents( ca_st_event_callEnd);
  }

  async setMute (value: boolean): Promise<void> {
    this.logger.debug(`CA: setMute. Value: ${value}`);
  
    // Set the global mute state- this is how Genesys keeps track of mute state. 
    this.isMuted = value;
    // set the device state
    this.UpdateDeviceStatus (micMuteFlag, value);  
  }

  async setHold (conversationId: string, value: boolean): Promise<void> {
    this.logger.debug(`CA: setHold. Value: ${value}`);
    this.activeConversationId = conversationId;
    this.isHolding = value;
  }



  private handleDeviceButtonPress (value: number, reportID: number): void {
    if (!this.activeDevice) {
      this.logger.error('do not have active device');
      return;
    }
  
    if( reportID === this.headsetInputReportId )
    {
      switch (value) 
      {
      case muteButtonToggle: //0x13
        this.isMuted = !this.isMuted;
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted'
        });  
        break;

      // call rejected if call incoming
      case ca_dev_event_hooksw_off: //0x00 
        this.ParseStateEvents( ca_st_event_hooksw_off);                                       
        break;                                                        
                            
      //Answer Incomming Call
      case ca_dev_event_hooksw_on : //0x01
        this.ParseStateEvents( ca_st_event_hooksw_on); 
        break;

      // hang up
      case ca_dev_event_busy: //0x02
        this.ParseStateEvents(ca_st_event_busy); 
        break;
      
      }
    }  
    else if( reportID === this.vendorInputReportId)
    {
      switch (value) 
      {
      case ca_dev_event_ans_confirm : //0x02
        this.ParseStateEvents(ca_st_event_answerConfirm); 
        break;
      }
    }

  } // handleDeviceButtonPress
  

  // This is the main call control engine.  State dependant events from the device
  // and/or the UI are handled here.  
  private ParseStateEvents (CAStateEvent)
  {
    switch(this.currentCallState) 
    {
    case  CALL_IDLE:
      switch(CAStateEvent)
      {
      case ca_st_event_incomingCall:  
        this.ChangeCallState(CALL_INCOMING);
        break; 
      }
      break;   
  
    case  CALL_INCOMING:
      switch(CAStateEvent)
      {
      // pickup
      case ca_st_event_hooksw_on:   // call answer from Device 
      case ca_st_event_call_answer: // call answer from UI 
        this.ChangeCallState(CALL_ANSWERING);
        break;
      
      // reject
      case ca_st_event_hooksw_off:  // call reject from Device   
      case ca_st_event_callEnd:     // call reject from UI
        this.ChangeCallState(CALL_REJECTING);
        this.ChangeCallState(CALL_END);
        this.ChangeCallState(CALL_IDLE);   
        break;
      }
      break; 
    
    case  CALL_ANSWERING:
      switch(CAStateEvent)
      {
      case ca_st_event_answerConfirm:
        this.ChangeCallState(CALL_ACTIVE);  
        break;
      
      case ca_st_event_callEnd:
      case ca_st_event_hooksw_off:  
        this.ChangeCallState(CALL_END); 
        this.ChangeCallState(CALL_IDLE);
        break; 
      }
      break;

    case  CALL_ACTIVE:
      switch(CAStateEvent)
      {
      case ca_st_event_callEnd:
      case ca_st_event_busy:  
        this.ChangeCallState(CALL_END ); 
        this.ChangeCallState(CALL_IDLE); 
        break;   
      }
      break;        
    } // switch callstate   

  }

  // Events handled in the previous function may change the global call state.  
  // This is handeled here.  Entering a new state may require work to be done- this
  // is also handled here.  
  private ChangeCallState (newstate)
  {
    this.logger.debug(`%cCA SETTING STATE: ${newstate}`, 'color: red');
    //this.logger.debug(`CA SETTING STATE: ${newstate}`);
    this.currentCallState = newstate;
    switch(this.currentCallState)
    {
    case CALL_IDLE:
      this.deviceStatus = 0;
      // ???this.currentConversationId = null;
      break;
    
    case CALL_INCOMING:
      this.UpdateDeviceStatus(ringFlag, true);
      break;
      
    case CALL_ANSWERING:
      this.UpdateDeviceStatus(hookswFlag, true);
      break;
    
    case CALL_ACTIVE:    
      this.UpdateDeviceStatus( ringFlag, false);
      this.deviceAnsweredCall({ name: 'CallOffHook', conversationId: this.activeConversationId });  
      break;

    case CALL_END: 
      this.UpdateDeviceStatus(hookswFlag, false);
      this.deviceEndedCall({ name: 'CallOnHook', conversationId: this.activeConversationId }); 
      break;

    case CALL_REJECTING: 
      this.UpdateDeviceStatus( ringFlag, false); 
      this.deviceRejectedCall({ name: 'CallRejected', conversationId: this.activeConversationId }); 
      break;  
    }
  }

  // This will set/clear bits in the hardware as needed.
  private UpdateDeviceStatus (flag, value)
  {
    this.deviceStatus = value ? this.deviceStatus | flag : this.deviceStatus & ~flag;
    this.SendCommandToDevice(this.deviceStatus);
  }

  // sends output report to device
  private async SendCommandToDevice ( value: number) {
    this.gCmdBuf[0] = value;
    await this.activeDevice.sendReport(this.headsetOutputReportId, this.gCmdBuf ); 
    this.logger.debug(`CA: Sent Command to Device. Value: ${this.gCmdBuf[0]}`);

    this.gCmdBuf[0] = 0;
  }

//End CA Vendor Implementation class  
}
  








