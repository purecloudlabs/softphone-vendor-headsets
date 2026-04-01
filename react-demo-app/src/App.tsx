import './App.css';
import { useEffect, useState } from 'react';
import HostedAppInfo from './components/HostedAppInfo';
import DeviceList from './components/DeviceList';
import CallControls from './components/CallControls';
import CallState from './components/CallState';
import InformationalLinks from './components/InformationalLinks';
import HeadsetService from '../../library/services/headset';

function App() {
  const headset = HeadsetService.getInstance({} as any);
  const [connectionStatus, setConnectionStatus] = useState<string>('noVendor')
  // let headsetConnectionStatus = 'noVendor';

  useEffect(() => {
    window.navigator.mediaDevices.getUserMedia({ audio: true });

    const eventSub = headset.headsetEvents$.subscribe(value => {
      console.log('mMoo: received headset event', value);
      if (!value) {
        return;
      }

      console.debug('New headset event received', value);

      switch(value.event) {
        case 'implementationChanged':
          break;
        case 'deviceHoldStatusChanged':

          break;
        case 'deviceMuteStatusChanged':
          break;
        case 'deviceAnsweredCall':
          break;
        case 'deviceRejectedCall':
          break;
        case 'deviceEndedCall':
          break;
        case 'deviceConnectionStatusChanged':
          setConnectionStatus(value.payload);
        default:
          break;
      }
    });

    return () => {
      eventSub.unsubscribe();
    };
  }, []);

  function changeMic(mic: string) {
    headset.activeMicChange(mic);
  }

  function toggleSoftwareHold(holdToggle: boolean) {
    console.log('mMoo: App.tsx toggleHold', holdToggle);
    headset.setHold('', holdToggle);
  }

  function toggleSoftwareMute(muteToggle: boolean) {
    headset.setMute(muteToggle);
  }

  return (
    <div className='app-wrapper'>
      <HostedAppInfo />
      <DeviceList connectionStatus={ connectionStatus } changeMic={ changeMic } />
      <CallControls toggleHold={ toggleSoftwareHold }/>
      <CallState />
      <InformationalLinks />
    </div>
  )
}

export default App;