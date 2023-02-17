// Poly | HP WebHID SDK - TypeScript version
// Allows you to add call control to Softphones/Contact Center Solutions for Poly | HP 
// headsets and speaker devices
// Version 0.1
// 16th Feb 2023
//
// *** 
// WARNING !!! This source code is provided As Is! It is intended as a sample 
// code to show ways of integrating your browser-based Softphones and Contact Center 
// apps with Poly | HP devices using Google WebHID API (in Chromium-based browsers). 
// However, in case of problems please feel free to contact us through our developer
// portal at this address:
// https://developers.hp.com/
// ***
//
// Version history:
// --
// 0.1, 16th Feb 2023
// Comment: Initial version
// --

import { EventEmitter } from 'events'

/**
 * PolyHPWebHIDSDK - This WebHid library provides high level support for call control and mute syncronization using standard hid telephony usages.
 */
export class PolyHPWebHIDSDK {

    // fields:
    private event$: EventEmitter = new EventEmitter()
    private device$ = null;
    private outputs = new Map<string, any>();
    private inputs = new Map<string, any>();
    // List of output reports for telephony call control
    private outputUsageMap = {
        0x08: {
            0x09: 'oLEDMute',
            0x17: 'oLEDHook',
            0x18: 'oLEDRing',
            0x20: 'oLEDHold',
        },
    }
    // List of output reports for telephony call control
    private inputUsageMap = {
        0x0b: {
            0x20: 'iTelHook',
            0x21: 'iTelFlash',
            0x2f: 'iTelMute',
        },
    }

    // headset state
    public ledmute = false;
    public ledhook = false;
    public ledring = false;
    public ledhold = false;
    // headset momentary input flags
    private flashmomentaryon = false;

    private HEADSET_USAGE_PAGE = 0x000B; // note, initially match any device with usage page 0xb which is the Telephony input usage page

    public constructor() {
    }

    answerCall() {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        this.ledring = false;
        this.ledmute = false;
        this.ledhook = true;
        this.sendOpToDevice('oLEDRing', this.ledring);
        this.sendOpToDevice('oLEDHook', this.ledhook);
        this.sendOpToDevice('oLEDMute', this.ledmute);
    }

    incomingCall() {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        this.ledring = true;
        this.sendOpToDevice('oLEDRing', this.ledring);
    }

    rejectCall() {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        this.ledring = false;
        this.sendOpToDevice('oLEDRing', this.ledring);
    }

    setMute(value) {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        this.ledmute = value;
        this.sendOpToDevice('oLEDMute', this.ledmute);
    }

    setHold(value) {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        if (value) {
            // set hold reminder on headset
            this.ledhold = value;
            this.sendOpToDevice('oLEDHold', this.ledhold);
            // set hook to false
            this.ledhook = !value;
            this.sendOpToDevice('oLEDHook', this.ledhook);
        }
        else {
            // test: try just setting hook to 1
            this.ledhook = true;
            this.ledmute = false;
            this.ledring = false;
            this.ledhold = false;
            this.sendOpToDevice('oLEDRing', this.ledring);
            this.sendOpToDevice('oLEDHook', this.ledhook);
            this.sendOpToDevice('oLEDMute', this.ledmute);
            this.sendOpToDevice('oLEDHold', this.ledhold);
        }
    }

    endCall() {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        this.ledmute = false;
        this.sendOpToDevice('oLEDMute', this.ledmute);
        this.ledhook = false;
        this.sendOpToDevice('oLEDHook', this.ledhook);
        this.ledhold = false;
        this.sendOpToDevice('oLEDHold', this.ledhold);
    }

