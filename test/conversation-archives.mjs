import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isolatedServer } from "./server-fixture.mjs";
import { archiveConversation } from "../lib/conversation-archives.mjs";

async function settled(server, name = "default") {
  for (let i = 0; i < 240; i++) {
    const snapshot = await server.room(name);
    if (!snapshot.room.working && !snapshot.room.busy.length && !snapshot.room.queued) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Archive test did not settle: ${server.log()}`);
}

test("archive restores ordered history and saved settings into a fresh, idle room", async () => {
  const server = await isolatedServer({ env: { FAKE_TRACE_PROMPTS: "1", FAKE_DELAY_MS: "30" } });
  try {
    await server.configure("default", { roomNote: "Keep reports short", agents: {
      claude: { displayName: "Reviewer", role: "Review", persona: "Check requirements" },
    } });
    assert.equal((await server.api("POST", "/api/message", { room: "default", text: "@claude SAY:ARCHIVE_HISTORY", target: "auto" })).status, 200);
    const before = await settled(server);
    const source = path.join(server.root, "default");
    const events = fs.readFileSync(path.join(source, "events.jsonl"), "utf8");
    const transcript = fs.readFileSync(path.join(source, "transcript.md"), "utf8");
    assert(before.entries.some((e) => e.kind === "agent"));
    assert.equal((await server.api("POST", "/api/new", { room: "default" })).status, 200);
    const archives = (await server.api("GET", "/api/archives?room=default")).data.archives;
    assert.equal(archives.length, 1);
    assert.equal(archives[0].hasSettings, true);
    const id = archives[0].id;
    const preview = await server.api("GET", `/api/archive?room=default&id=${encodeURIComponent(id)}`);
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.data.entries.map((e) => e.n), before.entries.map((e) => e.n));
    await server.configure("default", { agents: { claude: { persona: "Changed after archive" } } });
    const untouched = await server.room("default");
    const restored = await server.api("POST", "/api/archive/restore", { room: "default", id, name: "restored" });
    assert.equal(restored.status, 200, JSON.stringify(restored.data));
    assert.equal(restored.data.usedCurrentSettings, false);
    const dest = path.join(server.root, "restored");
    assert.equal(fs.readFileSync(path.join(dest, "events.jsonl"), "utf8"), events);
    assert.equal(fs.readFileSync(path.join(dest, "transcript.md"), "utf8"), transcript);
    const snapshot = await settled(server, "restored");
    assert.deepEqual(snapshot.entries, before.entries);
    assert.equal(snapshot.room.cfg.agents.claude.persona, "Check requirements");
    const state = JSON.parse(fs.readFileSync(path.join(dest, "state.json"), "utf8"));
    assert(Object.values(state.agents).every((seat) => seat.sessionRef === null));
    assert.equal(state.lastUser, null);
    assert.equal(state.pair, null);
    assert.equal(fs.existsSync(path.join(dest, "workspace", ".fake-cli-prompts.jsonl")), false);
    assert.equal((await server.api("POST", "/api/archive/restore", { room: "default", id, name: "restored" })).status, 409);
    assert.equal(fs.readFileSync(path.join(dest, "events.jsonl"), "utf8"), events);
    assert.equal((await server.api("POST", "/api/message", { room: "restored", text: "@claude SAY:CONTINUED", target: "auto" })).status, 200);
    const continued = await settled(server, "restored");
    assert.deepEqual(continued.entries.slice(0, before.entries.length), before.entries);
    assert(continued.entries[before.entries.length].n > before.entries.at(-1).n);
    const trace = fs.readFileSync(path.join(dest, "workspace", ".fake-cli-prompts.jsonl"), "utf8");
    assert.match(trace, /ARCHIVE_HISTORY/);
    assert.deepEqual((await server.room("default")).entries, untouched.entries);
    assert.equal(fs.readFileSync(path.join(source, `events-${id}.jsonl`), "utf8"), events);
  } finally { await server.close(); }
});

test("legacy restore copies attachments, uses current settings and rejects unsafe or corrupt archives", async () => {
  const server = await isolatedServer();
  try {
    const source = path.join(server.root, "default");
    const id = "2026-10-29T12-00-00";
    const attachment = "11111111-1111-4111-8111-111111111111";
    fs.mkdirSync(path.join(source, "attachments"), { recursive: true });
    fs.writeFileSync(path.join(source, "attachments", attachment + ".png"), "fixture-image");
    const entries = [{ n: 1, kind: "user", author: "you", ts: new Date().toISOString(), text: "legacy", meta: { attachments: [{ id: attachment, mime: "image/png", kind: "image" }] } }];
    fs.writeFileSync(path.join(source, `events-${id}.jsonl`), entries.map(JSON.stringify).join("\n") + "\n");
    const response = await server.api("POST", "/api/archive/restore", { room: "default", id, name: "legacy" });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.usedCurrentSettings, true);
    assert.equal(fs.readFileSync(path.join(server.root, "legacy", "attachments", attachment + ".png"), "utf8"), "fixture-image");
    assert.equal((await server.api("POST", "/api/archive/restore", { room: "default", id: "../escape", name: "bad-path" })).status, 400);
    fs.writeFileSync(path.join(source, "events-2026-bad.jsonl"), '{"n":2,"text":"second"}\n{"n":1,"text":"first"}\n');
    assert.equal((await server.api("POST", "/api/archive/restore", { room: "default", id: "2026-bad", name: "bad-order" })).status, 422);
    assert.equal(fs.existsSync(path.join(server.root, "bad-order")), false);
  } finally { await server.close(); }
});

test("failed archival rolls back files instead of losing the current conversation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parley-archive-rollback-"));
  const eventsFile = path.join(dir, "events.jsonl");
  const transcriptFile = path.join(dir, "transcript.md");
  fs.writeFileSync(eventsFile, "original events");
  fs.writeFileSync(transcriptFile, "original transcript");
  const originalRename = fs.renameSync;
  try {
    fs.renameSync = (source, dest) => {
      if (source === transcriptFile) throw new Error("simulated archive failure");
      return originalRename(source, dest);
    };
    assert.throws(() => archiveConversation({ dir, eventsFile, transcriptFile, cfg: { agents: {} }, state: {} }), /simulated/);
    assert.equal(fs.readFileSync(eventsFile, "utf8"), "original events");
    assert.equal(fs.readFileSync(transcriptFile, "utf8"), "original transcript");
    assert.deepEqual(fs.readdirSync(dir).sort(), ["events.jsonl", "transcript.md"]);
  } finally {
    fs.renameSync = originalRename;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
