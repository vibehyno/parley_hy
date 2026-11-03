import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { excludedBrowserTools } from './official-browser.mjs';

const require = createRequire(import.meta.url);
export const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm';
const inspectPage = `() => ({url: location.href, title: document.title,
  html: document.documentElement.outerHTML,
  fields: [...document.querySelectorAll('input,textarea,select')]
    .filter(el => el.type !== 'password').map(el => [el.value, el.checked, el.selectedIndex])})`;

export function chromeConnectionError(error) {
  if (error?.code?.startsWith('BROWSER_CHROME_') || error?.code === 'BROWSER_EXTENSION_REQUIRED') return error;
  const missing = /Playwright Extension not found|extension (?:is )?not installed/i.test(error?.message || String(error));
  return Object.assign(new Error(missing
    ? 'Playwright 확장이 필요합니다. 내 Chrome에 설치한 뒤 연결해주세요.'
    : 'Chrome 연결을 완료하지 못했습니다. Chrome에서 공유할 탭을 선택한 뒤 다시 연결해주세요.'),
  {status:503, code:missing ? 'BROWSER_EXTENSION_REQUIRED' : 'BROWSER_CHROME_CONNECT_FAILED'});
}

export function parsePageInspection(result) {
  const text = result.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') || '';
  if (result.isError) throw chromeConnectionError(new Error(text));
  const match = text.match(/### Result\s*\n([\s\S]*?)(?=\n### |$)/);
  let page;
  try { page = JSON.parse(match?.[1] || ''); } catch { /* Do not fingerprint an error as a valid page. */ }
  if (!page || typeof page.url !== 'string' || typeof page.html !== 'string' || !Array.isArray(page.fields)) {
    throw new Error('Chrome 화면 응답을 확인할 수 없습니다. 연결을 다시 시도해주세요.');
  }
  return { url: page.url, title: page.title,
    version: crypto.createHash('sha256').update(JSON.stringify(page)).digest('hex').slice(0, 20) };
}

// A separate official MCP process owns the extension relay, not the user's Chrome.
// Closing or timing out the relay cannot terminate the personal browser process.
export async function connectChromeBrowser(outputDir) {
  const [{ Client }, { StdioClientTransport }] = await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'), import('@modelcontextprotocol/sdk/client/stdio.js'),
  ]);
  const cli = path.join(path.dirname(require.resolve('@playwright/mcp/package.json')), 'cli.js');
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [cli, '--extension', '--browser', 'chrome', '--output-dir', outputDir,
      '--timeout-action', '10000', '--timeout-navigation', '25000'], stderr: 'pipe' });
  const client = new Client({ name: 'Parley HY', version: '1.4.32' });
  let disconnected = () => {};
  client.onclose = () => disconnected();
  let closed = false, active = { url: 'about:blank', title: '' };
  const close = async () => {
    if (closed) return;
    closed = true;
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
  };
  const call = async (name, args) => {
    if (closed) throw new Error('Chrome 연결이 종료되었습니다.');
    return client.callTool({ name, arguments: args }, undefined, { timeout: 60000 });
  };
  try {
    await client.connect(transport);
    transport.stderr?.on('data', () => {});
    const tools = (await client.listTools()).tools.filter(tool => !excludedBrowserTools.has(tool.name)).map(tool => {
      const { filename, ...properties } = tool.inputSchema.properties || {};
      return { ...tool, inputSchema: { ...tool.inputSchema, properties } };
    });
    return { tools, call, close, onDisconnect: callback => { disconnected = callback; }, current: () => active,
      fingerprint: async () => {
        active = parsePageInspection(await call('browser_evaluate', { function: inspectPage }));
        return active.version;
      },
      focus: async () => {
        const tabs = await call('browser_tabs', { action: 'list' });
        const text = tabs.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') || '';
        const index = text.match(/(?:^|\n)- (\d+): \(current\)/)?.[1];
        if (tabs.isError || index === undefined) throw new Error('연결된 Chrome 탭을 찾지 못했습니다.');
        const result = await call('browser_tabs', { action: 'select', index: Number(index) });
        if (result.isError) throw new Error('Chrome 탭을 앞으로 가져오지 못했습니다. 작업표시줄에서 선택해주세요.');
      },
    };
  } catch (error) { await close(); throw chromeConnectionError(error); }
}
