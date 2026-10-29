import assert from "node:assert/strict";
import test from "node:test";
import { parseAgyUsage, parseClaudeUsage, parseCodexRateLimits } from "../lib/provider-usage.mjs";

test("normalizes Codex percentage windows without exposing account metadata", () => {
  const parsed = parseCodexRateLimits({ ordinaryUsageAllowed: true, rateLimits: {
    limitId: "codex", planType: "pro", primary: { usedPercent: 32, windowDurationMins: 10080, resetsAt: 1793774164 },
    secondary: { usedPercent: 10, windowDurationMins: 300, resetsAt: 1793258998 },
  }});
  assert.deepEqual(parsed.windows.map((item) => [item.label, item.remainingPercent]), [["주간 한도", 68], ["5시간 한도", 90]]);
  assert.equal(parsed.ordinaryUsageAllowed, true);
  assert.equal("accountId" in parsed, false);
});

test("parses Claude account limits and zero-token local usage statistics", () => {
  const stdout = JSON.stringify({ usage: { input_tokens: 0, output_tokens: 0 }, result:
    "Current session: 62% used · resets Oct 29, 1:49pm (Asia/Seoul)\nCurrent week (all models): 10% used · resets Nov 1, 11:59am (Asia/Seoul)\n\nLast 24h · 103 requests · 6 sessions\nLast 7d · 186 requests · 10 sessions" });
  const parsed = parseClaudeUsage(stdout);
  assert.deepEqual(parsed.windows.map((item) => [item.id, item.remainingPercent]), [["claude:session", 38], ["claude:week", 90]]);
  assert.equal(parsed.windows[0].resetLabel, "Oct 29, 1:49pm (Asia/Seoul)");
  assert.deepEqual(parsed.stats.map((item) => [item.requests, item.sessions]), [[103, 6], [186, 10]]);
  assert.equal(parsed.zeroTokenLookup, true);
});

test("parses AGY remaining percentages and reset timestamps", () => {
  const parsed = parseAgyUsage("Gemini Models\tWeekly Limit Remaining\t74%\t2026-11-04T01:14:22Z\n");
  assert.equal(parsed.windows[0].remainingPercent, 74);
  assert.equal(parsed.windows[0].usedPercent, 26);
  assert.equal(parsed.windows[0].windowDurationMins, 10080);
});
