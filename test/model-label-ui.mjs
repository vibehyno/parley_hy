import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
const models = [{ value: "sonnet", label: "Sonnet 5.5", resolvedModel: "claude-sonnet-5-5" },
  { value: "default", label: "Default (recommended)", resolvedModel: "claude-sonnet-5-5" }];
const summary = model => ({ name: "test", seats: ["claude"], cfg: { agents: { claude: { model, command: "claude" } } }, seatInfo: { claude: { models } } });

test("seat tooltip resolves aliases, explicit IDs and defaults without inventing unknown versions", () => {
  const context = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf("function seatModelTitle("), source.indexOf("async function refreshSeatModels(")), context);
  for (const value of ["sonnet", "claude-sonnet-5-5"])
    assert.equal(context.seatModelTitle(summary(value), "claude"), "Sonnet 5.5 · claude-sonnet-5-5");
  assert.match(context.seatModelTitle(summary(null), "claude"), /claude-sonnet-5-5/);
  assert.equal(context.seatModelTitle(summary("custom-model"), "claude"), "custom-model");
  const fallback = summary("sonnet"); fallback.seatInfo = {};
  assert.equal(context.seatModelTitle(fallback, "claude"), "sonnet");
});

test("model choices display version names but submit original aliases", () => {
  const context = vm.createContext({ esc: x => x, tr: (_key, fallback) => fallback });
  vm.runInContext(source.slice(source.indexOf("function seatFieldHTML("), source.indexOf("function setFreeComboOpen(")), context);
  const html = context.seatFieldHTML("claude", "model", { models });
  assert.match(html, /data-combo-value="sonnet"><b>Sonnet 5\.5<\/b>/);
});

test("metadata completion refreshes current room only, without reverting other state", async () => {
  const state = { summary: summary("sonnet") };
  let complete;
  const context = vm.createContext({ state, api: () => new Promise(resolve => { complete = resolve; }),
    applySummary: s => { state.summary = s; } });
  vm.runInContext(source.slice(source.indexOf("async function refreshSeatModels("), source.indexOf("function applySummary(")), context);
  const pending = context.refreshSeatModels(state.summary);
  state.summary = { ...state.summary, busy: ["claude"] };
  complete({ seatInfo: { claude: { models } } });
  assert.equal(await pending, true);
  assert.deepEqual(state.summary.busy, ["claude"]);
  const stale = context.refreshSeatModels(state.summary);
  state.summary = { ...state.summary, name: "another-room" };
  complete({ seatInfo: {} });
  assert.equal(await stale, false);
});
