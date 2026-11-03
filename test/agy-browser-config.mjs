import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readAgyBrowserConfig, browserConfig, browserSetupRequired } from '../lib/shared-browser-config.mjs';

test('AGY missing and empty config are uninitialized; existing settings stay intact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parley-agy-config-'));
  const file = path.join(dir, 'mcp_config.json');
  try {
    assert.equal(readAgyBrowserConfig(file), undefined);
    for (const text of ['', ' \r\n ', '\uFEFF']) {
      fs.writeFileSync(file, text);
      assert.equal(readAgyBrowserConfig(file), undefined);
      assert.equal(fs.readFileSync(file, 'utf8'), text);
    }
    const expected = { command: 'node', args: ['bridge.mjs'] };
    const source = '\uFEFF' + JSON.stringify({ mcpServers: { other: { command: 'other' }, 'parley-browser': expected } });
    fs.writeFileSync(file, source);
    assert.deepEqual(readAgyBrowserConfig(file), expected);
    assert.equal(fs.readFileSync(file, 'utf8'), source);
    for (const text of ['{broken', 'null', '[]', '{"mcpServers":null}']) {
      fs.writeFileSync(file, text);
      assert.throws(() => readAgyBrowserConfig(file), /JSON/);
      assert.equal(fs.readFileSync(file, 'utf8'), text);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('setup is required only for missing runtime or selected model registration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parley-agy-config-'));
  const agyFile = path.join(dir, 'mcp_config.json');
  try {
    assert.equal(browserSetupRequired(['codex', 'claude'], { runtimeReady: true, agyFile }), false);
    assert.equal(browserSetupRequired(['codex'], { runtimeReady: false, agyFile }), true);
    assert.equal(browserSetupRequired(['codex', 'gemini'], { runtimeReady: true, agyFile }), true);
    assert.equal(fs.existsSync(agyFile), false, 'preflight does not create configuration');
    fs.writeFileSync(agyFile, JSON.stringify({mcpServers: {'parley-browser': browserConfig()}}));
    assert.equal(browserSetupRequired(['gemini'], { runtimeReady: true, agyFile }), false);
    fs.writeFileSync(agyFile, JSON.stringify({mcpServers: {'parley-browser': {command: 'other'}}}));
    assert.throws(() => browserSetupRequired(['gemini'], { runtimeReady: true, agyFile }), /다른 parley-browser/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
