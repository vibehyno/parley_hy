// codex exec's turn.completed usage is cumulative for the native thread.
// Unknown resumed baselines must not be presented as one response's usage.
export function codexTurnUsage(raw, { sessionRef, resumed = false, previous } = {}) {
  if (!raw || !sessionRef || sessionRef === "--last") return { usage: null, baseline: null };
  const fields = { in: "input_tokens", out: "output_tokens", reasoning: "reasoning_output_tokens", cacheRead: "cached_input_tokens" };
  const totals = Object.fromEntries(Object.entries(fields)
    .filter(([, field]) => Number.isFinite(raw[field]) && raw[field] >= 0)
    .map(([key, field]) => [key, raw[field]]));
  const baseline = { sessionRef, ...totals };
  const known = previous?.sessionRef === sessionRef;
  const usage = {};
  for (const [key, value] of Object.entries(totals)) {
    if (!resumed) usage[key] = value;
    else if (known && Number.isFinite(previous[key]) && value >= previous[key]) usage[key] = value - previous[key];
  }
  return { usage: Object.keys(usage).length ? usage : null, baseline };
}
