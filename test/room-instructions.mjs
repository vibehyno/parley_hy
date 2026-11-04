import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {isolatedServer} from './server-fixture.mjs';
import {communicationInstructions,communicationTurnReminder,persistentUserInstructions} from '../lib/room-instructions.mjs';

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
  assert.match(communicationInstructions('conversation'),/selected mode defines the communication flow/);
  assert.match(communicationInstructions('task'),/without routine opening acknowledgements/);
  assert.match(communicationInstructions('conversation'),/Never override approval rules or task constraints/);
  assert.match(communicationInstructions('conversation'),/applies to that request only/);
  assert.doesNotMatch(communicationInstructions('task'),/room note requests one/);
});

test('only explicit ongoing user preferences qualify for automatic storage',()=>{
  assert.deepEqual(persistentUserInstructions('앞으로 결과는 짧게 줘'),['앞으로 결과는 짧게 줘']);
  for(const text of ['이번만 자세히 해줘','이 파일 수정해','앞으로 이렇게 할까?','> 항상 요약해','항상 API key secret 저장해','/note 앞으로 짧게']) assert.deepEqual(persistentUserInstructions(text),[]);
});

test('automatic learning preserves room note, scopes memory and asks before overlap; explicit note still works',async()=>{
  const s=await isolatedServer();
  const memory=async seat=>(await s.api('GET',`/api/room-instructions?room=default&seat=${seat}`)).data.text;
  const send=async(text,extra={})=>{
    const result=await s.api('POST','/api/message',{room:'default',text,target:'auto',...extra});
    assert.equal(result.status,200,JSON.stringify(result.data));
    for(let n=0;n<200;n++){
      const r=await s.room('default');
      if(!r.room.working&&!r.room.busy.length&&!r.room.queued)return r;
      await new Promise(r=>setTimeout(r,25));
    }
    throw new Error('Fixture timeout');
  };
  try{
    await s.api('POST','/api/config',{room:'default',config:{roomNote:'사람이 작성한 메모'}});
    await send('@codex 앞으로 답은 짧게 줘');
    assert.match(await memory('codex'),/짧게/);
    assert.equal(await memory('claude'),'');
    let r=await send('@codex 앞으로 답은 자세하게 줘');
    let proposal=r.entries.filter(e=>e.meta?.instructionProposal).at(-1).meta.instructionProposal;
    assert.doesNotMatch(await memory('codex'),/자세/);
    assert.equal((await s.api('POST','/api/room-instructions/resolve',{room:'default',id:proposal.id,action:'append'})).status,200);
    assert.match(await memory('codex'),/짧게[\s\S]*자세/);
    r=await send('@codex 앞으로 답은 한 줄로 요약해');
    proposal=r.entries.filter(e=>e.meta?.instructionProposal).at(-1).meta.instructionProposal;
    await s.api('POST','/api/room-instructions/resolve',{room:'default',id:proposal.id,action:'cancel'});
    assert.doesNotMatch(await memory('codex'),/한 줄/);
    r=await send('@codex 앞으로 답은 두 줄로 요약해');
    proposal=r.entries.filter(e=>e.meta?.instructionProposal).at(-1).meta.instructionProposal;
    await s.api('POST','/api/room-instructions/resolve',{room:'default',id:proposal.id,action:'replace'});
    assert.doesNotMatch(await memory('codex'),/짧게|자세/);
    assert.match(await memory('codex'),/두 줄/);
    await send('@all 항상 존댓말로 말해줘');
    assert.match(await memory('_common'),/존댓말/);
    assert.equal((await s.room('default')).room.cfg.roomNote,'사람이 작성한 메모');
    await send('@claude SAY:EXPLICIT_NOTE',{solo:true,hopBudget:0,roomNoteRequest:true});
    assert.match((await s.room('default')).room.cfg.roomNote,/EXPLICIT_NOTE/);
  }finally{await s.close();}
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
    const trace=()=>fs.readFileSync(path.join(s.root,'default','workspace','.fake-cli-prompts.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s)).filter(e=>e.event==='start');
    assert.doesNotMatch(trace().at(-1).prompt,/Conversation reminder/);
    await send();
    assert.match(trace().at(-1).prompt,/Conversation reminder/);
    assert.equal(trace().length,2);
    assert.equal(JSON.parse(fs.readFileSync(stateFile)).agents.codex.sessionRef,original);
    const first=(await s.api('GET','/api/room-instructions?room=default&seat=codex')).data;
    await s.api('POST','/api/room-instructions',{room:'default',seat:'codex',revision:first.revision,text:'UNIQUE_SAVED_PREFERENCE'});
    await s.api('POST','/api/config',{room:'default',config:{communicationMode:'task',roomNote:'Final result only three lines'}});
    await send();
    const events=fs.readFileSync(path.join(s.root,'default','workspace','.fake-cli-prompts.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s)).filter(e=>e.event==='start');
    const latest=events.at(-1).prompt + events.at(-1).briefing;
    assert.match(latest,/UNIQUE_SAVED_PREFERENCE/);
    assert.match(latest,/Task-focused mode/);
    assert.doesNotMatch(events.at(-1).prompt,/Conversation reminder/);
    assert.match(latest,/Final result only three lines/);
    assert.equal(JSON.parse(fs.readFileSync(stateFile)).agents.codex.sessionRef,original);
  } finally {await s.close();}
});

test('conversation reminder only accompanies resumed conversational calls', () => {
  assert.equal(communicationTurnReminder('conversation', false), '');
  assert.equal(communicationTurnReminder('task', true), '');
  const reminder = communicationTurnReminder('conversation', true);
  assert.match(reminder, /before tools/);
  assert.match(reminder, /same invocation/);
  assert.match(reminder, /explicit silence\/output-only requests for this turn/);
});
