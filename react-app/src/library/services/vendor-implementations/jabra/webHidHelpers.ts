function hexByte (value) {
    let hex = Number(value).toString(16);
    while (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
}

export function onInputReport (event) {
    console.log('onInputReport event => ', event);
    console.log('**** ARRAY BUFFER ****' , event.data.getUint8(0));
    let reportId = event.reportId;
    let reportData = event.data;
    const listOfActions = [];

    if (reportId === 0x01) {
        // if (reportData.getUint8(0) & 0x01) buf += 'volume-down';
        if (reportData.getUint8(0) & 0x01) listOfActions.push('volume-down');
        // if (reportData.getUnit8(0) & 0x02) buf += 'volume-up';
        if (reportData.getUnit8(0) & 0x02) listOfActions.push('volume-up');
    } else if (reportId === 0x02 || reportId === 0x04) {
        listOfActions.push(reportData.getUint8(0) & 0x01 ? 'off-hook' : 'on-hook');
        if (reportData.getUint8(0) & 0x02) {
            listOfActions.push('busy');
        }

        if (reportData.getUint8(0) & 0x04) {
            listOfActions.push('mute');
        }

        if (reportData.getUint8(0) & 0x08) {
            listOfActions.push('flash');
        }
    }
    return listOfActions;
    // else {
    //     for (let i = 0; i < reportData.byteLength; i++) {
    //         listOfActions.push(hexByte(reportData.getUint8(i)));
    //     }
    // }
        // if (reportData.getUint(0) & 0x10) {
        //     listOfActions.push('redial');
        // }

        // if (reportData.getUint(0) & 0x20) {
        //     listOfActions.push('speed')
        // }

        // if (reportData.getUint(0) & 0x40) {
        //     listOfActions.push('button')
        // }
        // let hookSwitch = reportData.getUnit8(0) & 0x01;
        // let lineBusyTone = reportData.getUint8(0) & 0x02;
        // let phoneMute = reportData.getUint8(0) & 0x04;
        // let flash = reportData.getUint8(0) & 0x08;
        // let redial = reportData.getUint8(0) & 0x10;
        // let speedDial = reportData.getUint8(0) & 0x20;
        // let programmableButton = reportData.getUint8(0) & 0x40;
        // let keypadValue = ((reportData.getUnit8(0) & 0x80) >> 7) | ((reportData.getUnit8(1) & 0x07) << 1);

        // buf += `${hookSwitch ? ' off-hook' : ' on-hook'}`;
        // if (lineBusyTone) {
        //     buf += ' busy';
        // }
        // if (phoneMute) {
        //     buf += ' mute';
        // }
        // if (flash) {
        //     buf += ' flash';
        // }
        // if (redial) {
        //     buf += ' redial';
        // }
        // if (speedDial) {
        //     buf += ' speed';
        // }
        // if (programmableButton) {
        //     buf += ' button';
        // }
    // } else if (reportId === 0x04) {
    //     // let vendorHookSwitch = reportData
    // }
}