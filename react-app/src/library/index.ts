import HeadsetService from './services/headset';
import { VendorImplementation } from './services/vendor-implementations/vendor-implementation';

export * from './types/call-info';
export * from './types/consumed-headset-events';
export * from './types/device-info';
export * from './types/emitted-headset-events';
export * from './types/jabra-request';
export default { HeadsetService, VendorImplementation };
