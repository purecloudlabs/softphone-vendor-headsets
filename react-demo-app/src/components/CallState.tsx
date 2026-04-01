import { GuxIcon, GuxFormFieldTextarea } from 'genesys-spark-components-react';

function CallState() {
    return (
        <>
            <div className='entry-row'>
                <div className='entry-label'>
                    <GuxIcon></GuxIcon>
                </div>
                <div className='entry-values'>
                    <div className='entry-value'>Call State</div>
                    <div className='entry-value'>
                        {/* current call info */}
                    </div>
                </div>
            </div>

            <GuxFormFieldTextarea></GuxFormFieldTextarea>
        </>
    )
}

export default CallState;