import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const PID_FILE = path.resolve(__dirname, '.e2e-server.pid');

export default async function globalTeardown() {
  if (!fs.existsSync(PID_FILE)) return;

  const pid = fs.readFileSync(PID_FILE, 'utf-8').trim();
  fs.unlinkSync(PID_FILE);

  try {
    // Kill the entire process tree
    execSync(`pkill -P ${pid}`, { stdio: 'ignore' });
    execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
  } catch { /* already dead */ }
}
