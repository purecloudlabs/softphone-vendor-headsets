import {Builder, By, until, WebDriver} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

const YEALINK_MOCK_SETUP = `
  const hs = window.__headsetService;
  const yealink = hs.implementations.find(i => i.vendorName === 'Yealink');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  yealink.activeConversationId = convId;
  yealink.isMuted = false;
  yealink.isHold = false;
  yealink.callState = 0b1; // offhook
  yealink.recCallState = 0b1;
  yealink.inputReportReportId = 0x02;
  hs.selectedImplementation = yealink;
  yealink.isConnected = true;

  // Mock the active device so sendOpToDevice doesn't bail
  yealink.activeDevice = {
    sendReport: (reportId, data) => Promise.resolve(),
    addEventListener: () => {},
    close: () => {},
    opened: true,
    productName: 'Yealink UH38',
    collections: [{
      usage: 0x0005,
      usagePage: 0x000B,
      inputReports: [],
      children: [{
        usage: 0x0006,
        usagePage: 0x000B,
        inputReports: [{ reportId: 0x02 }]
      }]
    }]
  };
`;

const YEALINK_MOCK_PENDING = `
  const hs = window.__headsetService;
  const yealink = hs.implementations.find(i => i.vendorName === 'Yealink');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  yealink.pendingConversationId = convId;
  yealink.activeConversationId = null;
  yealink.isMuted = false;
  yealink.isHold = false;
  yealink.callState = 0b100; // ring flag
  yealink.recCallState = 0;
  yealink.inputReportReportId = 0x02;
  hs.selectedImplementation = yealink;
  yealink.isConnected = true;

  yealink.activeDevice = {
    sendReport: (reportId, data) => Promise.resolve(),
    addEventListener: () => {},
    close: () => {},
    opened: true,
    productName: 'Yealink UH38',
    collections: [{
      usage: 0x0005,
      usagePage: 0x000B,
      inputReports: [],
      children: [{
        usage: 0x0006,
        usagePage: 0x000B,
        inputReports: [{ reportId: 0x02 }]
      }]
    }]
  };
`;

const FAKE_YEALINK_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-yealink-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'Yealink UH38',
      toJSON() { return this; }
    });
    return devices;
  };
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

// Yealink button bit flags (from device input reports)
const BTN = {
  OFFHOOK: 0b1,
  MUTE: 0b100,
  HOLD: 0b1000,
  REJECT: 0x40,
};

describe('Yealink (WebHID)', () => {
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
    await driver.executeScript(FAKE_YEALINK_DEVICE);
    await driver.sleep(500);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(YEALINK_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    // Re-inject to pick up the conversationId
    await driver.executeScript(YEALINK_MOCK_SETUP);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(YEALINK_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(YEALINK_MOCK_SETUP);
  }

  async function simulateRingingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(YEALINK_MOCK_PENDING);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(YEALINK_MOCK_PENDING);
  }

  async function pressButton(value: number) {
    await driver.executeScript(`
      const hs = window.__headsetService;
      const yealink = hs.yealink;
      yealink.processBtnPress(${value});
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

  it('Yealink(WebHID)-incoming call answer from headset then end from headset', async () => {
    await simulateRingingCall('Yealink(WebHID)-incoming call answer from headset then end from headset');

    // Re-inject to ensure implementation is set
    await driver.executeScript(YEALINK_MOCK_PENDING);

    // Answer via offhook button press
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(1000);

    // Verify the Yealink set activeConversationId on answer
    const activeConvId = await driver.executeScript(`
      return window.__headsetService.yealink.activeConversationId;
    `);
    expect(activeConvId).toBeTruthy();

    // End call via releasing offhook (value goes to 0)
    await pressButton(0);
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('Yealink(WebHID)-incoming call reject from headset', async () => {
    await simulateRingingCall('Yealink(WebHID)-incoming call reject from headset');

    // Reject via reject button
    await pressButton(BTN.REJECT);
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('Yealink(WebHID)-incoming call mute and unmute', async () => {
    await simulateIncomingCall('Yealink(WebHID)-incoming call mute and unmute');

    // Mute via mute button press (mute + offhook)
    await pressButton(BTN.MUTE | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    // Release mute button (offhook only) — this doesn't unmute, it's just the release
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(500);

    // Press mute button again to toggle unmute
    await pressButton(BTN.MUTE | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Yealink(WebHID)-outgoing call mute and unmute', async () => {
    await simulateOutgoingCall('Yealink(WebHID)-outgoing call mute and unmute');

    // Mute
    await pressButton(BTN.MUTE | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    // Release mute button
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(500);

    // Press mute button again to unmute
    await pressButton(BTN.MUTE | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Yealink(WebHID)-incoming call hold and unhold', async () => {
    await simulateIncomingCall('Yealink(WebHID)-incoming call hold and unhold');

    // Hold via hold button press (hold + offhook)
    await pressButton(BTN.HOLD | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    // Release hold button (offhook only)
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(500);

    // Press hold button again to resume
    await pressButton(BTN.HOLD | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('Yealink(WebHID)-outgoing call hold and unhold', async () => {
    await simulateOutgoingCall('Yealink(WebHID)-outgoing call hold and unhold');

    // Hold
    await pressButton(BTN.HOLD | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    // Release hold button
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(500);

    // Press hold button again to resume
    await pressButton(BTN.HOLD | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('Yealink(WebHID)-UI mute headset reflects', async () => {
    await simulateOutgoingCall('Yealink(WebHID)-UI mute headset reflects');

    // Click mute in the UI
    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(1000);

    // Verify headset state reflects mute
    const isMuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isMuted).toBe(true);

    // Click unmute in the UI
    await muteBtn.click();
    await driver.sleep(1000);

    const isUnmuted = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isMuted;
    `);
    expect(isUnmuted).toBe(false);

    await endAllCalls();
  });

  it('Yealink(WebHID)-UI hold headset reflects', async () => {
    await simulateOutgoingCall('Yealink(WebHID)-UI hold headset reflects');

    // Click hold in the UI
    const holdBtn = await driver.findElement(By.css('[data-testid="hold"]'));
    await holdBtn.click();
    await driver.sleep(1000);

    const isHeld = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isHold;
    `);
    expect(isHeld).toBe(true);

    // Click resume in the UI
    await holdBtn.click();
    await driver.sleep(1000);

    const isResumed = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isHold;
    `);
    expect(isResumed).toBe(false);

    await endAllCalls();
  });
});
