// AGY rejects --effort when it conflicts with an explicit Gemini variant.
// Keep the selected variant authoritative, including for older saved settings.
export function agyEffortArgs(model, effort) {
  if (/^gemini-.+-(low|medium|high|xhigh|max)$/i.test(String(model || "").trim())) return [];
  return effort ? ["--effort", effort] : [];
}
