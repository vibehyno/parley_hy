import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { SharedBrowser } from '../lib/shared-browser.mjs';
import { browserBridge, browserCliArgs } from '../lib/shared-browser-config.mjs';
import { ensureBrowserRuntime } from '../lib/browser-runtime.mjs';
import { connectOfficialBrowser } from '../lib/official-browser.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const version = result => JSON.parse(result.content.at(-1).text.slice(7)).version;
function fixture(persistent = false) {
  const contexts = [];
  let launches = 0;
  const browser = new EventEmitter();
  browser.close = async () => browser.emit('disconnected');
  browser.newContext = async () => {
    const context = new EventEmitter();
    context.setDefaultTimeout = () => {};
    context.pages = () => context.page ? [context.page] : [];
    context.close = async () => {};
    context.newPage = async () => {
      const page = { value: 'initial', address: 'about:blank', isClosed: () => false, url: () => page.address, bringToFront: async () => {} };
      context.page = page; context.emit('page', page); return page;
    };
    contexts.push(context); return context;
  };
  const connect = async context => ({
    tools: [ ['browser_snapshot', true], ['browser_click', false], ['browser_type', false], ['browser_navigate', false] ].map(([name, readOnlyHint]) => ({name, annotations: { readOnlyHint }})),
    call: async (name, args) => {
      if (name === 'browser_click') { await context.block?.(); context.page.value += '!'; }
      if (name === 'browser_type') context.page.value = args.text;
      if (name === 'browser_navigate') context.page.address = args.url;
      return {content:[{type:'text',text:context.page.value}]};
    }, close: async () => {},
  });
  return { contexts, manager: new SharedBrowser({ launch: async () => { launches++; return persistent ? {browser,sharedContext:await browser.newContext()} : browser; }, connect, prepare: async () => {}, fingerprint: async context => context.page.value, focusWindow: async () => {} }), launches: () => launches };
}

test('shared tabs use the persistent context; private seats use separate contexts; disconnect closes persistent context gracefully', async () => {
  const {manager,contexts}=fixture(true),room={};
  await manager.open(room);
  assert.equal(contexts.length,1);
  assert.equal(manager.sessions.get(room).groups.get('shared').context,contexts[0]);
  const token=manager.grant(room,'codex');
  await manager.call(token,{name:'browser_snapshot',scope:'private'});
  assert.equal(contexts.length,2);
  assert.notEqual(manager.sessions.get(room).groups.get('private:codex').context,contexts[0]);
  let closed=false;contexts[0].close=async()=>{closed=true};
  await manager.close(room);
  assert.equal(closed,true);
});
const read = (manager, token, scope = 'shared') => manager.call(token, { name: 'browser_snapshot', scope });

test('focus restores only the selected minimized window before bringing its tab forward', async () => {
  const { manager, contexts } = fixture(), room = {};
  await manager.open(room);
  const calls = [];
  let windowState = 'minimized';
  contexts[0].newCDPSession = async page => {
    assert.equal(page, contexts[0].page);
    return {
      send: async (name, args) => { calls.push([name, args]); return { windowId: 7, bounds: { windowState } }; },
      detach: async () => calls.push(['detach']),
    };
  };
  contexts[0].page.bringToFront = async () => calls.push(['front']);
  manager.focusWindow = async (_, page) => { assert.equal(page, contexts[0].page); calls.push(['window']); };
  try {
    await manager.focus(room);
    assert.deepEqual(calls.map(call => call[0]), ['Browser.getWindowForTarget', 'Browser.setWindowBounds', 'front', 'detach', 'window']);
    assert.deepEqual(calls[1][1], { windowId: 7, bounds: { windowState: 'normal' } });
    calls.length = 0; windowState = 'maximized';
    await manager.focus(room);
    assert.deepEqual(calls.map(call => call[0]), ['Browser.getWindowForTarget', 'front', 'detach', 'window']);
    await assert.rejects(manager.focus(room, 'private:missing'), /열린 탭/);
  } finally { await manager.closeAll(); }
});
const write = (manager, token, prior, scope = 'shared', text = 'changed') => manager.call(token, {name:'browser_type', scope, version: version(prior), args:{target:'input',text}});

test('shared view, private contexts and model activity are kept separate', async () => {
  const { manager, contexts, launches } = fixture(), room = {};
  await Promise.all([manager.open(room), manager.open(room)]);
  assert.equal(launches(), 1);
  const a = manager.grant(room, 'codex'), b = manager.grant(room, 'claude');
  await write(manager, a, await read(manager, a));
  assert.equal((await read(manager, b)).content[0].text, 'changed');
  await Promise.all([read(manager, a, 'private'), read(manager, b, 'private')]);
  assert.equal(contexts.length, 3);
  await write(manager, a, await read(manager, a, 'private'), 'private', 'private-a');
  assert.equal((await read(manager, b, 'private')).content[0].text, 'initial');
  const shared = manager.state(room).tabs.find(tab => tab.scope === 'shared');
  assert(shared.seen.some(item => item.seat === 'claude' && item.reading && item.at > 0));
  assert.equal(shared.busy, null);
  await manager.closeAll();
});

