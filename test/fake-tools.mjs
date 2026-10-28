#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";

const args = process.argv.slice(2);
if (args[0] === "mcp" && args[1] === "list") {
  fs.appendFileSync(path.join(process.cwd(), ".fake-mcp-list.log"), "mcp list\n");
  console.log("Name      Command       Status");
  console.log("fake-mcp  secret-command enabled");
  process.exit(0);
}

if ((args[0] === "plugin" || args[0] === "plugins") && args[1] === "list") {
  console.log(JSON.stringify({
    installed: [{
      pluginId: "fake-plugin@local",
      name: "Fake Plugin",
      version: "1.0.0",
      enabled: true,
      installPath: path.join(process.cwd(), ".fake-plugin"),
      source: { path: path.join(process.cwd(), ".fake-plugin") },
    }, {
      pluginId: "superpowers@openai-curated-remote",
      name: "superpowers",
      marketplaceName: "openai-curated-remote",
      version: "7.0.1",
      enabled: true,
      installPath: path.join(process.cwd(), ".fake-superpowers"),
    }, {
      pluginId: "mattpocock-skills@mattpocock",
      name: "mattpocock-skills",
      marketplaceName: "mattpocock",
      version: "1.3.1",
      enabled: true,
      installPath: path.join(process.cwd(), ".fake-mattpocock"),
    }],
  }));
  process.exit(0);
}

console.error(`unsupported fake tool command: ${args.join(" ")}`);
process.exit(2);
