import './App.css';
import React = require('react');
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HeadsetService from '../../src/services/headset';
import ApplicationService from '../src/services/application';
import WebRTCService from '../src/services/webrtc';
import mockCall from '../../test/dummy/app/models/call';
import AudioVisualizer from '../src/components/audioVisualizer';

const App = () => {
  const { t } = useTranslation();
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState();
  const [muted, setMuted] = useState<boolean>(false);
  const [held, setHeld] = useState<boolean>(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  let eventLogs = [] as any;
  const eventLogsJson = JSON.stringify(eventLogs, null, 2);
  const headset = HeadsetService.getInstance();
  const webrtc = new WebRTCService();
  const isNativeApp = ApplicationService?.hostedContext?.isHosted();
  headset.headsetEvents.subscribe(value => {
    switch(value.eventName) {
      case 'implementationChanged':
        eventLogs = [];
        //handleHeadsetEvent();
        break;
      case 'deviceHoldStatusChanged':
        // handleHeadsetEvent();
        setHeld(!held);
        break;
      case 'deviceMuteStatusChanged':
        // handleHeadsetEvent();
        setMuted(!muted);
        break;
      case 'deviceAnsweredCall':
        // handleHeadsetEvent();
        answerIncomingCall();
        break;
      case 'deviceEndedCall':
        // handleHeadsetEvent();
        endCurrentCall();
        break;
      default:
        // Logger.warn('Unknown event taken place');
    }
  });
  // const deviceInfo = headset.selectedImplementation.deviceInfo;

  useEffect(() => {
    console.log('rendered component');
    headset.logHeadsetEvents = true;
    //implement observable check. headSetEvents is an observable
    //subscribe to those changes and fire accordingly?
    //All the below events exist as HeadsetEvents

    //deviceHoldStatusChanged uses handleHoldStatusChange
    //deviceMuteStatusChanged uses handleMuteStatusChange
    //deviceAnsweredCall uses handleHeadsetAnswer
    //deviceEndedCall uses handleHeadsetEndCall
    //implementation uses handleHeadsetEvent

    webrtc.initialize();
    _updateDeviceList();
    window.addEventListener('message', receiveMessage.bind(this), false);
  }, []);

  useEffect(() => {
    // setDeviceInfo(headset.selectedImplementation.deviceInfo);
  }, [headset.selectedImplementation])

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
      // headset.changeImplementation(headset.plantronics);
    }
    if (label.indexOf('jabra') > -1) {
      headset.changeImplementation(headset[isNativeApp ? 'jabraNative' : 'jabraChrome']);
    }
    if (label.indexOf('sennheiser') > -1 || label.indexOf('senn') > -1) {
      headset.changeImplementation(headset.sennheiser);
    }
    // setDeviceInfo(mic);
  }

  const handleHeadsetEvent = ({name, code}) => {
    eventLogs.push({name, code, time: new Date().toLocaleDateString()});
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
    // const stream = audioStream;
    if (!audioStream) {
      return;
    }
    audioStream.getTracks().forEach(track => track.stop());
    setAudioStream(null);
  }

  const endCurrentCall = () => {
    const call = currentCall;
    if (call) {
      call.end();
      headset.endCall(call.id);
    }
    endHeadsetAudio();
    setCurrentCall(null);
  }

  const changeMic = (event) => {
    console.log('uwu mofro');
    console.log('event -> ', event.target.value);
    const mic = microphones.find(mic => mic.deviceId === event.target.value);
    if (mic) {
      webrtc.setDefaultMicrophone(mic);
      //Logger
      activateImplementationForMicrophone(mic);
    }
  }

  const simulateIncomingCall = () => {
    const call = mockCall;
    call.create();
    setCurrentCall(call);
    headset.incomingCall({conversationId: call.id, contactName: call.contactName});
  }

  const answerIncomingCall = () => {
    currentCall.answer();
    headset.answerCall(currentCall.id);
    startHeadsetAudio();
  }

  const endAllCalls = () => {
    headset.endAllCalls();
    setCurrentCall(null);
    endHeadsetAudio();
  }

  return (
    <>
      <div className="entry-row">
        <div className="entry-label">
          <i className="ion-ios-world-outline"></i>
        </div>
        <div className="entry-values">
          {t(`dummy.environment.${isNativeApp ? 'native' : 'browser'}`)}
        </div>
      </div>
      <div className="entry-row">
        <div className="entry-label">
          <i className="ion-mic-a"></i>
        </div>
        <div className="entry-values">
          {t('dummy.currentMicrophone')}
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
            {!deviceInfo && t('dummy.noMatch')}
            {/* {headsetStatus} */}
          </div>
      </div>

      {/* {deviceInfo && */}
        <div className="entry-row">
          <div className="entry-values">
            <div className="entry-value">{t('dummy.controlInstructions')}</div>
            <div className="entry-value">
              <button type="button" onClick={() => simulateIncomingCall()}>{t('dummy.button.simulateCall')}</button>
              <button type="button" onClick={() => endAllCalls()}>{t('dummy.button.endCall.endAllCalls')}</button>
            </div>
            <div className="entry-value">
              <button disabled={!currentCall} type="button" onClick={() => answerIncomingCall()}>{t('dummy.button.answer')}</button>
              <button disabled={!mockCall.connected} type="button" onClick={() => {setMuted(!muted)}}>{t(`dummy.button.${muted ? 'un' : ''}mute`)}</button>
              <button disabled={!mockCall.connected} type="button" onClick={() => {setHeld(!held)}}>{t(`dummy.button.${held ? 'resume' : 'hold'}`)}</button>
              <button disabled={!currentCall} type="button" onClick={() => endCurrentCall()}>{t('dummy.button.endCall.endCurrentCall')}</button>
            </div>
          </div>
        </div>
      {/* } */}

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
            {t('dummy.currentCall.callState')}
          </div>
          <div className="entry-value">
            {currentCall
              ? <>
                  <div>ID: {currentCall.id}</div>
                  {/* <div>ID: </div> */}
                  <div>{t('dummy.currentCall.contactName')}: {currentCall.contactName}</div>
                  {/* <div>{t('dummy.currentCall.contactName')}: </div> */}
                  <div>{t('dummy.currentCall.ringing')}: {currentCall.ringing}</div>
                  {/* <div>{t('dummy.currentCall.ringing')}: </div> */}
                  <div>{t('dummy.currentCall.connected')}: {currentCall.connected}</div>
                  {/* <div>{t('dummy.currentCall.connected')}: </div> */}
                  <div>{t('dummy.currentCall.muted')}: {currentCall.muted}</div>
                  {/* <div>{t('dummy.currentCall.muted')}: </div> */}
                  <div>{t('dummy.currentCall.held')}: {currentCall.held}</div>
                  {/* <div>{t('dummy.currentCall.held')}: </div> */}
                </>
              : t('dummy.currentCall.noCall')
            }
          </div>
        </div>
      </div>

      {deviceInfo &&
        <textarea>{eventLogsJson}</textarea>
      }

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