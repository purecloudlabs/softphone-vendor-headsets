import {Builder, By, until, WebDriver} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const APP_URL = 'https://localhost:8443';

const JABRA_MOCK_SETUP = `
  const hs = window.__headsetService;
  const jabra = hs.implementations.find(i => i.vendorName === 'Jabra');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  jabra.activeConversationId = convId;
  jabra.callLock = true;
  jabra.isMuted = false;
  jabra.isHeld = false;
  hs.selectedImplementation = jabra;
  jabra.isConnected = true;

  const signalSubject = {
    observers: [],
    subscribe(fn) { this.observers.push(fn); return { unsubscribe(){} }; },
    next(v) { this.observers.forEach(fn => fn(v)); }
  };

  jabra.callControl = {
    deviceSignals: signalSubject,
    takeCallLock: () => Promise.resolve(),
    releaseCallLock: () => {},
    offHook: () => {},
    ring: () => {},
    mute: () => {},
    hold: () => {},
  };

  jabra._processEvents(jabra.callControl);
  window.__signalSubject = signalSubject;
`;

const FAKE_JABRA_DEVICE = `
  const originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerate();
    devices.push({
      deviceId: 'fake-jabra-id',
      groupId: 'fake-group',
      kind: 'audioinput',
      label: 'Jabra EVOLVE 75',
      toJSON() { return this; }
    });
    return devices;
  };
  // Trigger device list refresh
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
`;

const SIGNAL = {HOOK_SWITCH: 32, HOLD: 33, ALT_HOLD: 35, PHONE_MUTE: 47, REJECT_CALL: 65533};

// Mock setup for incoming call that hasn't been answered yet (pendingConversationId set)
const JABRA_MOCK_PENDING = `
  const hs = window.__headsetService;
  const jabra = hs.implementations.find(i => i.vendorName === 'Jabra');
  const convId = Object.keys(hs.headsetConversationStates)[0];

  jabra.pendingConversationId = convId;
  jabra.pendingConversationIsOutbound = false;
  jabra.activeConversationId = null;
  jabra.callLock = true;
  jabra.isMuted = false;
  jabra.isHeld = false;
  hs.selectedImplementation = jabra;
  jabra.isConnected = true;

  const signalSubject = {
    observers: [],
    subscribe(fn) { this.observers.push(fn); return { unsubscribe(){} }; },
    next(v) { this.observers.forEach(fn => fn(v)); }
  };

  jabra.callControl = {
    deviceSignals: signalSubject,
    takeCallLock: () => Promise.resolve(),
    releaseCallLock: () => {},
    offHook: () => {},
    ring: () => {},
    mute: () => {},
    hold: () => {},
  };

  jabra._processEvents(jabra.callControl);
  window.__signalSubject = signalSubject;
`;

