import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticText } from "../lib/diagnostic-text.mjs";
import "../ui/seat-errors.js";
const { latestSeatError } = globalThis.ParleySeatErrors;
test("later success clears only that seat's historical warning; a new error appears again", () => {
  const error = (n, agent) => ({ n, kind: "system", text: "failed", meta: { agent, error: true } });
  const entries = [error(1, "codex"), error(2, "claude"), { n: 3, kind: "agent", author: "claude" }];
  assert.equal(latestSeatError(entries, "claude"), null);
  assert.equal(latestSeatError(entries, "codex").id, 1);
  entries.push(error(4, "claude"));
  assert.equal(latestSeatError(entries, "claude").id, 4);
  for (const outcome of ["text", "pass", "empty"]) {
    assert.equal(latestSeatError(entries, "claude", {}, null,
      [{ agent: "claude", outcome, recordedAfterN: 4 }]), null);
  }
  for (const outcome of ["failed", "stopped", "capped"]) {
    assert.equal(latestSeatError(entries, "claude", {}, null,
      [{ agent: "claude", outcome, recordedAfterN: 4 }]).id, 4);
  }
  assert.equal(latestSeatError(entries, "claude", {}, { ok: false, detail: "missing CLI" }).id, "command");
});

test("error popup closes on pointer exit even after clicking, with keyboard/touch dismissal", () => {
  const handlers = {}, docHandlers = {}, classes = new Set();
  let expanded;
  const button = { setAttribute: (_key, value) => { expanded = value; } };
  const box = {
    classList: { contains: x => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
    querySelector: () => button, contains: node => node === target || node === detail,
  };
  const target = { closest: () => box, matches: () => true };
  const detail = { closest: selector => selector === ".seat-error" ? box : null };
  const container = { addEventListener: (name, fn) => { handlers[name] = fn; },
    querySelectorAll: () => classes.has("open") ? [box] : [],
    ownerDocument: { addEventListener: (name, fn) => { docHandlers[name] = fn; } } };
  globalThis.ParleySeatErrors.bindPopovers(container);
  handlers.pointerover({ target, pointerType: "mouse" });
  handlers.click({ target, pointerType: "mouse" });
  assert.equal(expanded, "true");
  handlers.pointerout({ target, relatedTarget: detail });
  assert.equal(expanded, "true", "details remain reachable for scrolling");
  handlers.pointerout({ target: detail, relatedTarget: null });
  assert.equal(expanded, "false");
  handlers.focusin({ target });
  assert.equal(expanded, "true");
  docHandlers.keydown({ key: "Escape" });
  assert.equal(expanded, "false");
  handlers.click({ target, pointerType: "touch" });
  assert.equal(expanded, "true");
  docHandlers.pointerdown({ target: { closest: () => null } });
  assert.equal(expanded, "false");
});
test("seat badge shows full captured error, excludes stops and disappears for resolved error", () => {
  const entries = [{ n: 1, text: "short", meta: { agent: "gemini", error: true, technicalError: "full\n".repeat(100) } },
    { n: 2, text: "stopped", meta: { agent: "gemini", stopped: true } }];
  assert.equal(latestSeatError(entries, "gemini").text, entries[0].meta.technicalError);
  assert.equal(latestSeatError(entries, "claude"), null);
  assert.equal(latestSeatError(entries, "gemini", { 1: {} }), null);
});
test("diagnostics mask credential fields and bearer tokens", () => {
  const text = diagnosticText('error\nAuthorization: Bearer super-secret\napi_key="private"');
  assert.ok(!text.includes("super-secret"));
  assert.ok(!text.includes("private"));
  assert.ok(text.includes("error"));
});


test("dismissal survives reload, stays room/seat scoped and allows a new occurrence", () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  const error = { id: 3, ts: "2026-11-02T00:36:16Z", text: "auth failed" };
  const { createDismissals } = globalThis.ParleySeatErrors;
  createDismissals(storage).dismiss("room", "claude", error);
  const restored = createDismissals(storage);
  assert.equal(restored.has("room", "claude", error), true);
  assert.equal(restored.has("other", "claude", error), false);
  assert.equal(restored.has("room", "codex", error), false);
  assert.equal(restored.has("room", "claude", { ...error, id: 4 }), false);
  assert.equal(restored.has("room", "claude", { ...error, ts: "2026-11-03T00:36:16Z" }), false);
  assert.equal(restored.has("room", "claude", null), false);
});

test("timestamp comes from the error event; disabled storage still allows dismissal", () => {
  const entry = { n: 3, ts: "2026-11-02T00:36:16Z", text: "failed", meta: { agent: "claude", error: true } };
  const error = latestSeatError([entry], "claude");
  assert.equal(error.ts, entry.ts);
  const store = globalThis.ParleySeatErrors.createDismissals({
    getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); },
  });
  store.dismiss("room", "claude", error);
  assert.equal(store.has("room", "claude", error), true);
});
