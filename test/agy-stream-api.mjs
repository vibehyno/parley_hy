import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { isolatedServer } from "./server-fixture.mjs";

test("AGY adapter persists intermediate speech before final answer and exposes CLI models", async () => {
  const server = await isolatedServer();
  try {
    await server.api("POST", "/api/rooms", { name: "stream-test", seats: ["codex", "claude", "gemini"] });
    await server.configure("stream-test");
    await server.api("POST", "/api/config", { room: "stream-test", config: { agents: {
      gemini: { command: fileURLToPath(new URL("./fake-agy.mjs", import.meta.url)) },
    } } });
    const catalog = await server.api("GET", "/api/models?room=stream-test");
    assert.equal(catalog.status, 200);
    assert.equal(catalog.data.seatInfo.claude.models[0].label, "Sonnet Test");
    assert.equal(catalog.data.seatInfo.gemini.models[0].value, "gemini-test");
    await server.api("POST", "/api/message", { room: "stream-test", target: "gemini", text: "AGYSTREAM" });
    let state;
    for (let i = 0; i < 80; i++) {
      state = await server.room("stream-test");
      if (!state.room.working && !state.room.busy.length) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    const speech = state.entries.find(entry => entry.kind === "activity" && entry.text === "확인해볼게.");
    const final = state.entries.find(entry => entry.kind === "agent" && entry.author === "gemini");
    assert.ok(speech, JSON.stringify(state.entries));
    assert.equal(final?.text, "확인 완료.");
    assert.ok(speech.n < final.n);
    const html = await (await fetch(server.url)).text();
    const assetPath = /src="([^\"]*\/ui\/seat-errors\.js\?[^\"]+)"/.exec(html)?.[1];
    assert.ok(assetPath);
    assert.equal((await fetch(server.url + assetPath)).status, 200);
  } finally { await server.close(); }
});
