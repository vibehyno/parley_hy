import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import net from "node:net";
import { spawn } from "node:child_process";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const recordPath = (root) => path.join(root, ".server.json");
export function readService(root) {
  try { return JSON.parse(fs.readFileSync(recordPath(root), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw new Error("서버 관리 파일을 읽을 수 없습니다: " + error.message); }
}
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; }
}

// Exclusive ownership prevents two servers from writing the same room files.
export function claimService(root) {
  fs.mkdirSync(root, { recursive: true });
  const file = recordPath(root);
  const info = { pid: process.pid, instance: crypto.randomUUID(), port: null, root };
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fs.writeFileSync(file, JSON.stringify(info), { flag: "wx", mode: 0o600 }); break; }
    catch (error) {
      if (error.code !== "EEXIST" || attempt) throw error;
      const previous = readService(root);
      if (!previous || alive(previous.pid)) throw new Error("이 대화 저장 폴더의 Parley가 이미 실행 중입니다. parley status로 확인하세요.");
      fs.unlinkSync(file);
    }
  }
  const release = () => {
    try { if (readService(root)?.instance === info.instance) fs.unlinkSync(file); } catch { /* never remove another instance */ }
  };
  process.once("exit", release);
  return { info, ready(port) {
    info.port = port;
    const temporary = file + "." + info.instance + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(info), { mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, file);
  }, release };
}

async function connect(root) {
  const record = readService(root);
  if (!record || !alive(record.pid)) return null;
  if (!Number.isInteger(record.port) || record.port < 1 || record.port > 65535) throw new Error("Parley 시작 준비 중입니다. 잠시 후 다시 시도하세요.");
  const url = `http://127.0.0.1:${record.port}`;
  const page = await fetch(url, { signal: AbortSignal.timeout(2000) }).then((res) => res.text());
  const token = /name="parley-token" content="([^"]+)"/.exec(page)?.[1];
  const protocol = /name="parley-runtime-protocol" content="([^"]+)"/.exec(page)?.[1];
  if (!token || !protocol) throw new Error("해당 포트의 서버가 Parley인지 확인할 수 없습니다.");
  const headers = { "X-Parley-Token": token, "X-Parley-Runtime-Protocol": protocol, "Content-Type": "application/json" };
  const response = await fetch(url + "/api/service/status", { headers, signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error("이 서버는 실행 관리 명령을 지원하지 않습니다. 기존 서버를 직접 종료한 뒤 다시 시작하세요.");
  const status = await response.json();
  if (status.instance !== record.instance || status.pid !== record.pid || status.root !== root) throw new Error("서버 정보가 일치하지 않아 제어하지 않았습니다.");
  return { ...status, url, headers };
}

function portOccupied(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", (error) => { socket.destroy(); resolve(error.code !== "ECONNREFUSED"); });
    socket.once("timeout", () => { socket.destroy(); resolve(true); });
  });
}

export async function serviceCommand(command, args, entry) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--no-open") options.noOpen = true;
    else if (["--root", "--port"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--")) options[args[i].slice(2)] = args[++i];
    else throw new Error("지원하지 않는 옵션입니다: " + args[i]);
  }
  const root = path.resolve(options.root || path.join(os.homedir(), ".parley"));
  const port = options.port === undefined ? 4141 : Number(options.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("포트는 0~65535 정수여야 합니다.");
  let current = await connect(root);
  if (command === "status") {
    console.log(current ? `Parley 실행 중 · ${current.url} · ${current.version}${current.busy ? " · 작업 진행 중" : " · 대기 중"}` : "Parley가 실행 중이지 않습니다.");
    return;
  }
  if (command === "stop" || command === "restart") {
    if (current) {
      const response = await fetch(current.url + "/api/service/stop", { method: "POST", headers: current.headers,
        body: JSON.stringify({ instance: current.instance }), signal: AbortSignal.timeout(3000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "서버를 종료하지 못했습니다.");
      for (let i = 0; i < 100 && alive(current.pid); i++) await delay(100);
      if (alive(current.pid)) throw new Error("서버 종료를 기다리는 중입니다. parley status로 다시 확인하세요.");
      console.log("Parley를 종료했습니다. 대화와 설정은 유지됩니다.");
    } else console.log("Parley가 실행 중이지 않습니다.");
    if (command === "stop") return;
  } else if (current) { console.log(`이미 실행 중입니다: ${current.url}`); return; }
  const targetPort = command === "restart" && options.port === undefined && current ? current.port : port;
  if (targetPort && await portOccupied(targetPort)) throw new Error(`${targetPort} 포트가 사용 중입니다. 기존 서버를 확인하거나 --port로 다른 포트를 지정하세요.`);
  fs.mkdirSync(root, { recursive: true });
  const log = path.join(root, "server.log");
  const output = fs.openSync(log, "a");
  let child;
  try {
    child = spawn(process.execPath, [entry, "--root", root, "--port", String(targetPort), ...(options.noOpen ? ["--no-open"] : [])], {
      cwd: path.dirname(entry), detached: true, windowsHide: true, stdio: ["ignore", output, output],
    });
    await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    child.unref();
  } finally { fs.closeSync(output); }
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Parley 시작 실패. 로그: ${log}`);
    await delay(100);
    try { const started = await connect(root); if (started) { console.log(`Parley 실행 완료: ${started.url}\n종료: parley stop\n로그: ${log}`); return; } } catch { /* startup handshake */ }
  }
  throw new Error(`시작 확인 시간이 초과되었습니다. parley status와 ${log}를 확인하세요.`);
}
