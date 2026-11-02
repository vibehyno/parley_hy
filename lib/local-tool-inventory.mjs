import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function json(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); } catch { return null; }
}
function directories(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name); }
  catch { return []; }
}
function text(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}

// Only inventory table names and the enabled flag are needed. Commands, URLs,
// environment variables and authentication values never leave this module.
export function tomlInventory(source, namespace) {
  const rows = new Map();
  let current = null;
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) {
      current = null;
      const match = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/.exec(line);
      if (!match) continue;
      const parts = match[1].match(/"(?:\\.|[^"\\])*"|'[^']*'|[\w-]+/g) || [];
      let keys;
      try { keys = parts.map((part) => part[0] === '"' ? JSON.parse(part) : part.replace(/^'|'$/g, "")); } catch { continue; }
      if (keys[0] !== namespace || keys.length < 2) continue;
      const name = keys[1];
      if (!rows.has(name)) rows.set(name, { name });
      if (keys.length === 2) current = rows.get(name);
    } else if (current && /^\s*enabled\s*=\s*(true|false)\b/.test(line)) {
      current.enabled = /^\s*enabled\s*=\s*true\b/.test(line);
    }
  }
  return [...rows.values()];
}

function manifest(dir) {
  return json(path.join(dir, ".codex-plugin", "plugin.json")) ||
    json(path.join(dir, ".claude-plugin", "plugin.json")) ||
    json(path.join(dir, "gemini-extension.json")) || json(path.join(dir, "plugin.json"));
}

function skillPaths(dir, meta) {
  if (!dir) return [];
  const declared = Array.isArray(meta?.skills) ? meta.skills : typeof meta?.skills === "string" ? [meta.skills] : ["skills"];
  return declared.filter((entry) => typeof entry === "string").map((entry) => path.resolve(dir, entry))
    .filter((candidate) => {
      const relative = path.relative(dir, candidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
      try { return fs.statSync(candidate).isDirectory(); } catch { return false; }
    });
}

export function readLocalToolInventory(provider, cwd, home = os.homedir()) {
  const plugins = new Map(), mcps = new Map();
  const codexHome = home === os.homedir() && process.env.CODEX_HOME ? process.env.CODEX_HOME : path.join(home, ".codex");
  const claudeHome = home === os.homedir() && process.env.CLAUDE_CONFIG_DIR ? process.env.CLAUDE_CONFIG_DIR : path.join(home, ".claude");
  const bases = provider === "codex" ? [codexHome, path.join(cwd, ".codex")]
    : provider === "claude" ? [claudeHome, path.join(cwd, ".claude")]
      : [path.join(home, ".gemini"), path.join(home, ".agy"), path.join(cwd, ".gemini"), path.join(cwd, ".agy")];
  const addMcps = (config) => {
    for (const [name, entry] of Object.entries(config?.mcpServers || {})) {
      mcps.set(name, { name, status: "configured", ...(entry?.disabled === true || entry?.enabled === false ? { enabled: false } : {}) });
    }
  };
  const addPlugin = (id, entry, base) => {
    if (!id || !entry || typeof entry !== "object") return;
    if (entry.projectPath && path.resolve(entry.projectPath).toLowerCase() !== path.resolve(cwd).toLowerCase()) return;
    const installPath = entry.installPath || entry.path;
    const resolved = typeof installPath === "string" ? path.resolve(base, installPath) : null;
    const meta = resolved ? manifest(resolved) : null;
    plugins.set(id, {
      name: meta?.name || id.split("@")[0], pluginId: id,
      marketplaceName: id.split("@")[1] || "", version: entry.version || meta?.version,
      enabled: entry.enabled !== false, ...(resolved ? { installPath: resolved } : {}),
      skillPaths: skillPaths(resolved, meta),
    });
  };

  for (const base of bases) {
    for (const file of ["settings.json", "settings.local.json", "mcp.json", "mcp_config.json", "config/mcp_config.json"]) addMcps(json(path.join(base, file)));
    const registry = json(path.join(base, "plugins", "installed_plugins.json"));
    for (const [id, entries] of Object.entries(registry?.plugins || {})) {
      for (const entry of Array.isArray(entries) ? entries : [entries]) addPlugin(id, entry, base);
    }
    if (provider === "codex") {
      const config = text(path.join(base, "config.toml"));
      for (const item of tomlInventory(config, "mcp_servers")) mcps.set(item.name, { ...item, status: "configured" });
      const settings = new Map(tomlInventory(config, "plugins").map((entry) => [entry.name, entry]));
      const cache = path.join(base, "plugins", "cache");
      for (const marketplace of directories(cache)) {
        for (const name of directories(path.join(cache, marketplace))) {
          const pluginDir = path.join(cache, marketplace, name);
          const versions = directories(pluginDir).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
          const version = versions.find((v) => manifest(path.join(pluginDir, v)));
          if (!version) continue;
          const id = `${name}@${marketplace}`;
          const configured = settings.get(id) || settings.get(`${name}@${marketplace.replace(/-remote$/, "")}`);
          addPlugin(id, { installPath: path.join(pluginDir, version), version, enabled: configured?.enabled }, base);
        }
      }
    }
    if (provider === "gemini") {
      for (const name of directories(path.join(base, "extensions"))) {
        const dir = path.join(base, "extensions", name);
        const meta = manifest(dir);
        if (meta) addPlugin(meta.name || name, { installPath: dir, version: meta.version }, base);
      }
    }
  }
  if (provider === "claude") {
    const config = json(path.join(home, ".claude.json"));
    addMcps(config);
    for (const [project, entry] of Object.entries(config?.projects || {})) {
      if (path.resolve(project).toLowerCase() === path.resolve(cwd).toLowerCase()) addMcps(entry);
    }
    for (const base of bases) {
      for (const file of ["settings.json", "settings.local.json"]) {
        for (const [id, enabled] of Object.entries(json(path.join(base, file))?.enabledPlugins || {})) {
          if (plugins.has(id)) plugins.get(id).enabled = enabled !== false;
        }
      }
    }
  }
  if (provider !== "codex") addMcps(json(path.join(cwd, ".mcp.json")));
  for (const plugin of plugins.values()) {
    if (!plugin.installPath || !plugin.enabled) continue;
    addMcps(json(path.join(plugin.installPath, ".mcp.json")));
    const meta = manifest(plugin.installPath);
    if (typeof meta?.mcpServers === "string") addMcps(json(path.resolve(plugin.installPath, meta.mcpServers)));
    else addMcps(meta);
  }
  return { plugins: [...plugins.values()], mcps: [...mcps.values()], skillBases: bases };
}
