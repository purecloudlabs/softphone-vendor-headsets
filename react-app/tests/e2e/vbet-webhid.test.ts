import {Builder, By, until, WebDriver} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

// VBet DeviceSignalType values (from @vbet/webhid-sdk)
const SIGNAL = {
  ACCEPT_CALL: 0,
  END_CALL: 1,
  REJECT_CALL: 2,
  MUTE_CALL: 3,
  UNMUTE_CALL: 4,
};

const VBET_MOCK_SETUP = `
  const hs = window.__headsetService;
  const vbet = hs.vbet;
  const convId = Object.keys(hs.headsetConversationStates)[0];

  vbet.activeConversationId = convId;
  vbet.pendingConversationId = null;
  vbet.isMuted = false;
  hs.selectedImplementation = vbet;
  vbet.isConnected = true;

  // Mock the active device (VBet SDK device interface)
  window.__vbetDeviceCalls = [];
  vbet.activeDevice = {
    ring: () => { window.__vbetDeviceCalls.push('ring'); },
    offHook: () => { window.__vbetDeviceCalls.push('offHook'); },
    onHook: () => { window.__vbetDeviceCalls.push('onHook'); },
    muteOn: () => { window.__vbetDeviceCalls.push('muteOn'); },
    muteOff: () => { window.__vbetDeviceCalls.push('muteOff'); },
    subscribe: (cb) => { window.__vbetSignalCallback = cb; },
    unsubscribe: () => {},
    productName: 'VT VBet Headset',
  };

  // Store the signal callback so we can invoke it from tests
  vbet.activeDevice.subscribe(vbet.processBtnPress);
`;

const VBET_MOCK_PENDING = `
  const hs = window.__headsetService;
  const vbet = hs.vbet;
  const convId = Object.keys(hs.headsetConversationStates)[0];

  vbet.pendingConversationId = convId;
  vbet.activeConversationId = null;
  vbet.isMuted = false;
  hs.selectedImplementation = vbet;
  vbet.isConnected = true;

  window.__vbetDeviceCalls = [];
  vbet.activeDevice = {
    ring: () => { window.__vbetDeviceCalls.push('ring'); },
    offHook: () => { window.__vbetDeviceCalls.push('offHook'); },
    onHook: () => { window.__vbetDeviceCalls.push('onHook'); },
    muteOn: () => { window.__vbetDeviceCalls.push('muteOn'); },
    muteOff: () => { window.__vbetDeviceCalls.push('muteOff'); },
    subscribe: (cb) => { window.__vbetSignalCallback = cb; },
    unsubscribe: () => {},
    productName: 'VT VBet Headset',
  };

  vbet.activeDevice.subscribe(vbet.processBtnPress);
`;

const FAKE_VBET_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-vbet-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'VT 340B Headset',
      toJSON() { return this; }
    });
    return devices;
  };
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

