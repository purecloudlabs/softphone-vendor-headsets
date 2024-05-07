import React, { useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
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
    endCurrentCall
  } = props;

  const { t } = useTranslation();
  const [callState, setCallState] = useState<any>(call);

  return (
    <Fragment key={callState.id}>
      <div>{t(`dummy.currentCall.id`)}: {callState.id}</div>
      <div>{t('dummy.currentCall.contactName')}: {callState.contactName}</div>
      <div>{t('dummy.currentCall.ringing')}: {JSON.stringify(callState.ringing)}</div>
      <div>{t('dummy.currentCall.connected')}: {JSON.stringify(callState.connected)}</div>
      <div>{t('dummy.currentCall.muted')}: {JSON.stringify(callState.muted)}</div>
      <div>{t('dummy.currentCall.held')}: {JSON.stringify(callState.held)}</div>

      <div>
        <button disabled={callState.connected} type="button" onClick={answerCall(callState.id)}>{t('dummy.button.answer')}</button>
        <button disabled={callState.connected} type="button" onClick={rejectCall(callState.id)}>{t('dummy.button.reject')}</button>
        <button disabled={!callState.connected} type="button" onClick={toggleMute(!callState.muted, callState.id)}>{t(`dummy.button.${callState.muted ? 'un' : ''}mute`)}</button>
        <button disabled={!callState.connected} type="button" onClick={toggleHold(!callState.held, callState.id)}>{t(`dummy.button.${callState.held ? 'resume' : 'hold'}`)}</button>
        <button type="button" onClick={endCurrentCall(callState.id)}>{t('dummy.button.endCall.endCurrentCall')}</button>
      </div>
      <hr></hr>
    </Fragment>
  );
};

export default CallControls;