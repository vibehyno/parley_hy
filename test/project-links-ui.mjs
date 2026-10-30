import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");

test("project modal drafts add, edit and remove actions until Save without a project switch", () => {
  assert.match(html, /id="projectOverlay"/);
  assert.match(html, /id="projectLinks"/);
  assert.match(app, /projectDraftDirs\.push\(picked\)/);
  assert.doesNotMatch(app, /data-project-use/);
  assert.match(app, /data-project-edit/);
  assert.match(app, /data-project-open/);
  assert.match(app, /data-project-remove/);
  assert.match(app, /projectDirs: \[\.\.\.projectDraftDirs\]/);
  assert.match(app, /\$\("projectApply"\)\.onclick/);
  assert.doesNotMatch(html, /id="s_browse"/);
});

test("sidebar and project modal surface project path mismatches", () => {
  assert.match(app, /projectMismatch/);
  assert.match(app, /workspace\.mismatchTitle/);
  assert.match(server, /projectLinksStatus/);
  assert.match(server, /projectCount/);
  assert.match(server, /sameProjectPath\(candidate, requestedPath\)/);
});

test("sidebar actions expose localized explanatory tooltips", () => {
  for (const key of ["sidebar.openWorkspaceTip", "sidebar.downloadTranscriptTip", "sidebar.roomFolderTip", "sidebar.toolsTip", "sidebar.settingsTip", "sidebar.docsTip"]) {
    assert.match(html, new RegExp(`data-i18n-side-tip="${key.replaceAll(".", "\\.")}"`));
  }
  assert.match(html, /href="https:\/\/github\.com\/vibehyno\/parley_hy#readme"/);
  assert.match(html, /target="_blank"/);
});
