import HeadsetService from '../../../library/services/headset';

const headset = HeadsetService.getInstance({} as any);

export function listenForHeadsetEvents() {
    headset.headsetEvents$.subscribe(value => {
        if (!value) {
            return;
        }

        console.debug('New headset event received', value);

        switch(value.event) {
            case 'deviceConnectionStatusChanged':
                this.emit('headsetConnectionStatusChanged', value.payload);
        }
    });
}