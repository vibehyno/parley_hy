import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { readLocalToolInventory, tomlInventory } from "../lib/local-tool-inventory.mjs";

test("TOML names are unique across nested tables and preserve quoted names and disabled flags", () => {
  const result = tomlInventory('[mcp_servers."play.wright"]\nenabled = false\n[mcp_servers."play.wright".env]\nTOKEN = "secret"\n[mcp_servers.appium]\ncommand = "secret-command"', "mcp_servers");
  assert.deepEqual(result, [{ name: "play.wright", enabled: false }, { name: "appium" }]);
});

test("all provider inventories read local metadata without launching a CLI; explicit health checks stay separate", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "parley-inventory-"));
  const home = path.join(root, "home"), cwd = path.join(root, "project");
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content));
  };
  try {
    write(path.join(home, ".codex", "config.toml"), '[mcp_servers.playwright]\ncommand = "SECRET_COMMAND"\n[mcp_servers.playwright.env]\nTOKEN = "SECRET_TOKEN"');
    write(path.join(home, ".claude.json"), { mcpServers: { playwright: { command: "SECRET_COMMAND" } } });
    write(path.join(home, ".gemini", "config", "mcp_config.json"), { mcpServers: { playwright: { command: "SECRET_COMMAND" } } });
    const plugin = path.join(root, "plugin");
    write(path.join(plugin, ".claude-plugin", "plugin.json"), { name: "superpowers", version: "7.0.1" });
    write(path.join(plugin, "skills", "brainstorming", "SKILL.md"), "---\nname: brainstorming\ndescription: Ideas\n---\nSECRET_BODY");
    for (const dir of [".codex", ".claude", ".gemini"]) {
      write(path.join(cwd, dir, "plugins", "installed_plugins.json"), { plugins: {
        "superpowers@local": [{ installPath: plugin, version: "7.0.1" }],
        "other-project@local": [{ installPath: plugin, projectPath: path.join(root, "other") }],
      } });
      write(path.join(cwd, dir, "skills", "review", "SKILL.md"), "---\nname: review\ndescription: Review\n---");
    }
    const source = fs.readFileSync(new URL("../parley.mjs", import.meta.url), "utf8");
    let launches = 0;
    const context = vm.createContext({
      fs, path, os: { homedir: () => home }, IS_WIN: process.platform === "win32",
      readLocalToolInventory: (provider, dir) => readLocalToolInventory(provider, dir, home),
      seatIds: (room) => Object.keys(room.cfg.agents), providerIdOf: (_, seat) => seat,
      workDir: () => cwd, toolCatalogCache: new Map(), TOOL_CATALOG_TTL_MS: 45000,
      TOOL_COMMANDS: Object.fromEntries(["codex", "claude", "gemini"].map((id) => [id, { mcp: ["mcp", "list"] }])),
      PROVIDERS: Object.fromEntries(["codex", "claude", "gemini"].map((id) => [id, { label: id }])),
      resolveCommand: (command) => command,
      runCli: async () => { launches++; return { code: 0, stdout: "Name Command Status\nlive-mcp command enabled" }; },
    });
    vm.runInContext(source.slice(source.indexOf("function catalogText("), source.indexOf("// EventSource can't send headers")), context);
    for (const provider of ["codex", "claude", "gemini"]) {
      const room = { name: provider, cfg: { agents: { [provider]: { command: "never-run" } } } };
      const catalog = await context.providerToolCatalog(room, provider, { refresh: true });
      assert.equal(launches, 0);
      assert.ok(catalog.mcps.some((item) => item.name === "playwright" && item.status === "configured"));
      assert.ok(catalog.skills.some((item) => item.displayName === "superpowers:brainstorming"));
      assert.ok(catalog.plugins.some((item) => item.name === "superpowers" && item.skillCount === 1));
      assert.equal(catalog.plugins.length, 1);
      assert.ok(!JSON.stringify(catalog).includes("SECRET"));
      assert.ok(!JSON.stringify(catalog).includes(root));
    }
    await context.providerToolCatalog({ name: "claude", cfg: { agents: { claude: { command: "fake" } } } }, "claude", { health: true });
    assert.equal(launches, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
