import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { claudeModelChoices, agyModelChoices, discoverCliModels } from "../lib/model-catalog.mjs";

test("CLI model labels and versions are preserved without guessing aliases", () => {
  assert.deepEqual(claudeModelChoices([{ value: "sonnet", displayName: "Sonnet 5.5", resolvedModel: "claude-sonnet-5-5" }]),
    [{ value: "sonnet", label: "Sonnet 5.5", resolvedModel: "claude-sonnet-5-5", hint: "claude-sonnet-5-5" }]);
  assert.deepEqual(agyModelChoices("Fetching available models...\ngemini-test\tGemini Test\n"), [{ value: "gemini-test", label: "Gemini Test", hint: "" }]);
});
test("Claude discovery sends control initialization only, suppresses helper windows and returns no account data", async () => {
  let killed = false;
  const models = await discoverCliModels("claude", { cmd: "claude", pre: [] }, ".", { spawnProcess: (cmd, args, options) => {
    assert.equal(options.windowsHide, true);
    assert.ok(args.includes("--no-session-persistence"));
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { killed = true; };
    child.stdin.on("data", data => {
      const req = JSON.parse(String(data));
      assert.equal(req.type, "control_request");
      assert.equal(req.request.subtype, "initialize");
      child.stdout.write(JSON.stringify({ type: "control_response", response: { request_id: req.request_id, response: { models: [{ value: "opus", displayName: "Opus version" }], account: { secret: "do not expose" } } } }) + "\n");
    });
    return child;
  } });
  assert.equal(models[0].label, "Opus version");
  assert.ok(killed);
  assert.ok(!JSON.stringify(models).includes("secret"));
});
