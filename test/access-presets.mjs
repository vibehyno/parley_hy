import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { isolatedServer } from './server-fixture.mjs';

test('explicit permission presets reach every provider without a Work-mode read-only upgrade', async () => {
  const server = await isolatedServer();
  try {
    await server.api('POST', '/api/config', {room:'default', seats:['claude','codex','gemini']});
    await server.configure('default', {mode:'work', explicitPermissions:true, hopBudget:0});
    await server.api('POST','/api/config',{room:'default',config:{
      agents:{gemini:{command:fileURLToPath(new URL('./fake-agy.mjs',import.meta.url))}}}});
    for (const [claude, codex, gemini] of [
      ['plan','read-only','plan'],
      ['acceptEdits','workspace-write','accept-edits'],
      ['bypassPermissions','danger-full-access','full'],
    ]) {
      const saved = await server.api('POST','/api/config',{room:'default',config:{agents:{
        claude:{permissionMode:claude},codex:{sandbox:codex},gemini:{approvalMode:gemini},
      }}});
      assert.equal(saved.status,200,JSON.stringify(saved.data));
      for (const seat of ['claude','codex','gemini']) {
        const sent=await server.api('POST','/api/message',{room:'default',target:seat,text:'ARGJSON'});
        assert.equal(sent.status,200,JSON.stringify(sent.data));
        let room;
        for(let n=0;n<160;n++) {
          room=await server.room('default');
          if(!room.room.working&&!room.room.busy.length&&!room.room.queued) break;
          await new Promise(resolve=>setTimeout(resolve,25));
        }
        const reply=room.entries.filter(e=>e.kind==='agent'&&e.author===seat).at(-1)?.text;
        assert.ok(reply?.startsWith('ARGVJSON '),`${seat}: ${reply}; ${JSON.stringify(room.entries.slice(-3))}`);
        const args=JSON.parse(reply.slice(9));
        const value=flag=>args[args.indexOf(flag)+1];
        if(seat==='codex') assert.equal(value('--sandbox'),codex);
        if(seat==='claude') assert.equal(value('--permission-mode'),claude);
        if(seat==='gemini') {
          assert.equal(value('--mode'),gemini==='full'?'auto':gemini);
          assert.equal(args.includes('--dangerously-skip-permissions'),gemini==='full');
        }
      }
    }
  } finally { await server.close(); }
});
