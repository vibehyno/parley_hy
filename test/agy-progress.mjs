import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { AGY_PROGRESS_CONTRACT } from '../lib/agy-progress.mjs';
const src=fs.readFileSync(new URL('../parley.mjs',import.meta.url),'utf8');
function extract(name,next) {return src.slice(src.indexOf(`function ${name}(`),src.indexOf(`function ${next}(`));}
test('AGY progress update migrates a resumed session once and leaves other providers unchanged',()=>{
 const room={cfg:{agents:{gemini:{},codex:{}},roomNote:null},state:{agents:{gemini:{sessionRef:'kept-session',promptSessionRef:'kept-session',briefingVersion:1,roomNoteRevision:0},codex:{}}}};
 const context=vm.createContext({crypto,AGY_PROGRESS_CONTRACT:'',PROMPT_VERSION:1,PROMPT_FINGERPRINT:'base',STANDING_CONTRACT_TEMPLATE:'Base contract',
  seatIds:()=>['gemini','codex'],displayNameOf:(_,a)=>a,callNameOf:(_,a)=>a,providerOf:()=>({desc:'provider'}),providerIdOf:(_,a)=>a,
  workDir:()=>'/tmp',normalizeProjectDirs:()=>[],briefingVersionOf:(r,a)=>r.state.agents[a].briefingVersion,
  stableSessionRef:s=>!!s,roomNoteRevisionOf:()=>0,normalizeRoomNote:()=>null,
  freshTurnBriefing:(r,a)=>context.composeStandingContract(a,r).text});
 vm.runInContext(extract('composeStandingContract','briefingVersionOf')+extract('composePromptDelivery','makeBriefing'),context);
 const before=context.composeStandingContract('gemini',room);
 const codexBefore=context.composeStandingContract('codex',room);
 room.state.agents.gemini.briefingFingerprint=before.fingerprint;
 context.AGY_PROGRESS_CONTRACT=AGY_PROGRESS_CONTRACT;
 const after=context.composeStandingContract('gemini',room);
 assert.notEqual(after.fingerprint,before.fingerprint);
 assert.equal(context.composeStandingContract('codex',room).fingerprint,codexBefore.fingerprint);
 const update=context.composePromptDelivery(room,'gemini',false);
 assert.ok(update.prefix.includes(AGY_PROGRESS_CONTRACT));
 assert.equal(update.contractDelivered,true);
 assert.equal(update.expectedSessionRef,'kept-session');
 room.state.agents.gemini.briefingFingerprint=after.fingerprint;
 const resumed=context.composePromptDelivery(room,'gemini',false);
 assert.equal(resumed.prefix,'');
 assert.equal(resumed.contractDelivered,false);
 assert.ok(context.composePromptDelivery(room,'gemini',true).briefing.includes(AGY_PROGRESS_CONTRACT));
});
