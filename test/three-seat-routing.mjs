import test from "node:test";
import assert from "node:assert/strict";
import { createCausalCoordinator } from "../lib/causal-coordinator.mjs";
import { fileURLToPath } from "node:url";
import { isolatedServer } from "./server-fixture.mjs";

test("three CLI adapters route Korean alias handoffs and all-seat messages through the real server", async () => {
  const server = await isolatedServer();
  async function settle(name) {
    for (let i = 0; i < 240; i++) {
      const state = await server.room(name);
      if (!state.room.working && !state.room.busy.length && !state.room.queued) return state;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw Error("Three-seat exchange did not settle");
  }
  try {
    for (const [name, budget, text, expected] of [
      ["handoff", 8, "ROUTE_THREE_START", ["codex", "claude", "codex", "gemini"]],
      ["alias", 0, "@뚱뚱아 SAY:DIRECT_OK", ["gemini"]],
      ["all-seats", 0, "@all SAY:ALL_OK", ["codex", "claude", "gemini"]],
      ["capped", 2, "ROUTE_THREE_START", ["codex", "claude", "codex"]],
    ]) {
      await server.api("POST", "/api/rooms", { name, seats: ["codex", "claude", "gemini"] });
      await server.configure(name, { accounting: "automatic", hopBudget: budget });
      const config = await server.api("POST", "/api/config", { room: name, config: { agents: {
        gemini: { command: fileURLToPath(new URL("./fake-agy.mjs", import.meta.url)), mentionAlias: "뚱뚱아" },
      } } });
      assert.equal(config.status, 200);
      const sent = await server.api("POST", "/api/message", { room: name,
        target: text.startsWith("@") ? "auto" : "codex", text });
      assert.equal(sent.status, 200);
      const state = await settle(name);
      const replies = state.entries.filter(entry => entry.kind === "agent");
      const authors = replies.map(entry => entry.author);
      assert.deepEqual(name === "all-seats" ? authors.sort() : authors,
        name === "all-seats" ? [...expected].sort() : expected,
        JSON.stringify(state.entries.map(({ n, author, text }) => ({ n, author, text }))));
      assert.ok(!replies.some(entry => entry.text.includes("WRONG_RECIPIENT")));
      assert.ok(!state.entries.some(entry => entry.meta?.error));
      if (name === "handoff") {
        assert.equal(replies.at(-1).text, "ROUTE_THREE_COMPLETE");
        assert.ok(state.room.agents.gemini.sessionRef);
      }
      if (name === "capped") assert.ok(state.entries.some(entry =>
        entry.meta?.relayCap?.dropped.some(edge => edge.target === "gemini")));
    }
  } finally { await server.close(); }
});

function scenario({ redirectInReply = false, target = "codex", budget = 5, asleep = false, stop = false, fail = false } = {}) {
  const room = { generation: 1, entries: [], state: { agents: Object.fromEntries(
    ["codex", "claude", "gemini"].map(id => [id, { cursor: 0 }])) } };
  const calls = [], outcomes = [];
  let used = 0;
  const failed = Symbol("failed");
  const agent = (n, author, to) => ({ n, author, kind: "agent", to });
  const deps = {
    HOP_SAFETY_HOPS: 25, relayUsed: () => used,
    findHopTarget: (_room, entry) => entry.to,
    persistLurkOutcome: (_room, recipient, _range, reason) => outcomes.push([recipient, reason]),
    isEntryResult: entry => entry?.kind === "agent",
    otherSeat: (_room, author) => author === "codex" ? "claude" : "codex",
    withdrawnFrom: () => false, chainHalted: () => stop && calls.length > 0,
    isAsleep: (_room, seat) => asleep && seat === "gemini", noteSleepSkip: () => {},
    seatOccupied: () => false, waitForHopSeat: async () => true,
    broadcast: () => {}, roomSummary: () => ({}), recordRelayLaunch: () => ++used,
    HOP_FAILED: failed, STEP_STOPPED: Symbol(), SEAT_ASLEEP: Symbol(),
    runHopTurn: async (_room, seat, trigger, _root, _scope, opts) => {
      calls.push([seat, trigger.n, opts.deliveryKind]); opts.onLaunch?.();
      if (fail) return failed;
      room.state.agents[seat].cursor = trigger.n;
      return seat === "claude" ? agent(3, "claude", redirectInReply ? "gemini" : null) : null;
    },
    deliverCausalAnswer: async (_room, { recipient, reply }) => {
      calls.push([recipient, reply.n, "answer-return"]);
      return { seen: true, entry: agent(4, recipient, "gemini") };
    },
    causalAnswerRange: reply => ({ triggerN: reply.n }),
    appendEntry: (_room, entry) => room.entries.push(entry),
  };
  const coordinator = createCausalCoordinator(deps, room, { userTurn: { n: 1, target },
    gen: 1, chain: {}, relayPolicy: { hopBudget: budget, source: "message" } });
  return { room, calls, outcomes, coordinator, agent };
}

test("review result returns to Codex, then its explicit third-seat handoff reaches AGY", async () => {
  const f = scenario();
  f.coordinator.enqueueInitial([f.agent(2, "codex", "claude")]);
  await f.coordinator.settle(); f.coordinator.finalize();
  assert.deepEqual(f.calls, [["claude", 2, "explicit"], ["codex", 3, "answer-return"], ["gemini", 4, "explicit"]]);
});
test("reviewer can hand work directly to the third seat", async () => {
  const f = scenario({ redirectInReply: true });
  f.coordinator.enqueueInitial([f.agent(2, "codex", "claude")]);
  await f.coordinator.settle(); f.coordinator.finalize();
  assert.deepEqual(f.calls, [["claude", 2, "explicit"], ["gemini", 3, "explicit"]]);
});
test("all-seat reply honors its explicit target instead of first peer", async () => {
  const f = scenario({ target: "both" });
  f.coordinator.enqueueInitial([f.agent(2, "codex", "gemini")], new Set(["codex", "claude", "gemini"]));
  await f.coordinator.settle(); f.coordinator.finalize();
  assert.deepEqual(f.calls, [["gemini", 2, "sibling"]]);
});
test("third-seat handoff obeys budget, sleep and stop without redirecting to another peer", async () => {
  for (const options of [{ budget: 1 }, { asleep: true }, { stop: true }, { fail: true }]) {
    const f = scenario({ redirectInReply: true, ...options });
    f.coordinator.enqueueInitial([f.agent(2, "codex", "claude")]);
    await f.coordinator.settle(); f.coordinator.finalize();
    assert.deepEqual(f.calls, [["claude", 2, "explicit"]], JSON.stringify(options));
    if (options.budget) assert.deepEqual(f.room.entries[0].meta.relayCap.dropped, [{ n: 3, target: "gemini" }]);
    if (options.asleep) assert.deepEqual(f.outcomes, [["gemini", "request-asleep"]]);
    if (options.stop) assert.deepEqual(f.outcomes, [["gemini", "request-stopped"]]);
    if (options.fail) assert.deepEqual(f.outcomes, [["claude", "request-failed"]]);
  }
});
