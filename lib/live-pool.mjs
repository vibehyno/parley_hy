import { spawn } from 'node:child_process';

const idleConnections = new Map();
const all = new Set();
const IDLE_MS = 10 * 60 * 1000;

export function closeLiveConnections() {
  for (const entry of [...all]) entry.close();
}

// Ownership is a room/seat, not a global provider: never share conversation state.
export function acquireLiveConnection(spec, args, options, settings = {}) {
  const key = options.poolKey;
  const stableArgs = args.filter((arg, index) => !['--resume', '--append-system-prompt'].includes(arg) && !['--resume', '--append-system-prompt'].includes(args[index - 1]));
  const fingerprint = JSON.stringify([spec, stableArgs, options.cwd, options.poolSettings, settings]);
  let entry = key && idleConnections.get(key);
  if (entry && (entry.fingerprint !== fingerprint || !options.sessionRef ||
      entry.data.sessionId !== options.sessionRef || entry.child.exitCode !== null || entry.child.killed)) {
    entry.close(); entry = null;
  }
  if (entry) {
    clearTimeout(entry.timer); idleConnections.delete(key);
    entry.reused = true;
    return entry;
  }
  if (spec.error) throw new Error(spec.error);
  const child = spawn(spec.cmd, [...(spec.pre || []), ...args], {
    cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    detached: process.platform !== 'win32',
  });
  child.rtProcessGroup = process.platform !== 'win32';
  entry = { child, fingerprint, data: {}, reused: false, timer: null,
    close() {
      clearTimeout(entry.timer);
      if (idleConnections.get(key) === entry) idleConnections.delete(key);
      all.delete(entry);
      if (child.exitCode === null && !child.killed) (options.kill || (p => p.kill()))(child);
    },
    release() {
      if (!key || child.exitCode !== null || child.killed || child.rtStopped) return entry.close();
      idleConnections.get(key)?.close();
      idleConnections.set(key, entry);
      entry.timer = setTimeout(() => entry.close(), options.idleMs ?? IDLE_MS);
      entry.timer.unref();
      while (idleConnections.size > 12) idleConnections.values().next().value.close();
    },
  };
  all.add(entry);
  child.on('error', () => entry.close());
  child.stdin.on('error', () => entry.close());
  child.once('close', () => entry.close());
  return entry;
}
