import test from 'node:test';
import assert from 'node:assert/strict';
import { isolatedServer } from './server-fixture.mjs';
import fs from 'node:fs';
import path from 'node:path';

test('browser UI API requires page authentication; MCP requires its own per-turn capability', async () => {
  const server = await isolatedServer();
  try {
    const unauthorized = await fetch(`${server.url}/api/browser?room=default`);
    assert.equal(unauthorized.status, 403);
    const result = await server.api('GET', '/api/browser?room=default');
    assert.equal(result.status, 200);
    assert.equal(result.data.connected, false);
    const invalid = await server.api('POST', '/api/browser/tool', { operation: 'inspect' });
    assert.equal(invalid.status, 403, 'even a valid UI token cannot call model tools without a turn capability');
    assert.equal((await server.api('POST', '/api/browser', { room: 'default', action: 'close' })).status, 200);
    assert.equal((await server.api('GET', '/api/browser?room=missing')).status, 404);
  } finally { await server.close(); }
});

test('missing AGY registration blocks browser setup until explicitly confirmed', async () => {
  const server = await isolatedServer();
  try {
    assert.equal((await server.api('POST', '/api/rooms', {name: 'setup', seats: ['codex', 'gemini']})).status, 200);
    const file = path.resolve(server.root, '../home/.gemini/config/mcp_config.json');
    for (const setupApproved of [undefined, false, 'true']) {
      const result = await server.api('POST', '/api/browser', {room: 'setup', action: 'open', setupApproved});
      assert.equal(result.status, 409);
      assert.equal(result.data.code, 'BROWSER_SETUP_REQUIRED');
      assert.equal(fs.existsSync(file), false);
      assert.equal((await server.api('GET', '/api/browser?room=setup')).data.connected, false);
    }
  } finally { await server.close(); }
});
