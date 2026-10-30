import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isolatedServer } from "./server-fixture.mjs";
test("Korean room names survive create, rename, list, archive restore and unsafe names stay rejected", async () => {
 const server=await isolatedServer();
 try {
  const name="설계 검토방";
  assert.equal((await server.api("POST","/api/rooms",{name})).status,200);
  await server.api("POST","/api/config",{room:name,config:{roomNote:"보존할 메모"}});
  assert.equal((await server.api("POST","/api/room/rename",{room:name,to:"한글 방 2"})).status,200);
  assert.equal((await server.room("한글 방 2")).room.cfg.roomNote,"보존할 메모");
  assert.ok(fs.existsSync(path.join(server.root,"한글 방 2","room.json")));
  const listed=(await server.api("GET","/api/rooms")).data.rooms;
  assert.ok(listed.some(r=>(r.name||r)==="한글 방 2"));
  await server.api("POST","/api/new",{room:"한글 방 2"});
  const archives=(await server.api("GET","/api/archives?room="+encodeURIComponent("한글 방 2"))).data.archives;
  assert.equal((await server.api("POST","/api/archive/restore",{room:"한글 방 2",id:archives[0].id,name:"복원한 대화"})).status,200);
  for(const invalid of ["../탈출","방/이름","방\\이름","CON","LPT1","가".repeat(41)]) assert.equal((await server.api("POST","/api/rooms",{name:invalid})).status,400,invalid);
 } finally { await server.close(); }
});
