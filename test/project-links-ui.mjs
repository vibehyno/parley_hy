import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");

test("settings can add, select and remove connected projects", () => {
  assert.match(html, /id="projectLinks"/);
  assert.match(app, /settingsProjectDirs\.push\(picked\)/);
  assert.match(app, /data-project-use/);
  assert.match(app, /data-project-remove/);
  assert.match(app, /projectDirs: \[\.\.\.settingsProjectDirs\]/);
});

test("sidebar and settings surface project path mismatches", () => {
  assert.match(app, /projectMismatch/);
  assert.match(app, /workspace\.mismatchTitle/);
  assert.match(server, /projectLinksStatus/);
  assert.match(server, /projectCount/);
});
