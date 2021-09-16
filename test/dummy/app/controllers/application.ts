// import { Component, OnDestroy, OnInit } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import ApplicationService from 'services/application';
import HeadsetService from 'services/headset';
import WebRTCService from '../../../../test-app/src/services/webrtc';
import mockCall from '../models/call';

@Component({
  selector: 'test-application',
  templateUrl: '../templates/application.html',
  styleUrls: ['./templates/applicationCache.scss'],
})

// export class TestApplication implements OnInit, OnDestroy {
export class TestApplication implements OnInit {
  currentCall: any = null;
  isNativeApp: boolean;
  connected: boolean;
  ringing: boolean;
  muted: boolean;
  held: boolean;
  eventLogs: any = [];
  eventLogsJson: any;
  audioStream: any;
  microphones: any = [];
  Logger: any;

  constructor(
    private headset: HeadsetService,
    private application: ApplicationService,
    private webrtc: WebRTCService
  ) {}

  async ngOnInit() {
    // const deviceInfo = this.headset.selectedImplementation.deviceInfo; //implement deviceInfo
    this.ringing = this.currentCall?.ringing;
    this.connected = this.currentCall?.connected;
    this.muted = this.currentCall?.muted;
    this.held = this.currentCall?.held;
    this.eventLogsJson = JSON.stringify(this.eventLogs, null, 2);
    this.isNativeApp = this.application.hostedContext.isHosted();
    this.headset.logHeadsetEvents = true;
    // deviceHoldStatusChanged
    // deviceMuteStatusChanged
    // deviceAnsweredCall
    // deviceEndedCall
    // implementation changed
    await this.webrtc.initialize();
    this._updateDeviceList();
    // Some Device change stuff
    window.addEventListener('message', this.receiveMessage.bind(this), false);
  }

  receiveMessage = event => {
    if (event.data.direction === 'jabra-headset-extension-from-content-script') {
      if (event.source === window) {
        return;
      }
      window.postMessage(event.data, '*');
      return;
    }
    if (event.source === window && window.parent !== window) {
      window.parent.postMessage(event.data, '*');
    }
  };

  _updateDeviceList = async () => {
    await this.webrtc.ensureAudioPermissions();
    // const devices = await navigator.mediaDevices.enumerateDevices();
    // this.microphones = devices.filter((device) => device.kind === 'audioinput');
    //equivalent to Ember.run.next
  };

  activateImplementationForMicrophone = mic => {
    if (!mic) {
      return;
    }

    const headset = this.headset;
    const label = mic.label.toLowercase();
    if (label.indexOf('plantronics') > -1 || label.indexOf('plt') > -1) {
      // headset.changeImplementation(headset.plantronics);
    }
    if (label.indexOf('jabra') > -1) {
      if (this.isNativeApp) {
        headset.changeImplementation(headset.jabraNative);
      } else {
        headset.changeImplementation(headset.jabraChrome);
      }
    }
    if (label.indexOf('sennheiser') > -1 || label.indexOf('senn') > -1) {
      headset.changeImplementation(headset.sennheiser);
    }
  };

  handleMuteStatusChanged = value => {
    this.muted = value;
  };

  handleHoldStatusChanged = value => {
    if (value !== true && value !== false) {
      return !this.held;
    }
    this.held = value;
    return this.Logger.info(`The call is now ${value ? ' ' : 'not '} on hold`);
  };

  setMute = value => {
    this.headset.setMute(value);
  };

  setHold = value => {
    this.headset.setHold(this.currentCall.id, value);
  };

  handleHeadsetEvent = ({ name, code }) => {
    this.eventLogs.push({ name, code, time: new Date().toLocaleTimeString() });
  };

  handleHeadsetEndCall = () => {
    this.endCurrentCall();
  };

  handleHeadsetAnswer = () => {
    this.currentCall.answer();
    this.headset.answerCall(this.currentCall.id);
    this.startHeadsetAudio();
  };

  startHeadsetAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: this.webrtc?.getDefaultMicrophone()?.deviceId,
      },
      video: false,
    });

    this.audioStream = stream;
  };

  endHeadsetAudio = async () => {
    const stream = this.audioStream;
    if (!stream) {
      return;
    }

    stream.getTracks().forEach(track => track.stop());
    this.audioStream = null;
  };

  endCurrentCall = () => {
    const call = this.currentCall;
    call.end();
    this.headset.endCall(call.id);
    this.endHeadsetAudio();
    this.currentCall = null;
  };

  changeMic = event => {
    const mic = this.microphones.find(element => element.deviceId === event.target.value);
    this.webrtc.setDefaultMicrophone(mic);
    this.Logger.info('Mic changed', mic);
    this.activateImplementationForMicrophone(mic);
  };

  simulateIncomingCall = () => {
    const call = Object.create(mockCall);
    call.create();
    this.currentCall = call;
    this.headset.incomingCall({ conversationId: call.id, contactName: call.contactName });
  };

  toggleSoftwareMute = () => {
    this.setMute(!this.muted);
  };

  toggleSoftwareHold = () => {
    this.setHold(!this.held);
  };

  answerIncomingCall = () => {
    const call = this.currentCall;
    call.answer();
    this.headset.answerCall(call.id);
    this.startHeadsetAudio();
  };

  endAllCalls = () => {
    this.headset.endAllCalls();
    this.currentCall = null;
    this.endHeadsetAudio();
  };
}
