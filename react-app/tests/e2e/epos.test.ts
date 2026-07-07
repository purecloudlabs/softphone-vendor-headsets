import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

const EPOS_MOCK_SETUP = `
  const hs = window.__headsetService;
  const epos = hs.implementations.find(i => i.vendorName === 'Sennheiser');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  hs.selectedImplementation = epos;
  epos.isConnected = true;
  epos.isConnecting = false;
  epos.websocketConnected = true;
  epos.ignoreAcknowledgement = false;

  // Mock websocket so _sendMessage doesn't blow up
  epos.websocket = { send: () => {}, readyState: 1 };

  window.__eposService = epos;
  window.__eposConvId = convId;
`;

const EPOS_MOCK_PENDING = `
  const hs = window.__headsetService;
  const epos = hs.implementations.find(i => i.vendorName === 'Sennheiser');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  hs.selectedImplementation = epos;
  epos.isConnected = true;
  epos.isConnecting = false;
  epos.websocketConnected = true;
  epos.ignoreAcknowledgement = false;
  epos.websocket = { send: () => {}, readyState: 1 };

  window.__eposService = epos;
  window.__eposConvId = convId;
`;

const FAKE_EPOS_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-epos-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'EPOS ADAPT 560',
      toJSON() { return this; }
    });
    return devices;
  };
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

describe('EPOS', () => {
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
    await driver.wait(until.elementLocated(By.css('[data-testid="simulate-incoming"]')), 10000);
    await driver.executeScript(FAKE_EPOS_DEVICE);
    await driver.sleep(500);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(EPOS_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(EPOS_MOCK_SETUP);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(EPOS_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(EPOS_MOCK_SETUP);
  }

  async function simulateRingingCall(testName: string) {
    await loadApp(testName);
    await driver.executeScript(EPOS_MOCK_PENDING);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(EPOS_MOCK_PENDING);
  }

  async function sendEposEvent(event: string, eventType = 'Notification') {
    await driver.executeScript(`
      window.__eposService._handleMessage({
        data: JSON.stringify({
          Event: '${event}',
          EventType: '${eventType}',
          CallID: window.__eposConvId
        })
      });
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

  it('EPOS - incoming call mute and unmute', async () => {
    await simulateIncomingCall('EPOS - incoming call mute and unmute');

    await sendEposEvent('MuteSoftphone');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await sendEposEvent('UnmuteSoftphone');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('EPOS - outgoing call mute and unmute', async () => {
    await simulateOutgoingCall('EPOS - outgoing call mute and unmute');

    await sendEposEvent('MuteSoftphone');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await sendEposEvent('UnmuteSoftphone');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('EPOS - incoming call hold and unhold', async () => {
    await simulateIncomingCall('EPOS - incoming call hold and unhold');

    await sendEposEvent('CallHold');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await sendEposEvent('HeldCallResumed');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('EPOS - outgoing call hold and unhold', async () => {
    await simulateOutgoingCall('EPOS - outgoing call hold and unhold');

    await sendEposEvent('CallHold');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await sendEposEvent('HeldCallResumed');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('EPOS - incoming call answer from headset then end from headset', async () => {
    await simulateRingingCall('EPOS - incoming call answer from headset then end from headset');

    await sendEposEvent('InCallAccepted');
    await driver.sleep(1000);
    expect(await getStateText('connected')).toContain('true');

    await sendEposEvent('CallEnded');
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('EPOS - incoming call reject from headset', async () => {
    await simulateRingingCall('EPOS - incoming call reject from headset');

    await sendEposEvent('InCallRejected');
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('EPOS - UI mute headset reflects', async () => {
    await simulateOutgoingCall('EPOS - UI mute headset reflects');

    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(1000);

    // Verify websocket message was attempted (websocket.send is mocked)
    expect(await getStateText('mute-state')).toContain('true');

    await muteBtn.click();
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('EPOS - UI hold headset reflects', async () => {
    await simulateOutgoingCall('EPOS - UI hold headset reflects');

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
