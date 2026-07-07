import {Builder, By, until, WebDriver} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

// CyberAcoustics button press values (from handleDeviceButtonPress)
const BTN = {
  HOOKSW_ON: 0x01,     // answer call / offhook
  HOOKSW_OFF: 0x00,    // reject or end call
  BUSY: 0x02,          // hang up during active call
  MUTE_TOGGLE: 0x13,   // mute button toggle
  ANS_CONFIRM: 0x02,   // answer confirmation (vendor report)
};

const CA_MOCK_SETUP = `
  const hs = window.__headsetService;
  const ca = hs.cyberAcoustics;
  const convId = Object.keys(hs.headsetConversationStates)[0];

  ca.activeConversationId = convId;
  ca.isMuted = false;
  ca._currentCallState = 'callActive';
  ca._deviceStatus = 0x01; // hookswFlag set (in call)
  hs.selectedImplementation = ca;
  ca.isConnected = true;

  // Mock the active device
  window.__caSendReportCalls = [];
  ca.activeDevice = {
    sendReport: (reportId, data) => {
      window.__caSendReportCalls.push({ reportId, value: data[0] });
      return Promise.resolve();
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    close: () => Promise.resolve(),
    opened: true,
    productName: 'CA Essential',
    productId: 0x01,
    collections: [{
      usage: 0x0005,
      usagePage: 0x000B,
      inputReports: [{ reportId: 3 }],
      outputReports: [{ reportId: 3 }]
    }]
  };
`;

const CA_MOCK_PENDING = `
  const hs = window.__headsetService;
  const ca = hs.cyberAcoustics;
  const convId = Object.keys(hs.headsetConversationStates)[0];

  ca.activeConversationId = convId;
  ca.isMuted = false;
  ca._currentCallState = 'callIncoming';
  ca._deviceStatus = 0x08; // ringFlag set
  ca._handeledInputReportIds = 3;
  hs.selectedImplementation = ca;
  ca.isConnected = true;

  window.__caSendReportCalls = [];
  ca.activeDevice = {
    sendReport: (reportId, data) => {
      window.__caSendReportCalls.push({ reportId, value: data[0] });
      return Promise.resolve();
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    close: () => Promise.resolve(),
    opened: true,
    productName: 'CA Essential',
    productId: 0x01,
    collections: [{
      usage: 0x0005,
      usagePage: 0x000B,
      inputReports: [{ reportId: 3 }],
      outputReports: [{ reportId: 3 }]
    }]
  };
`;

const FAKE_CA_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-ca-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'CA Essential Headset',
      toJSON() { return this; }
    });
    return devices;
  };
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

describe('CyberAcoustics (WebHID)', () => {
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
    await driver.executeScript(FAKE_CA_DEVICE);
    await driver.sleep(500);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(CA_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(CA_MOCK_SETUP);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(CA_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(CA_MOCK_SETUP);
  }

  async function simulateRingingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(CA_MOCK_PENDING);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(CA_MOCK_PENDING);
  }

  async function pressButton(wordCommand: number, reportId: number = 3) {
    await driver.executeScript(`
      const hs = window.__headsetService;
      const ca = hs.cyberAcoustics;
      ca.handleDeviceButtonPress(${wordCommand}, ${reportId});
    `);
  }

  async function getStateText(testId: string): Promise<string> {
    const el = await driver.findElement(By.css(`[data-testid="${testId}"]`));
    return el.getText();
  }

  async function endAllCalls() {
    const btn = await driver.findElement(By.css('[data-testid="end-all-calls"]'));
    await btn.click();
    await driver.sleep(500);
  }

  it('CA(WebHID)-incoming call answer from headset then end from headset', async () => {
    await simulateRingingCall('CA(WebHID)-incoming call answer then end from headset');

    // Re-inject to ensure implementation is set before pressing buttons
    await driver.executeScript(CA_MOCK_PENDING);

    // Answer via hooksw_on — transitions to CALL_ANSWERING
    await pressButton(BTN.HOOKSW_ON);
    await driver.sleep(1000);

    // Confirm answer (vendor report ID 4) — transitions to CALL_ACTIVE and fires deviceAnsweredCall
    await pressButton(BTN.ANS_CONFIRM, 4);
    await driver.sleep(1000);

    // Verify the CA state machine reached CALL_ACTIVE
    const callState = await driver.executeScript(`
      return window.__headsetService.cyberAcoustics._currentCallState;
    `);
    expect(callState).toBe('callActive');

    // End call via busy signal
    await pressButton(BTN.BUSY);
    await driver.sleep(1000);

    const endState = await driver.executeScript(`
      return window.__headsetService.cyberAcoustics._currentCallState;
    `);
    expect(endState).toBe('callIdle');

    await endAllCalls();
  });

  it('CA(WebHID)-incoming call reject from headset', async () => {
    await simulateRingingCall('CA(WebHID)-incoming call reject from headset');

    // Reject via hooksw_off
    await pressButton(BTN.HOOKSW_OFF);
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('CA(WebHID)-incoming call mute and unmute from headset', async () => {
    await simulateIncomingCall('CA(WebHID)-incoming call mute and unmute');

    // Mute toggle
    await pressButton(BTN.MUTE_TOGGLE);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    // Unmute toggle
    await pressButton(BTN.MUTE_TOGGLE);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('CA(WebHID)-outgoing call mute and unmute from headset', async () => {
    await simulateOutgoingCall('CA(WebHID)-outgoing call mute and unmute');

    await pressButton(BTN.MUTE_TOGGLE);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await pressButton(BTN.MUTE_TOGGLE);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('CA(WebHID)-UI mute headset reflects', async () => {
    await simulateOutgoingCall('CA(WebHID)-UI mute headset reflects');

    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(1000);

    const isMuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isMuted).toBe(true);

    await muteBtn.click();
    await driver.sleep(1000);

    const isUnmuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isUnmuted).toBe(false);

    await endAllCalls();
  });

  it('CA(WebHID)-UI hold headset reflects', async () => {
    await simulateOutgoingCall('CA(WebHID)-UI hold headset reflects');

    const holdBtn = await driver.findElement(By.css('[data-testid="hold"]'));
    await holdBtn.click();
    await driver.sleep(1000);

    const isHeld = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.holdState;
    `);
    expect(isHeld).toBe(true);

    await holdBtn.click();
    await driver.sleep(1000);

    const isResumed = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.holdState;
    `);
    expect(isResumed).toBe(false);

    await endAllCalls();
  });
});
