# Headset WebHID Debug Tools

Console snippets for diagnosing WebHID headset issues using the react-app test harness. Run these in Chrome DevTools while the app is loaded and a headset is connected.

## Prerequisites

1. Open the react-app (`https://localhost:8443`)
2. Select a microphone that matches a supported headset vendor
3. Open Chrome DevTools → Console

---

## 1. List all outgoing commands per action

Intercepts `sendReport` and runs each call control action, printing what report ID and byte value are sent to the device.

```js
(() => {
  const hs = window.__headsetService;
  const impl = hs.selectedImplementation;
  if (!impl) { console.log('No headset selected'); return; }

  const orig = impl.activeDevice?.sendReport?.bind(impl.activeDevice);
  if (!orig) { console.log('No active device'); return; }

  const log = [];
  impl.activeDevice.sendReport = (reportId, data) => {
    log.push({ reportId, value: data[0], binary: data[0].toString(2).padStart(8, '0') });
    return orig(reportId, data);
  };

  const actions = {
    incomingCall: () => impl.incomingCall({ conversationId: 'test-1' }),
    answerCall: () => impl.answerCall(),
    setMuteOn: () => impl.setMute(true),
    setMuteOff: () => impl.setMute(false),
    setHoldOn: () => impl.setHold('test-1', true),
    setHoldOff: () => impl.setHold('test-1', false),
    endCall: () => impl.endCall('test-1', false),
    rejectCall: () => impl.rejectCall(),
  };

  (async () => {
    for (const [name, fn] of Object.entries(actions)) {
      log.length = 0;
      await fn();
      console.log(`${name}:`, log.length ? log.map(l => `reportId=${l.reportId} value=${l.value} (0b${l.binary})`) : '(no sendReport call)');
    }
    impl.activeDevice.sendReport = orig;
  })();
})();
```

### Expected output

```
incomingCall: ["reportId=2 value=4 (0b00000100)"]
answerCall: ["reportId=2 value=1 (0b00000001)"]
setMuteOn: ["reportId=2 value=3 (0b00000011)"]
setMuteOff: ["reportId=2 value=1 (0b00000001)"]
setHoldOn: ["reportId=2 value=8 (0b00001000)"]
setHoldOff: ["reportId=2 value=1 (0b00000001)"]
endCall: ["reportId=2 value=0 (0b00000000)"]
rejectCall: ["reportId=2 value=0 (0b00000000)"]
```

### What to look for

- **Report ID:** Should match what the device advertises in its HID descriptor. If commands aren't working, this is the first thing to check.
- **Bit values:** Each bit corresponds to a call state flag. Compare against the vendor implementation constants.
- **"(no sendReport call)":** The action didn't trigger a device command — likely a state guard prevented it (e.g. trying to mute when not in a call).

---

## 2. Monitor incoming button presses

Listens for all HID input reports from the device. Press buttons on the headset to see what values arrive.

```js
(async () => {
  const devices = await navigator.hid.getDevices();
  const device = devices.find(d => d.vendorId === 0x6993); // Yealink
  // For other vendors: Jabra=0x0B0E, Sennheiser/EPOS=0x1395, Poly=0x047F

  if (!device) { console.log('No HID device found'); return; }

  device.addEventListener('inputreport', (e) => {
    const value = e.data.getUint8(0);
    console.log(`Report ID: ${e.reportId} | Value: ${value} (0b${value.toString(2).padStart(8, '0')})`);
    console.log('  Off-hook:', !!(value & 0b1));
    console.log('  Mute:',    !!(value & 0b10));
    console.log('  Ring:',    !!(value & 0b100));
    console.log('  Hold:',    !!(value & 0b1000));
    console.log('  Reject:',  !!(value & 0x40));
  });

  console.log(`Listening for input reports from: ${device.productName}`);
})();
```

### What to look for

