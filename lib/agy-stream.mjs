import { diagnosticText } from "./diagnostic-text.mjs";

function toolLabel(step) {
  const name = step.tool_name || step.tool_info?.name || "tool";
  const params = step.tool_info?.parameters || {};
  const detail = params.Path || params.path || params.file_path || params.CommandLine || params.command || "";
  return diagnosticText(`🔧 ${name}${typeof detail === "string" && detail ? ` · ${detail}` : ""}`).slice(0, 240);
}

// Only public agent_response steps are text. Thinking steps are status only.
export function createAgyStream({ onStream = () => {}, onActivity = () => {}, onProgress = () => {} } = {}) {
  const steps = new Map();
  let current = null, result = null;
  const published = new Set();
  const tools = new Set();
  function archiveCurrent() {
    if (current === null || published.has(current)) return;
    const text = steps.get(current)?.trim();
    if (text) { onActivity(text, { publicSpeech: true }); published.add(current); }
    onStream("");
  }
  return {
    accept(event) {
      if (event?.event === "init") onProgress({ kind: "connected" });
      if (event?.event === "step_update") {
        const step = event.step_update || {};
        if (step.step_type === "agent_response" && Number.isInteger(step.step_index)) {
          if (current !== step.step_index) { archiveCurrent(); current = step.step_index; }
          if (typeof step.text_delta === "string") {
            steps.set(current, (steps.get(current) || "") + step.text_delta);
            onStream(steps.get(current));
          }
        } else if (step.step_type && step.step_type !== "user_input") {
          archiveCurrent();
          // Do not forward unknown payloads or private reasoning to the UI.
          if (step.step_type === "tool" && (step.tool_name || step.tool_info?.name)) {
            const label = toolLabel(step);
            onProgress({ kind: "activity", text: label });
            if (Number.isInteger(step.step_index) && !tools.has(step.step_index)) {
              tools.add(step.step_index);
              onActivity(label);
            }
          } else onProgress({ kind: /think|reason/i.test(step.step_type) ? "reasoning" : "activity" });
        }
      }
      if (event?.event === "tool_use") {
        archiveCurrent();
        onProgress({ kind: "activity", text: String(event.name || event.tool || "Tool").slice(0, 100) });
      }
      if (event?.event === "thinking" || event?.event === "reasoning") onProgress({ kind: "reasoning" });
      if (event?.event === "result" && event.result) result = event.result;
    },
    get result() { return result; },
    finalText(response) {
      const last = current === null ? "" : (steps.get(current) || "").trim();
      const full = typeof response === "string" ? response : "";
      // Use an explicit final public step only if the provider result confirms
      // that it is the final suffix. Never guess/slice acknowledgements by words.
      return published.size && !published.has(current) && last && full.trim().endsWith(last) ? last : full;
    },
  };
}
