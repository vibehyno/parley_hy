// Opt-in headed check; no user rooms, browser profiles, or external pages.
import http from 'node:http';
import { SharedBrowser } from '../lib/shared-browser.mjs';
import { focusBrowserWindow } from '../lib/browser-window.mjs';

export async function startFocusCheck() {
  const manager = new SharedBrowser(), room = {};
  let target, cover, address;
  const html = `<!doctype html><meta charset="utf-8"><title>Parley window focus check</title>
    <h1>공유 브라우저 창 표시 검사</h1>
    <button id="minimize">최소화 상태 준비</button><button id="behind">뒤로 숨긴 상태 준비</button>
    <button id="focus">공유 화면</button><pre id="result"></pre>
    <script>for(const b of document.querySelectorAll('button'))b.onclick=async()=>{
      document.querySelector('#result').textContent='working';
      const response=await fetch('/'+b.id,{method:'POST'});
      document.querySelector('#result').textContent=await response.text();
    };</script>`;
  const windowState = async (state) => {
    const client = await target.context().newCDPSession(target);
    try {
      const current = await client.send('Browser.getWindowForTarget');
      if (state) await client.send('Browser.setWindowBounds', {windowId: current.windowId, bounds:{windowState:state}});
      return (await client.send('Browser.getWindowForTarget')).bounds.windowState;
    } finally { await client.detach(); }
  };
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(req.url === '/target' ? '<title>Parley temporary target 1426</title><h1>대상 공유 창</h1>' : req.url === '/cover' ? '<title>Parley temporary cover 1426</title><h1>가림 창</h1>' : html); return;
    }
    if (req.method !== 'POST' || req.headers.origin !== address) { res.writeHead(403); res.end(); return; }
    try {
      if (req.url === '/focus') {
        await manager.focus(room);
        res.end(JSON.stringify({foregroundVerified: true, state: await windowState()}));
      } else if (req.url === '/minimize' || req.url === '/behind') {
        await windowState(req.url === '/minimize' ? 'minimized' : 'normal');
        await cover.bringToFront();
        await focusBrowserWindow(manager.sessions.get(room).browser, cover);
        res.end(JSON.stringify({coverForegroundVerified: true, targetState: await windowState()}));
      } else { res.writeHead(404); res.end(); }
    } catch (error) { res.writeHead(500); res.end(JSON.stringify({error:error.message})); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  address = `http://127.0.0.1:${server.address().port}`;
  const close = async () => { await manager.closeAll(); await new Promise(resolve => server.close(resolve)); };
  try {
    await manager.open(room);
    const session = manager.sessions.get(room);
    target = session.groups.get('shared').page;
    await target.goto(address + '/target');
    const context = await session.browser.newContext({viewport: null});
    cover = await context.newPage(); await cover.goto(address + '/cover');
    return {url:address, close};
  } catch (error) { await close(); throw error; }
}
