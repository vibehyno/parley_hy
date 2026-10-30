import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { agyEffortArgs } from "../lib/agy-model-options.mjs";

test("explicit Gemini variants cannot conflict with saved effort; base models keep effort", () => {
  assert.deepEqual(agyEffortArgs("gemini-3.8-flash-medium", "high"), []);
  assert.deepEqual(agyEffortArgs("gemini-3.8-flash-high", "high"), []);
  assert.deepEqual(agyEffortArgs("gemini-3.8-flash", "high"), ["--effort", "high"]);
  assert.deepEqual(agyEffortArgs("custom-model", "medium"), ["--effort", "medium"]);
  assert.deepEqual(agyEffortArgs(null, null), []);
});

test("AGY settings lock to the selected variant, then unlock for a base model", () => {
  const source = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
  const toggle = {};
  const combo = { querySelector: () => toggle };
  const model = { value: "gemini-3.8-flash-medium" };
  const effort = { value: "high", disabled: false, closest: () => combo };
  const item = { id: "gemini", provider: "gemini" };
  const context = vm.createContext({ settingsSeatDraft: [item],
    document: { querySelector: selector => selector.includes('data-f="model"') ? model : effort },
    tr: (_key, fallback) => fallback, setFreeComboOpen: () => {} });
  vm.runInContext(source.slice(source.indexOf("function syncAgyEffort("), source.indexOf('$("seatCards").addEventListener("keydown"')), context);
  context.syncAgyEffort("gemini");
  assert.equal(effort.value, "medium");
  assert.equal(effort.disabled, true);
  assert.equal(toggle.disabled, true);
  model.value = "gemini-3.8-flash-high";
  context.syncAgyEffort("gemini");
  assert.equal(effort.value, "high");
  model.value = "gemini-3.8-flash";
  context.syncAgyEffort("gemini");
  assert.equal(effort.disabled, false);
  assert.equal(toggle.disabled, false);
  assert.equal(effort.value, "");
  item.provider = "claude";
  model.value = "gemini-3.8-flash-medium";
  context.syncAgyEffort("gemini");
  assert.equal(effort.disabled, false);
});
