/* istanbul ignore file */
import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DeviceService from './mocks/device-service';
import HeadsetService from './library/services/headset';
import AudioVisualizer from './components/audio-visualizer';
import ToggleSwitch from './components/toggle-switch/toggle-switch';
import MockCall from './mocks/call';
import { isCefHosted } from './library/utils';
import CallControls from './components/call-controls/call-controls';

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const App = () => {
/* eslint-enable */
  const { t } = useTranslation();
  const [ongoingCalls, setOngoingCalls] = useState<any[]>([]);
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
  const currentCall = useRef("");

  useEffect(() => {
    webrtc.initialize();
    _updateDeviceList();

    return function cleanup () {
      currentCall.current = "";
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

  const endCurrentCall = (conversationId: string, fromHeadset?) => {
    const call = ongoingCalls.find((element) => element.id === conversationId);
    if (call) {
      !fromHeadset && headset.endCall(call.id);
    }

    if (currentCall.current === conversationId) {
      currentCall.current = "";
    }

    const totalCalls = ongoingCalls;
    setOngoingCalls(totalCalls.filter((element) => element.id !== conversationId));
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
    setOngoingCalls([...ongoingCalls, { id: call.id, contactName: call.contactName }]);

    if (!autoAnswer) {
      headset.incomingCall({ conversationId: call.id, contactName: call.contactName });
    } else {
      currentCall.current = call.id;
      headset.answerCall(call.id, autoAnswer);
      startHeadsetAudio();
    }
  };

  const simulateOutgoingCall = () => {
    console.log('**** SIMULATING OUTGOING CALL ****');
    const call = new MockCall();
    startHeadsetAudio();
    currentCall.current = call.id;
    setOngoingCalls([...ongoingCalls, { id: call.id, contactName: call.contactName }]);
    headset.outgoingCall({ conversationId: call.id, contactName: call.contactName });
  };

  const answerIncomingCall = (conversationId: string, fromHeadset?) => {
    console.log('**** ANSWERING SIMULATED CALL ****', { currentCall });
    currentCall.current = conversationId;
    !fromHeadset && headset.answerCall(conversationId, autoAnswer);
    startHeadsetAudio();
  };

  const rejectIncomingCall = (conversationId: string, fromHeadset?) => {
    console.log('**** REJECTING SIMULATED CALL ****', { conversationId });
    if (ongoingCalls.includes(conversationId)) {
      const totalCalls = ongoingCalls;
      setOngoingCalls(totalCalls.filter((element) => element.id !== conversationId));
      !fromHeadset && headset.rejectCall(conversationId);
    }
  };

  const endAllCalls = () => {
    headset.endAllCalls();
    currentCall.current = "";
    setOngoingCalls([]);
    endHeadsetAudio();
  };

  const toggleSoftwareMute = (muteToggle, conversationId: string, fromHeadset?) => {
    console.log('**** TOGGLING MUTE STATUS ****');
    !fromHeadset && headset.setMute(muteToggle);
  };

  const toggleSoftwareHold = (holdToggle, conversationId: string, fromHeadset?) => {
    console.log('**** TOGGLING HOLD STATUS ****');
    !fromHeadset && headset.setHold(conversationId, holdToggle);
  };

  const generateCallStates = () => {
    const calls = [] as any;
    for (let i = 0; i < ongoingCalls.length; i++) {
      const callState = {
        id: ongoingCalls[i].id,
        contactName: ongoingCalls[i].contactName,
        ringing: ongoingCalls[i].id !== currentCall.current,
        connected: ongoingCalls[i].id === currentCall.current,
        muted: false,
        held: false
      };
      calls.push(
        <CallControls
          key={ongoingCalls[i].id}
          call={callState}
          answerCall={answerIncomingCall}
          rejectCall={rejectIncomingCall}
          toggleMute={toggleSoftwareMute}
          toggleHold={toggleSoftwareHold}
          endCurrentCall={endCurrentCall}
        />
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
            { ongoingCalls.length
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