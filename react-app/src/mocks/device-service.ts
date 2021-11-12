export default class DeviceService {
    private hasPermissions = false;
    private static defaultMicrophone = {} as MediaDeviceInfo;

    initialize = async () => {
        this.ensureAudioPermissions();
        const devices = await navigator.mediaDevices.enumerateDevices();
        let audioDevices = devices.filter((device) => device.kind === 'audioinput')
        let mic = audioDevices.find((device) => device.deviceId === 'default' && device.kind === 'audioinput');
        if (!mic) {
            mic = audioDevices[0];
        }
        DeviceService.defaultMicrophone = mic;
    }

    ensureAudioPermissions = async () => {
        if (this.hasPermissions) {
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false});
        stream.getTracks().forEach(track => track.stop());
        this.hasPermissions = true;
    }

    getDefaultMicrophone = () => {
        return DeviceService.defaultMicrophone;
    }

    setDefaultMicrophone = (microphone: MediaDeviceInfo) => {
        DeviceService.defaultMicrophone = microphone;
    }
}