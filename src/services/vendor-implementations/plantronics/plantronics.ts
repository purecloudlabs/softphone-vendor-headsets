import Implementation from '../Implementation';

// TODO: work in progress; get all the fields on this, and possibly move to a global location
interface DeviceInfo {
  ProductName: string;
}

export default class PlantronicsService extends Implementation {
  private static instance: PlantronicsService;

  vendorName = 'Plantronics';
  apiHost = 'https://127.0.0.1:32018/Spokes';
  pluginName = 'emberApp2';
  deviceInfo: DeviceInfo = null;
  activePollingInterval = 2000;
  connectedDeviceInterval = 6000;
  disconnectedDeviceInterval = 2000;
  deviceIdRetryInterval = 2000;
  isActive = false;
  disableEventPolling = false;
  deviceStatusTimer = null;

  private constructor() {
    super();
  }

  static getInstance() {
    if (!PlantronicsService.instance) {
      PlantronicsService.instance = new PlantronicsService();
    }

    return PlantronicsService.instance;
  }

  get deviceName(): string {
    return this.deviceInfo.ProductName;
  }
}
