#!/usr/bin/env node
/** Opt-in real AGY adapter check. Uses the current subscription login. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.PARLEY_LIVE_AGY !== "1") {
  console.error("Set PARLEY_LIVE_AGY=1 to authorize real AGY calls.");
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.join(here, "..", "parley.mjs");
const fake = path.join(here, "fake-cli.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "parley-live-agy-"));
const proc = spawn(process.execPath, [serverFile, "--no-open", "--port", "0", "--root", root], {
  stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let log = "";
proc.stdout.on("data", (chunk) => { log += chunk.toString(); });
proc.stderr.on("data", (chunk) => { log += chunk.toString(); });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let base = "";
  const until = Date.now() + 15_000;
  while (!base && Date.now() < until) {
    base = /UI:\s+(http:\/\/127\.0\.0\.1:\d+)/.exec(log)?.[1] || "";
    if (!base) await sleep(50);
  }
  if (!base) throw new Error(`server did not start: ${log.slice(-500)}`);
  const page = await fetch(base + "/").then((res) => res.text());
  const token = /name="parley-token" content="([^"]+)"/.exec(page)?.[1] || "";
  const protocol = /name="parley-runtime-protocol" content="([^"]+)"/.exec(page)?.[1] || "";
  async function api(route, body) {
    const res = await fetch(base + route, body === undefined ? {
      headers: { "X-Parley-Token": token, "X-Parley-Runtime-Protocol": protocol },
    } : {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Parley-Token": token, "X-Parley-Runtime-Protocol": protocol },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  async function idle() {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const data = await api("/api/room?name=live-agy");
      if (!data.room.busy.length && !data.room.queued && !data.room.working) return data;
      await sleep(250);
    }
    throw new Error("timed out waiting for AGY");
  }
  const lastAgy = (data) => [...data.entries].reverse().find((entry) => entry.kind === "agent" && entry.author === "agy");

  await api("/api/rooms", {
    name: "live-agy",
    seats: [{ id: "agy", provider: "gemini" }, { id: "codex", provider: "codex" }],
  });
  await api("/api/config", {
    room: "live-agy",
    config: {
      hopBudget: 0, timeoutMs: 180_000,
      agents: {
        agy: { command: "agy", model: "gemini-3.8-flash-low", effort: "low", approvalMode: "auto", lurk: false },
        codex: { command: fake, lurk: false },
      },
    },
  });

  await api("/api/message", { room: "live-agy", target: "agy", text: "Reply only LIVE_ONE." });
  const first = await idle();
  const firstRef = first.room.agents.agy.sessionRef;
  if (!lastAgy(first)?.text.includes("LIVE_ONE") || !firstRef) throw new Error("fresh Talk turn did not link an AGY session");

  await api("/api/message", { room: "live-agy", target: "agy", text: "Reply only LIVE_TWO." });
  const second = await idle();
  if (!lastAgy(second)?.text.includes("LIVE_TWO") || second.room.agents.agy.sessionRef !== firstRef) {
    throw new Error("Talk resume did not keep the same AGY conversation");
  }

  await api("/api/config", { room: "live-agy", config: { mode: "work" } });
  await api("/api/message", {
    room: "live-agy", target: "agy",
    text: "Create agy-work-proof.txt in the current workspace with exactly AGY_WORK_OK, then reply only WORK_OK.",
  });
  const work = await idle();
  if (!lastAgy(work)?.text.includes("WORK_OK")) throw new Error("Work turn failed");
  const proofFile = path.join(root, "live-agy", "workspace", "agy-work-proof.txt");
  if (!fs.existsSync(proofFile) || fs.readFileSync(proofFile, "utf8").trim() !== "AGY_WORK_OK") {
    throw new Error("Work turn did not prove sandboxed file editing");
  }
  console.log(JSON.stringify({
    talkFresh: true,
    talkResumeSameConversation: true,
    workAcceptEdits: true,
    talkTokens: [lastAgy(first)?.meta?.tokens || null, lastAgy(second)?.meta?.tokens || null],
    workTokens: lastAgy(work)?.meta?.tokens || null,
  }));
} finally {
  try { proc.kill(); } catch { /* already stopped */ }
  await Promise.race([new Promise((resolve) => proc.once("close", resolve)), sleep(2000)]);
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
}
