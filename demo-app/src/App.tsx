import './App.css';
import React = require('react');
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DeviceService from './services/device-service';
import ApplicationService from './services/application-service';
import HeadsetService from '../../src/index';
import MockCall from './models/call';
import AudioVisualizer from './components/audio-visualizer';

const App = () => {
  const { t } = useTranslation();
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [held, setHeld] = useState<boolean>(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  let eventLogs = [] as any;
  const [eventLogsJson, setEventLogsJson] = useState<any>([]);
  const headset = HeadsetService?.getInstance({} as any);
  const webrtc = new DeviceService();
  const appService = new ApplicationService();
  const isNativeApp = appService.isHosted;

  useEffect(() => {
    headset.logHeadsetEvents = true;
    webrtc.initialize();
    _updateDeviceList();
    window.addEventListener('message', receiveMessage.bind(this), false);

    return function cleanup() {
      setCurrentCall(null);
    }
  }, []);

  useEffect(() => {
    if (currentCall) {
      headset.headsetEvents.subscribe(value => {
        switch(value.eventName) {
          case 'implementationChanged':
            handleHeadsetEvent(value.eventData);
            break;
          case 'deviceHoldStatusChanged':
            handleHeadsetEvent(value.eventData);
            toggleSoftwareHold(value.eventData.name === 'Hold', true);
            break;
          case 'deviceMuteStatusChanged':
            handleHeadsetEvent(value.eventData);
            toggleSoftwareMute(value.eventData.name === 'Mute', true);
            break;
          case 'deviceAnsweredCall':
            handleHeadsetEvent(value.eventData);
            answerIncomingCall(true);
            break;
          case 'deviceEndedCall':
            handleHeadsetEvent(value.eventData);
            endCurrentCall(true);
            break;
          default:
            handleHeadsetEvent(value.eventData);
        }
      });
    }
  }, [currentCall]);

  const receiveMessage = (event) => {
    if (event.data.direction === 'jabra-headset-extension-from-content-script') {
      if (event.source === window) {
        return;
      }
      window.postMessage(event.date, '*');
      return;
    }
    if (event.source === window && window.parent !== window) {
      window.parent.postMessage(event.data, '*');
    }
  }

  const _updateDeviceList = async () => {
    await webrtc.ensureAudioPermissions();
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMicrophones(devices.filter((device) => device.kind === 'audioinput'));
    activateImplementationForMicrophone(webrtc.getDefaultMicrophone());
  }

  const activateImplementationForMicrophone = (mic) => {
    if (!mic) {
      return;
    }
    const label = mic.label.toLowerCase();
    if (label.indexOf('plantronics') > -1 || label.indexOf('plt') > -1) {
      headset.changeImplementation(headset.plantronics);
    }
    if (label.indexOf('jabra') > -1) {
      headset.changeImplementation(headset[isNativeApp ? 'jabraNative' : 'jabraChrome']);
    }
    if (label.indexOf('sennheiser') > -1 || label.indexOf('senn') > -1) {
      headset.changeImplementation(headset.sennheiser);
    }
  }

  const handleHeadsetEvent = ({name, code}) => {
    eventLogs.push({name, code, time: new Date().toLocaleTimeString()});
    setEventLogsJson(JSON.stringify(eventLogs, null, 2));
  }

  const startHeadsetAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: webrtc.getDefaultMicrophone()?.deviceId
      },
      video: false
    })
    setAudioStream(stream);
  }

  const endHeadsetAudio = async () => {
    if (!audioStream) {
      return;
    }
    audioStream.getTracks().forEach(track => track.stop());
    setAudioStream(null);
  }

  const endCurrentCall = (fromHeadset?) => {
    const call = currentCall;
    if (call) {
      call.end();
      !fromHeadset && headset.endCall(call.id);
    }
    endHeadsetAudio();
    setCurrentCall(null);
  }

  const changeMic = (event) => {
    const mic = microphones.find(mic => mic.deviceId === event.target.value);
    if (mic) {
      webrtc.setDefaultMicrophone(mic);
      console.info('**** MICROPHONE CHANGED ****', mic);
      activateImplementationForMicrophone(mic);
    }
  }

  const simulateIncomingCall = () => {
    console.log('**** SIMULATING CALL ****');
    const call = new MockCall();
    setCurrentCall(call);
    headset.incomingCall({conversationId: call.id, contactName: call.contactName});
  }

  const answerIncomingCall = (fromHeadset?) => {
    console.log('**** ANSWERING SIMULATED CALL ****');
    currentCall.answer();
    !fromHeadset && headset.answerCall(currentCall.id);
    startHeadsetAudio();
  }

  const endAllCalls = () => {
    headset.endAllCalls();
    setCurrentCall(null);
    endHeadsetAudio();
  }

  const toggleSoftwareMute = (muteToggle, fromHeadset?) => {
    console.log('**** TOGGLING MUTE STATUS ****');
    setMuted(muteToggle);
    !fromHeadset && headset.setMute(muteToggle);
  }

  const toggleSoftwareHold = (holdToggle, fromHeadset?) => {
    console.log('**** TOGGLING HOLD STATUS ****');
    setHeld(holdToggle);
    !fromHeadset && headset.setHold(currentCall.id, holdToggle);
  }

  return (
    <>
      <div className="entry-row">
        <div className="entry-label">
          <i className="ion-ios-world-outline"></i>
        </div>
        <div className="entry-values">
          {/* {t(`dummy.environment.${isNativeApp ? 'native' : 'browser'}`)} */}
          Environment: {isNativeApp ? 'Native App' : 'Browser'}
        </div>
      </div>
      <div className="entry-row">
        <div className="entry-label">
          <i className="ion-mic-a"></i>
        </div>
        <div className="entry-values">
          {/* {t('dummy.currentMicrophone')} */}
          Current Microphone
          <select
            id="microphone-select"
            placeholder="Select microphone"
            onChange={(event) => changeMic(event)}
            className="form-control speakers-select">
              {
                microphones.map(mic => {
                  return (
                    <option value={mic.deviceId}>{mic.label}</option>
                  )
                })
              }
          </select>
        </div>
      </div>
      <div className="entry-row">
          <div className="entry-label">
            <i className="ion-ios-information-outline"></i>
          </div>
          <div className="entry-values">
            {headset.connectionStatus}
          </div>
      </div>

      <div className="entry-row">
        <div className="entry-values">
          {/* <div className="entry-value">{t('dummy.controlInstructions')}</div> */}
          <div className="entry-value">Control simulated calls with these buttons and the buttons on your headset</div>
          <div className="entry-value">
            {/* <button type="button" onClick={() => simulateIncomingCall()}>{t('dummy.button.simulateCall')}</button> */}
            <button type="button" onClick={() => simulateIncomingCall()}>Simulate Incoming Call</button>
            {/* <button type="button" onClick={() => endAllCalls()}>{t('dummy.button.endCall.endAllCalls')}</button> */}
            <button type="button" onClick={() => endAllCalls()}>End All Calls</button>
          </div>
          <div className="entry-value">
            {/* <button disabled={!currentCall} type="button" onClick={() => answerIncomingCall()}>{t('dummy.button.answer')}</button> */}
            {/* <button disabled={!Object.keys(currentCall).length} type="button" onClick={() => answerIncomingCall()}>Answer</button> */}
            <button disabled={!currentCall} type="button" onClick={() => answerIncomingCall()}>Answer</button>
            {/* <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareMute()}>{t(`dummy.button.${currentCall?.muted ? 'un' : ''}mute`)}</button> */}
            {/* <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareMute()}>{currentCall?.muted ? 'Unmute' : 'Mute'}</button> */}
            <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareMute(!muted)}>{muted ? 'Unmute' : 'Mute'}</button>
            {/* <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareHold()}>{t(`dummy.button.${currentCall?.held ? 'resume' : 'hold'}`)}</button> */}
            <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareHold(!held)}>{held ? 'Resume' : 'Hold'}</button>
            {/* <button disabled={!currentCall} type="button" onClick={() => endCurrentCall()}>{t('dummy.button.endCall.endCurrentCall')}</button> */}
            <button disabled={!currentCall} type="button" onClick={() => endCurrentCall()}>End Current Calls</button>
            {/* <button disabled={!Object.keys(currentCall).length} type="button" onClick={() => endCurrentCall()}>End Current Calls</button> */}
          </div>
        </div>
      </div>

      {audioStream &&
        <div className="entry-row">
          <div className="entry-label">
            <i className="ion-mic-a"></i>
          </div>
          <AudioVisualizer audioStream={audioStream} />
        </div>
      }

      <div className="entry-row">
        <div className="entry-label">
          <i className="ion-ios-telephone" />
        </div>
        <div className="entry-values">
          <div className="entry-value">
            {/* {t('dummy.currentCall.callState')} */}
            Call State
          </div>
          <div className="entry-value">
            {currentCall
              ? <>
                  <div>ID: {currentCall.id}</div>
                  {/* <div>{t('dummy.currentCall.contactName')}: {currentCall.contactName}</div> */}
                  <div>Contact Name: {currentCall.contactName}</div>
                  {/* <div>{t('dummy.currentCall.ringing')}: {JSON.stringify(currentCall.ringing)}</div> */}
                  <div>Ringing: {JSON.stringify(currentCall.ringing)}</div>
                  {/* <div>{t('dummy.currentCall.connected')}: {JSON.stringify(currentCall.connected)}</div> */}
                  <div>Connected: {JSON.stringify(currentCall.connected)}</div>
                  {/* <div>{t('dummy.currentCall.muted')}: {JSON.stringify(currentCall.muted)}</div> */}
                  {/* <div>Mute State: {JSON.stringify(currentCall.muted)}</div> */}
                  <div>Mute State: {JSON.stringify(muted)}</div>
                  {/* <div>{t('dummy.currentCall.held')}: {JSON.stringify(currentCall.held)}</div> */}
                  {/* <div>On Hold: {JSON.stringify(currentCall.held)}</div> */}
                  <div>On Hold: {JSON.stringify(held)}</div>
                </>
              // : t('dummy.currentCall.noCall')
              : 'No Call'
            }
          </div>
        </div>
      </div>

      <textarea readOnly value={eventLogsJson}/>

      <div className="entry-row">
        <p>
          <a target="_blank" href="https://help.mypurecloud.com/articles/configure-a-jabra-headset/">Jabra Setup</a>
          <a target="_blank" href="https://help.mypurecloud.com/articles/configure-a-plantronics-headset/">Plantronics Setup</a>
          <a target="_blank" href="https://help.mypurecloud.com/articles/configure-a-sennheiser-headset/">Sennheiser Setup</a>
        </p>
      </div>
    </>
  );
}

export default App;