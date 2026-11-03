import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { installProviderClis, NPM_CLIS } from "../lib/install-provider-clis.mjs";
test("setup installs official latest npm CLIs then the Windows AGY installer", async () => {
  const npm = []; let saved;
  await installProviderClis(args => npm.push(args), { platform: "win32", log() {},
    fetcher: async url => { assert.equal(url, "https://antigravity.google/cli/install.ps1"); return { ok: true, text: async () => "# official installer test" }; },
    run: (exe, args, options) => { assert.match(exe, /powershell.exe$/); saved = args.at(-1); assert.ok(fs.existsSync(saved)); assert.equal(options.windowsHide, true); return { status: 0 }; } });
  assert.deepEqual(npm.map(a => a[2]), NPM_CLIS);
  assert.equal(fs.existsSync(saved), false);
});
test("installer failure is not reported as success", async () => {
  await assert.rejects(installProviderClis(() => {}, { log() {}, fetcher: async () => ({ ok: false, status: 503 }) }), /503/);
  await assert.rejects(installProviderClis(() => {}, { log() {}, fetcher: async () => ({ ok: true, text: async () => "# script" }), run: () => ({ status: 1 }) }), /설치 실패/);
});
