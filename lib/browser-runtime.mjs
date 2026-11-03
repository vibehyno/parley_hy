import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
let pending;
export function runtimeInstalled() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const runtime = JSON.parse(fs.readFileSync(require.resolve('@playwright/mcp/package.json'), 'utf8'));
    if (runtime.version !== manifest.dependencies['@playwright/mcp']) return false;
    require.resolve('@modelcontextprotocol/sdk/client/index.js');
    return true;
  } catch { return false; }
}
export async function ensureBrowserRuntime({ installed = runtimeInstalled, install = installRuntime, onPhase = () => {} } = {}) {
  if (installed()) return;
  onPhase('installing');
  if (!pending) pending = Promise.resolve().then(install).finally(() => { pending = null; });
  await pending;
  if (!installed()) throw new Error('Playwright MCP 설치를 확인할 수 없습니다. Parley 폴더에서 setupParley.cmd를 다시 실행해주세요.');
}
function installRuntime() {
  const candidates = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')];
  const npm = candidates.find(file => file && fs.existsSync(file));
  if (!npm) throw new Error('npm을 찾을 수 없습니다. Node.js 설치 후 setupParley.cmd를 다시 실행해주세요.');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npm, 'install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
    });
    let tail = '', timedOut = false;
    child.stderr.on('data', data => { tail = (tail + data).slice(-2000); });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 180000);
    child.once('error', error => { clearTimeout(timer); reject(new Error(`Playwright MCP 설치 실행 실패: ${error.message}`)); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(timedOut ? 'Playwright MCP 설치 시간이 초과되었습니다. 네트워크 확인 후 다시 연결해주세요.'
        : `Playwright MCP 자동 설치 실패. 네트워크·폴더 쓰기 권한을 확인해주세요.${/EACCES|EPERM/.test(tail) ? ' (폴더 접근 거부)' : ''}`));
    });
  });
}
export function officialPlaywright() {
  return createRequire(require.resolve('@playwright/mcp/package.json'))('playwright');
}
