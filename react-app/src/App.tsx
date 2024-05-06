/* istanbul ignore file */
import './App.css';
import React, { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import DeviceService from './mocks/device-service';
import HeadsetService from './library/services/headset';
import AudioVisualizer from './components/audio-visualizer';
import ToggleSwitch from './components/toggle-switch/toggle-switch';
import MockCall from './mocks/call';
import { isCefHosted } from './library/utils';

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const App = () => {
/* eslint-enable */
  const { t } = useTranslation();
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [held, setHeld] = useState<boolean>(false);
  const [allCallStates, setAllCallStates] = useState<any>({});
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const eventLogs = [] as any;
  const [eventLogsJson, setEventLogsJson] = useState<any>([]);
  const [webHidRequestButton, setWebHidRequestButton] = useState<any>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('noVendor');
  const [autoAnswer, setAutoAnswer] = useState<boolean>(false);
  const headset = HeadsetService?.getInstance({} as any);
  const webrtc = new DeviceService();
  const isNativeApp = isCefHosted();
  // let allCallStates = {};

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
        toggleSoftwareHold(value.payload.holdRequested, currentCall.id, true);
        break;
      case 'deviceMuteStatusChanged':
        handleHeadsetEvent(value.payload);
        toggleSoftwareMute(value.payload.isMuted, currentCall.id, true);
        break;
      case 'deviceAnsweredCall':
        handleHeadsetEvent(value.payload);
        answerIncomingCall(currentCall.id, true);
        break;
      case 'deviceRejectedCall':
        handleHeadsetEvent(value.payload);
        rejectIncomingCall(currentCall.id, true);
        break;
      case 'deviceEndedCall':
        handleHeadsetEvent(value.payload);
        endCurrentCall(currentCall.id, true);
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
  }, [ currentCall, audioStream ]);

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

  const endCurrentCall = (conversationId: string, fromHeadset?) => {
    const call = currentCall || allCallStates[conversationId];
    if (call) {
      call.end();
      !fromHeadset && headset.endCall(call.id);
    }
    setCurrentCall(null);
    const totalCalls = allCallStates;
    delete totalCalls[conversationId];
    setAllCallStates(totalCalls);
    console.log('mMoo: after updating allCallStates', { allCallStates, conversationId });
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
    setAllCallStates({
      ...allCallStates,
      [call.id]: call
    });
    // allCallStates = { ...allCallStates, [call.id]: call };
    console.log('mMoo: allCallStates after incoming call', allCallStates);
    if (!autoAnswer) {
      headset.incomingCall({ conversationId: call.id, contactName: call.contactName });
    } else {
      call.answer();
      setAllCallStates({
        ...allCallStates,
        [call.id]: call
      });
      // allCallStates = { ...allCallStates, [call.id]: call };
      headset.answerCall(call.id, autoAnswer);
      startHeadsetAudio();
    }
  };

  const simulateOutgoingCall = () => {
    console.log('**** SIMULATING OUTGOING CALL ****');
    const call = new MockCall();
    call.answer();
    startHeadsetAudio();
    setCurrentCall(call);
    setAllCallStates({
      ...allCallStates,
      [call.id]: call
    });
    // allCallStates = { ...allCallStates, [call.id]: call };
    headset.outgoingCall({ conversationId: call.id, contactName: call.contactName });
  };

  const answerIncomingCall = (conversationId: string, fromHeadset?) => {
    console.log('**** ANSWERING SIMULATED CALL ****', { currentCall });
    allCallStates[conversationId].answer();
    // currentCall.answer();
    setAllCallStates({
      ...allCallStates,
      [conversationId]: allCallStates[conversationId]
    });
    // allCallStates = { ...allCallStates, [currentCall.id]: currentCall };
    !fromHeadset && headset.answerCall(conversationId, autoAnswer);
    startHeadsetAudio();
  };

  const rejectIncomingCall = (conversationId: string, fromHeadset?) => {
    console.log('**** REJECTING SIMULATED CALL ****', { currentCall });
    if (allCallStates[conversationId].ringing) {
      allCallStates[conversationId].end();
      const totalCalls = allCallStates;
      delete totalCalls[conversationId];
      setAllCallStates(totalCalls);
      // delete allCallStates[currentCall.id];
      !fromHeadset && headset.rejectCall(conversationId);
    }
    setCurrentCall(null);
  };

  const endAllCalls = () => {
    headset.endAllCalls();
    setCurrentCall(null);
    setAllCallStates({});
    // allCallStates = {};
    endHeadsetAudio();
  };

  const toggleSoftwareMute = (muteToggle, conversationId: string, fromHeadset?) => {
    console.log('mMoo: mute call', conversationId);
    console.log('**** TOGGLING MUTE STATUS ****');
    setMuted(muteToggle);
    setAllCallStates({
      ...allCallStates,
      [conversationId]: {
        ...allCallStates[conversationId],
        muted: muteToggle
      }
    });
    !fromHeadset && headset.setMute(muteToggle);
  };

  const toggleSoftwareHold = (holdToggle, conversationId: string, fromHeadset?) => {
    console.log('**** TOGGLING HOLD STATUS ****');
    setHeld(holdToggle);
    setAllCallStates({
      ...allCallStates,
      [currentCall.id]: {
        ...allCallStates[currentCall.id],
        held: holdToggle
      }
    });
    !fromHeadset && headset.setHold(currentCall.id, holdToggle);
  };

  const generateCallStates = () => {
    const calls = [] as any;
    const keyValues = Object.keys(allCallStates);
    for (let i = 0; i < keyValues.length; i++) {
      const key = keyValues[i];
      calls.push(
        <Fragment key={allCallStates[key].id}>
          <div>{t(`dummy.currentCall.id`)}: {allCallStates[key].id}</div>
          <div>{t('dummy.currentCall.contactName')}: {allCallStates[key].contactName}</div>
          <div>{t('dummy.currentCall.ringing')}: {JSON.stringify(allCallStates[key].ringing)}</div>
          <div>{t('dummy.currentCall.connected')}: {JSON.stringify(allCallStates[key].connected)}</div>
          <div>{t('dummy.currentCall.muted')}: {JSON.stringify(allCallStates[key].muted)}</div>
          <div>{t('dummy.currentCall.held')}: {JSON.stringify(allCallStates[key].held)}</div>

          <div>
            <button disabled={allCallStates[key].connected} type="button" onClick={() => answerIncomingCall(allCallStates[key].id)}>{t('dummy.button.answer')}</button>
            <button disabled={allCallStates[key].connected} type="button" onClick={() => rejectIncomingCall(allCallStates[key].id)}>{t('dummy.button.reject')}</button>
            <button disabled={!allCallStates[key].connected} type="button" onClick={() => toggleSoftwareMute(!muted, allCallStates[key].id)}>{t(`dummy.button.${muted ? 'un' : ''}mute`)}</button>
            <button disabled={!allCallStates[key].connected} type="button" onClick={() => toggleSoftwareHold(!held, allCallStates[key].id)}>{t(`dummy.button.${held ? 'resume' : 'hold'}`)}</button>
            <button type="button" onClick={() => endCurrentCall(allCallStates[key].id)}>{t('dummy.button.endCall.endCurrentCall')}</button>
          </div>
          <hr></hr>
        </Fragment>
      );
    }
    return calls;
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
          <div style={{ display: 'inline-flex', marginBottom: '10px' }}>
            <label style={{ marginRight: '5px' }}>Auto Answer</label>
            <ToggleSwitch
              name="autoAnswer"
              checked={autoAnswer}
              onChange={() => setAutoAnswer(!autoAnswer)}
              disabled={!!currentCall}
            />
            <span className={ !currentCall ? 'hidden' : 'auto-answer-warning' }>Cannot toggle Auto Answer at this time</span>
          </div>
          <div className="entry-value">
            <button type="button" onClick={() => simulateIncomingCall()}>{t('dummy.button.simulateCall')}</button>
            <button type="button" onClick={() => simulateOutgoingCall()}>{t('dummy.button.simulateOutgoingCall')}</button>
            <button type="button" onClick={() => endAllCalls()}>{t('dummy.button.endCall.endAllCalls')}</button>
          </div>
          {/* <div className="entry-value"> */}
          {/* <button disabled={!currentCall} type="button" onClick={() => answerIncomingCall()}>{t('dummy.button.answer')}</button> */}
          {/* <button disabled={!currentCall} type="button" onClick={() => rejectIncomingCall()}>{t('dummy.button.reject')}</button> */}
          {/* <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareMute(!muted)}>{t(`dummy.button.${muted ? 'un' : ''}mute`)}</button> */}
          {/* <button disabled={!currentCall?.connected} type="button" onClick={() => toggleSoftwareHold(!held)}>{t(`dummy.button.${held ? 'resume' : 'hold'}`)}</button> */}
          {/* <button disabled={!currentCall} type="button" onClick={() => endCurrentCall()}>{t('dummy.button.endCall.endCurrentCall')}</button> */}
          {/* </div> */}
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
            { Object.keys(allCallStates).length
              ?
              generateCallStates()
              : t('dummy.currentCall.noCalls')
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