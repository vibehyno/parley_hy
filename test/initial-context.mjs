import test from "node:test";
import assert from "node:assert/strict";
import { initialContext } from "../lib/initial-context.mjs";
test("first participation includes a bounded chronological suffix with an honest receipt start", () => {
  const entries = Array.from({ length: 584 }, (_, i) => ({ n: i + 1, text: "a".repeat(290) }));
  const snapshot = JSON.stringify(entries);
  const selected = initialContext(entries, { cursor: 0, sessionRef: null, rootN: 601 });
  assert.ok(selected.entries.reduce((sum, e) => sum + e.text.length + 160, 0) <= 16000);
  assert.equal(selected.entries.at(-1).n, 584);
  assert.equal(selected.from, selected.entries[0].n - 1);
  assert.equal(selected.omitted + selected.entries.length, 584);
  assert.equal(JSON.stringify(entries), snapshot);
});
test("existing sessions, held work and historical-root retries are not silently truncated", () => {
  const entries = Array.from({ length: 50 }, (_, i) => ({ n: i + 1, text: "x" }));
  for (const opts of [{ cursor: 1 }, { cursor: 0, sessionRef: "saved" }, { cursor: 0, held: true }, { cursor: 0, rootN: 2 }]) {
    assert.equal(initialContext(entries, { rootN: 80, ...opts }).entries, entries);
  }
});
test("oversized historical entry is omitted whole, never falsely receipted", () => {
  const selected = initialContext([{ n: 4, text: "x".repeat(20000) }], { cursor: 0, rootN: 5 });
  assert.deepEqual(selected.entries, []);
  assert.equal(selected.from, 4);
});
