import fs from "node:fs";
import path from "node:path";

function keyOf(value) {
  const normalized = path.normalize(path.resolve(value));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function sameProjectPath(left, right) {
  if (!left || !right) return !left && !right;
  return keyOf(left) === keyOf(right);
}

export function normalizeProjectDirs(values, active = null) {
  const out = [];
  const seen = new Set();
  for (const raw of [...(Array.isArray(values) ? values : []), active]) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const resolved = path.resolve(value);
    const key = keyOf(resolved);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }
  return out;
}

export function projectLinksStatus(values, active, runtimeDir) {
  const dirs = normalizeProjectDirs(values, active);
  const activePath = active ? path.resolve(String(active)) : null;
  const links = dirs.map((projectPath) => {
    let exists = false;
    try { exists = fs.statSync(projectPath).isDirectory(); } catch { /* missing or inaccessible */ }
    return {
      path: projectPath,
      name: path.basename(projectPath) || projectPath,
      active: !!activePath && sameProjectPath(projectPath, activePath),
      exists,
    };
  });
  const activeLink = activePath ? links.find((link) => link.active) : null;
  const runtimeMatches = activePath ? sameProjectPath(activePath, runtimeDir) : true;
  return {
    active: activePath,
    runtime: runtimeDir ? path.resolve(runtimeDir) : null,
    links,
    mismatch: !!activePath && (!activeLink || !activeLink.exists || !runtimeMatches),
  };
}
