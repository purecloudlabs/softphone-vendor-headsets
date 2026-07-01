import {Builder, By, until, WebDriver} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

/**
 * Yealink UH38-specific E2E tests.
 *
 * The UH38 has a different HID descriptor structure from most Yealink headsets:
 * - Standard Yealink: inputReports at the top-level telephony collection (report ID 0x04)
 * - UH38: inputReports nested in a child collection (report ID 0x02)
 *
 * These tests verify that the dynamic report ID resolution works correctly
 * for the UH38's child-collection structure.
 */

const APP_URL = 'https://localhost:8443';

// UH38 uses report ID 0x02 from a child collection
const UH38_REPORT_ID = 0x02;

const UH38_MOCK_SETUP = `
  const hs = window.__headsetService;
  const yealink = hs.implementations.find(i => i.vendorName === 'Yealink');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  yealink.activeConversationId = convId;
  yealink.isMuted = false;
  yealink.isHold = false;
  yealink.callState = 0b1; // offhook
  yealink.recCallState = 0b1;
  yealink.inputReportReportId = ${UH38_REPORT_ID};
  hs.selectedImplementation = yealink;
  yealink.isConnected = true;

  // Track all sendReport calls to verify correct report ID is used
  window.__sendReportCalls = [];
  yealink.activeDevice = {
    sendReport: (reportId, data) => {
      window.__sendReportCalls.push({ reportId, value: data[0] });
      return Promise.resolve();
    },
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
        inputReports: [{ reportId: ${UH38_REPORT_ID} }]
      }]
    }]
  };
`;

const UH38_MOCK_PENDING = `
  const hs = window.__headsetService;
  const yealink = hs.implementations.find(i => i.vendorName === 'Yealink');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  yealink.pendingConversationId = convId;
  yealink.activeConversationId = null;
  yealink.isMuted = false;
  yealink.isHold = false;
  yealink.callState = 0b100; // ring flag
  yealink.recCallState = 0;
  yealink.inputReportReportId = ${UH38_REPORT_ID};
  hs.selectedImplementation = yealink;
  yealink.isConnected = true;

  window.__sendReportCalls = [];
  yealink.activeDevice = {
    sendReport: (reportId, data) => {
      window.__sendReportCalls.push({ reportId, value: data[0] });
      return Promise.resolve();
    },
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
        inputReports: [{ reportId: ${UH38_REPORT_ID} }]
      }]
    }]
  };
`;

const FAKE_UH38_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-uh38-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'Yealink UH38 (6993:B206)',
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

