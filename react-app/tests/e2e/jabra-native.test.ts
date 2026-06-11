import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

const JABRA_NATIVE_MOCK_SETUP = `
  const hs = window.__headsetService;
  const jabraNative = hs.jabraNative;
  const convId = Object.keys(hs.headsetConversationStates)[0];

  hs.selectedImplementation = jabraNative;
  jabraNative.isConnected = true;
  jabraNative.isConnecting = false;
  jabraNative.activeConversationId = convId;
  jabraNative.isMuted = false;
  jabraNative.headsetState = { ringing: false, offHook: true };

  // Mock the CEF hosted context
  jabraNative.config.hostedContext = {
    sendEventToDesktop: () => {},
    isHosted: () => true,
    supportsJabra: () => true,
    on: () => {},
  };

  window.__jabraNativeService = jabraNative;
  window.__jabraNativeConvId = convId;
`;

const JABRA_NATIVE_MOCK_PENDING = `
  const hs = window.__headsetService;
  const jabraNative = hs.jabraNative;
  const convId = Object.keys(hs.headsetConversationStates)[0];

  hs.selectedImplementation = jabraNative;
  jabraNative.isConnected = true;
  jabraNative.isConnecting = false;
  jabraNative.pendingConversationId = convId;
  jabraNative.pendingConversationIsOutbound = false;
  jabraNative.activeConversationId = null;
  jabraNative.isMuted = false;
  jabraNative.headsetState = { ringing: true, offHook: false };

  jabraNative.config.hostedContext = {
    sendEventToDesktop: () => {},
    isHosted: () => true,
    supportsJabra: () => true,
    on: () => {},
  };

  window.__jabraNativeService = jabraNative;
  window.__jabraNativeConvId = convId;
`;

const FAKE_JABRA_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-jabra-native-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'Jabra ENGAGE 50',
      toJSON() { return this; }
    });
    return devices;
  };
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

describe('Jabra Native', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--ignore-certificate-errors');
    options.addArguments('--allow-insecure-localhost');
    if (process.env.HEADLESS) options.addArguments('--headless=new');
    options.addArguments('--use-fake-ui-for-media-stream');
    options.addArguments('--use-fake-device-for-media-stream');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  afterAll(async () => {
    await driver?.quit();
  });

  async function loadApp(testName: string) {
    await driver.get(`${APP_URL}?testName=${testName.replace(/\s+/g, '-')}`);
    await driver.wait(until.elementLocated(By.css('[data-testid="simulate-incoming"]')), 10000);
    await driver.executeScript(FAKE_JABRA_DEVICE);
    await driver.sleep(500);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(JABRA_NATIVE_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(JABRA_NATIVE_MOCK_SETUP);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(JABRA_NATIVE_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(JABRA_NATIVE_MOCK_SETUP);
  }

  async function simulateRingingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(JABRA_NATIVE_MOCK_PENDING);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(JABRA_NATIVE_MOCK_PENDING);
  }

  async function sendNativeEvent(eventName: string, value: boolean) {
    await driver.executeScript(`
      window.__jabraNativeService._processEvent('${eventName}', ${value});
    `);
  }

  async function getStateText(testId: string): Promise<string> {
    const el = await driver.findElement(By.css(`[data-testid="${testId}"]`));
    return el.getText();
  }

  async function dismissOverlay() {
    await driver.executeScript(`
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
    `);
  }

  async function endAllCalls() {
    await dismissOverlay();
    const btn = await driver.findElement(By.css('[data-testid="end-all-calls"]'));
    await btn.click();
    await driver.sleep(500);
  }

  it('Jabra Native - incoming call mute and unmute', async () => {
    await simulateIncomingCall('Jabra Native - incoming call mute and unmute');

    await sendNativeEvent('Mute', true);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await sendNativeEvent('Mute', false);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Jabra Native - outgoing call mute and unmute', async () => {
    await simulateOutgoingCall('Jabra Native - outgoing call mute and unmute');

    await sendNativeEvent('Mute', true);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await sendNativeEvent('Mute', false);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Jabra Native - incoming call hold and unhold', async () => {
    await simulateIncomingCall('Jabra Native - incoming call hold and unhold');

    await sendNativeEvent('Flash', true);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await sendNativeEvent('Flash', false);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('Jabra Native - outgoing call hold and unhold', async () => {
    await simulateOutgoingCall('Jabra Native - outgoing call hold and unhold');

    await sendNativeEvent('Flash', true);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await sendNativeEvent('Flash', false);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('Jabra Native - incoming call answer from headset then end from headset', async () => {
    await simulateRingingCall('Jabra Native - incoming call answer from headset then end from headset');

    await sendNativeEvent('OffHook', true);
    await driver.sleep(1500); // extra time for debounce

    expect(await getStateText('connected')).toContain('true');

    await sendNativeEvent('OffHook', false);
    await driver.sleep(1500);

    await endAllCalls();
  });

  it('Jabra Native - incoming call reject from headset', async () => {
    await simulateRingingCall('Jabra Native - incoming call reject from headset');

    await sendNativeEvent('RejectCall', true);
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('Jabra Native - UI mute headset reflects', async () => {
    await simulateOutgoingCall('Jabra Native - UI mute headset reflects');

    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await muteBtn.click();
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Jabra Native - UI hold headset reflects', async () => {
    await simulateOutgoingCall('Jabra Native - UI hold headset reflects');

    const holdBtn = await driver.findElement(By.css('[data-testid="hold"]'));
    await holdBtn.click();
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await holdBtn.click();
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });
});
