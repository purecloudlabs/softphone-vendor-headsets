export default class DeviceService {
    private hasPermissions = false;
    private static defaultMicrophone = {} as MediaDeviceInfo;

    initialize = async (): Promise<void> => {
        this.ensureAudioPermissions();
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter((device) => device.kind === 'audioinput')
        let mic = audioDevices.find((device) => device.deviceId === 'default' && device.kind === 'audioinput');
        if (!mic) {
            mic = audioDevices[0];
        }
        DeviceService.defaultMicrophone = mic;
    }

    ensureAudioPermissions = async (): Promise<void | undefined> => {
        if (this.hasPermissions) {
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false});
        stream.getTracks().forEach(track => track.stop());
        this.hasPermissions = true;
    }

    getDefaultMicrophone = (): MediaDeviceInfo => {
        return DeviceService.defaultMicrophone;
    }

    setDefaultMicrophone = (microphone: MediaDeviceInfo): void => {
        DeviceService.defaultMicrophone = microphone;
    }
}