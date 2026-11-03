import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { SharedBrowser } from '../lib/shared-browser.mjs';
import { parsePageInspection } from '../lib/chrome-connection.mjs';

const version = result => JSON.parse(result.content.at(-1).text.slice(7)).version;
function fixture({ fail = false } = {}) {
  let attaches = 0, launches = 0, detached = 0, ownedClosed = 0, fingerprint = 'initial';
  const contexts = [];
  const engine = { tools: [{name:'browser_snapshot',annotations:{readOnlyHint:true}}, {name:'browser_click'}],
    current: () => ({url:'https://example.test/signed-in'}), fingerprint: async () => {
      if (fail) throw Error('Playwright Extension not found'); return fingerprint;
    }, call: async () => ({content:[]}), close: async () => { detached++; }, focus: async () => {},
  };
  const browser = new EventEmitter();
  browser.close = async () => { ownedClosed++; };
  browser.newContext = async () => {
    const context = new EventEmitter();
    const page = {url:()=> 'about:blank',isClosed:()=>false};
    Object.assign(context,{pages:()=>[page],setDefaultTimeout(){},close:async()=>{}});
    contexts.push(context); return context;
  };
  const manager = new SharedBrowser({ prepare: async()=>{}, attach: async()=>{attaches++;return engine;},
    launch: async()=>{launches++;return browser;}, connect: async()=>({...engine,close:async()=>{}}), fingerprint:async()=> 'private' });
  return {manager,contexts,engine,counts:()=>({attaches,launches,detached,ownedClosed}), change:()=>{fingerprint='changed';}};
}

test('default uses one existing Chrome connection across seats, and disconnect only detaches it', async()=>{
  const f=fixture(), room={};
  await Promise.all([f.manager.open(room),f.manager.open(room)]);
  const a=f.manager.grant(room,'codex'), b=f.manager.grant(room,'claude');
  await f.manager.call(a,{name:'browser_snapshot'});
  await f.manager.call(b,{name:'browser_snapshot'});
  assert.equal(f.manager.state(room).mode,'chrome');
  assert.equal(f.manager.state(room).tabs[0].seen.length,2);
  assert.equal(f.counts().launches,0);
  assert.equal(f.counts().attaches,1);
  await f.manager.close(room);
  assert.ok(f.counts().detached>0);
  assert.equal(f.counts().ownedClosed,0);
});

test('only explicit private scope launches an owned browser, with isolated contexts per seat',async()=>{
  const f=fixture(),room={};await f.manager.open(room);
  const tokens=['codex','gemini'].map(seat=>f.manager.grant(room,seat));
  await Promise.all(tokens.map(token=>f.manager.call(token,{name:'browser_snapshot',scope:'private'})));
  assert.equal(f.counts().launches,1);
  assert.equal(f.contexts.length,2);
  assert.notEqual(f.contexts[0],f.contexts[1]);
  assert.equal(f.manager.state(room).tabs.find(tab=>tab.scope==='shared').url,'https://example.test/signed-in');
  await f.manager.close(room);
  assert.equal(f.counts().ownedClosed,1);
});

test('personal Chrome retains manual-control, read-only and stale-page protections',async()=>{
  const f=fixture(),room={};await f.manager.open(room);
  const token=f.manager.grant(room,'codex');
  const read=await f.manager.call(token,{name:'browser_snapshot'});
  f.change();
  await assert.rejects(f.manager.call(token,{name:'browser_click',version:version(read)}),/화면이 변경/);
  f.manager.setManual(room,true);
  await assert.rejects(f.manager.call(token,{name:'browser_click'}),/직접 조작/);
  f.manager.setManual(room,false);
  const restricted=f.manager.grant(room,'claude',{readOnly:true});
  await assert.rejects(f.manager.call(restricted,{name:'browser_click'}),/읽기 전용/);
  await f.manager.close(room);
});

test('failed extension connection cleans relay and never falls back to a different profile',async()=>{
  const f=fixture({fail:true}),room={};
  await assert.rejects(f.manager.open(room),/확장이 필요/);
  assert.equal(f.manager.state(room).connected,false);
  assert.equal(f.manager.sessions.size,0);
  assert.equal(f.counts().launches,0);
  assert.ok(f.counts().detached>0);
});

test('page fingerprint rejects error responses and changes when user changes input',()=>{
  const result = value => ({content:[{type:'text',text:'### Result\n'+JSON.stringify({url:'https://example.test',title:'Test',html:'<input>',fields:[value]})+'\n### Ran Playwright code\nignored'}]});
  assert.notEqual(parsePageInspection(result('a')).version,parsePageInspection(result('b')).version);
  assert.throws(()=>parsePageInspection({isError:true,content:[]}),/Chrome 연결/);
  assert.throws(()=>parsePageInspection({content:[]}),/응답/);
});


test('status polling is safe before the extension engine has been attached',async()=>{
  const f=fixture(),room={};let release;
  f.manager.attach=()=>new Promise(resolve=>{release=()=>resolve(f.engine)});
  const opening=f.manager.open(room);
  while(!release) await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.manager.state(room).opening,true);
  assert.deepEqual(f.manager.state(room).tabs,[]);
  release();await opening;assert.equal(f.manager.state(room).connected,true);
  await f.manager.close(room);
});
