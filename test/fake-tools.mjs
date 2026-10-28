#!/usr/bin/env node
import path from "node:path";

const args = process.argv.slice(2);
if (args[0] === "mcp" && args[1] === "list") {
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
    }],
  }));
  process.exit(0);
}

console.error(`unsupported fake tool command: ${args.join(" ")}`);
process.exit(2);
