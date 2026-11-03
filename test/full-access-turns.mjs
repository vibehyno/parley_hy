import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { isolatedServer } from './server-fixture.mjs';

const src = fs.readFileSync(new URL('../parley.mjs', import.meta.url), 'utf8');
const fn = (name, next) => src.slice(src.indexOf(`function ${name}(`), src.indexOf(`function ${next}(`));
const policy = vm.createContext({
  CLAUDE_PERMISSION_MODES: new Set(['auto','default','plan','acceptEdits','bypassPermissions']),
  AGY_APPROVAL_MODES: new Set(['auto','plan','accept-edits','full','auto_edit','yolo']),
  providerIdOf: (room, seat) => room.cfg.agents[seat].provider || seat,
});
vm.runInContext(fn('cliArgValue','effectiveClaudePermissionMode') +
  fn('effectiveClaudePermissionMode','fullAccessEnabled') +
  fn('fullAccessEnabled','claudeSessionScope') +
  src.slice(src.indexOf('function effectiveAgyApprovalMode('), src.indexOf('/**', src.indexOf('function effectiveAgyApprovalMode('))), policy);

test('full access follows the seat across Talk, Work, discussions and reviews; Plan remains restricted', () => {
  for (const mode of ['talk','work']) for (const opts of [{},{discussion:true},{readOnly:true}]) {
    const room = {cfg:{mode,agents:{codex:{sandbox:'danger-full-access'},claude:{permissionMode:'bypassPermissions'},gemini:{approvalMode:'full'}}}};
    for (const seat of Object.keys(room.cfg.agents)) assert.equal(policy.browserTurnReadOnly(room,seat,opts),false,`${mode}/${seat}/${JSON.stringify(opts)}`);
    room.cfg.agents.claude.permissionMode='plan'; room.cfg.agents.gemini.approvalMode='plan';
    assert.equal(policy.browserTurnReadOnly(room,'claude',opts),true);
    assert.equal(policy.browserTurnReadOnly(room,'gemini',opts),true);
  }
  assert.equal(policy.effectiveClaudePermissionMode({permissionMode:'bypassPermissions',extraArgs:['--permission-mode','plan']},'talk'),'bypassPermissions');
});

async function idle(server,name) {
  for(let n=0;n<200;n++) {
    const state=await server.room(name);
    if(!state.room.working&&!state.room.busy.length)return state;
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  throw Error('Test room did not settle');
}
const argv = (state,seat) => {
  const text=state.entries.findLast(entry=>entry.kind==='agent'&&entry.author===seat&&entry.text.startsWith('ARGVJSON '))?.text;
  assert.ok(text?.startsWith('ARGVJSON '),JSON.stringify(state.entries.map(e=>({kind:e.kind,author:e.author,text:e.text.slice(0,200)}))));
  return JSON.parse(text.slice(9));
};
const value = (args,flag) => args[args.indexOf(flag)+1];

test('real server dispatch keeps all three full-access flags and sessions on repeated group turns', async () => {
  const server=await isolatedServer();
  const name='full-turns';
  try {
    await server.api('POST','/api/rooms',{name,seats:['codex','claude','gemini']});
    await server.configure(name,{mode:'work',agents:{codex:{sandbox:'danger-full-access'},claude:{permissionMode:'bypassPermissions'},gemini:{approvalMode:'full'}}});
    assert.equal((await server.api('POST','/api/config',{room:name,config:{agents:{gemini:{command:fileURLToPath(new URL('./fake-agy.mjs',import.meta.url))}}}})).status,200);
    for(let turn=0;turn<2;turn++) {
      assert.equal((await server.api('POST','/api/message',{room:name,text:'@all ARGJSON'})).status,200);
      const state=await idle(server,name);
      const c=argv(state,'claude'),g=argv(state,'gemini'),x=argv(state,'codex');
      assert.equal(value(c,'--permission-mode'),'bypassPermissions');
      assert.equal(value(g,'--mode'),'auto');
      assert.ok(g.includes('--dangerously-skip-permissions')); assert.ok(!g.includes('--sandbox'));
      assert.ok(x.some(a=>a.includes('danger-full-access')),JSON.stringify(x));
      if(turn) { assert.ok(c.includes('--resume')); assert.ok(g.includes('--conversation')); assert.ok(x.includes('resume')); }
      const saved=JSON.parse(fs.readFileSync(path.join(server.root,name,'state.json'),'utf8'));
      assert.equal(saved.agents.claude.permissionScope,'bypassPermissions');
      assert.equal(saved.agents.gemini.approvalScope,'full');
    }
    // Explicitly lowering permissions still changes the actual invocation.
    await server.api('POST','/api/config',{room:name,config:{agents:{claude:{permissionMode:'plan'},gemini:{approvalMode:'plan'}}}});
    await server.api('POST','/api/message',{room:name,text:'@all ARGJSON'});
    const lowered=await idle(server,name);
    assert.equal(value(argv(lowered,'claude'),'--permission-mode'),'plan');
    const g=argv(lowered,'gemini'); assert.equal(value(g,'--mode'),'plan'); assert.ok(g.includes('--sandbox'));
    assert.ok(!g.includes('--dangerously-skip-permissions'));
  } finally { await server.close(); }
});

test('Claude listener and pair-review dispatch retain Full access and resume the configured session', async () => {
  const server=await isolatedServer();
  const name='full-review';
  try {
    await server.api('POST','/api/rooms',{name,seats:['codex','claude']});
    await server.configure(name,{mode:'work',agents:{claude:{permissionMode:'bypassPermissions'}}});
    await server.api('POST','/api/message',{room:name,text:'@claude ARGJSON'});
    await idle(server,name);
    await server.api('POST','/api/config',{room:name,config:{agents:{claude:{lurk:true}}}});
    await server.api('POST','/api/message',{room:name,text:'@codex LURKARGS'});
    let state=await idle(server,name);
    const listener=state.entries.findLast(e=>e.kind==='agent'&&e.author==='claude'&&e.meta?.lurk&&e.text.startsWith('ARGVJSON '));
    assert.ok(listener,'listener turn reached the adapter');
    let args=JSON.parse(listener.text.slice(9));
    assert.equal(value(args,'--permission-mode'),'bypassPermissions'); assert.ok(args.includes('--resume'));
    await server.api('POST','/api/config',{room:name,config:{agents:{claude:{lurk:false}}}});
    await server.api('POST','/api/message',{room:name,text:'/pair start 1 @codex REVIEWARGS'});
    state=await idle(server,name);
    const review=state.entries.findLast(e=>e.kind==='agent'&&e.author==='claude'&&e.meta?.pair==='review'&&e.text.startsWith('ARGVJSON '));
    assert.ok(review,'review turn reached the adapter');
    args=JSON.parse(review.text.slice(9));
    assert.equal(value(args,'--permission-mode'),'bypassPermissions'); assert.ok(args.includes('--resume'));
  } finally { await server.close(); }
});
