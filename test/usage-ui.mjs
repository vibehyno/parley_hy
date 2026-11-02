import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");
const server = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");

test("usage endpoint is room-scoped and does not return account identity", () => {
  assert.match(server, /route === "GET \/api\/usage"/);
  assert.match(server, /roomUsageSnapshot\(room, url\.searchParams\.get\("refresh"\) === "1"\)/);
  assert.doesNotMatch(server.slice(server.indexOf("async function providerUsageSnapshot"), server.indexOf("function catalogText")), /accountId/);
});

test("usage cards use the same token and quota layout without provider-only activity stats", () => {
  assert.match(app, /usageTokenStats\(provider\) \+ usageWindowRows\(provider\)/);
  assert.doesNotMatch(app, /function usageStats\(provider\)/);
  assert.match(app, /function usageTokenStats\(provider\)/);
  assert.match(app, /usage\.tokenScope/);
  assert.match(styles, /\.usage-token-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(html, /id="(?:usageBtn|usageHover|usageOverlay)"/);
  assert.doesNotMatch(html, /class="note usage-note"/);
  assert.match(app, /claude:session[\s\S]*?usage\.window5h/);
  assert.match(app, /claude:week[\s\S]*?usage\.windowWeekly/);
});

test("Windows folder opening launches Explorer directly and reports launcher failures", () => {
  const route = server.slice(server.indexOf('route === "POST /api/open"'));
  assert.match(route, /fs\.existsSync\(target\)/);
  assert.match(route, /explorer\.exe/);
  assert.match(route, /await launchDetached/);
  assert.doesNotMatch(route, /SilentlyContinue/);
});
