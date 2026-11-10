import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { snapshotClientAssets } from '../lib/client-assets.mjs';

test('every local script and stylesheet in the page is served by the startup snapshot', () => {
  const snapshot = snapshotClientAssets(fileURLToPath(new URL('../ui/', import.meta.url)));
  const references = [...snapshot.html.matchAll(/(?:src|href)="(\/ui\/[^"?]+)(?:\?[^">]*)?"/g)];
  assert.ok(references.length > 0);
  for (const [, url] of references) {
    assert.ok(snapshot.assets.has(url), `Missing startup asset: ${url}`);
    assert.ok(snapshot.assets.get(url).body.length > 0, `Empty startup asset: ${url}`);
  }
  assert.ok(snapshot.assets.has('/ui/panel-preview.js'));
});
