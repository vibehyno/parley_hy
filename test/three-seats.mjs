import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isolatedServer } from "./server-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(server) {
  for (let i = 0; i < 200; i++) {
    const room = await server.room("default");
    if (!room.room.working && !room.room.busy.length && !room.room.queued) return room;
    await pause(25);
  }
  throw new Error(`Three-seat room did not settle:\n${server.log()}`);
}

function promptStarts(server) {
  const file = path.join(server.root, "default", "workspace", ".fake-cli-prompts.jsonl");
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean)
    .map(JSON.parse).filter((event) => event.event === "start");
}

test("room settings add, personalize, and remove a third seat", async () => {
  const server = await isolatedServer();
  try {
    let saved = await server.api("POST", "/api/config", {
      room: "default",
      seats: [
        { id: "claude", provider: "claude" },
        { id: "codex", provider: "codex" },
        { id: "gemini", provider: "gemini" },
      ],
      config: {
        defaultAgent: "codex",
        agents: {
          gemini: { displayName: "검수봇", avatar: "🧠", color: "#5b8def" },
        },
      },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.deepEqual(saved.data.room.seats, ["claude", "codex", "gemini"]);
    assert.equal(saved.data.room.seatInfo.gemini.displayName, "검수봇");
    assert.equal(saved.data.room.seatInfo.gemini.avatar, "🧠");
    assert.equal(saved.data.room.seatInfo.gemini.color, "#5b8def");

    const listed = await server.api("GET", "/api/rooms");
    const room = listed.data.rooms.find((item) => item.name === "default");
    assert.equal(room.presentation.gemini.displayName, "검수봇");

    await server.configure("default", { accounting: "automatic", hopBudget: 0 });
    const sent = await server.api("POST", "/api/message", {
      room: "default", text: "@all SAY:GROUP", target: "auto",
    });
    assert.equal(sent.status, 200, JSON.stringify(sent.data));
    const finished = await settle(server);
    const groupRoot = finished.entries.find((entry) => entry.kind === "user" && entry.text === "@all SAY:GROUP");
    assert.deepEqual(groupRoot?.meta?.audience?.addressed, ["claude", "codex", "gemini"]);
    assert.equal(groupRoot?.target, "both");

    saved = await server.api("POST", "/api/config", {
      room: "default",
      seats: [
        { id: "claude", provider: "claude" },
        { id: "codex", provider: "codex" },
      ],
      config: { defaultAgent: "codex", agents: {} },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.deepEqual(saved.data.room.seats, ["claude", "codex"]);
    assert.equal(saved.data.room.cfg.agents.gemini, undefined);
  } finally {
    await server.close();
  }
});

test("adding and removing a seat preserves existing sessions and transcript order", async () => {
  const server = await isolatedServer({ env: { FAKE_TRACE_PROMPTS: "1", FAKE_DELAY_MS: "30" } });
  try {
    const primed = await server.api("POST", "/api/message", {
      room: "default", text: "@both SAY:SESSION_PRIMED", target: "auto",
    });
    assert.equal(primed.status, 200, JSON.stringify(primed.data));
    const beforeAdd = await settle(server);
    const refs = Object.fromEntries(["claude", "codex"].map((id) =>
      [id, beforeAdd.room.agents[id].sessionRef]));
    assert(refs.claude && refs.codex, JSON.stringify(beforeAdd.room.agents));
    const originalEntries = beforeAdd.entries.map(({ n, kind, author, target, text }) =>
      ({ n, kind, author, target, text }));
    const fakeCommand = beforeAdd.room.cfg.agents.codex.command;

    const added = await server.api("POST", "/api/config", {
      room: "default",
      seats: [
        { id: "claude", provider: "claude" },
        { id: "codex", provider: "codex" },
        { id: "reviewer", provider: "codex" },
      ],
      config: { agents: { reviewer: { command: fakeCommand, lurk: false } } },
    });
    assert.equal(added.status, 200, JSON.stringify(added.data));
    const afterAdd = await server.room("default");
    assert.equal(afterAdd.room.agents.claude.sessionRef, refs.claude);
    assert.equal(afterAdd.room.agents.codex.sessionRef, refs.codex);
    assert.equal(afterAdd.room.agents.reviewer.sessionRef, null);
    assert.deepEqual(afterAdd.entries.slice(0, originalEntries.length)
      .map(({ n, kind, author, target, text }) => ({ n, kind, author, target, text })), originalEntries);

    const sent = await server.api("POST", "/api/message", {
      room: "default", text: "@reviewer SAY:NEW_SEAT", target: "auto",
    });
    assert.equal(sent.status, 200, JSON.stringify(sent.data));
    const withNewSeat = await settle(server);
    assert(withNewSeat.room.agents.reviewer.sessionRef);
    const reviewerStart = promptStarts(server).find((event) => event.prompt.includes("NEW_SEAT"));
    assert.match(reviewerStart?.prompt || "", /SESSION_PRIMED/,
      "A newly added seat should receive the recent room transcript as context");

    const beforeRemoveEntries = withNewSeat.entries.map(({ n, kind, author, target, text }) =>
      ({ n, kind, author, target, text }));
    const removed = await server.api("POST", "/api/config", {
      room: "default",
      seats: [
        { id: "claude", provider: "claude" },
        { id: "codex", provider: "codex" },
      ],
      config: { agents: {} },
    });
    assert.equal(removed.status, 200, JSON.stringify(removed.data));
    const afterRemove = await server.room("default");
    assert.equal(afterRemove.room.agents.claude.sessionRef, refs.claude);
    assert.equal(afterRemove.room.agents.codex.sessionRef, refs.codex);
    assert.equal(afterRemove.room.agents.reviewer, undefined);
    assert.deepEqual(afterRemove.entries.slice(0, beforeRemoveEntries.length)
      .map(({ n, kind, author, target, text }) => ({ n, kind, author, target, text })), beforeRemoveEntries);
  } finally {
    await server.close();
  }
});

test("three-seat UI uses @all and explains Extra CLI args as options, not prompts", () => {
  assert.match(serverSource, /@\(\$\{alt\}\|both\|all\)/);
  assert.match(app, /seats\.length > 2 \? "all" : "both"/);
  assert.match(app, /settings\.extraArgsHelp/);
  assert.match(app, /not a prompt sent to the model/);
  assert.match(app, /data-remove-seat/);
  assert.match(app, /settings\.removeSeatConfirm/);
  assert.match(app, /mode\.sessionResetConfirm/);
});
