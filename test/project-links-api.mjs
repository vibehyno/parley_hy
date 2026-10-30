import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isolatedServer } from "./server-fixture.mjs";

test("room API saves, switches and removes multiple project folders", async () => {
  const server = await isolatedServer();
  try {
    const one = path.resolve(server.root, "..", "project-one");
    const two = path.resolve(server.root, "..", "project-two");
    fs.mkdirSync(one); fs.mkdirSync(two);

    let saved = await server.api("POST", "/api/config", {
      room: "default", config: { projectDirs: [one, two], projectDir: one },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.room.projectLinks.links.length, 2);
    assert.equal(saved.data.room.projectLinks.mismatch, false);
    assert.equal(saved.data.room.projectLinks.active, one);

    const listed = await server.api("GET", "/api/rooms");
    assert.equal(listed.data.rooms.find((room) => room.name === "default").projectCount, 2);

    saved = await server.api("POST", "/api/config", {
      room: "default", config: { projectDirs: [two], projectDir: two },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.deepEqual(saved.data.room.cfg.projectDirs, [two]);
    assert.equal(saved.data.room.projectLinks.active, two);

    const missing = path.resolve(server.root, "..", "missing-project");
    const rejected = await server.api("POST", "/api/config", {
      room: "default", config: { projectDirs: [missing], projectDir: missing },
    });
    assert.equal(rejected.status, 400);
  } finally {
    await server.close();
  }
});

test("all providers receive linked projects together on fresh and resumed turns", async () => {
  const server = await isolatedServer({ env: { FAKE_TRACE_PROMPTS: "1", FAKE_DELAY_MS: "20" } });
  const name = "multi-project";
  const one = path.resolve(server.root, "..", "primary project");
  const two = path.resolve(server.root, "..", "second project");
  fs.mkdirSync(one); fs.mkdirSync(two);
  const value = (argv, flag) => argv[argv.indexOf(flag) + 1];
  const send = async (seat) => {
    const before = (await server.room(name)).entries.at(-1)?.n || 0;
    assert.equal((await server.api("POST", "/api/message", { room: name, target: seat, text: "ARGJSON" })).status, 200);
    for (let i = 0; i < 200; i++) {
      const data = await server.room(name);
      if (!data.room.working && !data.room.busy.length && !data.room.queued) {
        const reply = data.entries.find((entry) => entry.n > before && entry.kind === "agent" && entry.author === seat);
        assert(reply?.text.startsWith("ARGVJSON "), JSON.stringify(data.entries.slice(-3)));
        return JSON.parse(reply.text.slice(9));
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Provider fixture did not settle");
  };
  const readState = () => JSON.parse(fs.readFileSync(path.join(server.root, name, "state.json"), "utf8"));
  try {
    assert.equal((await server.api("POST", "/api/rooms", { name, seats: ["codex", "claude", "gemini"] })).status, 200);
    await server.configure(name, { mode: "work", projectDir: one, projectDirs: [one, two] });
    assert.equal((await server.api("POST", "/api/config", { room: name, config: {
      agents: { gemini: { command: fileURLToPath(new URL("./fake-agy.mjs", import.meta.url)) } },
    } })).status, 200);
    for (const seat of ["codex", "claude", "gemini"]) {
      const first = await send(seat);
      assert.equal(value(first, "--add-dir"), two, `${seat} must receive the other project`);
      const reference = readState().agents[seat].sessionRef;
      assert(reference, `${seat} must save a session`);
      const resumed = await send(seat);
      assert.equal(value(resumed, "--add-dir"), two);
      assert.equal(readState().agents[seat].sessionRef, reference);
      assert(resumed.includes(reference), `${seat} must resume its own session`);
      if (seat === "codex") assert.equal(value(resumed, "--sandbox"), "workspace-write");
      if (seat === "claude") assert.equal(value(resumed, "--permission-mode"), "acceptEdits");
      if (seat === "gemini") assert.equal(value(resumed, "--mode"), "accept-edits");
    }
    const traces = fs.readFileSync(path.join(one, ".fake-cli-prompts.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
    for (const seat of ["codex", "claude"]) {
      const first = traces.find((entry) => entry.event === "start" && entry.seat === seat);
      assert(first.briefing.includes(JSON.stringify(one)) && first.briefing.includes(JSON.stringify(two)), `${seat} briefing must list both projects`);
    }
    const before = (await server.room(name)).entries.filter((entry) => ["user", "agent"].includes(entry.kind));
    const removed = await server.api("POST", "/api/config", { room: name, config: { projectDir: one, projectDirs: [one] } });
    assert.equal(removed.status, 200);
    assert(Object.values(readState().agents).every((agent) => agent.sessionRef === null), "Removing a directory retires the sessions carrying its grant");
    const after = (await server.room(name)).entries.filter((entry) => ["user", "agent"].includes(entry.kind));
    assert.deepEqual(after, before, "Project changes must preserve message contents and order");
    assert(!(await send("codex")).includes(two), "Removed directories must not be granted on the next call");
  } finally {
    await server.close();
  }
});
