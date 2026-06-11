import { execSync } from 'child_process';

export default async function globalTeardown() {
  const pid = (globalThis as any).__APP_PID__;
  if (pid) {
    try {
      // Kill the process group
      execSync(`kill -9 -${pid}`, { stdio: 'ignore' });
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch { /* already dead */ }
    }
  }
}
