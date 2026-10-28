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

test("the composer exposes an editable non-stopping current-work card", () => {
  const html = fs.readFileSync(new URL("../ui/index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
  const i18n = fs.readFileSync(new URL("../ui/i18n.js", import.meta.url), "utf8");
  assert.match(html, /id="adjustDraftText"/);
  assert.match(html, /id="adjustDraftDelete"/);
  assert.match(html, /id="adjustDraftSend"/);
  assert.ok(html.indexOf("composer-adjustment.js") < html.indexOf("app.js"));
  assert.match(app, /mode:\s*"queue"/);
  assert.match(app, /api\("\/api\/ask", body\)/);
  assert.doesNotMatch(app, /sendAdjustmentDraft[\s\S]{0,1800}mode:\s*"stop"/);
  assert.match(i18n, /"adjust\.send": "현재 작업에 추가"/);
  assert.match(i18n, /진행 중인 응답은 중지하지 않아요/);
});
