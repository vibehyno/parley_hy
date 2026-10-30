import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isolatedServer } from "./server-fixture.mjs";
import { createPublicSpeech } from "../lib/public-speech.mjs";

test("public speech preserves intermediate replies without rewriting an unrelated final result", () => {
  const activities = [], streams = [];
  const speech = createPublicSpeech({ onActivity: t => activities.push(t), onStream: t => streams.push(t) });
  speech.update("확인하고 수정할게."); speech.archive(); speech.archive();
  speech.update("수정했어.");
  assert.deepEqual(activities, ["확인하고 수정할게."]);
  assert.equal(speech.finalText("확인하고 수정할게.\n수정했어."), "수정했어.");
  assert.equal(speech.finalText("별도 최종 결과"), "별도 최종 결과");
  assert.ok(streams.includes(""));
});

test("peer mentioned only in public progress receives that request after successful completion", async () => {
  const server = await isolatedServer();
  try {
    const command = path.join(server.root, "public-handoff.mjs");
    const events = [
      { type: "thread.started", thread_id: "public-handoff" },
      { type: "item.completed", item: { type: "agent_message", id: "ack", text: "@claude 검토해줘 SAY:PUBLIC_REVIEW_RECEIVED" } },
      { type: "item.started", item: { type: "command_execution", id: "tool", command: "echo check" } },
      { type: "item.completed", item: { type: "agent_message", id: "final", text: "검토를 요청했어." } },
    ];
    fs.writeFileSync(command, `let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{const events=/PUBLIC_REVIEW_RECEIVED/.test(input)?[{type:'thread.started',thread_id:'public-handoff'},{type:'item.completed',item:{type:'agent_message',text:'[pass]'}}]:${JSON.stringify(events)};for(const e of events)console.log(JSON.stringify(e));});`);
    await server.api("POST", "/api/config", { room: "default", config: { hopBudget: 2, agents: { codex: { command } } } });
    await server.api("POST", "/api/message", { room: "default", target: "codex", text: "검토를 요청해줘" });
    let state;
    for (let i = 0; i < 160; i++) {
      state = await server.room("default");
      if (!state.room.working && !state.room.busy.length && !state.room.queued) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    const rootReply = state.entries.find(e => e.kind === "agent" && e.author === "codex");
    assert.equal(rootReply.text, "검토를 요청했어.");
    assert.equal(rootReply.meta.publicHandoff.target, "claude");
    assert.ok(state.entries.some(e => e.kind === "agent" && e.author === "claude" && e.text === "PUBLIC_REVIEW_RECEIVED"), JSON.stringify(state.entries));
    assert.ok(!state.room.working && !state.room.busy.length);
  } finally { await server.close(); }
});

test("all adapters preserve the first public reply before tool activity and return only the final answer", async () => {
  const server = await isolatedServer();
  const ack = "응, 파일 확인하고 수정해서 알려줄게.", final = "수정 끝났어.";
  const delta = text => ({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text } } });
  const start = { type: "stream_event", event: { type: "message_start" } };
  const sequences = {
    codex: [
      { type: "thread.started", thread_id: "speech-codex" },
      { type: "item.completed", item: { type: "agent_message", id: "ack", text: ack } },
      { type: "item.started", item: { type: "command_execution", id: "tool", command: "Get-Content note1.txt" } },
      { type: "item.completed", item: { type: "command_execution", id: "tool", command: "Get-Content note1.txt", exit_code: 0 } },
      { type: "item.completed", item: { type: "agent_message", id: "final", text: final } },
      { type: "turn.completed", usage: { output_tokens: 12 } },
    ],
    claude: [
      { type: "system", subtype: "init", session_id: "speech-claude" }, start, delta(ack),
      { type: "assistant", message: { content: [{ type: "text", text: ack }, { type: "tool_use", id: "tool", name: "Read", input: { file_path: "note1.txt" } }] } },
      start, delta(final), { type: "assistant", message: { content: [{ type: "text", text: final }] } },
      { type: "result", session_id: "speech-claude", result: final, is_error: false },
    ],
    gemini: [
      { event: "init", conversation_id: "speech-agy" },
      { event: "step_update", step_update: { step_type: "agent_response", step_index: 1, text_delta: ack } },
      ...["ACTIVE", "DONE"].map(state => ({ event: "step_update", step_update: { step_type: "tool", step_index: 2, state,
        tool_name: "read_file", tool_info: { parameters: { Path: "note1.txt" } } } })),
      { event: "step_update", step_update: { step_type: "agent_response", step_index: 3, text_delta: final } },
      { event: "result", result: { conversation_id: "speech-agy", status: "SUCCESS", response: ack + "\n" + final } },
    ],
  };
  try {
    await server.api("POST", "/api/rooms", { name: "speech", seats: ["codex", "claude", "gemini"] });
    await server.configure("speech");
    for (const [seat, events] of Object.entries(sequences)) {
      const command = path.join(server.root, `speech-${seat}.mjs`);
      fs.writeFileSync(command, `process.stdin.resume(); process.stdin.on('data',()=>{}); process.stdin.on('end',async()=>{for(const e of ${JSON.stringify(events)}){console.log(JSON.stringify(e));await new Promise(r=>setTimeout(r,20));}});`);
      const configured = await server.api("POST", "/api/config", { room: "speech", config: { agents: { [seat]: { command } } } });
      assert.equal(configured.status, 200);
      const sent = await server.api("POST", "/api/message", { room: "speech", target: seat, text: "파일 수정해줘" });
      assert.equal(sent.status, 200);
      let state;
      for (let i = 0; i < 160; i++) {
        state = await server.room("speech");
        if (!state.room.working && !state.room.busy.length && !state.room.queued) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      const entries = state.entries.filter(e => e.author === seat);
      const intro = entries.filter(e => e.kind === "activity" && e.text === ack);
      const answer = entries.filter(e => e.kind === "agent");
      const tool = entries.find(e => e.kind === "activity" && e.text.includes("note1.txt"));
      assert.equal(intro.length, 1, JSON.stringify(entries));
      assert.equal(intro[0].meta.publicSpeech, true);
      assert.ok(intro[0].meta.runId);
      assert.equal(answer.length, 1, JSON.stringify(entries));
      assert.equal(answer[0].text, final);
      assert.ok(intro[0].n < tool.n && tool.n < answer[0].n);
      assert.equal(tool.meta.runId, intro[0].meta.runId);
      assert.equal(state.receipts.filter(r => r.agent === seat && r.outcome === "text").length, 1);
    }
  } finally { await server.close(); }
});
