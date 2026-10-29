import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");

test("new releases appear as an optional header update with preview and choices", () => {
  assert.match(html, /id="updateWrap" hidden/);
  assert.match(html, /id="updatePreview" role="tooltip"/);
  assert.match(html, /id="updateOverlay"/);
  assert.match(html, /id="updateLater"/);
  assert.match(html, /id="updateApply"/);
  assert.match(css, /#updateWrap:hover #updatePreview/);
  assert.match(app, /state\.update = await api\("\/api\/update\/status"\)/);
  assert.match(app, /if \(!update \|\| !update\.available\) \{ wrap\.hidden = true/);
  assert.match(app, /\$\("updateApply"\)\.onclick = applyUpdate/);
});

test("automatic update is guarded and restarts only after a clean fast-forward pull", () => {
  assert.match(server, /GET \/api\/update\/status/);
  assert.match(server, /POST \/api\/update\/apply/);
  assert.match(server, /git, \["status", "--porcelain"\]/);
  assert.match(server, /git, \["pull", "--ff-only", "origin", branchName\]/);
  assert.match(server, /finish or stop work in these rooms before updating/);
  assert.match(server, /restart-after-update\.mjs/);
});

test("access warning is dismissible once per room and notification layout stays aligned", () => {
  assert.match(html, /id="workBannerClose"/);
  assert.match(app, /parley\.accessBannerDismissed:/);
  assert.match(app, /localStorage\.setItem\(accessBannerKey\(state\.room\), "1"\)/);
  assert.match(app, /\$\("workBannerClose"\)\.onclick = dismissAccessBanner/);
  assert.match(html, /class="fld notification-field"/);
  assert.match(html, /class="notification-toggle"/);
  assert.match(css, /\.notification-toggle\s*\{[^}]*grid-template-columns:\s*20px minmax\(0, 1fr\)/s);
});
