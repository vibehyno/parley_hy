import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");
const server = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");

test("usage UI shares a five-minute cache across hover and open, with explicit refresh bypass", () => {
  for (const id of ["usageBtn", "usageHover", "usageOverlay", "usageRefresh", "usageCards"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /const USAGE_CACHE_MS = 5 \* 60_000/);
  assert.match(app, /function usageIsFresh\(room\)[\s\S]*?Date\.now\(\) - checkedAt < USAGE_CACHE_MS/);
  assert.match(app, /function openUsage\(\)[\s\S]*?loadUsage\(\)/);
  assert.doesNotMatch(app, /usageTimer|USAGE_REFRESH_MS/);
  assert.doesNotMatch(app, /usageHoverLocked/);
  assert.match(app, /usageRequest\?\.room === room[\s\S]*?return usageRequest\.promise/);
  assert.match(app, /usageWrap[\s\S]*?mouseenter[\s\S]*?loadUsage\(\)/);
  assert.match(app, /usageRefresh[\s\S]*?loadUsage\(true\)/);
  assert.match(styles, /conic-gradient\(var\(--ring-color\)/);
  assert.match(styles, /#usageWrap:hover #usageHover:not\(:empty\)/);
});

test("usage endpoint is room-scoped and does not return account identity", () => {
  assert.match(server, /route === "GET \/api\/usage"/);
  assert.match(server, /roomUsageSnapshot\(room, url\.searchParams\.get\("refresh"\) === "1"\)/);
  assert.doesNotMatch(server.slice(server.indexOf("async function providerUsageSnapshot"), server.indexOf("function catalogText")), /accountId/);
});

test("usage cards place activity and conversation tokens before quota charts", () => {
  assert.match(app, /usageStats\(provider\) \+ usageTokenStats\(provider\) \+ usageWindowRows\(provider\)/);
  assert.match(app, /function usageTokenStats\(provider\)/);
  assert.match(app, /usage\.tokenScope/);
  assert.match(styles, /\.usage-token-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(html, /class="usage-info"[^>]*data-i18n-title="usage\.autoRefresh"/);
  assert.doesNotMatch(html, /class="note usage-note"/);
  assert.match(app, /claude:session[\s\S]*?usage\.windowSession/);
  assert.match(app, /claude:week[\s\S]*?usage\.windowWeekly/);
});

test("Windows folder opening launches Explorer directly and reports launcher failures", () => {
  const route = server.slice(server.indexOf('route === "POST /api/open"'));
  assert.match(route, /fs\.existsSync\(target\)/);
  assert.match(route, /explorer\.exe/);
  assert.match(route, /await launchDetached/);
  assert.doesNotMatch(route, /SilentlyContinue/);
});
