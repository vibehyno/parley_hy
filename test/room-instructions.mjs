import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {isolatedServer} from './server-fixture.mjs';
import {communicationInstructions} from '../lib/room-instructions.mjs';

test('communication mode saves without changing permissions and seat memory is isolated with conflict protection', async () => {
  const s = await isolatedServer();
  try {
    const before = (await s.room('default')).room;
    assert.equal((await s.api('POST','/api/config',{room:'default',config:{communicationMode:'task'}})).status,200);
    const after = (await s.room('default')).room;
    assert.equal(after.cfg.communicationMode,'task');
    assert.deepEqual(after.cfg.agents,before.cfg.agents);
    assert.equal(after.cfg.mode,before.cfg.mode);
    assert.equal((await s.api('POST','/api/config',{room:'default',config:{communicationMode:'bad'}})).status,400);
    const route='/api/room-instructions?room=default&seat=codex';
    const first=(await s.api('GET',route)).data;
    assert.equal(first.text,'');
    const saved=await s.api('POST','/api/room-instructions',{room:'default',seat:'codex',text:'결과는 세 줄로 요약',revision:first.revision});
    assert.equal(saved.status,200);
    assert.equal(fs.readFileSync(saved.data.file,'utf8'),'결과는 세 줄로 요약');
    assert.equal((await s.api('GET','/api/room-instructions?room=default&seat=claude')).data.text,'');
    assert.equal((await s.api('POST','/api/room-instructions',{room:'default',seat:'codex',text:'stale',revision:first.revision})).status,409);
    assert.equal((await s.api('GET','/api/room-instructions?room=default&seat=../outside')).status,404);
    assert.equal((await s.api('POST','/api/room-instructions',{room:'default',seat:'codex',text:'x'.repeat(32001),revision:saved.data.revision})).status,400);
    // Model-side file writes are visible to the human editor on the next read.
    fs.writeFileSync(saved.data.file,'먼저 답하고 작업하기');
    assert.equal((await s.api('GET',route)).data.text,'먼저 답하고 작업하기');
    assert.deepEqual((await s.room('default')).entries,[]);
  } finally {await s.close();}
});

test('mode preferences describe priority, persona and differing progress behavior', () => {
  assert.match(communicationInstructions('conversation'),/persona.*personality/);
  assert.match(communicationInstructions('conversation'),/current user's explicit request first, then the room note/);
  assert.match(communicationInstructions('task'),/without routine opening acknowledgements/);
});

test('saved memory and mode changes reach an existing CLI session on its next call', async () => {
  const s=await isolatedServer({env:{FAKE_TRACE_PROMPTS:'1'}});
  const send=async()=>{
    assert.equal((await s.api('POST','/api/message',{room:'default',text:'@codex SAY:OK',target:'auto'})).status,200);
    for(let n=0;n<200;n++) {
      const r=await s.room('default');
      if(!r.room.working && !r.room.busy.length && !r.room.queued) return;
      await new Promise(r=>setTimeout(r,25));
    }
    throw new Error('Fixture did not settle');
  };
  try {
    await send();
    const stateFile=path.join(s.root,'default','state.json');
    const original=JSON.parse(fs.readFileSync(stateFile)).agents.codex.sessionRef;
    const first=(await s.api('GET','/api/room-instructions?room=default&seat=codex')).data;
    await s.api('POST','/api/room-instructions',{room:'default',seat:'codex',revision:first.revision,text:'UNIQUE_SAVED_PREFERENCE'});
    await s.api('POST','/api/config',{room:'default',config:{communicationMode:'task',roomNote:'Final result only three lines'}});
    await send();
    const events=fs.readFileSync(path.join(s.root,'default','workspace','.fake-cli-prompts.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s)).filter(e=>e.event==='start');
    const latest=events.at(-1).prompt + events.at(-1).briefing;
    assert.match(latest,/UNIQUE_SAVED_PREFERENCE/);
    assert.match(latest,/Task-focused mode/);
    assert.match(latest,/Final result only three lines/);
    assert.equal(JSON.parse(fs.readFileSync(stateFile)).agents.codex.sessionRef,original);
  } finally {await s.close();}
});
