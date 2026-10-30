import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isolatedServer } from "./server-fixture.mjs";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(server) {
  for (let i = 0; i < 240; i++) {
    const room = await server.room("default");
    if (!room.room.working && !room.room.busy.length && !room.room.queued) return room;
    await pause(25);
  }
  throw new Error(`Persona room did not settle:\n${server.log()}`);
}

function starts(server) {
  const file = path.join(server.root, "default", "workspace", ".fake-cli-prompts.jsonl");
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean)
    .map(JSON.parse).filter((event) => event.event === "start" && event.seat === "claude");
}

async function send(server, text) {
  const sent = await server.api("POST", "/api/message", { room: "default", text, target: "auto" });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  await settle(server);
  return sent.data;
}

test("custom call alias routes to the stable seat and persona is cached per native session", async () => {
  const server = await isolatedServer({ env: { FAKE_TRACE_PROMPTS: "1", FAKE_DELAY_MS: "30" } });
  try {
    await server.configure("default", {
      accounting: "automatic",
      hopBudget: 0,
      agents: { claude: {
        displayName: "지니", role: "요구검수", mentionAlias: "지니",
        persona: "사용자 요구사항을 짧게 검수하고 중요한 누락만 알려주세요.",
      } },
    });

    const first = await send(server, "@지니 SAY:FIRST");
    assert.equal(first.target, "claude");
    assert.equal(first.explicit, true);
    let trace = starts(server);
    assert.match(trace[0].briefing, /Your call name in this room is @지니/);
    assert.match(trace[0].briefing, /NOT your native subagents or roles/);
    assert.match(trace[0].briefing, /Do not create, rename or substitute a native subagent/);
    assert.match(trace[0].briefing, /Assigned role: 요구검수/);
    assert.match(trace[0].briefing, /사용자 요구사항을 짧게 검수/);

    await send(server, "@지니 SAY:SECOND");
    trace = starts(server);
    assert.equal(trace[1].briefing, "");
    assert.doesNotMatch(trace[1].prompt, /Assigned role: 요구검수|사용자 요구사항을 짧게 검수/);

    const changed = await server.api("POST", "/api/config", {
      room: "default", config: { agents: { claude: { persona: "보안과 데이터 무결성을 우선 검수해주세요." } } },
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.data));
    await send(server, "@지니 SAY:THIRD");
    trace = starts(server);
    assert.match(trace[2].prompt, /Update to your standing instructions/);
    assert.match(trace[2].prompt, /보안과 데이터 무결성을 우선 검수/);
    assert.equal((trace[2].prompt.match(/보안과 데이터 무결성을 우선 검수/g) || []).length, 1);
  } finally {
    await server.close();
  }
});

test("seat identity validation rejects long roles and duplicate call aliases", async () => {
  const server = await isolatedServer();
  try {
    const longRole = await server.api("POST", "/api/config", {
      room: "default", config: { agents: { claude: { role: "열한글자이상인맡은업무" } } },
    });
    assert.equal(longRole.status, 400);

    const duplicate = await server.api("POST", "/api/config", {
      room: "default", config: { agents: {
        claude: { mentionAlias: "지니" }, codex: { mentionAlias: "지니" },
      } },
    });
    assert.equal(duplicate.status, 400);
  } finally {
    await server.close();
  }
});

test("an explicitly addressed model can write a room note and the note is sent once per session", async () => {
  const server = await isolatedServer({ env: { FAKE_TRACE_PROMPTS: "1", FAKE_DELAY_MS: "30" } });
  try {
    await server.configure("default", { accounting: "automatic", hopBudget: 0,
      agents: { claude: { mentionAlias: "지니" } } });
    const generated = await server.api("POST", "/api/message", {
      room: "default", text: "@지니 SAY:ROOM_NOTE_SHORT", target: "auto",
      roomNoteRequest: true, solo: true, hopBudget: 0,
    });
    assert.equal(generated.status, 200, JSON.stringify(generated.data));
    let room = await settle(server);
    assert.equal(room.room.cfg.roomNote, "ROOM_NOTE_SHORT");
    assert(room.entries.some((entry) => entry.meta?.roomNoteChanged && entry.meta.agent === "claude"));

    const before = starts(server).length;
    await send(server, "@지니 SAY:NOTE-FIRST");
    await send(server, "@지니 SAY:NOTE-SECOND");
    const trace = starts(server).slice(before);
    assert.match(trace[0].prompt, /user room note: ROOM_NOTE_SHORT/);
    assert.doesNotMatch(trace[1].prompt, /user room note: ROOM_NOTE_SHORT/);
  } finally {
    await server.close();
  }
});

test("cropped avatar images persist as seat presentation and invalid data is rejected", async () => {
  const server = await isolatedServer();
  try {
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
    const saved = await server.api("POST", "/api/config", {
      room: "default", config: { agents: { claude: { avatarImage: pixel } } },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.room.seatInfo.claude.avatarImage, pixel);
    const rooms = await server.api("GET", "/api/rooms");
    assert.equal(rooms.data.rooms.find((room) => room.name === "default").presentation.claude.avatarImage, pixel);

    const invalid = await server.api("POST", "/api/config", {
      room: "default", config: { agents: { claude: { avatarImage: "data:text/plain;base64,QQ==" } } },
    });
    assert.equal(invalid.status, 400);
  } finally {
    await server.close();
  }
});

test("persona settings UI exposes role, call name, persona and Unicode mentions", () => {
  const app = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
  assert.match(app, /data-f="role" maxlength="10"/);
  assert.match(app, /data-f="mentionAlias" maxlength="20"/);
  assert.match(app, /data-f="persona" maxlength="1000"/);
  assert.match(app, /function openAvatarCrop/);
  assert.match(app, /roomNoteRequest: true/);
  assert.match(app, /\\p\{L\}\\p\{N\}_-/);
  assert.match(app, /seatMention\(a\)/);
});
