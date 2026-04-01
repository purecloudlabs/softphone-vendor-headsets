import { GuxIcon } from 'genesys-spark-components-react';
import { isCefHosted } from '../utils';

function HostedAppInfo() {
    const isNativeApp = isCefHosted();

    return (
        <div className='entry-row'>
            <div className='entry-label'>
                <GuxIcon iconName='fa/face-smile-solid' size='small' decorative={true}></GuxIcon>
            </div>
            <div className='entry-values'>
                {isNativeApp ? 'Native' : 'Browser' }
            </div>
        </div>
    )
}

export default HostedAppInfo;