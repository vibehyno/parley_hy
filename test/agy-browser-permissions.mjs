import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agyBrowserPermissions } from '../lib/agy-browser-permissions.mjs';

test('browser permission overlay preserves global and per-call deny/ask without changing disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parley-permissions-test-'));
  const settingsFile = path.join(dir, 'settings.json');
  const original = JSON.stringify({ permissions: {allow:['command(git)'], deny:['mcp(parley-browser/browser_click)'], ask:['mcp(other/*)']} });
  fs.writeFileSync(settingsFile, original);
  try {
    const result = agyBrowserPermissions(['--effort','high','--settings',JSON.stringify({colorScheme:'light',permissions:{allow:['read_file(example)'],ask:['mcp(parley-browser/browser_snapshot)']}})], {readOnly:true,cwd:dir,settingsFile});
    assert.deepEqual(result.args, ['--effort','high']);
    assert.equal(result.settings.colorScheme, 'light');
    assert.deepEqual(result.settings.permissions.allow, ['command(git)','read_file(example)','mcp(parley-browser/browser_snapshot)']);
    assert.deepEqual(result.settings.permissions.deny, ['mcp(parley-browser/browser_click)']);
    assert.deepEqual(result.settings.permissions.ask, ['mcp(other/*)','mcp(parley-browser/browser_snapshot)']);
    assert.equal(fs.readFileSync(settingsFile,'utf8'), original);
    const work = agyBrowserPermissions([], {readOnly:false,cwd:dir,settingsFile});
    assert(work.settings.permissions.allow.includes('mcp(parley-browser/*)'));
    assert(!work.settings.permissions.allow.includes('mcp(*)'));
    fs.writeFileSync(settingsFile, '{broken');
    assert.throws(()=>agyBrowserPermissions([], {readOnly:true,cwd:dir,settingsFile}),/JSON/);
  } finally { fs.unlinkSync(settingsFile); fs.rmdirSync(dir); }
});
