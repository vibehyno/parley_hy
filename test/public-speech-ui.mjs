import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
test("speech stays a bubble during work; only completed runs fold with their tool details", () => {
  const node = () => ({ dataset: {}, children: [], appendChild(child) { this.children.push(child); } });
  const state = { summary: { busyInfo: [{ runId: "run-1" }] }, expandedActivity: new Set() };
  const context = vm.createContext({ state, document: { createElement: node }, rowByN: new Map(),
    seatAvatarHTML: () => "avatar", seatLabel: x => x, esc: x => x, hhmm: () => "12:00", renderMD: x => x,
    t: () => "작업 과정 보기", hiddenEntry: () => false, dayOf: () => null,
    appendActivityRun: (parent, entries) => parent.appendChild({ className: "tool-run", entries }) });
  vm.runInContext(source.slice(source.indexOf("function isToolActivity("), source.indexOf("const INITIAL_ENTRY_LIMIT")), context);
  vm.runInContext("const actualEntryEl = entryEl; entryEl = e => e.meta?.publicSpeech ? actualEntryEl(e) : ({className:e.kind, text:e.text});", context);
  vm.runInContext(source.slice(source.indexOf("function appendEntryRange("), source.indexOf("function renderedStartIndex(")), context);
  const speech = { n: 1, kind: "activity", author: "codex", text: "확인하고 수정할게.", meta: { runId: "run-1", publicSpeech: true } };
  const entries = [speech, ...Array.from({ length: 12 }, (_, i) => ({ n: i + 2, kind: "activity", author: "codex", text: "tool", meta: { runId: "run-1" } })),
    { n: 14, kind: "agent", author: "codex", text: "완료" }];
  const active = node(); context.appendEntryRange(active, entries);
  assert.equal(active.children.length, 3);
  assert.match(active.children[0].className, /public-speech/);
  assert.match(active.children[0].innerHTML, /확인하고 수정할게/);
  assert.equal(active.children[1].className, "tool-run");
  state.summary.busyInfo = [];
  const completed = node(); context.appendEntryRange(completed, entries);
  assert.equal(completed.children.length, 2);
  assert.equal(completed.children[0].className, "completed-work");
  assert.equal(completed.children[0].open, false);
  assert.equal(completed.children[0].children.length, 14);
  assert.equal(completed.children[1].text, "완료");
  completed.children[0].open = true; completed.children[0].ontoggle();
  const reload = node(); context.appendEntryRange(reload, entries);
  assert.equal(reload.children[0].open, true);
  state.summary.busyInfo = [{ runId: "run-2" }];
  const nextRun = node(); context.appendEntryRange(nextRun, entries);
  assert.equal(nextRun.children[0].className, "completed-work");
  // A correction is still the same work even though it uses a new CLI call.
  state.summary.continuingRunIds = ["run-1"];
  const continuing = node(); context.appendEntryRange(continuing, entries);
  assert.match(continuing.children[0].className, /public-speech/);
  state.summary.continuingRunIds = [];
  const settled = node(); context.appendEntryRange(settled, entries);
  assert.equal(settled.children[0].className, "completed-work");
});
