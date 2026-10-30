import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isolatedServer } from "./server-fixture.mjs";

async function until(server, predicate) {
  for (let i = 0; i < 200; i++) {
    const state = await server.room("default");
    if (predicate(state)) return state;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Adjustment did not reach expected state: " + server.log().slice(-800));
}
const idle = state => !state.room.working && !state.room.busy.length && !state.room.queued;

async function fixture({ finalMention = false, reissue = true } = {}) {
  const server = await isolatedServer();
  const gate = path.join(server.root, "finish-codex");
  const peerGate = path.join(server.root, "finish-claude");
  const count = path.join(server.root, "calls");
  const promptFile = path.join(server.root, "correction-prompt");
  const command = path.join(server.root, "correction-codex.mjs");
  fs.writeFileSync(command, `import fs from 'node:fs';
let prompt='';process.stdin.on('data',c=>prompt+=c);process.stdin.on('end',async()=>{
const countFile=${JSON.stringify(count)}, n=fs.existsSync(countFile)?Number(fs.readFileSync(countFile,'utf8')):0;
fs.writeFileSync(countFile,String(n+1));
const emit=e=>console.log(JSON.stringify(e)), say=(text,id)=>emit({type:'item.completed',item:{type:'agent_message',text,id}});
emit({type:'thread.started',thread_id:'correction-session'});
if(n===0){say('@claude OLD_REVIEW_REQUEST','ack');emit({type:'item.started',item:{type:'command_execution',id:'tool',command:'check document'}});
while(!fs.existsSync(${JSON.stringify(gate)}))await new Promise(r=>setTimeout(r,20));
say(${JSON.stringify(finalMention ? "@claude OLD_REVIEW_REQUEST" : "Original work finished.")},'final');
}else if(n===1){fs.writeFileSync(${JSON.stringify(promptFile)},prompt);say(${JSON.stringify(reissue ? "@claude NEW_REVIEW_REQUEST" : "CORRECTION_APPLIED")},'final');}
else say('[pass]','final');
emit({type:'turn.completed',usage:{output_tokens:10}});
});`);
  const peer = path.join(server.root, "correction-claude.mjs");
  fs.writeFileSync(peer, `import fs from 'node:fs';let prompt='';process.stdin.on('data',c=>prompt+=c);process.stdin.on('end',async()=>{
if(prompt.includes('INDEPENDENT_TASK'))while(!fs.existsSync(${JSON.stringify(peerGate)}))await new Promise(r=>setTimeout(r,20));
console.log(JSON.stringify({type:'result',session_id:'peer-session',result:'REVIEWED',is_error:false}));});`);
  await server.api("POST", "/api/config", { room: "default", config: { hopBudget: 3,
    agents: { codex: { command }, claude: { command: peer } } } });
  await server.api("POST", "/api/message", { room: "default", target: "codex", text: "Check the document" });
  const state = await until(server, s => s.entries.some(e => e.meta?.publicSpeech));
  const sourceN = state.entries.find(e => e.kind === "user").n;
  const draft = { room: "default", action: "stage", id: "draft-one", sourceN,
    target: "codex", targetMode: "codex", text: "NEW_USER_INSTRUCTION", hopChoice: "default" };
  return { server, draft, finish: () => fs.writeFileSync(gate, "done"),
    finishPeer: () => fs.writeFileSync(peerGate, "done"), promptFile };
}

for (const finalMention of [false, true]) test(`correction precedes ${finalMention ? "final" : "public-progress"} handoff; only reissued request reaches peer`, async () => {
  const f = await fixture({ finalMention });
  try {
    const staged = await f.server.api("POST", "/api/adjustment", f.draft);
    assert.equal(staged.status, 200);
    const waiting = await f.server.room("default");
    assert.equal(waiting.room.adjustmentDraft.text, "NEW_USER_INSTRUCTION");
    assert.equal(waiting.entries.filter(e => e.kind === "user").length, 1);
    f.finish();
    const done = await until(f.server, idle);
    assert.equal(done.room.adjustmentDraft, null);
    const replies = done.entries.filter(e => e.kind === "agent");
    assert.equal(replies[0].author, "codex");
    assert.equal(replies[1].text, "@claude NEW_REVIEW_REQUEST");
    assert.equal(replies[2].author, "claude");
    assert.equal(replies.filter(e => e.author === "claude").length, 1);
    const correction = done.entries.find(e => e.meta?.askFrom?.adjustmentId === f.draft.id);
    assert.ok(replies[0].n < correction.n && correction.n < replies[1].n);
    assert.match(fs.readFileSync(f.promptFile, "utf8"), /Reassess whether peer work is still needed/);
    const replay = await f.server.api("POST", "/api/adjustment", f.draft);
    assert.equal(replay.data.n, correction.n);
    assert.equal((await f.server.room("default")).entries.filter(e => e.meta?.askFrom?.adjustmentId === f.draft.id).length, 1);
  } finally { await f.server.close(); }
});

test("deleting an unsent correction preserves the original handoff", async () => {
  const f = await fixture();
  try {
    await f.server.api("POST", "/api/adjustment", f.draft);
    assert.equal((await f.server.api("POST", "/api/adjustment", { room: "default", id: f.draft.id, action: "cancel" })).status, 200);
    f.finish();
    const done = await until(f.server, idle);
    assert.equal(done.entries.filter(e => e.kind === "user").length, 1);
    assert.equal(done.entries.filter(e => e.kind === "agent")[1].author, "claude");
  } finally { await f.server.close(); }
});

test("an unrelated busy seat does not delay a correction or get stopped", async () => {
  const f = await fixture({ reissue: false });
  try {
    await f.server.api("POST", "/api/message", { room: "default", target: "claude", text: "INDEPENDENT_TASK", solo: true });
    await until(f.server, s => s.room.busy.includes("claude"));
    await f.server.api("POST", "/api/adjustment", f.draft);
    f.finish();
    const corrected = await until(f.server, s => s.entries.some(e => e.text === "CORRECTION_APPLIED"));
    assert.ok(corrected.room.busy.includes("claude"));
    assert.equal(corrected.room.adjustmentDraft, null);
    f.finishPeer();
    await until(f.server, idle);
  } finally { await f.server.close(); }
});

test("edit changes pending text; invalid edits preserve it; stop prevents automatic submission", async () => {
  const f = await fixture();
  try {
    await f.server.api("POST", "/api/adjustment", f.draft);
    assert.equal((await f.server.api("POST", "/api/adjustment", { ...f.draft, update: true, text: "EDITED_INSTRUCTION" })).status, 200);
    assert.equal((await f.server.api("POST", "/api/adjustment", { ...f.draft, update: true, target: "missing" })).status, 400);
    assert.equal((await f.server.room("default")).room.adjustmentDraft.text, "EDITED_INSTRUCTION");
    await f.server.api("POST", "/api/stop", { room: "default", scope: "all" });
    const done = await until(f.server, idle);
    assert.equal(done.room.adjustmentDraft, null);
    assert.equal(done.entries.filter(e => e.kind === "user").length, 1);
  } finally { await f.server.close(); }
});

test("send now queues without interrupting the active call and suppresses its old handoff", async () => {
  const f = await fixture({ reissue: false });
  try {
    await f.server.api("POST", "/api/adjustment", f.draft);
    const sent = await f.server.api("POST", "/api/adjustment", { room: "default", id: f.draft.id, action: "send" });
    assert.equal(sent.status, 200);
    const waiting = await f.server.room("default");
    assert.ok(waiting.room.busy.includes("codex"));
    assert.ok(waiting.room.continuingRunIds.includes(waiting.room.busyInfo.find(run => run.agent === "codex").runId));
    assert.equal(waiting.entries.filter(e => e.kind === "agent").length, 0);
    f.finish();
    const done = await until(f.server, idle);
    assert.equal(done.entries.filter(e => e.kind === "agent" && e.author === "claude").length, 0);
    assert.ok(done.entries.some(e => e.text === "CORRECTION_APPLIED"));
    assert.ok(!done.entries.some(e => e.meta?.stopped));
    assert.deepEqual(done.room.continuingRunIds, []);
  } finally { await f.server.close(); }
});

test("a directly queued user correction also takes precedence over old handoffs", async () => {
  const f = await fixture({ reissue: false });
  try {
    await f.server.api("POST", "/api/message", { room: "default", target: "codex", text: "NEW_USER_INSTRUCTION" });
    f.finish();
    const done = await until(f.server, idle);
    assert.ok(done.entries.some(e => e.text === "CORRECTION_APPLIED"));
    assert.equal(done.entries.filter(e => e.kind === "agent" && e.author === "claude").length, 0);
    assert.match(fs.readFileSync(f.promptFile, "utf8"), /Reassess whether peer work is still needed/);
  } finally { await f.server.close(); }
});