- **Report ID mismatch:** If button presses arrive on a different report ID than what the code expects, commands will be silently dropped.
- **Unexpected bit patterns:** If a button sets bits that don't match the expected flags, the vendor may use a different HID descriptor layout.
- **No events at all:** The device may not have been opened, or WebHID permissions weren't granted.

---

## 3. Inspect the device's HID descriptor

Shows the full collection hierarchy including report IDs. Use this to diagnose report ID mismatches.

```js
(async () => {
  const devices = await navigator.hid.getDevices();
  const device = devices.find(d => d.vendorId === 0x6993); // Yealink

  if (!device) { console.log('No HID device found'); return; }

  console.log(`Device: ${device.productName} (vendorId=0x${device.vendorId.toString(16)}, productId=0x${device.productId.toString(16)})`);
  console.log('Collections:');

  for (const [i, col] of device.collections.entries()) {
    console.log(`  [${i}] usage=${col.usage} usagePage=${col.usagePage}`);
    if (col.inputReports?.length) {
      console.log(`    inputReports:`, col.inputReports.map(r => `reportId=${r.reportId}`));
    }
    if (col.outputReports?.length) {
      console.log(`    outputReports:`, col.outputReports.map(r => `reportId=${r.reportId}`));
    }
    if (col.children) {
      for (const [j, child] of col.children.entries()) {
        console.log(`    child[${j}] usage=${child.usage} usagePage=${child.usagePage}`);
        if (child.inputReports?.length) {
          console.log(`      inputReports:`, child.inputReports.map(r => `reportId=${r.reportId}`));
        }
      }
    }
  }
})();
```

### What to look for

- **Telephony collection:** `usagePage=11` (0x000B), `usage=5` (headset)
- **Report ID location:** Some devices put `inputReports` at the top-level collection, others nest them in children (like the Yealink UH38).
- **Missing inputReports:** If the telephony collection has no input reports at any level, the device may not support call control via WebHID.

---

## 4. Intercept outgoing commands (live monitoring)

Monkey-patches `sendReport` to log all outgoing commands in real-time while using the app normally.

```js
(() => {
  const hs = window.__headsetService;
  const impl = hs.selectedImplementation;
  if (!impl?.activeDevice) { console.log('No active device'); return; }

  const orig = impl.activeDevice.sendReport.bind(impl.activeDevice);
  impl.activeDevice.sendReport = (reportId, data) => {
    const value = data[0];
    console.log(`>>> SEND reportId=${reportId} value=${value} (0b${value.toString(2).padStart(8, '0')})`,
      { offhook: !!(value & 0b1), mute: !!(value & 0b10), ring: !!(value & 0b100), hold: !!(value & 0b1000) });
    return orig(reportId, data);
  };

  console.log('Intercepting sendReport — use the app normally and watch the console.');
  console.log('To stop: window.__headsetService.selectedImplementation.activeDevice.sendReport = null');
})();
```

---

## Common vendor IDs

| Vendor | USB Vendor ID | Notes |
|--------|--------------|-------|
| Yealink | `0x6993` | Some models nest reports in child collections |
| Jabra | `0x0B0E` | Uses Jabra SDK signals, not raw HID for most events |
| Sennheiser/EPOS | `0x1395` | |
| Poly/Plantronics | `0x047F` | Uses HTTP API, not WebHID |
| CyberAcoustics | `0x289B` | |
| VBet | `0x3503` | |

---

## Troubleshooting checklist

1. **No headset selected?** Check that `window.__headsetService.selectedImplementation` is not null.
2. **No active device?** The WebHID connection may have failed. Check `impl.activeDevice` and `impl.isConnected`.
3. **Commands not working?** Compare the report ID in the descriptor (snippet 3) against what's being sent (snippet 1 or 4).
4. **Button presses not detected?** Check that input reports arrive (snippet 2) and that the report ID matches `impl.inputReportReportId`.
5. **Wrong bit flags?** The device may use a non-standard mapping. Use snippet 2 to discover what each button sends.
