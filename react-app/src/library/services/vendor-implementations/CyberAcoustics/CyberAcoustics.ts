import { VendorImplementation, ImplementationConfig } from "../vendor-implementation";
import { CallInfo } from '../../..';
import DeviceInfo, { PartialHIDDevice } from "../../../types/device-info";
import { PartialInputReportEvent } from '../../../types/consumed-headset-events';
import { isCefHosted } from "../../../utils";


let hookswFlag = 0x01;
let micMuteFlag = 0x04;
const ringFlag = 0x08;

const defaultFlagSupport = 0x0F;
const muteButtonToggle = 0x13;

// JLChip support
const JLmuteButtonToggle = 0x0203;
const JLFlagSupport = 0x0240;
const JLMicMuteFlag = 0x40;
const JLhookswFlag = 0x0200;

// call states
const CALL_IDLE = 'callIdle';
const CALL_INCOMING = 'callIncoming';
const CALL_ANSWERING = 'callAnswering';
const CALL_REJECTING = 'callRejecting';
const CALL_ACTIVE = 'callActive';
const CALL_END = 'callEnd';
const CALL_OUTGOING = 'callOutgoing';

// CAStateEvents
const ca_st_event_hooksw_on = 0;
const ca_st_event_answerConfirm = 1;
const ca_st_event_incomingCall = 2;
const ca_st_event_callEnd = 3;
const ca_st_event_hooksw_off = 5;
const ca_st_event_busy = 6;
const ca_st_event_call_answer = 7;
const ca_st_event_outgoingCall = 8;

// CADeviceEvents
const ca_dev_event_hooksw_on = 0x01;
const ca_dev_event_hooksw_off = 0x00;
const ca_dev_event_busy = 0x02;
const ca_dev_event_ans_confirm = 0x02;

const PHONE_USAGE = 0x0001;
const HEADSET_USAGE = 0x0005;
const HEADSET_USAGE_PAGE = 0x000B;

export default class CyberAcousticsService extends VendorImplementation {
  private static instance: CyberAcousticsService;

  vendorName = 'CyberAcoustics';
  private activeConversationId: string;
  private _deviceInfo: DeviceInfo = null;
  activeDevice: any;

  private numDeviceEventListeners = 0;

  private currentProductID = null;
  private headsetOutputReportId = 3;
  private headsetInputReportId  = 3;
  private vendorInputReportId   = 4;

  private currentState = 0x00;
  private isHolding = false;
  private currentlDeviceLabel: string;

  private currentCallInfo: CallInfo;
  protected currentCallState = CALL_IDLE;
  private deviceStatus = 0;

  protected gCmdBuf = new Uint8Array( [0x00, 0x00]);

  private inputReportReportId = 0x03;
  private outputReportReportId = 0x03;

  private JLCommandSet = false;
  private callControlSuport = true;

  private flagSupport = defaultFlagSupport;
  private handeledInputReportIds = [this.headsetInputReportId, this.vendorInputReportId];

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

