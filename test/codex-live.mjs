import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCodexLive } from "../lib/codex-live.mjs";
import { isolatedServer } from "./server-fixture.mjs";

const fakeSource = `const readline=require('node:readline');
let active=false, text='ORIGINAL';
const out=x=>console.log(JSON.stringify(x));
readline.createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line), p=m.params||{};
 if(m.method==='initialize')out({id:m.id,result:{}});
 if(m.method==='thread/start'||m.method==='thread/resume')out({id:m.id,result:{thread:{id:'native-thread'}}});
 if(m.method==='turn/start'){
  active=true;out({id:m.id,result:{turn:{id:'native-turn'}}});
  out({method:'turn/started',params:{turn:{id:'native-turn'}}});
  out({method:'item/started',params:{item:{type:'commandExecution',id:'tool',command:'test work'}}});
 }
 if(m.method==='turn/steer'){
  if(!active||p.expectedTurnId!=='native-turn')return out({id:m.id,error:{message:'turn mismatch'}});
  text=p.input[0].text;out({id:m.id,result:{turnId:'native-turn'}});
  out({method:'item/agentMessage/delta',params:{itemId:'reply',delta:'ACK '+text}});
  setTimeout(()=>{
   out({method:'item/completed',params:{item:{type:'agentMessage',id:'reply',text:'APPLIED '+text}}});
   out({method:'turn/completed',params:{turn:{id:'native-turn',status:'completed'}}});
   active=false;
  },100);
 }
});`;

test("native steering uses the existing turn and forwards live speech", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "moyeo-steer-test-"));
  const script = path.join(dir, "codex.js"); fs.writeFileSync(script, fakeSource);
  const events = []; let receipt, launched = 0, closed;
  try {
    const result = await runCodexLive({ cmd: process.execPath, pre: [script] }, {
      cwd: dir, timeoutMs: 5000, sandbox: "read-only", input: "ORIGINAL", onLine: line => events.push(JSON.parse(line)),
      kill: child => child?.kill(), onChild: child => { launched++; closed = new Promise(resolve => child.once("close", resolve)); },
      onReady: steer => { if (steer && !receipt) receipt = steer("GREEN", "unique-id"); },
    });
    assert.equal(result.code, 0); assert.equal(launched, 1);
    assert.deepEqual(await receipt, { turnId: "native-turn", threadId: "native-thread" });
    assert.ok(events.some(e => e.type === "item.updated" && e.item.text === "ACK GREEN"));
    assert.ok(events.some(e => e.item?.text === "APPLIED GREEN"));
  } finally { await closed; await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
});

test("the button delivers once to a running native turn, with no queued second run", async () => {
  const server = await isolatedServer();
  const script = path.join(server.root, "codex.js"); fs.writeFileSync(script, fakeSource);
  try {
    const config = await server.api("POST", "/api/config", { room: "default", config: { agents: { codex: { command: script } } } });
    assert.equal(config.status, 200);
    await server.api("POST", "/api/message", { room: "default", target: "codex", text: "ORIGINAL" });
    let state;
    for (let i=0;i<100;i++) {
      state=await server.room("default");
      if(state.entries.some(e=>e.kind==='activity'))break;
      await new Promise(r=>setTimeout(r,30));
    }
    const sourceN = state.entries.find(e=>e.kind==='user').n;
    const stage = await server.api("POST", "/api/adjustment", { room: "default", id: "live-one", action: "stage", sourceN, target: "codex", text: "GREEN" });
    assert.equal(stage.status, 200);
    const body = { room: "default", id: "live-one", action: "send" };
    const sent = await server.api("POST", "/api/adjustment", body);
    assert.equal(sent.status, 200, JSON.stringify(sent.data)); assert.equal(sent.data.live, true);
    const replay = await server.api("POST", "/api/adjustment", body);
    assert.equal(replay.data.n, sent.data.n);
    for(let i=0;i<100;i++) {
      state=await server.room("default");
      if(!state.room.busy.length)break;
      await new Promise(r=>setTimeout(r,30));
    }
    assert.equal(state.entries.filter(e=>e.meta?.askFrom?.adjustmentId==='live-one').length,1);
    assert.equal(state.entries.filter(e=>e.kind==='agent'&&e.author==='codex').length,1);
    assert.ok(state.entries.some(e=>e.kind==='agent'&&e.text.includes('GREEN')));
    assert.equal(state.room.adjustmentDraft,null);
  } finally { await server.close(); }
});
