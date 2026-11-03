import test from 'node:test';
import assert from 'node:assert/strict';
import { isolatedServer } from './server-fixture.mjs';
test('CLI version discovery reads configured executable version without starting a conversation',async()=>{
 const s=await isolatedServer();
 try{
  await s.api('POST','/api/config',{room:'default',config:{agents:{codex:{command:process.execPath}}}});
  const before=(await s.room('default')).entries;
  const result=await s.api('GET','/api/cli-versions?room=default');
  assert.equal(result.status,200);
  assert.equal(result.data.versions[process.execPath].version,process.version.slice(1));
  assert.deepEqual((await s.room('default')).entries,before);
  assert.deepEqual((await s.api('GET','/api/cli-versions?room=default')).data,result.data);
 }finally{await s.close();}
});
