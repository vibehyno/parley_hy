import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runClaudeLive, runAgyLive } from '../lib/provider-live.mjs';
import { runCodexLive } from '../lib/codex-live.mjs';
import { closeLiveConnections } from '../lib/live-pool.mjs';
import { isolatedServer } from './server-fixture.mjs';

const fake = `const readline=require('node:readline');
const out=x=>console.log(JSON.stringify(x)); let initial, n=0;
readline.createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line),p=m.params||{};
 const reply=result=>out({id:m.id,result});
 if(m.method==='initialize')return reply({});
 if(m.method==='thread/start'||m.method==='thread/resume')return reply({thread:{id:'session'}});
 if(m.method==='session/new'||m.method==='session/load')return reply({sessionId:'session'});
 if(m.method?.startsWith('session/set_'))return reply({});
 if(m.type==='user'){
  out({type:'system',subtype:'init',session_id:'session'});
  if(m.uuid)out(m);
  if(!m.uuid&&m.message.content==='FIRST')return;
  return setTimeout(()=>out({type:'result',session_id:'session',result:m.message.content}),40);
 }
 if(m.method==='session/prompt'){
  const text=p.prompt[0].text;
  if(text==='FIRST'){initial=m.id;return;}
  if(initial){out({id:initial,result:{stopReason:'end_turn'}});initial=null;}
  return setTimeout(()=>{
   out({method:'session/update',params:{sessionId:'session',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text}}}});
   reply({stopReason:'end_turn'});
  },80);
 }
 if(m.method==='turn/start'){
  reply({turn:{id:'turn'+ ++n}});
  if(p.input[0].text==='FIRST')return;
  return setTimeout(()=>out({method:'turn/completed',params:{turn:{id:'turn'+n,status:'completed'}}}),40);
 }
 if(m.method==='turn/steer'){
  reply({turnId:p.expectedTurnId});
  setTimeout(()=>out({method:'turn/completed',params:{turn:{id:p.expectedTurnId,status:'completed'}}}),40);
 }
});`;

for (const [name, runner] of [['claude', runClaudeLive], ['agy', runAgyLive], ['codex', runCodexLive]]) {
  test(`${name}: steer and reuse one process; settings changes open another`, async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-pool-test-'));
    const script = path.join(cwd, 'fake.cjs'); fs.writeFileSync(script, fake);
    const spec = { cmd: process.execPath, pre: [script] };
    const pids = [], events = []; let receipt, sent = false;
    const options = { args: [], cwd, timeoutMs: 3000, poolKey: cwd, mode: 'full', sandbox: 'read-only',
      kill: child => child.kill(), onChild: child => pids.push(child.pid), onLine: line => events.push(JSON.parse(line)) };
    const input = text => name === 'claude' ? { type: 'user', message: { role: 'user', content: text } } : text;
    try {
      const first = await runner(spec, { ...options, input: input('FIRST'), onReady: steer => {
        if (steer && !sent) { sent = true; receipt = steer('GREEN', 'one'); }
      } });
      assert.equal(first.code, 0, first.stderr); await receipt;
      if (name === 'agy') assert.equal(events.filter(e => e.event === 'result').at(-1).result.response, 'GREEN');
      const second = await runner(spec, { ...options, input: input('SECOND'), sessionRef: 'session' });
      assert.equal(second.code, 0, second.stderr); assert.equal(pids[0], pids[1]);
      const third = await runner(spec, { ...options, input: input('THIRD'), sessionRef: 'session', poolSettings: { permission: 'changed' } });
      assert.equal(third.code, 0, third.stderr); assert.notEqual(pids[1], pids[2]);
    } finally { closeLiveConnections(); }
  });
}

test('idle expiry and timeout discard the connection', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-pool-expiry-'));
  const script = path.join(cwd, 'fake.cjs'); fs.writeFileSync(script, fake);
  const spec = { cmd: process.execPath, pre: [script] }, pids = [];
  const options = { args: [], cwd, poolKey: cwd, sessionRef: 'session', timeoutMs: 2000, idleMs: 20,
    input: { type: 'user', message: { role: 'user', content: 'DONE' } }, onChild: child => pids.push(child.pid), kill: child => child.kill() };
  try {
    assert.equal((await runClaudeLive(spec, options)).code, 0);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal((await runClaudeLive(spec, options)).code, 0);
    assert.notEqual(pids[0], pids[1]);
    const failed = await runClaudeLive(spec, { ...options, timeoutMs: 150, input: { type: 'user', message: { role: 'user', content: 'FIRST' } } });
    assert.equal(failed.timedOut, true);
    assert.equal((await runClaudeLive(spec, options)).code, 0);
    assert.notEqual(pids[2], pids[3]);
  } finally { closeLiveConnections(); }
});

