import './CallControls.css';
import { useState } from 'react';
import { GuxToggle, GuxButton } from 'genesys-spark-components-react';

function CallControls({ toggleHold, toggleMute }: { toggleHold: any, toggleMute: any }) {
    const [holdState, setHoldState] = useState<boolean>(false);
    const [muteState, setMuteState] = useState<boolean>(false);

    return (
        <div className='entry-row'>
            <div className='entry-values'>
                <h5>Call Controls</h5>
                <div className='entry-value'>Control simulated calls with these buttons and the buttons on your headset</div>
                <div style={{ display: 'inline-flex', marginRight: '10px'}}>
                    <label>Auto Answer</label>
                    <GuxToggle></GuxToggle>
                    <span>{/* Auto Answer warning message */}</span>
                </div>
                <div className='entry-value'>
                    <GuxButton>Simulate Incoming Call</GuxButton>
                    <GuxButton>Simulate Outgoing Call</GuxButton>
                    <GuxButton>End All Calls</GuxButton>
                </div>
                <div className='entry-value'>
                    <GuxButton>Answer</GuxButton>
                    <GuxButton>Reject</GuxButton>
                    <GuxButton onClick={() => { setMuteState(!muteState); toggleMute(muteState); }}>Mute</GuxButton>
                    <GuxButton onClick={() => { setHoldState(!holdState); toggleHold(holdState); }}>Hold</GuxButton>
                    <GuxButton>End Current Call</GuxButton>
                </div>
            </div>
        </div>
    )
}

export default CallControls;