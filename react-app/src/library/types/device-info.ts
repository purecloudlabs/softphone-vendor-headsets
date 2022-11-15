/* eslint-disable semi */
export default interface DeviceInfo {
    ProductName?: string;
    deviceName?: string;
    deviceId?: string; // This format is used by all but jabra-native?
    deviceID?: string; // This format is used by jabra-native
    headsetType?: string;
    attached?: boolean;
}

export interface PartialHIDDevice {
    productName: string;
    collections: PartialDeviceCollections[];
}

interface PartialDeviceCollections {
    usage: number;
    usagePage: number;
    inputReports: PartialInputReports[];
}

interface PartialInputReports {
    reportId: number;
}
