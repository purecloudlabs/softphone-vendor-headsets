import { ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';

let appProcess: ChildProcess;

const PID_FILE = path.resolve(__dirname, '.e2e-server.pid');

function checkServer(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      resolve(res.statusCode !== undefined);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServer(url)) return;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  const reactAppDir = path.resolve(__dirname, '../../');

  appProcess = exec('yarn start', {
    cwd: reactAppDir,
    env: { ...process.env, BROWSER: 'none', HTTPS: 'true' }
  });

  // Write PID to file so teardown can kill it
  fs.writeFileSync(PID_FILE, String(appProcess.pid));

  appProcess.stdout?.on('data', (d) => process.stdout.write(d));
  appProcess.stderr?.on('data', (d) => process.stderr.write(d));

  await waitForServer('https://localhost:8443');
}
