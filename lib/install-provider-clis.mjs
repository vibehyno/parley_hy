import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const NPM_CLIS = ["@openai/codex@latest", "@anthropic-ai/claude-code@latest"];
// AGY distributes a native CLI, not an official npm CLI package.
export async function installProviderClis(runNpm, { platform = process.platform, fetcher = fetch, run = spawnSync, log = console.log } = {}) {
  for (const pkg of NPM_CLIS) {
    log(`CLI 최신 버전 설치: ${pkg}`);
    runNpm(["install", "--global", pkg, "--no-audit", "--no-fund"]);
  }
  log("AGY 최신 버전 설치: Google 공식 설치기");
  const windows = platform === "win32";
  const extension = windows ? "ps1" : "sh";
  const response = await fetcher(`https://antigravity.google/cli/install.${extension}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`AGY 설치기 다운로드 실패 (${response.status})`);
  const script = await response.text();
  if (!script.trim() || script.length > 2_000_000 || /^\s*<!doctype html/i.test(script)) throw new Error("AGY 설치기 응답이 올바르지 않습니다.");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "moyeo-cli-install-"));
  const file = path.join(directory, `install.${extension}`);
  try {
    fs.writeFileSync(file, script);
    const executable = windows ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "bash";
    const args = windows ? ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file] : [file];
    const result = run(executable, args, { stdio: "inherit", windowsHide: true, timeout: 300000 });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || `AGY 설치 실패 (${result.status})`);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  log("CLI 설치 완료. 새 터미널에서 codex, claude, agy를 각각 실행하여 로그인하세요.");
}
