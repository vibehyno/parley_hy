import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.env.npm_execpath;
if (!npm || !fs.existsSync(npm)) {
  console.error("설치 폴더에서 npm run setup 또는 setupParley.cmd를 실행하세요.");
  process.exit(1);
}
function runNpm(args) {
  const result = spawnSync(process.execPath, [npm, ...args], { cwd: repo, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || "전역 명령 등록 실패");
  return result.stdout.trim();
}
try {
  runNpm(["link", "--ignore-scripts", "--no-audit", "--no-fund"]);
  const prefix = runNpm(["prefix", "--global"]);
  if (process.platform === "win32") {
    // Never use setx: it can truncate PATH or expand unrelated environment values.
    const script = `
$ErrorActionPreference = 'Stop'
$target = $env:PARLEY_INSTALL_PREFIX
$existing = [Environment]::GetEnvironmentVariable('Path', 'User')
$parts = @($existing -split ';' | Where-Object { $_ -and $_.TrimEnd('\\') -ine $target.TrimEnd('\\') })
[Environment]::SetEnvironmentVariable('Path', (@($target) + $parts -join ';'), 'User')
`;
    const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const result = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-Command", "-"], {
      input: script, encoding: "utf8", windowsHide: true, env: { ...process.env, PARLEY_INSTALL_PREFIX: prefix },
    });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || "사용자 PATH 등록 실패");
    console.log(`전역 parley 명령 및 사용자 PATH 등록 완료: ${prefix}\n새 터미널에서 parley start로 실행하세요.\nPowerShell 실행 정책 오류 시 parley.cmd start를 사용하세요.`);
  } else {
    console.log(`전역 parley 명령 등록 완료: ${path.join(prefix, "bin")}\n이 경로가 PATH에 포함된 터미널에서 parley start로 실행하세요.`);
  }
} catch (error) {
  console.error(`설치 실패: ${error.message}`);
  process.exit(1);
}