describe('Yealink UH38 (WebHID - child collection report ID)', () => {
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
    await driver.executeScript(FAKE_UH38_DEVICE);
    await driver.sleep(500);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(UH38_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(UH38_MOCK_SETUP);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(UH38_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(UH38_MOCK_SETUP);
  }

  async function simulateRingingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(UH38_MOCK_PENDING);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(UH38_MOCK_PENDING);
  }

  async function pressButton(value: number) {
    await driver.executeScript(`
      const hs = window.__headsetService;
      const yealink = hs.selectedImplementation;
      yealink.processBtnPress(${value});
    `);
  }

  async function getStateText(testId: string): Promise<string> {
    const el = await driver.findElement(By.css(`[data-testid="${testId}"]`));
    return el.getText();
  }

  async function getSendReportCalls(): Promise<Array<{reportId: number, value: number}>> {
    return driver.executeScript('return window.__sendReportCalls || [];') as Promise<Array<{reportId: number, value: number}>>;
  }

  async function clearSendReportCalls() {
    await driver.executeScript('window.__sendReportCalls = [];');
  }

  async function endAllCalls() {
    const btn = await driver.findElement(By.css('[data-testid="end-all-calls"]'));
    await btn.click();
    await driver.sleep(500);
  }

  it('UH38 sends commands with report ID 0x02 (not the default 0x04)', async () => {
    await simulateOutgoingCall('UH38-report-id-verify');
    await clearSendReportCalls();

    // Trigger a mute command from the UI
    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(500);

    const calls = await getSendReportCalls();
    expect(calls.length).toBeGreaterThan(0);

    // Every sendReport call should use the UH38's report ID (0x02)
    for (const call of calls) {
      expect(call.reportId).toBe(UH38_REPORT_ID);
    }

    await endAllCalls();
  });

  it('UH38 mute command sends correct bit flags', async () => {
    await simulateOutgoingCall('UH38-mute-bit-flags');
    await clearSendReportCalls();

    // Mute via UI
    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(500);

    let calls = await getSendReportCalls();
    // Mute ON should set offhook + mute bits (0b11 = 3)
    const muteOnCall = calls.find(c => c.value === 0b11);
    expect(muteOnCall).toBeDefined();
    expect(muteOnCall.reportId).toBe(UH38_REPORT_ID);

    await clearSendReportCalls();

    // Unmute via UI
    await muteBtn.click();
    await driver.sleep(500);

    calls = await getSendReportCalls();
    // Mute OFF should have offhook only (0b01 = 1)
    const muteOffCall = calls.find(c => c.value === 0b1);
    expect(muteOffCall).toBeDefined();
    expect(muteOffCall.reportId).toBe(UH38_REPORT_ID);

    await endAllCalls();
  });

  it('UH38 hold command sends correct bit flags', async () => {
    await simulateOutgoingCall('UH38-hold-bit-flags');
    await clearSendReportCalls();

    // Hold via UI
    const holdBtn = await driver.findElement(By.css('[data-testid="hold"]'));
    await holdBtn.click();
    await driver.sleep(500);

    let calls = await getSendReportCalls();
    // Hold should set hold flag and clear offhook (0b1000 = 8)
    const holdCall = calls.find(c => (c.value & 0b1000) !== 0);
    expect(holdCall).toBeDefined();
    expect(holdCall.reportId).toBe(UH38_REPORT_ID);

    await clearSendReportCalls();

    // Resume via UI
    await holdBtn.click();
    await driver.sleep(500);

    calls = await getSendReportCalls();
    // Resume should set offhook and clear hold (0b0001 = 1)
    const resumeCall = calls.find(c => c.value === 0b1);
    expect(resumeCall).toBeDefined();
    expect(resumeCall.reportId).toBe(UH38_REPORT_ID);

    await endAllCalls();
  });

  it('UH38 incoming call ring sends correct bit flags', async () => {
    await loadApp('UH38-ring-bit-flags');
    await driver.executeScript(UH38_MOCK_SETUP);
    await driver.executeScript('window.__sendReportCalls = [];');

    // Simulate incoming call — should send ring flag
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    const calls = await getSendReportCalls();
    // Ring command should include ring flag (0b100 = 4)
    const ringCall = calls.find(c => (c.value & 0b100) !== 0);
    expect(ringCall).toBeDefined();
    expect(ringCall.reportId).toBe(UH38_REPORT_ID);

    await endAllCalls();
  });

  it('UH38 headset mute button press triggers mute state change', async () => {
    await simulateIncomingCall('UH38-headset-mute-btn');

    // Simulate pressing mute button on the headset (mute + offhook)
    await pressButton(BTN.MUTE | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    // Release mute button (offhook only) — doesn't unmute, just release
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(500);

    // Press mute button again to toggle unmute
    await pressButton(BTN.MUTE | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('UH38 headset hook button answers and ends call', async () => {
    await simulateRingingCall('UH38-headset-hook-btn');

    // Press offhook to answer
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('connected')).toContain('true');

    // Release offhook to end
    await pressButton(0);
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('UH38 headset hold button toggles hold state', async () => {
    await simulateIncomingCall('UH38-headset-hold-btn');

    // Press hold button (hold + offhook)
    await pressButton(BTN.HOLD | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    // Release hold button (offhook only) — doesn't unhold, just release
    await pressButton(BTN.OFFHOOK);
    await driver.sleep(500);

    // Press hold button again to resume
    await pressButton(BTN.HOLD | BTN.OFFHOOK);
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('UH38 headset reject button rejects incoming call', async () => {
    await simulateRingingCall('UH38-headset-reject-btn');

    // Press reject
    await pressButton(BTN.REJECT);
    await driver.sleep(1000);

    await endAllCalls();
  });
});
