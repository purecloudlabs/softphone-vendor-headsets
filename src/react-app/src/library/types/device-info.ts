// TODO: Work in progress, there may be more fields that are not included yet
export default interface DeviceInfo {
    ProductName?: string;
    deviceName?: string;
    deviceId?: string; // This format is used by all but jabra-native?
    deviceID?: string; // This format is used by jabra-native
    headsetType?: string;
}