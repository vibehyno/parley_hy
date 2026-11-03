import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

function isRunning(root) {
  try {
    const { pid } = JSON.parse(fs.readFileSync(path.join(root, ".server.json"), "utf8"));
    if (!Number.isSafeInteger(pid) || pid <= 0) return false;
    try { process.kill(pid, 0); return true; } catch (e) { return e.code !== "ESRCH"; }
  } catch (e) { if (e.code === "ENOENT") return false; throw e; }
}
function inventory(root, relative = "") {
  const result = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (!relative && (entry.name === ".server.json" || entry.name.startsWith(".server.json."))) continue;
    const rel = path.join(relative, entry.name), file = path.join(root, rel);
    if (entry.isSymbolicLink()) result.push([rel, "link", fs.readlinkSync(file)]);
    else if (entry.isDirectory()) { result.push([rel, "dir"]); result.push(...inventory(root, rel)); }
    else result.push([rel, "file", crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")]);
  }
  return result.sort((a, b) => a[0].localeCompare(b[0]));
}

export function defaultDataRoot({ home = os.homedir(), migrate = true } = {}) {
  const target = path.join(home, ".moa");
  if (fs.existsSync(target)) return target;
  const source = [".parley", ".roundtable"].map(name => path.join(home, name)).find(p => fs.existsSync(p));
  if (!source) return target;
  if (!migrate) return source; // Only status/stop may address the old running server.
  if (isRunning(source)) throw new Error("기존 서버가 실행 중입니다. moa stop으로 종료한 뒤 moa start를 실행하세요. 대화 이전은 서버 종료 후 진행됩니다.");
  const stage = fs.mkdtempSync(path.join(home, ".moa-migration-"));
  const before = JSON.stringify(inventory(source));
  // Keep the entire old directory as the backup; never merge into an existing target.
  fs.cpSync(source, stage, { recursive: true, dereference: false, verbatimSymlinks: true,
    filter: file => !/^\.server\.json(?:\.|$)/.test(path.relative(source, file)) });
  if (before !== JSON.stringify(inventory(stage)) || before !== JSON.stringify(inventory(source)) || isRunning(source)) {
    throw new Error(`대화 이전 검증에 실패했습니다. 원본은 유지했습니다. 임시 복사본: ${stage}`);
  }
  if (fs.existsSync(target)) throw new Error("다른 실행에서 ~/.moa를 생성했습니다. 자동 병합하지 않았습니다.");
  fs.renameSync(stage, target);
  return target;
}