describe('Jabra', () => {
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
        // Inject mock BEFORE simulating so headset service sees a connected implementation
        await driver.executeScript(JABRA_MOCK_SETUP);
        const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
        await btn.click();
        await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);

        const answerBtn = await driver.findElement(By.css('[data-testid="answer"]'));
        await answerBtn.click();
        await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
        await driver.sleep(500);

        // Re-inject to pick up the conversationId
        await driver.executeScript(JABRA_MOCK_SETUP);
    }

    async function simulateOutgoingCall(testName: string) {
        await loadApp(testName);
        await driver.executeScript(JABRA_MOCK_SETUP);
        const btn = await driver.findElement(By.css('[data-testid="simulate-outgoing"]'));
        await btn.click();
        await driver.wait(until.elementLocated(By.css('[data-testid="connected"]')), 5000);
        await driver.sleep(500);

        await driver.executeScript(JABRA_MOCK_SETUP);
    }

    async function sendSignal(type: number) {
        await driver.executeScript(`window.__signalSubject.next({ type: ${type}, value: true });`);
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

    async function simulateRingingCall(testName: string) {
        await loadApp(testName);
        await driver.executeScript(JABRA_MOCK_PENDING);
        const btn = await driver.findElement(By.css('[data-testid="simulate-incoming"]'));
        await btn.click();
        await driver.wait(until.elementLocated(By.css('[data-testid="ringing"]')), 5000);
        await driver.sleep(500);

        // Re-inject to pick up the conversationId as pendingConversationId
        await driver.executeScript(JABRA_MOCK_PENDING);
    }

    it('Jabra(WebHID)-incoming call answer from headset then end from headset', async () => {
        await simulateRingingCall('Jabra(WebHID)-incoming call answer from headset then end from headset');

        // Answer via HOOK_SWITCH value=true
        await driver.executeScript(`window.__signalSubject.next({ type: ${SIGNAL.HOOK_SWITCH}, value: true });`);
        await driver.sleep(1000);
        expect(await getStateText('connected')).toContain('true');

        // End via HOOK_SWITCH value=false
        await driver.executeScript(`window.__signalSubject.next({ type: ${SIGNAL.HOOK_SWITCH}, value: false });`);
        await driver.sleep(1000);

        await endAllCalls();
    });

    it('Jabra(WebHID)-incoming call reject from headset', async () => {
        await simulateRingingCall('Jabra(WebHID)-incoming call reject from headset');

        // Reject via REJECT_CALL signal
        await driver.executeScript(`window.__signalSubject.next({ type: ${SIGNAL.REJECT_CALL}, value: true });`);
        await driver.sleep(1000);

        await endAllCalls();
    });

    it('Jabra(WebHID)-incoming call mute and unmute', async () => {
        await simulateIncomingCall('Jabra(WebHID)-incoming call mute and unmute');

        await sendSignal(SIGNAL.PHONE_MUTE);
        await driver.sleep(1000);
        expect(await getStateText('mute-state')).toContain('true');

        await sendSignal(SIGNAL.PHONE_MUTE);
        await driver.sleep(1000);
        expect(await getStateText('mute-state')).toContain('false');

        await endAllCalls();
    });

    it('Jabra(WebHID)-outgoing call mute and unmute', async () => {
        await simulateOutgoingCall('Jabra(WebHID)-outgoing call mute and unmute');

        await sendSignal(SIGNAL.PHONE_MUTE);
        await driver.sleep(1000);
        expect(await getStateText('mute-state')).toContain('true');

        await sendSignal(SIGNAL.PHONE_MUTE);
        await driver.sleep(1000);
        expect(await getStateText('mute-state')).toContain('false');

        await endAllCalls();
    });

    it('Jabra(WebHID)-incoming call hold and unhold', async () => {
        await simulateIncomingCall('Jabra(WebHID)-incoming call hold and unhold');

        await sendSignal(SIGNAL.HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('true');

        await sendSignal(SIGNAL.HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('false');

        await endAllCalls();
    });

    it('Jabra(WebHID)-outgoing call hold and unhold', async () => {
        await simulateOutgoingCall('Jabra(WebHID)-outgoing call hold and unhold');

        await sendSignal(SIGNAL.HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('true');

        await sendSignal(SIGNAL.HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('false');

        await endAllCalls();
    });

    it('Jabra(WebHID)-incoming call alt hold and unhold', async () => {
        await simulateIncomingCall('Jabra(WebHID)-incoming call alt hold and unhold');

        await sendSignal(SIGNAL.ALT_HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('true');

        await sendSignal(SIGNAL.ALT_HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('false');

        await endAllCalls();
    });

    it('Jabra(WebHID)-outgoing call alt hold and unhold', async () => {
        await simulateOutgoingCall('Jabra(WebHID)-outgoing call alt hold and unhold');

        await sendSignal(SIGNAL.ALT_HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('true');

        await sendSignal(SIGNAL.ALT_HOLD);
        await driver.sleep(1000);
        expect(await getStateText('hold-state')).toContain('false');

        await endAllCalls();
    });

    it('Jabra(WebHID)-UI mute headset reflects', async () => {
        await simulateOutgoingCall('Jabra(WebHID)-UI mute headset reflects');

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

    it('Jabra(WebHID)-UI hold headset reflects', async () => {
        await simulateOutgoingCall('Jabra(WebHID)-UI hold headset reflects');

        // Click hold in the UI
        const holdBtn = await driver.findElement(By.css('[data-testid="hold"]'));
        await holdBtn.click();
        await driver.sleep(1000);

        const isHeld = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isHeld;
    `);
        expect(isHeld).toBe(true);

        // Click resume in the UI
        await holdBtn.click();
        await driver.sleep(1000);

        const isResumed = await driver.executeScript(`
      return window.__headsetService.selectedImplementation.isHeld;
    `);
        expect(isResumed).toBe(false);

        await endAllCalls();
    });
});
