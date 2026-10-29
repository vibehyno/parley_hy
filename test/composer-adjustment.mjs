#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../ui/composer-adjustment.js", import.meta.url), "utf8");
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const api = context.globalThis.ParleyComposerAdjustment;

test("a message for the working seat becomes an addition to that work", () => {
  const summary = {
    seats: ["codex", "claude"],
    busyInfo: [{ agent: "codex", rootN: 41, sourceN: 44 }],
  };
  assert.equal(api.activeSource(summary, "codex"), 41);
  assert.equal(api.shouldStage({ summary, target: "codex", text: "검증 조건도 추가해줘" }), true);
});

test("a free seat message, slash command or attachment keeps the normal send path", () => {
  const summary = {
    seats: ["codex", "claude"],
    busyInfo: [{ agent: "codex", rootN: 41, sourceN: 44 }],
  };
  assert.equal(api.shouldStage({ summary, target: "claude", text: "별도 의견 줘" }), false);
  assert.equal(api.shouldStage({ summary, target: "codex", text: "/pair end" }), false);
  assert.equal(api.shouldStage({ summary, target: "codex", text: "이 파일도 봐줘", attachmentCount: 1 }), false);
});

test("pair work uses the shared root even when the selected target is the other seat", () => {
  const summary = {
    seats: ["codex", "claude"],
    workingPair: { worker: "codex", reviewer: "claude" },
    busyInfo: [{ agent: "codex", rootN: 88, sourceN: 88 }],
  };
  assert.equal(api.activeSource(summary, "claude"), 88);
});

test("delivery waits for the whole active exchange and resolves Auto from the working seats", () => {
  const active = {
    working: true,
    busyInfo: [{ agent: "codex", runId: "r1", rootN: 10 }],
  };
  const wait = api.waitSnapshot(active);
  assert.deepEqual(Array.from(wait.runIds), ["r1"]);
  assert.deepEqual(Array.from(wait.agents), ["codex"]);
  assert.equal(api.workFinished(active, wait.runIds), false);
  assert.equal(api.workFinished({ working: false, busyInfo: [] }, wait.runIds), true);
  assert.equal(api.resolvedTarget("auto", wait.agents, "claude"), "codex");
  assert.equal(api.resolvedTarget("auto", ["codex", "claude"], "codex"), "both");
  assert.equal(api.resolvedTarget("claude", wait.agents, "codex"), "claude");
});

test("the composer exposes a targetable auto-send card whose edit action restores the input", () => {
  const html = fs.readFileSync(new URL("../ui/index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
  const i18n = fs.readFileSync(new URL("../ui/i18n.js", import.meta.url), "utf8");
  assert.match(html, /id="adjustDraftTargets"/);
  assert.match(html, /id="adjustDraftPreview"/);
  assert.match(html, /id="adjustDraftEdit"/);
  assert.match(html, /id="adjustDraftDelete"/);
  assert.ok(html.indexOf("composer-adjustment.js") < html.indexOf("app.js"));
  assert.match(app, /mode:\s*"queue"/);
  assert.match(app, /api\("\/api\/ask", body\)/);
  assert.match(app, /ComposerAdjustment\.workFinished/);
  assert.match(app, /input\.value = draft\.text/);
  assert.doesNotMatch(app, /sendAdjustmentDraft[\s\S]{0,1800}mode:\s*"stop"/);
  assert.match(i18n, /"adjust\.edit": "편집"/);
  assert.match(i18n, /현재 진행 중인 작업이 끝난 후 자동으로 전달됩니다/);
});
