import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

const POLY_MOCK_SETUP = `
  const hs = window.__headsetService;
  const poly = hs.implementations.find(i => i.vendorName === 'Plantronics');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  hs.selectedImplementation = poly;
  poly.isConnected = true;
  poly.isConnecting = false;
  poly.isActive = true;

  const fakeCallId = 99999;
  poly.callMappings[convId] = fakeCallId;
  poly.callMappings[fakeCallId] = convId;

  // Mock HTTP calls and track them
  window.__polyRequests = [];
  poly._makeRequestTask = (url) => { window.__polyRequests.push(url); return Promise.resolve({}); };
  poly._checkIsActiveTask = () => {};
  poly.getCallEvents = () => Promise.resolve();

  window.__polyService = poly;
  window.__polyCallId = fakeCallId;
`;

const FAKE_POLY_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-poly-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'Poly Voyager Focus 2',
      toJSON() { return this; }
    });
    return devices;
  };
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

describe('Poly', () => {
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
    await driver.executeScript(FAKE_POLY_DEVICE);
    await driver.sleep(500);
  }

  async function simulateIncomingCall(testName: string) {
    await loadApp(testName);
    // Inject mock BEFORE simulating so headset service sees a connected implementation
    await driver.executeScript(POLY_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

    const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
    await answerBtn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);

    // Re-inject to pick up the conversationId
    await driver.executeScript(POLY_MOCK_SETUP);
  }

  async function simulateOutgoingCall(testName: string) {
    await loadApp(testName);
    // Inject mock BEFORE simulating so headset service sees a connected implementation
    await driver.executeScript(POLY_MOCK_SETUP);
    const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
    await driver.sleep(500);
    // Re-inject to pick up the new conversationId in callMappings
    await driver.executeScript(POLY_MOCK_SETUP);
  }

  async function sendPolyEvent(eventName: string) {
    await driver.executeScript(`
      window.__polyService.callCorrespondingFunction({
        name: '${eventName}',
        event: { CallId: { Id: window.__polyCallId } }
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

  it('Poly(Hub)-incoming call mute and unmute', async () => {
    await simulateIncomingCall('Poly(Hub)-incoming call mute and unmute');

    await sendPolyEvent('Mute');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await sendPolyEvent('Unmute');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Poly(Hub)-outgoing call mute and unmute', async () => {
    await simulateOutgoingCall('Poly(Hub)-outgoing call mute and unmute');

    await sendPolyEvent('Mute');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('true');

    await sendPolyEvent('Unmute');
    await driver.sleep(1000);
    expect(await getStateText('mute-state')).toContain('false');

    await endAllCalls();
  });

  it('Poly(Hub)-incoming call hold and unhold', async () => {
    await simulateIncomingCall('Poly(Hub)-incoming call hold and unhold');

    await sendPolyEvent('HoldCall');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await sendPolyEvent('ResumeCall');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('Poly(Hub)-outgoing call hold and unhold', async () => {
    await simulateOutgoingCall('Poly(Hub)-outgoing call hold and unhold');

    await sendPolyEvent('HoldCall');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('true');

    await sendPolyEvent('ResumeCall');
    await driver.sleep(1000);
    expect(await getStateText('hold-state')).toContain('false');

    await endAllCalls();
  });

  it('Poly(Hub)-incoming call answer from headset then end from headset', async () => {
    await loadApp('Poly(Hub)-incoming call answer from headset then end from headset');
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(POLY_MOCK_SETUP);
    // Mock HTTP calls that TerminateCall triggers
    await driver.executeScript(`
      window.__polyService._makeRequestTask = () => Promise.resolve({});
      window.__polyService._checkIsActiveTask = () => {};
      window.__polyService.getCallEvents = () => Promise.resolve();
    `);

    // Answer from headset
    await sendPolyEvent('AcceptCall');
    await driver.sleep(1000);
    expect(await getStateText('connected')).toContain('true');

    // End from headset
    await sendPolyEvent('TerminateCall');
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('Poly(Hub)-incoming call reject from headset', async () => {
    await loadApp('Poly(Hub)-incoming call reject from headset');
    const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
    await driver.sleep(500);

    await driver.executeScript(`
      const hs = window.__headsetService;
      const poly = hs.implementations.find(i => i.vendorName === 'Plantronics');
      const convId = Object.keys(hs.headsetConversationStates)[0];
      hs.selectedImplementation = poly;
      poly.isConnected = true;
      poly.isActive = true;
      poly.incomingConversationId = convId;
      poly._makeRequestTask = () => Promise.resolve({});
      poly._checkIsActiveTask = () => {};
      poly.getCallEvents = () => Promise.resolve();
      const fakeCallId = 99999;
      poly.callMappings[convId] = fakeCallId;
      poly.callMappings[fakeCallId] = convId;
      window.__polyService = poly;
      window.__polyCallId = fakeCallId;
    `);

    // Reject from headset
    await sendPolyEvent('RejectCall');
    await driver.sleep(1000);

    await endAllCalls();
  });

  it('Poly(Hub)-UI mute headset reflects', async () => {
    await simulateOutgoingCall('Poly(Hub)-UI mute headset reflects');

    // Clear tracked requests
    await driver.executeScript(`window.__polyRequests = [];`);

    // Click mute in the UI
    const muteBtn = await driver.findElement(By.css('[data-testid="mute"]'));
    await muteBtn.click();
    await driver.sleep(1000);

    // Verify the mute request was sent to the headset
    const requests = await driver.executeScript(`return window.__polyRequests;`) as string[];
    expect(requests.some(r => r.includes('MuteCall') && r.includes('muted=true'))).toBe(true);

    // Click unmute in the UI
    await muteBtn.click();
    await driver.sleep(1000);

    const requests2 = await driver.executeScript(`return window.__polyRequests;`) as string[];
    expect(requests2.some(r => r.includes('MuteCall') && r.includes('muted=false'))).toBe(true);

    await endAllCalls();
  });

  it('Poly(Hub)-UI hold headset reflects', async () => {
    await simulateOutgoingCall('Poly(Hub)-UI hold headset reflects');

    await driver.executeScript(`window.__polyRequests = [];`);

    // Click hold in the UI
    const holdBtn = await driver.findElement(By.css('[data-testid="hold"]'));
    await holdBtn.click();
    await driver.sleep(1000);

    const held = await driver.executeScript(`
      const hs = window.__headsetService;
      const states = hs.headsetConversationStates;
      const key = Object.keys(states)[0];
      return key ? states[key].held : null;
    `);
    expect(held).toBe(true);

    // Click resume in the UI
    await holdBtn.click();
    await driver.sleep(1000);

    const requests2 = await driver.executeScript(`return window.__polyRequests;`) as string[];
    expect(requests2.some(r => r.includes('ResumeCall'))).toBe(true);

    const resumed = await driver.executeScript(`
      const hs = window.__headsetService;
      const states = hs.headsetConversationStates;
      const key = Object.keys(states)[0];
      return key ? states[key].held : null;
    `);
    expect(resumed).toBe(false);

    await endAllCalls();
  });
});
