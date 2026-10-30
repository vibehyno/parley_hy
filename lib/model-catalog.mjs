import { spawn } from "node:child_process";

export function claudeModelChoices(models) {
  return (models || []).filter(m => typeof m.value === "string").map(m => ({
    value: m.value, label: m.displayName || m.value,
    ...(m.resolvedModel ? { resolvedModel: m.resolvedModel } : {}),
    hint: [m.resolvedModel, m.description].filter(Boolean).join(" · "),
  }));
}
export function agyModelChoices(text) {
  return String(text).split(/\r?\n/).map(line => line.split("\t")).filter(parts => parts.length >= 2 && /^[\w.-]+$/.test(parts[0]))
    .map(([value, label]) => ({ value, label: label.trim(), hint: "" }));
}
// Control initialization/model listing only: no user prompt or model generation.
export function discoverCliModels(provider, spec, cwd, { spawnProcess = spawn, timeoutMs = 20000 } = {}) {
  if (spec.error) return Promise.resolve([]);
  return new Promise(resolve => {
    let child, buffer = "", output = "", done = false, timer;
    const finish = models => {
      if (done) return;
      done = true; clearTimeout(timer);
      child?.kill(); resolve(models);
    };
    const args = provider === "claude"
      ? ["--print", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--strict-mcp-config"]
      : ["models"];
    try { child = spawnProcess(spec.cmd, [...spec.pre, ...args], { cwd, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }); }
    catch { finish([]); return; }
    timer = setTimeout(() => finish([]), timeoutMs);
    child.on("error", () => finish([]));
    child.stdin.on("error", () => finish([]));
    child.stderr.on("data", () => {});
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", chunk => {
      output += chunk;
      if (output.length > 2_000_000) { finish([]); return; }
      if (provider !== "claude") return;
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try {
          const event = JSON.parse(line);
          if (event.type === "control_response" && event.response?.request_id === "parley-model-list") {
            finish(claudeModelChoices(event.response?.response?.models));
          }
        } catch { /* non-JSON diagnostics */ }
      }
    });
    child.on("close", code => finish(provider === "gemini" && code === 0 ? agyModelChoices(output) : []));
    if (provider === "claude") child.stdin.write(JSON.stringify({ type: "control_request", request_id: "parley-model-list", request: { subtype: "initialize" } }) + "\n");
    else child.stdin.end();
  });
}