test('stale actions cannot overwrite a concurrent shared-page action', async () => {
  const {manager} = fixture(), room = {}; await manager.open(room);
  const a = manager.grant(room,'a'), b = manager.grant(room,'b'), prior = await read(manager,a);
  const results = await Promise.allSettled([write(manager,a,prior),write(manager,b,prior)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.match(results.find(result=>result.status==='rejected').reason.message,/화면이 변경/);
  await manager.closeAll();
});

test('manual control, read-only turns, invalid grants and forbidden paths are enforced', async () => {
  const {manager} = fixture(), room = {}; await manager.open(room);
  const a=manager.grant(room,'a'), ro=manager.grant(room,'review',{readOnly:true}), prior=await read(manager,a);
  await assert.rejects(write(manager,ro,prior),/읽기 전용/);
  manager.setManual(room,true); await assert.rejects(write(manager,a,prior),/직접 조작/); await read(manager,a);
  manager.setManual(room,false);
  await assert.rejects(manager.call(a,{name:'browser_navigate',version:version(prior),args:{url:'file:///secret'}}),/HTTP/);
  await assert.rejects(manager.call(a,{name:'browser_snapshot',args:{filename:'../secret'}}),/파일 저장/);
  manager.revoke(a); await assert.rejects(read(manager,a),/만료/);
  await manager.closeAll(); await assert.rejects(read(manager,ro),/만료/);
});

test('a shared action invalidates prior versions even when the DOM stays identical', async () => {
  const {manager} = fixture(), room = {}; await manager.open(room);
  try {
    const a = manager.grant(room, 'a'), b = manager.grant(room, 'b');
    const prior = await read(manager, a);
    await write(manager, a, prior, 'shared', 'initial');
    await assert.rejects(write(manager, b, prior), /화면이 변경/);
  } finally { await manager.closeAll(); }
});

test('private contexts continue independently and expose only the active model while busy', async () => {
  const {manager,contexts}=fixture(),room={}; await manager.open(room);
  const a=manager.grant(room,'a'),b=manager.grant(room,'b');
  const prior=await read(manager,a,'private'); await read(manager,b,'private');
  let release,started;
  const blocked=new Promise(resolve=>{release=resolve}); const running=new Promise(resolve=>{started=resolve});
  contexts[1].block=async()=>{started();await blocked};
  const pending=manager.call(a,{name:'browser_click',scope:'private',version:version(prior),args:{target:'button'}});
  await running;
  try {
    assert.equal(manager.state(room).tabs.find(tab=>tab.scope==='private:a').busy,'a');
    assert.equal((await read(manager,b,'private')).content[0].text,'initial');
  } finally {release();await pending;await manager.closeAll()}
});

test('official MCP tool catalog is forwarded through stdio, without launching a browser', async () => {
  const {manager}=fixture(),room={};await manager.open(room);const token=manager.grant(room,'codex');
  const endpoint=http.createServer(async(req,res)=>{
    try { const chunks=[];for await(const chunk of req) chunks.push(chunk);
      const result=await manager.call(req.headers.authorization?.slice(7),JSON.parse(Buffer.concat(chunks)));
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
    } catch(error){res.writeHead(error.status||500);res.end(JSON.stringify({error:error.message}))}
  });
  await new Promise(resolve=>endpoint.listen(0,'127.0.0.1',resolve));
  const client=new Client({name:'parley-test',version:'1'});
  const transport=new StdioClientTransport({command:process.execPath,args:[browserBridge],stderr:'pipe'});
  try {
    await client.connect(transport);
    const tools=(await client.listTools()).tools;
    assert(tools.some(tool=>tool.name==='browser_snapshot'));
    assert(tools.some(tool=>tool.name==='browser_click'));
    assert(!tools.some(tool=>tool.name==='parley_browser'||tool.name==='browser_run_code_unsafe'));
    const args={connection:`${endpoint.address().port}/${token}`};
    assert.equal((await client.callTool({name:'browser_snapshot',arguments:args})).content[0].text,'initial');
    manager.revoke(token);assert.equal((await client.callTool({name:'browser_snapshot',arguments:args})).isError,true);
  } finally {await client.close();endpoint.closeAllConnections();await new Promise(resolve=>endpoint.close(resolve));await manager.closeAll()}
});

test('missing runtime installs once for concurrent requests; failures remain retryable', async () => {
  let ready=false, count=0;
  const options={installed:()=>ready,install:async()=>{count++;await new Promise(resolve=>setTimeout(resolve,10));ready=true}};
  await Promise.all([ensureBrowserRuntime(options),ensureBrowserRuntime(options)]);assert.equal(count,1);
  await ensureBrowserRuntime(options);assert.equal(count,1);
  await assert.rejects(ensureBrowserRuntime({installed:()=>false,install:async()=>{throw Error('offline')}}),/offline/);
  ready=false;await ensureBrowserRuntime(options);assert.equal(count,2);
});

test('native CLI overlays and official schema preserve tool annotations', async () => {
  assert.equal(browserCliArgs('claude')[0],'--mcp-config');
  assert(browserCliArgs('codex').some(arg=>arg.startsWith('mcp_servers.parley-browser.command=')));
  const catalog=await connectOfficialBrowser(null);
  try { assert.equal(catalog.tools.find(tool=>tool.name==='browser_snapshot').annotations.readOnlyHint,true); }
  finally {await catalog.close()}
});
