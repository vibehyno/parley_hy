import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureBrowserRuntime, officialPlaywright } from './browser-runtime.mjs';
import { connectOfficialBrowser } from './official-browser.mjs';
import { focusBrowserWindow } from './browser-window.mjs';

const fail = (message, status = 409) => Object.assign(new Error(message), { status });
async function pageVersion(context) {
  const values = await Promise.all(context.pages().filter(page => !page.isClosed()).map(async page => {
    // Fingerprint only. Browser actions and user-facing snapshots belong to the official MCP.
    const content = await page.evaluate(() => ({ html: document.documentElement.outerHTML,
      fields: [...document.querySelectorAll('input,textarea,select')].filter(el => el.type !== 'password').map(el => [el.value, el.checked, el.selectedIndex]),
    }));
    return [page.url(), content];
  }));
  return crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 20);
}
export class SharedBrowser {
  constructor({ launch, connect = connectOfficialBrowser, prepare = ensureBrowserRuntime, fingerprint = pageVersion, focusWindow = focusBrowserWindow } = {}) {
    this.sessions = new Map(); this.grants = new Map();
    this.connect = connect; this.prepare = prepare; this.fingerprint = fingerprint;
    this.focusWindow = focusWindow;
    this.launch = launch || (async () => {
      const { chromium } = officialPlaywright();
      try { return await chromium.launch({ headless: false, channel: 'chrome', timeout: 15000 }); }
      catch { throw fail('Chrome을 열 수 없습니다. Chrome 설치 상태를 확인한 뒤 다시 시도해주세요.', 503); }
    });
  }
  state(room) {
    const session = this.sessions.get(room);
    return { connected: !!session?.browser && !session?.opening, opening: !!session?.opening, phase: session?.phase || null, manual: !!session?.manual,
      tabs: [...(session?.groups || [])].filter(([, group]) => group.page && !group.page.isClosed()).map(([scope, group]) => ({
        scope, url: group.page.url(), busy: group.busy || null, activity: group.activity || null,
        seen: [...group.seen.values()],
      })) };
  }
  async open(room, beforeLaunch) {
    let session = this.sessions.get(room);
    if (session?.opening) return session.opening;
    if (session?.browser) return this.state(room);
    session = { browser: null, groups: new Map(), manual: false, closed: false, phase: 'preparing' };
    this.sessions.set(room, session);
    session.opening = (async () => {
      try {
        await this.prepare({ onPhase: phase => { session.phase = phase; } });
        if (session.closed) throw fail('브라우저 연결이 취소되었습니다.');
        if (beforeLaunch) { session.phase = 'registering'; await beforeLaunch(); }
        session.phase = 'opening';
        const browser = await this.launch();
        if (session.closed) { await browser.close(); throw fail('브라우저 연결이 취소되었습니다.'); }
        session.browser = browser;
        session.outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parley-shared-browser-'));
        browser.on('disconnected', () => {
          if (this.sessions.get(room) !== session) return;
          this.close(room).catch(() => {});
        });
        await this.group(session, 'shared');
      } catch (error) {
        if (this.sessions.get(room) === session) this.sessions.delete(room);
        await session.browser?.close().catch(() => {});
        this.removeOutput(session); throw error;
      } finally { session.opening = null; session.phase = null; }
      return this.state(room);
    })();
    return session.opening;
  }
  async group(session, key) {
    let group = session.groups.get(key);
    if (!group) {
      group = { page: null, context: null, tail: Promise.resolve(), busy: null, seen: new Map(), revision: 0 };
      session.groups.set(key, group);
      group.opening = (async () => {
        group.context = await session.browser.newContext({ viewport: null, acceptDownloads: false });
        group.context.setDefaultTimeout(10000);
        group.context.on('page', page => { group.page = page; });
        group.page = await group.context.newPage();
        group.engine = await this.connect(group.context, session.outputDir);
      })().catch(async error => {
        session.groups.delete(key); await group.context?.close().catch(() => {}); throw error;
      });
    }
    await group.opening;
    if (!group.page || group.page.isClosed()) {
      group.page = group.context.pages().find(page => !page.isClosed());
      if (!group.page) throw fail('탭이 닫혔습니다. 브라우저 연결을 닫고 다시 열어주세요.');
    }
    return group;
  }
  grant(room, seat, { readOnly = false, valid = () => true } = {}) {
    if (!this.state(room).connected) return null;
    const token = crypto.randomBytes(32).toString('base64url');
    this.grants.set(token, { room, seat, readOnly, valid }); return token;
  }
  revoke(token) { this.grants.delete(token); }
  revokeRoom(room) { for (const [token, grant] of this.grants) if (grant.room === room) this.grants.delete(token); }
  setManual(room, value) {
    const session = this.sessions.get(room);
    if (!session?.browser) throw fail('브라우저가 연결되어 있지 않습니다.');
    session.manual = !!value; return this.state(room);
  }
  async focus(room, scope = 'shared') {
    const session = this.sessions.get(room);
    const group = session?.groups.get(scope);
    const page = group?.page;
    if (!page || page.isClosed()) throw fail('열린 탭이 없습니다.');
    const client = await group.context.newCDPSession(page);
    try {
      const { windowId, bounds } = await client.send('Browser.getWindowForTarget');
      if (bounds.windowState === 'minimized') {
        await client.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
      }
      await page.bringToFront();
    } finally { await client.detach(); }
    await this.focusWindow(session.browser, page);
  }
  removeOutput(session) {
    const dir = session.outputDir;
    if (dir && path.dirname(path.resolve(dir)) === path.resolve(os.tmpdir()) && path.basename(dir).startsWith('parley-shared-browser-')) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* OS may still hold a screenshot handle. */ }
    }
  }
  async close(room) {
    const session = this.sessions.get(room); if (!session) return;
    session.closed = true; this.sessions.delete(room); this.revokeRoom(room);
    if (session.opening) await session.opening.catch(() => {});
    await Promise.allSettled([...session.groups.values()].map(async group => { await group.opening.catch(() => {}); await group.engine?.close(); }));
    await session.browser?.close(); this.removeOutput(session);
  }
  async closeAll() { await Promise.allSettled([...this.sessions.keys()].map(room => this.close(room))); }
  authorize(token) {
    const grant = this.grants.get(token);
    if (!grant || !grant.valid()) throw fail('브라우저 연결 권한이 만료되었습니다. 현재 호출의 연결 정보를 사용해주세요.', 403);
    return grant;
  }
  async call(token, input) {
    const grant = this.authorize(token);
    if (!['shared', 'private'].includes(input.scope || 'shared')) throw fail('지원하지 않는 브라우저 범위입니다.', 400);
    const session = this.sessions.get(grant.room);
    if (!session?.browser || session.closed) throw fail('브라우저가 연결되어 있지 않습니다.');
    const key = input.scope === 'private' ? `private:${grant.seat}` : 'shared';
    const group = await this.group(session, key);
    const tool = group.engine.tools.find(tool => tool.name === input.name);
    if (!tool) throw fail('지원하지 않는 브라우저 도구입니다.', 400);
    const writing = tool.annotations?.readOnlyHint !== true;
    const check = () => {
      this.authorize(token);
      if (session.closed || this.sessions.get(grant.room) !== session) throw fail('브라우저 연결이 종료되었습니다.');
      if (writing && session.manual) throw fail('사용자가 직접 조작 중입니다. 자동 조작을 다시 허용할 때까지 기다려주세요.');
      if (writing && grant.readOnly) throw fail('현재 호출은 읽기 전용입니다. 화면 확인만 가능합니다.', 403);
    };
    check();
    const args = input.args || {};
    if (!args || typeof args !== 'object' || Array.isArray(args) || 'filename' in args) throw fail('공유 브라우저에서는 파일 저장 경로를 지정할 수 없습니다.', 400);
    if (input.name === 'browser_tabs' && args.isolatedContext && args.isolatedContext !== 'default') throw fail('독립 작업은 scope=private로 요청해주세요.', 400);
    if (typeof args.url === 'string') {
      let url; try { url = new URL(args.url); } catch { throw fail('올바른 URL을 입력해주세요.', 400); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw fail('HTTP 또는 HTTPS 주소만 사용할 수 있습니다.', 400);
    }
    const execute = async () => {
      check(); group.busy = grant.seat; group.activity = { name: input.name, reading: !writing, startedAt: Date.now() };
      try {
        if (writing) {
          const current = `${await this.fingerprint(group.context)}:${group.revision}`;
          if (!input.version || input.version !== current) throw fail('화면이 변경되었거나 확인하지 않은 상태입니다. browser_snapshot으로 다시 읽은 후 판단해주세요.');
          check();
        }
        const result = await group.engine.call(input.name, args);
        if (writing) group.revision++;
        if (input.name === 'browser_tabs' && args.action === 'select') group.page = group.context.pages()[args.index] || group.page;
        const version = `${await this.fingerprint(group.context)}:${group.revision}`;
        if (!result.isError) group.seen.set(grant.seat, { seat: grant.seat, at: Date.now(), name: input.name, reading: !writing });
        return { ...result, content: [...(result.content || []), { type: 'text', text: `Parley ${JSON.stringify({ scope: input.scope || 'shared', version })}` }] };
      } finally { group.busy = null; group.activity = null; }
    };
    const pending = group.tail.then(execute, execute); group.tail = pending.catch(() => {}); return pending;
  }
}