test('rooms remain isolated; stopped tasks cannot be reused', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-pool-isolation-'));
  const script = path.join(cwd, 'fake.cjs'); fs.writeFileSync(script, fake);
  const spec = { cmd: process.execPath, pre: [script] }, pids = [];
  const options = { args: [], cwd, timeoutMs: 2000, sessionRef: 'session', kill: child => child.kill(),
    onChild: child => pids.push(child.pid), input: { type: 'user', message: { role: 'user', content: 'DONE' } } };
  try {
    await runClaudeLive(spec, { ...options, poolKey: cwd + 'room-a' });
    await runClaudeLive(spec, { ...options, poolKey: cwd + 'room-b' });
    assert.notEqual(pids[0], pids[1]);
    const stopped = await runClaudeLive(spec, { ...options, poolKey: cwd + 'room-a', onChild: child => {
      pids.push(child.pid); setTimeout(() => { child.rtStopped = true; child.kill(); }, 10);
    }, input: { type: 'user', message: { role: 'user', content: 'FIRST' } } });
    assert.equal(stopped.stopped, true);
    await runClaudeLive(spec, { ...options, poolKey: cwd + 'room-a' });
    assert.notEqual(pids[2], pids[3]);
  } finally { closeLiveConnections(); }
});

test('Claude does not recycle a connection with unconfirmed additional input', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-pool-race-'));
  const script = path.join(cwd, 'fake.cjs');
  fs.writeFileSync(script, fake.replace('if(m.uuid)out(m);', 'if(m.uuid)return out({type:"result",session_id:"session",result:"OLD"});'));
  let receipt, sent = false;
  try {
    const result = await runClaudeLive({cmd:process.execPath,pre:[script]}, {
      args: [], cwd, poolKey: cwd, timeoutMs: 2000, kill: child => child.kill(),
      input: {type:'user',message:{role:'user',content:'FIRST'}}, onReady: steer => {
        if (steer && !sent) { sent = true; receipt = steer('GREEN').then(() => null, error => error.message); }
      },
    });
    assert.equal(result.code, 1);
    assert.match(await receipt, /before confirming/);
  } finally { closeLiveConnections(); }
});

for (const [command, seat] of [['claude', 'claude'], ['agy', 'gemini']]) {
  test(`${command}: HTTP additions reach the provider and subsequent messages reuse its process`, async () => {
    const server = await isolatedServer();
    const script = path.join(server.root, command + '.js');
    const source = fake.replace("const readline=require('node:readline');", "const readline=require('node:readline');if(process.argv.includes('-p')||process.argv.includes('acp'))require('node:fs').appendFileSync(__filename+'.pids',process.pid+'\\n');")
      .replace("m.message.content==='FIRST'", "m.message.content.includes('FIRST') && n++===0")
      .replace("text==='FIRST'", "text.includes('FIRST') && n++===0");
    fs.writeFileSync(script, source);
    try {
      const cfg = await server.api('POST', '/api/config', { room: 'default',
        seats: [{id:'codex',provider:'codex'}, {id:seat,provider:seat}],
        config: { agents: { [seat]: {command:script, lurk:false, ...(seat==='gemini'?{approvalMode:'full'}:{})} } } });
      assert.equal(cfg.status, 200, JSON.stringify(cfg.data));
      const wait = async predicate => {
        for(let i=0;i<100;i++) { const s=await server.room('default'); if(predicate(s)) return s; await new Promise(r=>setTimeout(r,30)); }
        const last=await server.room('default'); assert.fail('Room state did not settle: '+JSON.stringify({busy:last.room.busy,tail:last.entries.slice(-2).map(e=>({kind:e.kind,text:e.text?.slice(0,200)}))}));
      };
      await server.api('POST','/api/message',{room:'default',target:seat,text:'FIRST'});
      const state=await wait(s=>s.room.busyInfo.some(r=>r.agent===seat&&r.liveSteering));
      const sourceN=state.entries.find(e=>e.kind==='user').n;
      assert.equal((await server.api('POST','/api/adjustment',{room:'default',id:'provider-add',action:'stage',sourceN,target:seat,text:'GREEN'})).status,200);
      const sent=await server.api('POST','/api/adjustment',{room:'default',id:'provider-add',action:'send'});
      assert.equal(sent.status,200,JSON.stringify(sent.data));
      const done=await wait(s=>!s.room.busy.length);
      assert.ok(done.entries.some(e=>e.kind==='agent'&&e.author===seat&&e.text.includes('GREEN')));
      await server.api('POST','/api/message',{room:'default',target:seat,text:'SECOND'});
      await wait(s=>!s.room.busy.length&&s.entries.filter(e=>e.kind==='agent'&&e.author===seat).length===2);
      assert.equal(fs.readFileSync(script+'.pids','utf8').trim().split('\n').length,1,fs.readFileSync(script+'.pids','utf8'));
    } finally { await server.close(); }
  });
}
