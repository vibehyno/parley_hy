import fs from "node:fs";
import path from "node:path";

// Repair beside a verified launcher already on PATH; never replace another app.
export function repairCommandAliases(entry, { platform = process.platform, searchPath = process.env.PATH || "", node = process.execPath } = {}) {
  if (platform !== "win32") return [];
  const created = [];
  const actualEntry = fs.realpathSync(entry);
  for (const dir of searchPath.split(";").filter(Boolean)) {
    let owned = false;
    for (const name of ["parley", "moyeo", "moa"]) {
      try {
        const contents = fs.readFileSync(path.join(dir, `${name}.cmd`), "utf8");
        if (contents.includes(`"${actualEntry}"`)) { owned = true; break; }
        const match = contents.match(/node_modules[\\/](parley-room|parley-hy|moa-room|moyeo-room)[\\/]parley\.mjs/);
        if (match && fs.realpathSync(path.join(dir, "node_modules", match[1], "parley.mjs")) === actualEntry) { owned = true; break; }
      } catch { /* Not a launcher belonging to this checkout. */ }
    }
    if (!owned) continue;
    for (const name of ["moyeo", "parley"]) {
      const target = path.join(dir, `${name}.cmd`);
      try {
        fs.writeFileSync(target, `@echo off\r\n"${node}" "${actualEntry}" %*\r\n`, { flag: "wx" });
        created.push(target);
      } catch (error) {
        if (error.code !== "EEXIST") console.warn(`명령 등록 실패 (${name}): ${error.message}. 설치 폴더에서 setupMoyeo.cmd를 실행해주세요.`);
      }
    }
    break;
  }
  return created;
}
