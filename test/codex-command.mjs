import assert from "node:assert/strict";
import test from "node:test";
import { buildCodexInvocationArgs } from "../lib/codex-command.mjs";

test("fresh Codex calls receive the configured sandbox", () => {
  assert.deepEqual(buildCodexInvocationArgs({
    sandbox: "danger-full-access",
    cwd: "C:\\project",
  }), ["-c", 'service_tier="default"', "--sandbox", "danger-full-access", "exec", "-C", "C:\\project"]);
});

test("Codex Fast mode uses the native service tier without changing effort", () => {
  assert.deepEqual(buildCodexInvocationArgs({
    sandbox: "workspace-write",
    fastMode: true,
    cwd: "C:\\project",
  }), ["-c", 'service_tier="fast"', "--sandbox", "workspace-write", "exec", "-C", "C:\\project"]);
});

test("resumed Codex calls repeat the configured sandbox", () => {
  assert.deepEqual(buildCodexInvocationArgs({
    sandbox: "danger-full-access",
    sessionRef: "thread-123",
    cwd: "C:\\project",
  }), ["-c", 'service_tier="default"', "--sandbox", "danger-full-access", "exec", "resume", "thread-123"]);
});

test("resume keeps disposable input access in the global option section", () => {
  assert.deepEqual(buildCodexInvocationArgs({
    sandbox: "workspace-write",
    inputDir: "C:\\staged-input",
    sessionRef: "--last",
    cwd: "C:\\project",
  }), [
    "-c", 'service_tier="default"',
    "--sandbox", "workspace-write",
    "--add-dir", "C:\\staged-input",
    "exec", "resume", "--last",
  ]);
});
