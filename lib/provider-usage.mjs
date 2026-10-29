import { spawn } from "node:child_process";

function run(spec, args, { cwd, input = "", timeoutMs = 25_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!spec || spec.error) return reject(new Error(spec?.error || "command unavailable"));
    let child;
    try {
      child = spawn(spec.cmd, [...(spec.pre || []), ...args], {
        cwd, env: process.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) { reject(error); return; }
    let stdout = "", stderr = "", settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* already gone */ }
      finish(new Error("usage lookup timed out"));
    }, timeoutMs);
    child.once("error", (error) => finish(error));
    child.stdout.on("data", (chunk) => { if (stdout.length < 2_000_000) stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { if (stderr.length < 200_000) stderr += chunk.toString("utf8"); });
    child.once("close", (code) => {
      if (settled) return;
      if (code !== 0) finish(new Error((stderr || stdout || `usage command exited ${code}`).trim()));
      else finish(null, { stdout, stderr });
    });
    child.stdin.end(input);
  });
}

function windowLabel(window, fallback) {
  const mins = Number(window?.windowDurationMins);
  if (mins === 300) return "5시간 한도";
  if (mins === 1_440) return "일간 한도";
  if (mins === 10_080) return "주간 한도";
  return mins > 0 ? `${mins}분 한도` : fallback;
}

export function parseCodexRateLimits(result) {
  const source = result?.rateLimitsByLimitId && Object.keys(result.rateLimitsByLimitId).length
    ? Object.values(result.rateLimitsByLimitId) : [result?.rateLimits].filter(Boolean);
  const windows = [];
  for (const snapshot of source) {
    for (const [kind, window] of [["primary", snapshot?.primary], ["secondary", snapshot?.secondary]]) {
      if (!window || !Number.isFinite(Number(window.usedPercent))) continue;
      const usedPercent = Math.max(0, Math.min(100, Number(window.usedPercent)));
      windows.push({
        id: `${snapshot.limitId || "codex"}:${kind}`,
        group: snapshot.limitName || "Codex",
        label: windowLabel(window, kind === "primary" ? "기본 한도" : "추가 한도"),
        usedPercent,
        remainingPercent: 100 - usedPercent,
        windowDurationMins: Number(window.windowDurationMins) || null,
        resetsAt: Number(window.resetsAt) || null,
      });
    }
  }
  return {
    windows,
    stats: [],
    plan: result?.rateLimits?.planType || source[0]?.planType || null,
    ordinaryUsageAllowed: result?.ordinaryUsageAllowed ?? null,
    source: "Codex CLI app-server",
  };
}

export function parseClaudeUsage(stdout) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  let payload = null;
  for (const line of lines.reverse()) {
    try { payload = JSON.parse(line); break; } catch { /* keep looking */ }
  }
  const text = String(payload?.result || stdout || "");
  const windows = [];
  const quotaPattern = /^Current\s+(session|week(?:\s+\(all models\))?):\s+(\d+(?:\.\d+)?)%\s+used(?:\s+[·-]\s+resets\s+(.+))?$/gim;
  for (const match of text.matchAll(quotaPattern)) {
    const kind = match[1].toLowerCase().startsWith("session") ? "session" : "week";
    const usedPercent = Math.max(0, Math.min(100, Number(match[2])));
    windows.push({
      id: `claude:${kind}`,
      group: "Claude",
      label: kind === "session" ? "Current session" : "Current week (all models)",
      usedPercent,
      remainingPercent: 100 - usedPercent,
      windowDurationMins: kind === "week" ? 10_080 : 300,
      resetsAt: null,
      resetLabel: match[3]?.trim() || "",
    });
  }
  const stats = [];
  for (const [period, label] of [["24h", "최근 24시간"], ["7d", "최근 7일"]]) {
    const match = new RegExp(`Last\\s+${period}\\s+[·-]\\s+([\\d,]+)\\s+requests\\s+[·-]\\s+([\\d,]+)\\s+sessions`, "i").exec(text);
    if (match) stats.push({ id: period, label, requests: Number(match[1].replaceAll(",", "")), sessions: Number(match[2].replaceAll(",", "")) });
  }
  if (!windows.length && !stats.length) throw new Error("Claude CLI가 사용량 정보를 반환하지 않았어");
  return { windows, stats, source: "Claude CLI /usage", zeroTokenLookup: payload?.usage?.input_tokens === 0 && payload?.usage?.output_tokens === 0 };
}

export function parseAgyUsage(stdout) {
  const windows = [];
  for (const raw of String(stdout || "").split(/\r?\n/)) {
    const [group, label, percent, reset] = raw.trim().split("\t");
    const remainingPercent = Number(String(percent || "").replace("%", ""));
    if (!group || !label || !Number.isFinite(remainingPercent)) continue;
    windows.push({
      id: `${group}:${label}`,
      group,
      label,
      remainingPercent: Math.max(0, Math.min(100, remainingPercent)),
      usedPercent: 100 - Math.max(0, Math.min(100, remainingPercent)),
      windowDurationMins: /five hour/i.test(label) ? 300 : /weekly/i.test(label) ? 10_080 : null,
      resetsAt: reset || null,
    });
  }
  if (!windows.length) throw new Error("AGY CLI가 사용량 한도를 반환하지 않았어");
  return { windows, stats: [], source: "AGY CLI /usage" };
}

function codexRateLimits(spec, cwd) {
  return new Promise((resolve, reject) => {
    if (!spec || spec.error) { reject(new Error(spec?.error || "Codex command unavailable")); return; }
    let child;
    try {
      child = spawn(spec.cmd, [...(spec.pre || []), "app-server"], {
        cwd, env: process.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) { reject(error); return; }
    let buffer = "", stderr = "", settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      try { child.kill(); } catch { /* already gone */ }
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error("Codex usage lookup timed out")), 20_000);
    child.once("error", (error) => finish(error));
    child.stderr.on("data", (chunk) => { if (stderr.length < 200_000) stderr += chunk.toString("utf8"); });
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      for (;;) {
        const newline = buffer.indexOf("\n");
        if (newline < 0) break;
        const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
        if (!line.startsWith("{")) continue;
        let message; try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 1) {
          child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");
          child.stdin.write(JSON.stringify({ id: 2, method: "account/rateLimits/read", params: { excludeResetCreditDetails: true } }) + "\n");
        } else if (message.id === 2) {
          if (message.error) finish(new Error(message.error.message || "Codex usage lookup failed"));
          else finish(null, parseCodexRateLimits(message.result));
        }
      }
    });
    child.once("close", (code) => {
      if (!settled) finish(new Error((stderr || `Codex app-server exited ${code}`).trim()));
    });
    child.stdin.write(JSON.stringify({ id: 1, method: "initialize", params: { clientInfo: { name: "parley-hy", version: "1.3.6" } } }) + "\n");
  });
}

export async function readProviderUsage(provider, { spec, cwd } = {}) {
  const checkedAt = new Date().toISOString();
  if (provider === "codex") return { provider, checkedAt, ...(await codexRateLimits(spec, cwd)) };
  if (provider === "claude") {
    const result = await run(spec, ["-p", "/usage", "--output-format", "json"], { cwd });
    return { provider, checkedAt, ...parseClaudeUsage(result.stdout) };
  }
  if (provider === "gemini") {
    const result = await run(spec, ["--print", "/usage", "--print-timeout", "20s"], { cwd, timeoutMs: 25_000 });
    return { provider, checkedAt, ...parseAgyUsage(result.stdout) };
  }
  throw new Error(`unsupported usage provider: ${provider}`);
}
