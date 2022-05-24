/* istanbul ignore file */
import './App.css';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DeviceService from './mocks/device-service';
import HeadsetService from './library/services/headset';
import AudioVisualizer from './components/audio-visualizer';
import MockCall from './mocks/call';
import { isCefHosted } from './library/utils';

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const App = () => {
/* eslint-enable */
  const { t } = useTranslation();
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [held, setHeld] = useState<boolean>(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const eventLogs = [] as any;
  const [eventLogsJson, setEventLogsJson] = useState<any>([]);
  const [webHidRequestButton, setWebHidRequestButton] = useState<any>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('noVendor');
  const headset = HeadsetService?.getInstance({} as any);
  const webrtc = new DeviceService();
  const isNativeApp = isCefHosted();

  useEffect(() => {
    webrtc.initialize();
    _updateDeviceList();

    return function cleanup () {
      setCurrentCall(null);
    };
  }, []);

  useEffect(() => {
    console.info('subscribing to headset events');
    const sub = headset.headsetEvents$.subscribe(value => {
      if (!value) {
        return;
      }

      console.debug('new headset event', value);

      switch(value.event) {
        case 'implementationChanged':
          logImplementationChange(value?.payload?.vendorName);
          break;
        case 'deviceHoldStatusChanged':
          handleHeadsetEvent(value.payload);
          toggleSoftwareHold(value.payload.holdRequested, true);
          break;
        case 'deviceMuteStatusChanged':
          handleHeadsetEvent(value.payload);
          toggleSoftwareMute(value.payload.isMuted, true);
          break;
        case 'deviceAnsweredCall':
          handleHeadsetEvent(value.payload);
          answerIncomingCall(true);
          break;
        case 'deviceRejectedCall':
          handleHeadsetEvent(value.payload);
          rejectIncomingCall(true);
          break;
        case 'deviceEndedCall':
          handleHeadsetEvent(value.payload);
          endCurrentCall(true);
          break;
        case 'deviceConnectionStatusChanged':
          setConnectionStatus(value.payload);
          break;
        default:
          handleHeadsetEvent(value.payload);
      }

      if (value.event === 'webHidPermissionRequested') {
        setWebHidRequestButton(<button onClick={ () => (value.payload as any).callback() }>Request WebHID Permissions</button>);
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [ currentCall ]);

  const _updateDeviceList = async () => {
    await webrtc.ensureAudioPermissions();
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMicrophones(devices.filter((device) => device.kind === 'audioinput'));
    headset.activeMicChange(webrtc.getDefaultMicrophone().label.toLowerCase());
  };

  const handleHeadsetEvent = (eventData) => {
    const { name, code } = eventData;
    eventLogs.push({ name, code, time: new Date().toLocaleTimeString() });
    setEventLogsJson(JSON.stringify(eventLogs, null, 2));
  };

  const logImplementationChange = (vendorName) => {
    eventLogs.push({ name: 'ImplementationChanged', vendor: vendorName, time: new Date().toLocaleTimeString() });
    setEventLogsJson(JSON.stringify(eventLogs, null, 2));
  };

  const startHeadsetAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: webrtc.getDefaultMicrophone()?.deviceId
      },
      video: false
    });
    setAudioStream(stream);
  };

  const endHeadsetAudio = async () => {
    if (audioStream) {
      audioStream?.getTracks()?.forEach(track => track.stop());
    }
    setAudioStream(null);
  };

  const endCurrentCall = (fromHeadset?) => {
    const call = currentCall;
    if (call) {
      call.end();
      !fromHeadset && headset.endCall(call.id);
    }
    setCurrentCall(null);
    endHeadsetAudio();
  };

  const changeMic = (event) => {
    const mic = microphones.find(mic => mic.deviceId === event.target.value);
    if (mic) {
      webrtc.setDefaultMicrophone(mic);
      console.info('**** MICROPHONE CHANGED ****', mic);
      headset.activeMicChange(mic.label.toLowerCase());
    }
  };

  const simulateIncomingCall = () => {
    console.log('**** SIMULATING CALL ****');
    const call = new MockCall();
    setCurrentCall(call);
    headset.incomingCall({ conversationId: call.id, contactName: call.contactName });
  };

  const simulateOutgoingCall = () => {
    console.log('**** SIMULATING OUTGOING CALL ****');
    const call = new MockCall();
    call.answer();
    startHeadsetAudio();
    setCurrentCall(call);
    headset.outgoingCall({ conversationId: call.id, contactName: call.contactName });
  };

  const answerIncomingCall = (fromHeadset?) => {
    console.log('**** ANSWERING SIMULATED CALL ****', { currentCall });
    currentCall.answer();
    !fromHeadset && headset.answerCall(currentCall.id);
    startHeadsetAudio();
  };

  const rejectIncomingCall = (fromHeadset?) => {
    console.log('**** REJECTING SIMULATED CALL ****', { currentCall });
    if (currentCall) {
      currentCall.end();
      !fromHeadset && headset.rejectCall(currentCall.id);
    }
    setCurrentCall(null);
  };

  const endAllCalls = () => {
    headset.endAllCalls();
    setCurrentCall(null);
    endHeadsetAudio();
  };

  const toggleSoftwareMute = (muteToggle, fromHeadset?) => {
    console.log('**** TOGGLING MUTE STATUS ****');
    setMuted(muteToggle);
    !fromHeadset && headset.setMute(muteToggle);
  };

  const toggleSoftwareHold = (holdToggle, fromHeadset?) => {
    console.log('**** TOGGLING HOLD STATUS ****');
    setHeld(holdToggle);
    !fromHeadset && headset.setHold(currentCall.id, holdToggle);
  };

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
                  <option key={mic.deviceId} value={mic.deviceId}>{mic.label}</option>
                );
              })
            }
          </select>
        </div>
      </div>
      <div className="entry-row">
        {
          connectionStatus !== 'noVendor' &&
          <>
            <div className="entry-label">
              <i className="ion-ios-information-outline"></i>
            </div>
            <div className="entry-values">
              {t(`implementation.connectionStatus.${connectionStatus}`)}
              {connectionStatus === 'notRunning' && (
                <button type="button" style={{ marginLeft: '5px' }} onClick={() => headset.retryConnection(webrtc.getDefaultMicrophone().label)}>Retry</button>
              )}
            </div>
          </>
        }
      </div>

      <div className="entry-row">
        <div className="entry-values">
          <div className="entry-value">{t('dummy.controlInstructions')}</div>
          <div className="entry-value">
            <button type="button" onClick={() => simulateIncomingCall()}>{t('dummy.button.simulateCall')}</button>
            <button type="button" onClick={() => simulateOutgoingCall()}>{t('dummy.button.simulateOutgoingCall')}</button>
            <button type="button" onClick={() => endAllCalls()}>{t('dummy.button.endCall.endAllCalls')}</button>
          </div>
          <div className="entry-value">
            <button disabled={!currentCall} type="button" onClick={() => answerIncomingCall()}>{t('dummy.button.answer')}</button>
            <button disabled={!currentCall} type="button" onClick={() => rejectIncomingCall()}>{t('dummy.button.reject')}</button>
            <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareMute(!muted)}>{t(`dummy.button.${muted ? 'un' : ''}mute`)}</button>
            <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareHold(!held)}>{t(`dummy.button.${held ? 'resume' : 'hold'}`)}</button>
            <button disabled={!currentCall} type="button" onClick={() => endCurrentCall()}>{t('dummy.button.endCall.endCurrentCall')}</button>
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
            {t('dummy.currentCall.callState')}
          </div>
          <div className="entry-value">
            {currentCall
              ? <>
                <div>{t(`dummy.currentCall.id`)}: {currentCall.id}</div>
                <div>{t('dummy.currentCall.contactName')}: {currentCall.contactName}</div>
                <div>{t('dummy.currentCall.ringing')}: {JSON.stringify(currentCall.ringing)}</div>
                <div>{t('dummy.currentCall.connected')}: {JSON.stringify(currentCall.connected)}</div>
                <div>{t('dummy.currentCall.muted')}: {JSON.stringify(muted)}</div>
                <div>{t('dummy.currentCall.held')}: {JSON.stringify(held)}</div>
              </>
              : t('dummy.currentCall.noCall')
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
      {webHidRequestButton}
    </>
  );
};

export default App;