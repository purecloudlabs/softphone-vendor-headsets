import { ChildProcess, exec } from 'child_process';
import path from 'path';

let appProcess: ChildProcess;

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(url, { method: 'HEAD' });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  const reactAppDir = path.resolve(__dirname, '../react-app');

  appProcess = exec('yarn start', { cwd: reactAppDir, env: { ...process.env, BROWSER: 'none', HTTPS: 'true' } });

  // Store PID so globalTeardown can kill it
  (globalThis as any).__APP_PID__ = appProcess.pid;

  appProcess.stdout?.on('data', (d) => process.stdout.write(d));
  appProcess.stderr?.on('data', (d) => process.stderr.write(d));

  await waitForServer('https://localhost:8443');
}
