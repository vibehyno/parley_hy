import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repairCommandAliases } from '../lib/command-aliases.mjs';

test('old npm launcher repairs both names without setup or overwriting commands', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-alias-'));
  try {
    const pkg = path.join(root, 'node_modules', 'parley-room');
    fs.mkdirSync(pkg, { recursive: true });
    const entry = path.join(pkg, 'parley.mjs');
    fs.writeFileSync(entry, 'console.log(process.argv[2])');
    const original = '@echo off\r\n"' + process.execPath + '" "%~dp0node_modules\\parley-room\\parley.mjs" %*\r\n';
    fs.writeFileSync(path.join(root, 'parley.cmd'), original);
    const options = { platform: 'win32', searchPath: root };
    assert.equal(repairCommandAliases(entry, options).length, 1);
    assert.equal(fs.readFileSync(path.join(root, 'parley.cmd'), 'utf8'), original);
    assert.deepEqual(repairCommandAliases(entry, options), []);
    if (process.platform === 'win32') {
      for (const name of ['moyeo', 'parley']) {
        const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', `${name}.cmd probe`], { cwd: root, encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), 'probe');
      }
    }
    fs.writeFileSync(path.join(root, 'moyeo.cmd'), 'other app');
    repairCommandAliases(entry, options);
    assert.equal(fs.readFileSync(path.join(root, 'moyeo.cmd'), 'utf8'), 'other app');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('unrelated launcher and non-Windows do not create aliases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-alias-'));
  try {
    const entry = path.join(root, 'parley.mjs'); fs.writeFileSync(entry, '');
    fs.writeFileSync(path.join(root, 'parley.cmd'), 'unrelated');
    assert.deepEqual(repairCommandAliases(entry, { platform: 'win32', searchPath: root }), []);
    assert.deepEqual(repairCommandAliases(entry, { platform: 'linux', searchPath: root }), []);
    assert.equal(fs.existsSync(path.join(root, 'moyeo.cmd')), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