    /**
     * sendOpToDevice
     * @param opName Provide the operation name you want to send to device out of oLEDHook, oLEDMute, oLEDRing, oLEDHold
     * @returns nothing
     */
    async sendOpToDevice(opName, value) {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }
        let bit = 0;
        let value1 = Number(value);
        if (opName in this.outputs) bit |= value1 << this.outputs[opName]['reportPos'];
        console.log('OUTPUT (' + opName + ')' + ", value = " + value1);
        // Send the report to the device.
        await this.device().sendReport(this.outputs[opName]['reportId'], new Uint8Array([bit, 0x00]));
    }

    async getDevicesList() {
        let devices = await (window.navigator as any).hid.getDevices();
        return devices;
    }

    async closeMatchingDevice(aDevice) {
        let retval = false;
        if (this.device() && this.device().opened) {
            if (aDevice == this.device()) {
                await this.device().close();
                this.device$ = null;
                retval = true;
            }
        }
        return retval;
    }

    public async connectByStoredDeviceId() {
        var devicetemp = null;

        var lastDevice = localStorage.getItem('PolyHPWebHIDSDK:lastDevice');
        if (lastDevice == null) {
            console.log('No stored last device id was found in a local storage item called: PolyHPWebHIDSDK:lastDevice');
            return null;
        }
        console.log('last device id was: ' + lastDevice);

        // see if last device matches a hid device in getDevices
        console.log('attached devices are: ');
        var devices = await (window.navigator as any).hid.getDevices();
        for (var i = 0; i < devices.length; i++) {
            console.log(devices[i].productId);
            if (devices[i].productId == lastDevice) {
                console.log('hid device in getDevices matches last device');

                devicetemp = devices[i];
            }
        }
        if (!devicetemp) {
            console.log('No stored last device was found in attached devices');
            return null;
        }

        if (await this.openDevice(devicetemp)) {
            console.log('opened device: ' + devicetemp.productName);
        }
        else {
            console.log('failed to open device: ' + devicetemp.productName + ', does it have no telephony usage support?');
            devicetemp = null; // return null to indicate no device was connected
        }

        return devicetemp;
    }

    public async connectByDeviceLabel(aDeviceLabel) {
        var devicetemp = null;
        const deviceLabel = aDeviceLabel.toLowerCase();

        // see if deviceLabel matches a hid device in getDevices
        console.log('attached devices are: ');
        var devices = await (window.navigator as any).hid.getDevices();
        for (var i = 0; i < devices.length; i++) {
            console.log(devices[i].productId);
            if (!this.device()) { // only if we haven't got one already then connect to a matching device
                if (deviceLabel.includes(devices[i].productName?.toLowerCase())) {
                    console.log('hid device in getDevices matches deviceLabel ' + deviceLabel);
                    devicetemp = devices[i];
                }
            }
        }
        if (!devicetemp) {
            console.log('No matching device was found in attached devices for device label ' + deviceLabel);
            return null;
        }

        if (await this.openDevice(devicetemp)) {
            console.log('opened device: ' + devicetemp.productName);
        }
        else {
            console.log('failed to open device: ' + devicetemp.productName + ', does it have no telephony usage support?');
            devicetemp = null; // return null to indicate no device was connected
        }

        return devicetemp;
    }

    public async connectByUserRequest() {
        var devicetemp = null;

        let filters = [];
        filters.push({ usagePage: this.HEADSET_USAGE_PAGE });

        [devicetemp] = await (window.navigator as any).hid.requestDevice({ filters: filters });
        if (!devicetemp) {
            console.log('chooser dismissed without a selection');
            return null;
        }

        if (await this.openDevice(devicetemp)) {
            console.log('opened device: ' + devicetemp.productName);
        }
        else {
            console.log('failed to open device: ' + devicetemp.productName + ', does it have no telephony usage support?');
            devicetemp = null; // return null to indicate no device was connected
        }
        return devicetemp;
    }

    public async openDevice(devicetemp) {
        let retval = false;

        // Open the device
        try {
            await devicetemp.open();
            if (!devicetemp.opened) {
                console.log('open failed');
                return retval;
            }
        }
        catch (error) {
            console.log('error occured while opening hid device');
            return retval;
        }

        console.log('Opened device: ' + devicetemp.productName);

        // store last connected for auto reconnect
        localStorage.setItem('PolyNiceMax:lastDevice', JSON.stringify(devicetemp.productId));

        retval = this.enumerateDevice(devicetemp); // returns true if it matches telephony usage, and also sets device$ global

        if (retval) { // if it enumerated telephony usage:
            // Register an input report event listener on our device$ global
            this.device$.oninputreport = (event) => this.onInputReport(event);
        }
        return retval; // return boolean indicates if we opened and it enumerated the telephony usage (in which case devicetemp is now in our device$ global and registered for input reports)
    }

    getDeviceName() {
        if (this.device() && this.device().opened) {
            return this.device().productName;
        }
        else {
            return "no device";
        }
    }

    async disconnect() {
        let retval = false;
        // Close the device
        if (!this.device() || !this.device().opened) {
            console.log('open device first');
            return retval;
        }
        retval = true;
        console.log('Closing device: ' + this.device().productName);
        await this.device().close();
        this.device$ = null;
        console.log('Device closed');
        return retval;
    }

    // Convert ArrayBuffer to a hex string
    buf2hex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    onInputReport(event) {
        console.log("input received: report id = " + event.reportId);
        let handle = false;
        let k;
        let value, hookSwitch, phoneMute, phoneFlash;
        for (k in this.inputs) {
            if (this.inputs[k].reportId == event.reportId) {
                handle = true;
                value = (event.data.getUint8(0) & (1 << this.inputs[k].reportPos)) != 0;
                console.log('************ >> ' + k + " = " + value);
                switch (k) {
                    case 'iTelHook':
                        hookSwitch = value;
                        break;
                    case 'iTelMute':
                        phoneMute = value;
                        break;
                    case 'iTelFlash':
                        phoneFlash = value;
                        break;
                }
            }
        }
        // TODO: set a breakpoint here and try the Flash button, and see what HID usages you get
        if (handle) {
            this.processBtnPress(hookSwitch, phoneMute, phoneFlash, event.reportId);
        }
    }

    processBtnPress(hookSwitch, phoneMute, phoneFlash, reportId) {
        if (!this.device() || !this.device().opened) {
            console.log('Connect first!');
            return;
        }

        console.log(`User pressed button: hookSwitch = ${hookSwitch}, phoneMute = ${phoneMute}, phoneFlash = ${phoneFlash}`);
        let buf = ''; // string to capture info about received events

        if (phoneFlash) { // this is the value 1 of a Tel Flash=1/0 one shot
            buf += ' flash to hold or resume';
            this.flashmomentaryon = true;
            // note, held bit toggle will be done once held state is toggled in softphone
            // toggle the held state in softphone:
            //this.ledhold=!this.ledhold; // toggle the hold state
            //this.setHold(this.ledhold); // tell the headset about it
            this.event().emit(!this.ledhold ? "OnHold" : "ResumeCall");
        }
        else if (hookSwitch == true) {
            /* USE CASE: call answer */
            if (!this.ledhook && this.ledring) {
                buf += ' off-hook to answer ringing call';
                this.answerCall();
                this.event().emit("OffHook");
            }
            else {
                buf += ' off-hook, no action to take';
            }
        }
        else if (hookSwitch == false) {
            // adding case for call was held
            if (this.ledhold || this.flashmomentaryon) {
                /* USE CASE: call was held, so hook becomes false, but don't hangup call */
                buf += ' on-hook call held, no action to take';
                // no action
                this.flashmomentaryon = false;
            }
            else if (this.ledring) { // are we ringing, then this is a call reject
                /* USE CASE: call end */
                buf += ' on-hook to reject incoming';
                this.event().emit("Reject");
            }
            else {
                /* USE CASE: call end */
                buf += ' on-hook';
                if (this.ledhook) {
                    // note: the HID hangup state will occur once softphone confirms disconnect state change
                    // terminate softphone call
                    this.endCall();
                    this.event().emit("OnHook");
                }
            }
        }
        if (phoneMute == true) { // this is the value 1 of a Tel Mute=1/0 one shot
            /* USE CASE: call mute/unmute */
            buf += ' user doing: ' + this.ledmute ? "mute" : "unmute";
            // note: the HID mute toggle will occur once softphone confirms mute state change
            // toggle softphone mute state
            this.ledmute = !this.ledmute;
            this.setMute(this.ledmute);
            this.event().emit(this.ledmute ? "CallMuted" : "CallUnmuted");
        }
        console.log('INPUT ' + this.hexByte(reportId) + ': ' + buf);
    }

    hexByte(d) {
        var hex = Number(d).toString(16);
        while (hex.length < 2)
            hex = "0" + hex;
        return hex;
    }

    enumerateDevice(aDevice) {
        let retval = false;
        // if it finds a match for telephony, it should set aDevice param into device global
        console.log(`in enumerateDevice`);

        var telephonyCollection = null;
        var collectionnum;

        for (collectionnum = 0; collectionnum < aDevice.collections.length; collectionnum++) {
            // is it the telephony page?
            if (aDevice.collections[collectionnum].usagePage == 0x0b) {
                if (!telephonyCollection) {
                    telephonyCollection = aDevice.collections[collectionnum];
                }
            }
        }
        if (!telephonyCollection) {
            console.log(`Error: Couldn't find telephony collection`);
            return retval;
        }
        else {
            retval = true;
            this.device$ = aDevice; // found match
            var q, reportPos, x, y, usagePage, usage;
            for (q = 0; q < telephonyCollection.outputReports.length; q++) {
                reportPos = 0;
                for (x = 0; x < telephonyCollection.outputReports[q].items.length; x++) {
                    for (y = 0; y < telephonyCollection.outputReports[q].items[x].usages.length; y++) {
                        usagePage = (telephonyCollection.outputReports[q].items[x].usages[y] & 0xFF0000) >> 16
                        usage = (telephonyCollection.outputReports[q].items[x].usages[y] & 0x0000FF)
                        if (usagePage in this.outputUsageMap) {
                            if (usage in this.outputUsageMap[usagePage]) {
                                this.outputs[this.outputUsageMap[usagePage][usage]] = {
                                    "reportId": telephonyCollection.outputReports[q].reportId,
                                    "reportPos": reportPos
                                }
                                console.log("output usage: 0x" + this.hexByte(usagePage) + ", usage: 0x" + this.hexByte(usage) + "(" + this.outputUsageMap[usagePage][usage] + "), pos: " + reportPos);
                            }
                        }
                        reportPos += telephonyCollection.outputReports[q].items[x].reportSize;
                    }
                }
            }
            for (q = 0; q < telephonyCollection.inputReports.length; q++) {
                reportPos = 0;
                for (x = 0; x < telephonyCollection.inputReports[q].items.length; x++) {
                    for (y = 0; y < telephonyCollection.inputReports[q].items[x].usages.length; y++) {
                        usagePage = (telephonyCollection.inputReports[q].items[x].usages[y] & 0xFF0000) >> 16
                        usage = (telephonyCollection.inputReports[q].items[x].usages[y] & 0x0000FF)
                        if (usagePage in this.inputUsageMap) {
                            if (usage in this.inputUsageMap[usagePage]) {
                                this.inputs[this.inputUsageMap[usagePage][usage]] = {
                                    "reportId": telephonyCollection.inputReports[q].reportId,
                                    "reportPos": reportPos
                                }
                                console.log("input usage: 0x" + this.hexByte(usagePage) + ", usage: 0x" + this.hexByte(usage) + "(" + this.inputUsageMap[usagePage][usage] + "), pos: " + reportPos);
                            }
                        }
                        reportPos += telephonyCollection.inputReports[q].items[x].reportSize;
                    }
                }
            }
        }
        return retval;
    }

    initSDK() {
        if (!(window.navigator as any).hid) {
            console.log('navigator.hid not defined - Use latest Chrome version that includes Google Hid feature.');
        }
        else {
            (window.navigator as any).hid.addEventListener("connect", this.handleConnectedDevice);
            (window.navigator as any).hid.addEventListener("disconnect", this.handleDisconnectedDevice);
        }
    }

    handleConnectedDevice(e) {
        ("Device connected: " + e.device.productName + ", id = " + e.device.productId);
        if (!this.device() || !this.device().opened) {
            // there is no connection, so try to connect to poly last saved...
            console.log('there is no connection, so try to connect to this device');
            this.connectByStoredDeviceId();
        }
    }

    async handleDisconnectedDevice(e) {
        console.log("Device disconnected: " + e.device.productName);
        if (this.closeMatchingDevice(e.device)) {
            console.log('Closed the disconnected device');
        }
    }

    // getters:

    /**
    * @returns Active device or null.
    */
    public device(): any | null {
        return this.device$
    }

    /**
     * @returns EventEmitter
     */
    public event() {
        return this.event$
    }
}