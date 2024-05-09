import React, { useState, Fragment, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HeadsetService from '../../library';
import './call-controls.css';

const CallControls = (props: {
    call: any,
    autoAnswer: boolean,
    isOutgoing: boolean,
    answerCall: any,
    rejectCall: any,
    toggleMute: any,
    toggleHold: any,
    endCurrentCall: any;
    ongoingCalls: any;
}) => {
  const {
    call,
    autoAnswer,
    isOutgoing,
    answerCall,
    rejectCall,
    toggleMute,
    toggleHold,
    endCurrentCall,
    ongoingCalls
  } = props;

  const { t } = useTranslation();
  const [callState, setCallState] = useState<any>(call);
  const headset = HeadsetService?.getInstance({} as any);

  useEffect(() => {
    setCallState({
      ...call,
      ringing: !autoAnswer && !isOutgoing ? true : false,
      connected: autoAnswer || isOutgoing ? true : false,
      muted: false,
      held: false
    });
    handleCallInit();
    const sub = headset.headsetEvents$.subscribe(value => {
      if (!value || value?.payload?.conversationdId !== callState.id) {
        return;
      }

      console.log(`Updating state for ${callState.id}`);

      switch(value.event) {
      case 'deviceHoldStatusChanged':
        setCallState({
          ...callState,
          held: value.payload.holdRequested
        });
        break;
      case 'deviceMuteStatusChanged':
        setCallState({
          ...callState,
          muted: value.payload.isMuted
        });
        break;
      case 'deviceAnsweredCall':
      case 'deviceRejectedCall':
      case 'deviceEndedCall':
        setCallState({
          ...callState,
          connected: value.event === 'deviceAnsweredCall' ? true : false,
          ringing: false
        });
        break;
      default:
        return;
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const handleCallInit = () => {
    if (isOutgoing) {
      return headset.outgoingCall({ conversationId: call.id, contactName: call.contactName });
    }

    if (autoAnswer) {
      return headset.answerCall(call.id, autoAnswer);
    }

    return headset.incomingCall({ conversationId: call.id, contactName: call.contactName });
  };

  const updateMuteState = (muted: boolean, conversationId: string) => {
    setCallState({
      ...callState,
      muted
    });
    toggleMute(muted, conversationId);
  };

  const updateHoldState = (held: boolean, conversationId: string) => {
    setCallState({
      ...callState,
      held
    });
    toggleHold(held, conversationId);
  };

  const updateRingingState = (action: string, conversationId: string) => {
    console.log('mMoo: inside updateRingingState', { action, conversationId });
    setCallState({
      ...callState,
      ringing: false,
      connected: action === 'answer' ? true : false
    });

    switch(action) {
    case 'answer':
      answerCall(conversationId);
      break;
    case 'end':
      console.log('mMoo: should fall in here');
      endCurrentCall(conversationId);
      break;
    case 'reject':
      console.log('mMoo: well check here too');
      rejectCall(conversationId);
      break;
    default:
      console.warn("Invalid action taken");
    }
  };

  const getOngoingCalls = () => {
    ongoingCalls();
  };

  return (
    <Fragment key={callState.id}>
      <div>{t(`dummy.currentCall.id`)}: {callState.id}</div>
      <div>{t('dummy.currentCall.contactName')}: {callState.contactName}</div>
      <div>{t('dummy.currentCall.ringing')}: {JSON.stringify(callState.ringing)}</div>
      <div>{t('dummy.currentCall.connected')}: {JSON.stringify(callState.connected)}</div>
      <div>{t('dummy.currentCall.muted')}: {JSON.stringify(callState.muted)}</div>
      <div>{t('dummy.currentCall.held')}: {JSON.stringify(callState.held)}</div>

      <div>
        <button disabled={callState.connected} type="button" onClick={() => updateRingingState('answer', callState.id)}>{t('dummy.button.answer')}</button>
        <button disabled={callState.connected} type="button" onClick={() => updateRingingState('reject', callState.id)}>{t('dummy.button.reject')}</button>
        <button disabled={!callState.connected} type="button" onClick={() => updateMuteState(!callState.muted, callState.id)}>{t(`dummy.button.${callState.muted ? 'un' : ''}mute`)}</button>
        <button disabled={!callState.connected} type="button" onClick={() => updateHoldState(!callState.held, callState.id)}>{t(`dummy.button.${callState.held ? 'resume' : 'hold'}`)}</button>
        <button type="button" onClick={() => updateRingingState('end', callState.id)}>{t('dummy.button.endCall.endCurrentCall')}</button>
        <button type="button" onClick={() => getOngoingCalls()}>Test</button>
      </div>
      <hr></hr>
    </Fragment>
  );
};

export default CallControls;