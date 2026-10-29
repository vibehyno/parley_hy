import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeFastMode, updateFastMode } from "../lib/fast-mode.mjs";

const server = fs.readFileSync(new URL("../parley.mjs", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
const i18n = fs.readFileSync(new URL("../ui/i18n.js", import.meta.url), "utf8");

test("fast mode lowers effort and restores the previous provider setting", () => {
  const enabled = updateFastMode({ effort: "high", fastMode: false }, true);
  assert.equal(enabled.changed, true);
  assert.equal(enabled.config.fastMode, true);
  assert.equal(enabled.config.effort, "low");
  assert.equal(enabled.config.fastPreviousEffort, "high");

  const disabled = updateFastMode(enabled.config, false);
  assert.equal(disabled.config.fastMode, false);
  assert.equal(disabled.config.effort, "high");
  assert.equal(disabled.config.fastPreviousEffort, null);
});

test("normalization keeps low effort while the preset is active", () => {
  assert.deepEqual(normalizeFastMode({ fastMode: true, effort: "max", model: "sample" }), {
    fastMode: true, effort: "low", model: "sample",
  });
});

test("all provider adapters receive effort and the seat pill owns the toggle", () => {
  assert.match(server, /args\.push\("--effort", cfg\.effort\)/);
  assert.match(server, /model_reasoning_effort=" \+ cfg\.effort/);
  assert.match(server, /POST \/api\/seat\/fast/);
  assert.match(app, /class="fast"/);
  assert.match(app, /\/api\/seat\/fast/);
  assert.match(i18n, /"seat\.fastEnabledTitle": "\{seat\} 빠른 응답 켜짐/);
});
