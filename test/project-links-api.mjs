import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isolatedServer } from "./server-fixture.mjs";

test("room API saves, switches and removes multiple project folders", async () => {
  const server = await isolatedServer();
  try {
    const one = path.resolve(server.root, "..", "project-one");
    const two = path.resolve(server.root, "..", "project-two");
    fs.mkdirSync(one); fs.mkdirSync(two);

    let saved = await server.api("POST", "/api/config", {
      room: "default", config: { projectDirs: [one, two], projectDir: one },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.room.projectLinks.links.length, 2);
    assert.equal(saved.data.room.projectLinks.mismatch, false);
    assert.equal(saved.data.room.projectLinks.active, one);

    const listed = await server.api("GET", "/api/rooms");
    assert.equal(listed.data.rooms.find((room) => room.name === "default").projectCount, 2);

    saved = await server.api("POST", "/api/config", {
      room: "default", config: { projectDirs: [two], projectDir: two },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.deepEqual(saved.data.room.cfg.projectDirs, [two]);
    assert.equal(saved.data.room.projectLinks.active, two);

    const missing = path.resolve(server.root, "..", "missing-project");
    const rejected = await server.api("POST", "/api/config", {
      room: "default", config: { projectDirs: [missing], projectDir: missing },
    });
    assert.equal(rejected.status, 400);
  } finally {
    await server.close();
  }
});
