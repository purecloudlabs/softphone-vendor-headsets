// import './DeviceList.css';
import { useEffect, useState } from 'react';
import { GuxButton, GuxDropdown, GuxIcon, GuxListbox, GuxOption } from 'genesys-spark-components-react'

function DeviceList({ connectionStatus, changeMic }: { connectionStatus: string, changeMic: any }) {
    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
    // const [connectionStatus, setConnectionStatus] = useState<string>('noVendor');

    useEffect(() => {
        window.navigator.mediaDevices.enumerateDevices().then((devices) => {
            console.log('mMoo: devices', devices);
            const audioDevices = devices.filter((device) => device.kind === 'audioinput');
            setMicrophones(audioDevices);
        });
    }, []);

    function findProperMic(event) {
        const mic = microphones.find(mic => mic.deviceId === event.target.value);
        if(mic) {
            console.info('Changing microphone from dropdown selection', mic);
            changeMic(mic.label.toLowerCase());
        }
    }

    return (
        <div className='entry-row'>
            <div className='entry-label'>
                <GuxIcon iconName='fa/headset-solid' size='small' decorative={true}></GuxIcon>
            </div>
            <div className='entry-values'>
                Current Microphone
                <GuxDropdown
                    id='microphone-select'
                    className='form-control speakers-select'
                    value={microphones[0]?.deviceId}
                    onChange={(e) => { findProperMic(e) }}
                >
                    <GuxListbox>
                        {microphones.map((device: MediaDeviceInfo) => (
                            <GuxOption key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </GuxOption>
                        ))}
                    </GuxListbox>
                </GuxDropdown>
            </div>
            <div className='entry-values'>
                { connectionStatus }
            </div>
        </div>
    )
}

export default DeviceList;