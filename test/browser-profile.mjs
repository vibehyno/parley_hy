import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { browserProfileDir } from '../lib/browser-profile.mjs';

test('profiles survive new room objects and room rename while keeping separate rooms isolated', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'parley-profile-test-'));
  try {
    const dir=path.join(root,'one'), other=path.join(root,'two');
    fs.mkdirSync(dir); fs.mkdirSync(other);
    const profile=browserProfileDir({dir});
    assert.equal(browserProfileDir({dir}),profile);
    assert.notEqual(browserProfileDir({dir:other}),profile);
    const renamed=path.join(root,'renamed'); fs.renameSync(dir,renamed);
    assert.equal(browserProfileDir({dir:renamed}),profile);
    assert.equal(browserProfileDir({}),null);
    fs.writeFileSync(path.join(renamed,'browser-profile-id'),'../../outside');
    assert.throws(()=>browserProfileDir({dir:renamed}),/식별자/);
  } finally {
    if(path.dirname(root)===path.resolve(os.tmpdir())&&path.basename(root).startsWith('parley-profile-test-'))fs.rmSync(root,{recursive:true,force:true});
  }
});
