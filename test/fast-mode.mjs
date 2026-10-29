import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeFastMode, updateFastMode } from "../lib/fast-mode.mjs";

const server = fs.readFileSync(new URL("../parley.mjs", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
const i18n = fs.readFileSync(new URL("../ui/i18n.js", import.meta.url), "utf8");

test("fast mode never rewrites reasoning effort", () => {
  const enabled = updateFastMode({ effort: "high", fastMode: false }, true);
  assert.equal(enabled.changed, true);
  assert.equal(enabled.config.fastMode, true);
  assert.equal(enabled.config.effort, "high");
  assert.equal("fastPreviousEffort" in enabled.config, false);

  const disabled = updateFastMode(enabled.config, false);
  assert.equal(disabled.config.fastMode, false);
  assert.equal(disabled.config.effort, "high");
  assert.equal("fastPreviousEffort" in disabled.config, false);
});

test("normalization restores the pre-1.3.8 effort preset", () => {
  assert.deepEqual(normalizeFastMode({
    fastMode: true, effort: "low", fastPreviousEffort: "max", model: "sample",
  }), {
    fastMode: true, effort: "max", model: "sample",
  });
});

test("only providers with a verified native transport expose the toggle", () => {
  assert.match(server, /fastMode: "claude-settings"/);
  assert.match(server, /fastMode: "codex-service-tier"/);
  assert.doesNotMatch(server, /fastMode: "agy/);
  assert.match(server, /JSON\.stringify\(\{ fastMode: !!cfg\.fastMode \}\)/);
  assert.match(server, /POST \/api\/seat\/fast/);
  assert.match(app, /fastModeSupported \? `<button class="fast"/);
  assert.match(app, /\/api\/seat\/fast/);
  assert.match(i18n, /"seat\.fastEnabledTitle": "\{seat\} Fast 끄기"/);
  assert.match(i18n, /"seat\.fastWarningCodex": "주의: Fast는 보통 크레딧 2\.5배/);
  assert.match(i18n, /"seat\.fastWarningClaude": "주의: Fast는 별도 Usage Credits/);
  assert.doesNotMatch(i18n, /fast response[^\n]*reasoning effort is low/i);
});
