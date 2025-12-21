#!/usr/bin/env node

// Next.js dev launcher that prefers ports 6500-6800
// - Picks the first available port in the range
// - Falls back to Next.js default behavior if none found
// - Prints the chosen port and forwards all stdio
//
// WHY: Local tools and other apps often use 3000; this avoids collisions.

import net from 'net';
import { spawn } from 'child_process';

const RANGE_START = 6500;
const RANGE_END = 6800; // inclusive

async function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const srv = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => srv.close(() => resolve(true)))
      .listen(port, host);
  });
}

async function findPort() {
  for (let p = RANGE_START; p <= RANGE_END; p++) {
    // Try loopback first, then 0.0.0.0 as fallback
    if (await isPortFree(p, '127.0.0.1')) return p;
    if (await isPortFree(p, '0.0.0.0')) return p;
  }
  return null;
}

(async () => {
  const preferred = await findPort();

  if (!preferred) {
    console.error(`[dev] No free port found in ${RANGE_START}-${RANGE_END}. Falling back to Next.js default.`);
  }

  const args = ['dev'];
  if (preferred) {
    args.push('-p', String(preferred));
    process.env.PORT = String(preferred);
    process.env.BASE_URL = process.env.BASE_URL || `http://localhost:${preferred}`;
    console.log(`[dev] Starting Next.js on port ${preferred} (preferred range ${RANGE_START}-${RANGE_END})`);
  } else if (process.env.PORT) {
    console.log(`[dev] Starting Next.js on PORT=${process.env.PORT}`);
  } else {
    console.log('[dev] Starting Next.js on default port (no preferred port available).');
  }

  const child = spawn('next', args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[dev] Next.js exited due to signal ${signal}`);
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });
})();
