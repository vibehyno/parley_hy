#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const server = fs.readFileSync(new URL("../parley.mjs", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../ui/styles.css", import.meta.url), "utf8");
const i18n = fs.readFileSync(new URL("../ui/i18n.js", import.meta.url), "utf8");

test("provider progress is transient and never exposes raw reasoning text", () => {
  assert.match(server, /type: "progress", agent, runId: run\.runId, progress/);
  assert.match(server, /obj\.type === "turn\.started".*kind: "reasoning"/);
  assert.match(server, /item\.type === "reasoning"\) onProgress\(\{ kind: "reasoning" \}\)/);
  assert.doesNotMatch(server, /item\.type === "reasoning"[^\n]*item\.(?:text|summary)/);
  assert.match(server, /kind: "activity", text: label/);
  assert.match(server, /publish a short user-visible progress update at meaningful transitions/);
  assert.match(server, /Never reveal private chain-of-thought or hidden reasoning/);
  assert.match(server, /finish with one concise consolidated result covering changes, verification, and any remaining limitation/);
});

test("the live bubble renders real progress with a Korean honest fallback", () => {
  assert.match(app, /msg\.type === "progress"\) liveProgress/);
  assert.match(app, /live\.progress\.length > 4/);
  assert.match(app, /live-progress-slot/);
  assert.match(app, /progress\.preparing/);
  assert.match(css, /\.live-progress-list/);
  assert.match(i18n, /"progress\.preparing": "CLI에 요청 전달 완료/);
  assert.match(i18n, /"progress\.reasoning": "요청을 검토하고 다음 단계를 판단하는 중"/);
});
