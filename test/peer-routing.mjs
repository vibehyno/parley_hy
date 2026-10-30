import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { plainPeerRequest } from "../lib/peer-routing.mjs";
import { isolatedServer } from "./server-fixture.mjs";

const peers = [{ id: "codex", label: "빵빵이", alias: "빵빵아" },
  { id: "claude", label: "옥지", alias: "옥지야" }, { id: "gemini", label: "뚱뚱이", alias: "뚱뚱아" }];
test("recover direct named requests without routing ordinary references, promises or ambiguous names", () => {
  for (const text of ["옥지야, 문서를 검토해줘", "옥지 검토 부탁해.", "**옥지야**, 이 설계는 어때?", "Claude, please review this."])
    assert.equal(plainPeerRequest(text, peers, "codex"), "claude", text);
  assert.equal(plainPeerRequest("뚱뚱아 수정해 주세요", peers, "codex"), "gemini");
  for (const text of ["옥지에게 검토를 요청할게", "옥지 검토가 완료됐어", "옥지와 협의했어", "옥지가 검토해줘", "빵빵아 검토해줘", "옥지야, 검토하지 마"])
    assert.equal(plainPeerRequest(text, peers, "codex"), null, text);
  assert.equal(plainPeerRequest("옥지 검토해줘", [...peers, { id: "another", label: "옥지" }], "codex"), null);
});

test("missing-sigil handoff reaches the named CLI, while quoted examples do not", async () => {
  const server = await isolatedServer();
  try {
    for (const [name, text, delivered] of [
      ["plain-peer", "옥지야, SAY:REVIEW_OK 검토해줘", true],
      ["quoted-peer", "> 옥지야, SAY:REVIEW_OK 검토해줘", false],
      ["code-peer", "```\n옥지야, SAY:REVIEW_OK 검토해줘\n```", false],
    ]) {
      await server.api("POST", "/api/rooms", { name, seats: ["codex", "claude", "gemini"] });
      await server.configure(name, { hopBudget: 1, accounting: "automatic" });
      const command = path.join(server.root, name + ".mjs");
      fs.writeFileSync(command, `process.stdin.resume();process.stdin.on('end',()=>{for(const e of [{type:'thread.started',thread_id:'${name}'},{type:'item.completed',item:{type:'agent_message',text:${JSON.stringify(text)}}}])console.log(JSON.stringify(e));});`);
      await server.api("POST", "/api/config", { room: name, config: { agents: {
        codex: { command }, claude: { displayName: "옥지", mentionAlias: "옥지야" },
      } } });
      await server.api("POST", "/api/message", { room: name, target: "codex", text: "검토를 요청해줘" });
      let state;
      for (let i = 0; i < 160; i++) {
        state = await server.room(name);
        if (!state.room.working && !state.room.busy.length && !state.room.queued) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.equal(state.entries.some(e => e.kind === "agent" && e.author === "claude" && e.text === "REVIEW_OK"), delivered, name);
      assert.ok(!state.entries.some(e => e.kind === "agent" && e.author === "gemini"), name);
    }
  } finally { await server.close(); }
});