describe('VBet (WebHID)', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--ignore-certificate-errors');
    options.addArguments('--allow-insecure-localhost');
    if (process.env.HEADLESS) {
      options.addArguments('--headless=new');
    }
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
    await driver.executeScript(`
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
    `);
    await driver.wait(until.elementLocated(By.css('[data-testid="simulate-incoming"]')), 10000);
    await driver.executeScript(FAKE_VBET_DEVICE);
    await driver.sleep(500);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(VBET_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(VBET_MOCK_SETUP);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(VBET_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(VBET_MOCK_SETUP);
  }

  async function simulateRingingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(VBET_MOCK_PENDING);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(VBET_MOCK_PENDING);
  }

  async function sendSignal(signal: number) {
    await driver.executeScript(`window.__vbetSignalCallback(${signal});`);
  }

  async function getStateText(testId: string): Promise<string> {
    const el = await driver.findElement(By.css(`[data-testid="${testId}"]`));
    return el.getText();
  }

  async function getDeviceCalls(): Promise<string[]> {
    return driver.executeScript('return window.__vbetDeviceCalls || [];') as Promise<string[]>;
  }

  async function clearDeviceCalls() {
    await driver.executeScript('window.__vbetDeviceCalls = [];');
  }

  async function endAllCalls() {
    const btn = await driver.findElement(By.css('[data-testid="end-all-calls"]'));
    await btn.click();
    await driver.sleep(500);
  }

  it('VBet(WebHID)-incoming call answer from headset then end from headset', async () => {
    await simulateRingingCall('VBet(WebHID)-incoming call answer then end from headset');

    // Re-inject to ensure implementation is set before sending signals
    await driver.executeScript(VBET_MOCK_PENDING);

    // Answer via ACCEPT_CALL signal
    await sendSignal(SIGNAL.ACCEPT_CALL);
    await driver.sleep(1000);

    // Verify the VBet implementation set the active conversation
    const activeConvId = await driver.executeScript(`
      return window.__headsetService.vbet.activeConversationId;
    `);
    expect(activeConvId).toBeTruthy();

    // End via END_CALL signal
    await sendSignal(SIGNAL.END_CALL);
    await driver.sleep(1000);

    const endConvId = await driver.executeScript(`
      return window.__headsetService.vbet.activeConversationId;
    `);
    expect(endConvId).toBeFalsy();

    await endAllCalls();
  });

  it('VBet(WebHID)-incoming call reject from headset', async () => {
    await simulateRingingCall('VBet(WebHID)-incoming call reject from headset');

    // Reject via REJECT_CALL signal
    await sendSignal(SIGNAL.REJECT_CALL);
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('VBet(WebHID)-incoming call mute and unmute from headset', async () => {
    await simulateIncomingCall('VBet(WebHID)-incoming call mute and unmute');

    await sendSignal(SIGNAL.MUTE_CALL);
    await driver.sleep(1000);

    const isMuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isMuted).toBe(true);

    await sendSignal(SIGNAL.UNMUTE_CALL);
    await driver.sleep(1000);

    const isUnmuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isUnmuted).toBe(false);

    await endAllCalls();
  });

  it('VBet(WebHID)-outgoing call mute and unmute from headset', async () => {
    await simulateOutgoingCall('VBet(WebHID)-outgoing call mute and unmute');

    await sendSignal(SIGNAL.MUTE_CALL);
    await driver.sleep(1000);

    const isMuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isMuted).toBe(true);

    await sendSignal(SIGNAL.UNMUTE_CALL);
    await driver.sleep(1000);

    const isUnmuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isUnmuted).toBe(false);

    await endAllCalls();
  });

  it('VBet(WebHID)-UI mute sends correct device commands', async () => {
    await simulateOutgoingCall('VBet(WebHID)-UI mute device commands');
    await clearDeviceCalls();

    // Mute from UI
    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(1000);

    let calls = await getDeviceCalls();
    expect(calls).toContain('muteOn');

    const isMuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isMuted).toBe(true);

    await clearDeviceCalls();

    // Unmute from UI
    await muteBtn.click();
    await driver.sleep(1000);

    calls = await getDeviceCalls();
    expect(calls).toContain('muteOff');

    const isUnmuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isUnmuted).toBe(false);

    await endAllCalls();
  });

  it('VBet(WebHID)-outgoing call sends offHook to device', async () => {
    await loadApp('VBet(WebHID)-outgoing call offHook');
    await driver.executeScript(VBET_MOCK_SETUP);
    await driver.executeScript('window.__vbetDeviceCalls = [];');

    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    const calls = await getDeviceCalls();
    expect(calls).toContain('offHook');

    await endAllCalls();
  });

  it('VBet(WebHID)-end call sends onHook to device', async () => {
    await simulateOutgoingCall('VBet(WebHID)-end call onHook');
    await clearDeviceCalls();

    const endBtn = await driver.findElement(By.css('[data-testid="end-all-calls"]'));
    await endBtn.click();
    await driver.sleep(1000);

    const calls = await getDeviceCalls();
    expect(calls).toContain('onHook');
  });
});
