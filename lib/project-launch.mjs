import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function projectLaunchSpec(target, application, { platform = process.platform, env = process.env, exists = fs.existsSync, readText = (file) => fs.readFileSync(file, "utf8"), executable = null } = {}) {
  if (application === "cmd") {
    if (platform !== "win32") throw Object.assign(new Error("CMD 열기는 Windows에서만 지원합니다."), { status: 400 });
    if (target.startsWith("\\\\")) throw Object.assign(new Error("CMD는 네트워크 UNC 경로를 작업 폴더로 사용할 수 없습니다. 드라이브로 연결한 경로를 사용하세요."), { status: 400 });
    const command = path.win32.join(env.SystemRoot || "C:\\Windows", "System32", "cmd.exe");
    // START creates the interactive console with its own input handles. A
    // detached CMD inheriting the server's ignored stdin can close immediately.
    // The shell command is constant: the project path only travels through cwd.
    return { command, args: ["/d", "/s", "/c", 'start "" "%COMSPEC%" /d /k'],
      options: { cwd: target, windowsHide: true, windowsVerbatimArguments: true, env: { ...env, COMSPEC: command } } };
  }
  if (application !== "vscode") throw Object.assign(new Error("지원하지 않는 프로젝트 실행 도구입니다."), { status: 400 });
  const cleanEnv = { ...env };
  delete cleanEnv.ELECTRON_RUN_AS_NODE;
  delete cleanEnv.VSCODE_DEV;
  delete cleanEnv.VSCODE_CWD;
  delete cleanEnv.VSCODE_IPC_HOOK_CLI;
  if (platform !== "win32") return { command: "code", args: ["--new-window", target], options: { cwd: target, env: cleanEnv } };
  const candidates = [
    executable,
    env.LOCALAPPDATA && path.win32.join(env.LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe"),
    env.ProgramFiles && path.win32.join(env.ProgramFiles, "Microsoft VS Code", "Code.exe"),
    env["ProgramFiles(x86)"] && path.win32.join(env["ProgramFiles(x86)"], "Microsoft VS Code", "Code.exe"),
  ];
  for (const dir of (env.PATH || env.Path || "").split(";").filter(Boolean)) {
    const folder = dir.replace(/^"|"$/g, "");
    candidates.push(path.win32.join(folder, "Code.exe"));
    if (path.win32.basename(folder).toLowerCase() === "bin") candidates.push(path.win32.join(folder, "..", "Code.exe"));
  }
  const command = candidates.find((file) => file && /^(?:Code|Code - Insiders)\.exe$/i.test(path.win32.basename(file)) && exists(file));
  if (!command) throw Object.assign(new Error("VS Code를 찾지 못했습니다. 실행 파일을 선택해 주세요."), { status: 400, code: "vscode-not-found" });
  const installDir = path.win32.dirname(command);
  let cli = path.win32.join(installDir, "resources", "app", "out", "cli.js");
  // Recent Windows releases keep resources in a versioned subfolder. Read
  // the shipped shim's path, but never execute its contents through a shell.
  for (const shimName of ["code.cmd", "code-insiders.cmd"]) {
    try {
      const shim = readText(path.win32.join(installDir, "bin", shimName));
      const relative = /"%~dp0([^"\r\n]*[\\/]resources[\\/]app[\\/]out[\\/]cli\.js)"/i.exec(shim)?.[1];
      if (!relative) continue;
      const resolved = path.win32.resolve(installDir, "bin", relative);
      const within = path.win32.relative(installDir, resolved);
      if (within.startsWith("..") || path.win32.isAbsolute(within)) continue;
      if (exists(resolved)) { cli = resolved; break; }
    } catch { /* standard installations can use the unversioned path */ }
  }
  if (!exists(cli)) throw Object.assign(new Error("VS Code 실행 구성 파일을 찾지 못했습니다. 올바른 Code.exe를 선택해 주세요."), { status: 400, code: "vscode-not-found" });
  return { command, args: [cli, "--new-window", target],
    options: { cwd: target, windowsHide: true, env: { ...cleanEnv, ELECTRON_RUN_AS_NODE: "1" } } };
}

// Wait for the official CLI's acknowledgement, not just the OS spawn event.
// This confirms the launch request was processed; it does not promise that
// the editor window is foreground or monitor the editor's later lifetime.
export function launchVSCode(spec, { spawnProcess = spawn, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    let child, timer, done = false, detail = "";
    const finish = (error) => {
      if (done) return;
      done = true; clearTimeout(timer); child?.unref();
      if (error) reject(Object.assign(error, { status: error.status || 502, code: error.code || "vscode-launch-failed" }));
      else resolve();
    };
    try { child = spawnProcess(spec.command, spec.args, { detached: true, stdio: ["ignore", "pipe", "pipe"], ...spec.options }); }
    catch (error) { finish(new Error(`VS Code 실행 실패: ${error.message}`)); return; }
    const collect = (chunk) => { detail = (detail + chunk.toString()).slice(-2000); };
    child.stdout?.on("data", collect); child.stderr?.on("data", collect);
    child.once("error", (error) => finish(new Error(`VS Code 실행 실패: ${error.message}`)));
    child.once("close", (code) => {
      const message = detail.replace(/\x1b\[[0-9;]*m/g, "").trim().slice(-600);
      finish(code === 0 ? null : new Error(`VS Code 실행 실패 (종료 코드 ${code})${message ? `: ${message}` : ""}`));
    });
    timer = setTimeout(() => {
      // Only stop this CLI helper; an editor it already opened is left alone.
      child.kill();
      finish(Object.assign(new Error("VS Code 실행 응답을 확인하지 못했습니다. 창이 열렸는지 먼저 확인해 주세요."), { status: 504, code: "vscode-launch-timeout" }));
    }, timeoutMs);
  });
}
