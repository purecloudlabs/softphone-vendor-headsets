import React, { useState, Fragment, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HeadsetService from '../../library';
import './call-controls.css';

const CallControls = (props: {
    call: any,
    answerCall: any,
    rejectCall: any,
    toggleMute: any,
    toggleHold: any,
    endCurrentCall: any;
}) => {
  const {
    call,
    answerCall,
    rejectCall,
    toggleMute,
    toggleHold,
    endCurrentCall,
  } = props;

  const { t } = useTranslation();
  const [callState, setCallState] = useState<any>(call);
  const headset = HeadsetService?.getInstance({} as any);

  useEffect(() => {
    const sub = headset.headsetEvents$.subscribe(value => {
      if (!value || value?.payload?.conversationId !== callState.id) {
        return;
      }

      console.log(`Updating state for ${callState.id}`);

      switch(value.event) {
      case 'deviceHoldStatusChanged':
        updateHoldState(value.payload.holdRequested, value.payload.conversationId, true);
        break;
      case 'deviceMuteStatusChanged':
        updateMuteState(value.payload.isMuted, value.payload.conversationId, true);
        break;
      case 'deviceAnsweredCall':
        updateRingingState('answer', value.payload.conversationId, true);
        break;
      case 'deviceRejectedCall':
        updateRingingState('reject', value.payload.conversationId, true);
        break;
      case 'deviceEndedCall':
        updateRingingState('end', value.payload.conversationId, true);
        break;
      default:
        return;
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [ callState ]);

  const updateMuteState = async (muted: boolean, conversationId?: string, fromHeadset?: boolean) => {
    await setCallState({
      ...callState,
      muted
    });
    toggleMute(muted, conversationId, fromHeadset);
  };

  const updateHoldState = async (held: boolean, conversationId?: string, fromHeadset?: boolean) => {
    await setCallState({
      ...callState,
      held
    });
    toggleHold(held, conversationId, fromHeadset);
  };

  const updateRingingState = async (action: string, conversationId: string, fromHeadset?: boolean) => {
    await setCallState({
      ...callState,
      ringing: false,
      connected: action === 'answer' ? true : false
    });

    switch(action) {
    case 'answer':
      answerCall(conversationId, fromHeadset);
      break;
    case 'end':
      endCurrentCall(conversationId, fromHeadset);
      break;
    case 'reject':
      rejectCall(conversationId, fromHeadset);
      break;
    default:
      console.warn("Invalid action taken");
    }
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
      </div>
      <hr></hr>
    </Fragment>
  );
};

export default CallControls;