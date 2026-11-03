import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isolatedServer } from './server-fixture.mjs';

test('default can be deleted and read endpoints never recreate a missing room', async () => {
  const s = await isolatedServer();
  try {
    const removed=await s.api('POST','/api/room/delete',{room:'default'}); assert.equal(removed.status,200,JSON.stringify(removed.data));
    assert.deepEqual((await s.api('GET','/api/rooms')).data.rooms,[]);
    for(const route of ['/api/room?name=default','/api/room/summary?name=default','/api/doctor?room=default','/api/tools?room=default&provider=claude','/api/usage?room=default','/api/work-changes?room=default']) {
      assert.equal((await s.api('GET',route)).status,404,route);
    }
    assert.equal(fs.existsSync(path.join(s.root,'default')),false);
    assert.equal(fs.existsSync(path.join(s.root,'.rooms-initialized')),true);
    assert.ok(fs.readdirSync(path.join(s.root,'.trash')).some(n=>n.startsWith('default-')));
    assert.equal((await s.api('POST','/api/rooms',{name:'새방',seats:['claude','codex']})).status,200);
    assert.equal((await s.api('POST','/api/rooms',{name:'새방'})).status,409);
    assert.equal((await s.api('POST','/api/room/rename',{room:'새방',to:'이름수정'})).status,200);
    assert.equal((await s.api('GET','/api/room?name=이름수정')).status,200);
  } finally {await s.close();}
});

