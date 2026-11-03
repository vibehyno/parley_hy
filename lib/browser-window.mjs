import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

// Only called by an explicit user click, never by model tools or status polling.
export async function focusBrowserWindow(browser, page, { platform = process.platform, execute = execFile } = {}) {
  if (platform !== 'win32') return;
  const client = await browser.newBrowserCDPSession();
  let browserPid;
  try {
    const { processInfo } = await client.send('SystemInfo.getProcessInfo');
    browserPid = processInfo.find(info => info.type === 'browser')?.id;
  } finally { await client.detach(); }
  if (!Number.isSafeInteger(browserPid) || browserPid <= 0) throw new Error('공유 Chrome 프로세스를 확인하지 못했습니다.');
  const title = await page.title() || page.url();
  const script = fs.readFileSync(new URL('./focus-browser-window.ps1', import.meta.url), 'utf8');
  await new Promise((resolve, reject) => {
    execute(path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { windowsHide: true, timeout: 10000, maxBuffer: 8192,
        env: { ...process.env, PARLEY_BROWSER_PID: String(browserPid), PARLEY_BROWSER_TITLE: title } },
      error => error ? reject(new Error('공유 브라우저 창을 앞으로 가져오지 못했습니다. 작업표시줄의 Chrome 창을 선택해주세요.')) : resolve());
  });
}
