import assert from "node:assert/strict";
import test from "node:test";
import { codexTurnUsage } from "../lib/codex-usage.mjs";

test("live recorded cumulative outputs become per-call counts", () => {
  let previous;
  const actual = [];
  for (const [index, output] of [160, 285, 405, 513].entries()) {
    const result = codexTurnUsage({ output_tokens: output }, { sessionRef: "thread", resumed: index > 0, previous });
    actual.push(result.usage.out);
    previous = result.baseline;
  }
  assert.deepEqual(actual, [160, 125, 120, 108]);
});

test("legacy resumes, missing fields and counter resets do not invent usage", () => {
  assert.equal(codexTurnUsage({ output_tokens: 900 }, { sessionRef: "old", resumed: true }).usage, null);
  assert.equal(codexTurnUsage({ output_tokens: 900 }, { sessionRef: "new", resumed: true, previous: { sessionRef: "old", out: 10 } }).usage, null);
  assert.equal(codexTurnUsage({ output_tokens: 5 }, { sessionRef: "old", resumed: true, previous: { sessionRef: "old", out: 900 } }).usage, null);
  assert.equal(codexTurnUsage(null, { sessionRef: "old" }).baseline, null);
  assert.deepEqual(codexTurnUsage({ output_tokens: 10 }, { sessionRef: "new", previous: { sessionRef: "old", out: 900 } }).usage, { out: 10 });
});
