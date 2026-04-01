import { VendorEvent, WebHidPermissionRequest } from "../..";
import deviceInfo from "../../types/device-info";
import { VendorImplementation } from "./vendor-implementation";

class TestImplementation extends VendorImplementation {
  get deviceInfo (): deviceInfo {
    return { deviceName: 'fake device' };
  }
}

let implementation: TestImplementation;

beforeEach(() => {
  implementation = new TestImplementation({ logger: console, vendorName: 'test' });
});

describe('constructor', () => {
  it('should extend EventEmitter', () => {
    // just testing a few event emitter fns
    expect((implementation as any).on).toBeDefined();
    expect((implementation as any).emit).toBeDefined();
    expect((implementation as any).off).toBeDefined();
  });
});

describe('requestWebHidPermissions', () => {
  it('should emit event', () => {
    const callback = {};
    expect.assertions(2);
    implementation.on('webHidPermissionRequested', (event: VendorEvent<WebHidPermissionRequest>) => {
      expect(event.vendor).toBe(implementation);
      expect(event.body.callback).toBe(callback);
    });

    implementation.requestWebHidPermissions(callback);
  });
});

describe('setHold', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.setHold('convo', true)).rejects.toThrow('not implemented');
  });
});

describe('setMute', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.setMute(true)).rejects.toThrow('not implemented');
  });
});

describe('endAllCalls', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.endAllCalls()).rejects.toThrow('not implemented');
  });
});

describe('endCall', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.endCall('convo', true)).rejects.toThrow('not implemented');
  });
});

describe('answerCall', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.answerCall('convo')).rejects.toThrow('not implemented');
  });
});

describe('rejectCall', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.rejectCall('convo')).rejects.toThrow('not implemented');
  });
});

describe('outgoingCall', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.outgoingCall({ conversationId: 'convo' })).rejects.toThrow('not implemented');
  });
});

describe('incomingCall', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.incomingCall({ conversationId: 'convo' })).rejects.toThrow('not implemented');
  });
});

describe('disconnect', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.disconnect()).rejects.toThrow('not implemented');
  });
});

describe('connect', () => {
  it('should throw not implemented', async () => {
    await expect(() => implementation.connect()).rejects.toThrow('not implemented');
  });
});

describe('deviceLabelMatchesVendor', () => {
  it('should throw not implemented', () => {
    expect(() => implementation.deviceLabelMatchesVendor('my mic')).toThrow('not implemented');
  });
});

describe('isDeviceAttached', () => {
  it('should throw not implemented', () => {
    expect(() => implementation.isDeviceAttached).toThrow('not implemented');
  });
});

describe('isSupported', () => {
  it('should default to true', () => {
    expect(implementation.isSupported()).toBeTruthy();
  });
});

describe('resetHeadsetStateForCall', () => {
  it('should call rejectCall', async () => {
    const rejectSpy = implementation.rejectCall = jest.fn();
    await implementation.resetHeadsetStateForCall('test123');
    expect(rejectSpy).toHaveBeenCalledWith('test123');
  });
});

describe('deductProductId', () => {
  it('should match proper labels', () => {
    const result = implementation.deductProductId('Test Device Label (6993:b017)');
    expect(result).toBe(45079);
  });

  it('should not match invalid labels', () => {
    const result = implementation.deductProductId('Test Device Label');
    expect(result).toBe(null);
  });
});

