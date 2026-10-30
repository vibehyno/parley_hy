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