    return ['ac-104enc', 'ac-204enc', 'ac-304','foundever',
      'ca essential', 'ca-2890'].some(searchVal => lowerLabel.includes(searchVal));
  }

  // Connect: Attempt to connect to the device
  async connect (originalDeviceLabel: string): Promise<void> {
    //// DEBUG CODE ////
    // uncomment to test Forgetdevice with requestWebHidPermissions

    // const devicesListTest = await (window.navigator as any).hid.getDevices({
    //   filters: [{ vendorId: 0x3391 },],
    // });
    // if(devicesListTest.length > 0){
    //   const deviceTest = devicesListTest[0];
    //   deviceTest.forget();
    // }

    //// END DEBUG CODE ////

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
    this.selectDevice(devList, originalDeviceLabel);

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

    //// DEBUG CODE uncomment to test initial connect fail
    //this.activeDevice.close();
    //bConnectSuccess = false;
    ////

    if(!bConnectSuccess) {
      try{
        bConnectSuccess = await new Promise((resolve, reject) => {
          const HIDPermissionTimeout = setTimeout(reject, 30000);
          this.requestWebHidPermissions(async () => {
            this.logger.debug("Requesting web HID permissions");
            const productId = this.deductProductId(originalDeviceLabel);

            const devList = await (window.navigator as any).hid.requestDevice({
              filters: [
                {
                  vendorId: 0x3391,
                  //vendorId: 0x046D,
                  productId: productId || undefined
                },
              ],
            });
            clearTimeout(HIDPermissionTimeout);
            const deviceFound = await this.connectFromHidPermissions(devList, originalDeviceLabel);
            if(deviceFound){
              /* istanbul ignore next */
              if (chrome && chrome?.runtime) {
                console.log('mMoo: Chrome and Runtime existed, sending message');
                chrome?.runtime?.sendMessage('newDevice');
              }

              resolve(deviceFound);
            }
            else
            {
              reject();
            }
            console.debug(`CA: requestWebHidPermissions device found = ${ deviceFound } `);
          });
        });
      } catch (error) {
        this.isConnecting && this.changeConnectionStatus({ isConnected: this.isConnected, isConnecting: false });
        this.logger.error('CA: WebHID permissions denied');
        return;
      }
    //
    }
  }
  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  async connectFromHidPermissions (devList: any, originalDeviceLabel: string): Promise<boolean>
  /* eslint-enable */
  {

    this.activeDevice = null;
    this.selectDevice(devList, originalDeviceLabel);

    if(this.activeDevice) {
      // Open the device
      if (!this.activeDevice.opened) {
        await this.activeDevice.open();
      }
      if(this.activeDevice.opened) {
        // SUCESSFUL connection!
        this.handleDeviceConnect();
        this.logger.debug("CA: Connect SUCCESS- from HIDWebPermission request ");
        return true;
      }
      else{
        this.logger.debug("CA: Connect FAIL requesting WebHID permissions");
        return false;
      }
    }
  }

  // Called when the device sends an input report
  handleInputReport (event: PartialInputReportEvent): void {
    const reportID = event.reportId;
    // If reportId is not in the list, return immediately
    if (!this.handeledInputReportIds.includes(reportID)) {
      return;
    }

    const byte0 = event.data.getUint8(0);
    const byte1 = event.data.getUint8(1);

    ////this.logger.debug(`CA Received Input Report #${event.reportId}. byte0 = ${byte0}, byte1 = ${byte1}`);

    // Process device input
    const wordCommand = (byte1 << 8) + byte0;
    this.logger.debug(`CA received button press ${ this.formatHex(wordCommand) } reportID ${reportID} from Device`);
    this.handleDeviceButtonPress(wordCommand, reportID);
  }

  // called on sucessful connect to do initialization work
  async handleDeviceConnect (): Promise<void>
  {
    this._deviceInfo = {
      ProductName: this.activeDevice.productName,
    };

    this.handleInputReport = this.handleInputReport.bind(this);
    //
    this.activeDevice.addEventListener('inputreport', this.handleInputReport);
    this.numDeviceEventListeners++;
    console.debug(`Installed Device Input listener, num listeners = ${this.numDeviceEventListeners} `);
    if(this.numDeviceEventListeners > 1 )
    {
      this.logger.debug(`%c CA: ********************************************************`, 'color: red');
      this.logger.debug(`%c CA: *****WARNING ***** MULTIPLE EVENT LISTENERS ON DEVICE!!!`, 'color: red');
      this.logger.debug(`%c CA: ********************************************************`, 'color: red');
    }

    this.currentProductID = this.activeDevice.productId;
    this.logger.debug(`Product ID: 0x${this.currentProductID.toString(16)}`);

    this.currentCallState = CALL_IDLE;

    // This could potentially change with different products, but for now this is
    // constant across all products.
    this.headsetOutputReportId = this.outputReportReportId;
    this.headsetInputReportId  = this.outputReportReportId;
    this.vendorInputReportId   = 4;

    this.handeledInputReportIds = [this.headsetInputReportId, this.vendorInputReportId];


    switch(this.currentProductID )
    {
    case 0x04: // BT1500
      this.flagSupport = JLFlagSupport;
      this.JLCommandSet = true;

      hookswFlag  = JLhookswFlag;
      micMuteFlag = JLMicMuteFlag;
      break;

    case 0x18 : // ac-304
      this.flagSupport = 0x05;
      break;

    default:
      this.flagSupport = defaultFlagSupport;
      break;
    }

    this.logger.debug( `flagSupport = ${ this.formatHex(this.flagSupport) } `);
    this.changeConnectionStatus({ isConnected: true, isConnecting: false });
  }

  selectDevice (devList: PartialHIDDevice[], originalDeviceLabel : string): boolean {
    this.logger.debug("CA: SelectDevice");

    const deviceLabel = originalDeviceLabel.toLowerCase();

    let deviceFound = false;
    devList.forEach(device => {
      if (deviceLabel.includes(device?.productName?.toLowerCase())) {
        for (const collection of device.collections) {
          if ( (collection.usage === HEADSET_USAGE || collection.usage === PHONE_USAGE ) &&
            (collection.usagePage === HEADSET_USAGE_PAGE ))  {
            this.activeDevice = device;
            deviceFound = true;
            if (collection.inputReports.length !== 0) {
              this.inputReportReportId = collection.inputReports[0].reportId;
              this.logger.debug(`CA inputReportReportId = ${this.inputReportReportId}`);
            }
            if (collection.outputReports.length !== 0) {
              this.outputReportReportId = collection.outputReports[0].reportId;
              this.logger.debug(`CA outputReportReportId = ${this.outputReportReportId}`);
            }
            break;
          }
        }
      }
    });
    return deviceFound;
  }

  async disconnect (): Promise<void> {
    if (this.activeDevice) {
      this.logger.debug(`CA: Disconnecting`);
      this.ChangeCallState(CALL_END);
      this.ChangeCallState(CALL_IDLE);

      if(this.isMuted)
      {
        this.setMute(false);
        this.deviceMuteChanged({
          isMuted: false,
          name: 'CallUnmuted'
        });
      }

      ////
      this.activeDevice.removeEventListener('inputreport', this.handleInputReport); 
      this.numDeviceEventListeners--;
      console.debug(`Removed Device Input listener, num listeners = ${this.numDeviceEventListeners} `);
      ////
      await this.activeDevice.close();
      this.logger.debug(`CA: Device closed`);
      this.activeDevice = null;
      this._deviceInfo = null;

      this.currentCallState = CALL_IDLE;

      if (this.isConnected || this.isConnecting) {
        this.changeConnectionStatus({ isConnected: false, isConnecting: false });
      }
    }
  }

  async incomingCall (callInfo: CallInfo): Promise<void> {
    this.logger.debug("CA: incomingCall");
    this.currentCallInfo = callInfo;
    this.activeConversationId = callInfo.conversationId;
    this.ParseStateEvents(ca_st_event_incomingCall);
  }

  async outgoingCall (callInfo: CallInfo): Promise<void> {
    this.logger.debug("CA: outgoingCall");
    this.currentCallInfo = callInfo;
    this.activeConversationId = callInfo.conversationId;
    this.ParseStateEvents(ca_st_event_outgoingCall);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async answerCall (conversationId: string, autoAnswer?: boolean): Promise<void> {
    this.logger.debug("CA: Answer Call from UI");
    this.activeConversationId = conversationId;
    if( autoAnswer)
    { // let the state machine know there is an incoming call
      this.logger.debug("CA: AutoAnswer");
      this.ParseStateEvents(ca_st_event_incomingCall);
    }

    // answer call
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

  handleDeviceButtonPress (wordCommand: number, reportID: number): void {
    if (!this.activeDevice) {
      this.logger.error('do not have active device');
      return;
    }

    if(reportID === this.headsetInputReportId )
    {
      if( this.currentProductID === 0x18 ) //ac-304
      {

        switch (wordCommand)
        {

        case 0x1:
        case 0x05:
          this.isMuted = !this.isMuted;
          this.deviceMuteChanged({
            isMuted: this.isMuted,
            name: this.isMuted ? 'CallMuted' : 'CallUnmuted'
          });

          // Don't do this- updateDeviceStatus instead
          // this.setMute(this.isMuted);

          this.UpdateDeviceStatus (micMuteFlag, this.isMuted);
          this.logger.debug(`CA: AC304 Mute update micMuteFlag = ${ this.formatHex(micMuteFlag) } this.isMuted = ${this.isMuted}`);

          break;
        }
        return;


        // This mode of operation will be enabled in a future firmware release
        // switch (wordCommand)
        // {
        // case 0x01:  this.isMuted = false; break;
        // case 0x05:  this.isMuted = true;  break;
        // }

        // this.deviceMuteChanged({
        //   isMuted: this.isMuted,
        //   name: this.isMuted ? 'CallMuted' : 'CallUnmuted'
        // });

        // // send command back to device
        // this.setMute(this.isMuted);

        // return;
      }

      switch (wordCommand)
      {
      case JLmuteButtonToggle :  // 0x0203
      case muteButtonToggle:     // 0x13
        this.isMuted = !this.isMuted;
        this.deviceMuteChanged({
          isMuted: this.isMuted,
          name: this.isMuted ? 'CallMuted' : 'CallUnmuted'
        });

        // send mute or unmute command back to device
        // this seems to help debounce button presses
        this.setMute(this.isMuted);

        break;

      // call rejected if call incoming
      case ca_dev_event_hooksw_off: //0x00
        this.ParseStateEvents(ca_st_event_hooksw_off);
        break;

      // Answer Incomming Call
      case ca_dev_event_hooksw_on : //0x01
        this.ParseStateEvents(ca_st_event_hooksw_on);
        break;

      // hang up
      case ca_dev_event_busy: //0x02
        this.ParseStateEvents(ca_st_event_busy);
        break;

      }
    }
    else if( reportID === this.vendorInputReportId)
    {
      switch (wordCommand)
      {
      case ca_dev_event_ans_confirm : //0x02
        this.ParseStateEvents(ca_st_event_answerConfirm);
        break;
      }
    }
    else
    {
      console.debug(`CA: Unhandeled input report #${reportID.toString(16)}`);
    }

  } // handleDeviceButtonPress


  // This is the main call control engine.  State dependant events from the device
  // and/or the UI are handled here.
  ParseStateEvents (CAStateEvent: number): void
  {
    switch(this.currentCallState)
    {
    case  CALL_IDLE:
      switch(CAStateEvent)
      {
      case ca_st_event_incomingCall:
        this.ChangeCallState(CALL_INCOMING);
        break;

      case ca_st_event_outgoingCall:
        this.ChangeCallState(CALL_OUTGOING);
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

    case  CALL_OUTGOING:
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
  ChangeCallState (newstate: string): void
  {
    this.logger.debug(`%cCA SETTING STATE: ${newstate}`, 'color: red');
    this.currentCallState = newstate;
    switch(this.currentCallState)
    {
    case CALL_IDLE:
      this.deviceStatus = 0;
      break;

    case CALL_INCOMING:
      this.UpdateDeviceStatus(ringFlag, true);
      break;

    case CALL_OUTGOING:
    case CALL_ANSWERING:
      this.UpdateDeviceStatus(hookswFlag, true);
      // if call answered muted, unmute
      if(this.isMuted)
      {
        this.setMute(false);
        this.deviceMuteChanged({
          isMuted: false,
          name: 'CallUnmuted'
        });
      }
      break;

    case CALL_ACTIVE:
      this.UpdateDeviceStatus(ringFlag, false);

      this.deviceAnsweredCall({ name: 'CallOffHook', conversationId: this.activeConversationId });
      break;

    case CALL_END:
      this.UpdateDeviceStatus(hookswFlag, false);
      this.deviceEndedCall({ name: 'CallOnHook', conversationId: this.activeConversationId });
      break;

    case CALL_REJECTING:
      this.UpdateDeviceStatus(ringFlag, false);
      this.deviceRejectedCall({ name: 'CallRejected', conversationId: this.activeConversationId });
      break;
    }
  }

  // This will set/clear bits in the hardware as needed.
  UpdateDeviceStatus (flag: number, value: boolean): void
  {
    if(!(flag & this.flagSupport)) {
      console.debug(`CA: UpdateDeviceStatus called with unsupported flag ${flag.toString(16)}... returning`);
      return;
    }

    this.deviceStatus = value ? this.deviceStatus | flag : this.deviceStatus & ~flag;
    this.SendCommandToDevice(this.deviceStatus);
  }

  // ResetDeviceStatus ()
  // {
  //   this.deviceStatus = 0x0000;
  //   this.SendCommandToDevice(this.deviceStatus);
  // }

  // sends output report to device
  async SendCommandToDevice ( value: number): Promise<void> {
    if(this.JLCommandSet)
    {

      this.gCmdBuf[0] = value >> 8;
      this.gCmdBuf[1] = value & 0x00ff;

    }
    else
    {
      this.gCmdBuf[0] = value;
    }
    ////this.logger.debug(`CA: Command assembled: ${this.gCmdBuf[0].toString(16)},  ${this.gCmdBuf[1].toString(16)} `);
    ////this.logger.debug(`CA: reportID ${this.headsetOutputReportId.toString(16)} `);
    await this.activeDevice.sendReport(this.headsetOutputReportId, this.gCmdBuf );
    this.logger.debug(`CA: Sent Command to Device. Value: ${ this.formatHex(this.gCmdBuf[0])},  ${ this.formatHex(this.gCmdBuf[1])} `);

    this.gCmdBuf[0] = 0;
    this.gCmdBuf[1] = 0;
  }

  formatHex (value:number): string {
    return `0x${value.toString(16).padStart(2, '0')}`;
  }

  // Creates a mock device that is in scope for Jest tests that
  // require this.activeDevice to be valid
  async HidMockDeviceInit (): Promise<PartialHIDDevice>
  {
    const deviceLists: PartialHIDDevice[] = await (window.navigator as any).hid.getDevices();
    this.activeDevice = deviceLists[0];
    return this.activeDevice;
  }
  ////
  // Getter and Setter for currentCallState
  get _currentCallState (): string {
    return this.currentCallState;
  }

  set _currentCallState (s: string) {
    this.currentCallState = s;
  }
  // Getter and Setter for deviceStatus
  get _deviceStatus (): number {
    return this.deviceStatus;
  }

  set _deviceStatus (s: number) {
    this.deviceStatus = s;
  }

  // Getter  for activeConversationId
  get _activeConversationId (): string {
    return this.activeConversationId;
  }

  // Getter for currentCallInfo
  get _currentCallInfo (): CallInfo {
    return this.currentCallInfo;
  }

  // Getter for isHolding
  get holdState (): boolean {
    return this.isHolding;
  }

  get _headsetInputReportId (): number {
    return this.headsetInputReportId;
  }

  get _vendorInputReportId (): number {
    return this.vendorInputReportId;
  }


  get _headsetOutputReportId (): number {
    return this.headsetOutputReportId;
  }


  get muteState (): boolean {
    return this.isMuted;
  }

  set muteState (s: boolean) {
    this.isMuted = s;
  }

  set _JLCommandSet (s: boolean) {
    this.JLCommandSet= s;
  }

  set _handeledInputReportIds (id: number) {
    this.handeledInputReportIds[0] = id;
  }

  set _flagSupport (val: number) {
    this.flagSupport = val;
  }

  set _currentProductID (val: number) {
    this.currentProductID = val;
  }

} // End CA Vendor Implementation class