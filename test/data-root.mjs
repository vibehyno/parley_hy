import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultDataRoot } from "../lib/data-root.mjs";

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "moyeo-migration-test-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}
test("new installation resolves to .moyeo", t => {
  const home = fixture(t);
  assert.equal(defaultDataRoot({ home }), path.join(home, ".moyeo"));
});
test("migration preserves original messages, archives and settings; ignores stale runtime record", t => {
  const home = fixture(t), old = path.join(home, ".parley");
  fs.mkdirSync(path.join(old, "한글 방", "archives"), { recursive: true });
  fs.writeFileSync(path.join(old, "한글 방", "state.json"), '{"session":"existing"}');
  fs.writeFileSync(path.join(old, "한글 방", "archives", "old.md"), "대화 원문");
  fs.writeFileSync(path.join(old, ".server.json"), '{"pid":-1}');
  assert.equal(defaultDataRoot({ home, migrate: false }), old);
  const root = defaultDataRoot({ home });
  assert.equal(fs.readFileSync(path.join(root, "한글 방", "state.json"), "utf8"), '{"session":"existing"}');
  assert.equal(fs.readFileSync(path.join(root, "한글 방", "archives", "old.md"), "utf8"), "대화 원문");
  assert.equal(fs.existsSync(old), false);
  const backup = path.join(home, fs.readdirSync(home).find(name => name.startsWith(".moyeo-backup-")));
  assert.equal(fs.readFileSync(path.join(backup, "한글 방", "state.json"), "utf8"), '{"session":"existing"}');
  assert.ok(fs.existsSync(path.join(backup, ".server.json")));
  assert.equal(fs.existsSync(path.join(root, ".server.json")), false);
  fs.mkdirSync(old);
  fs.writeFileSync(path.join(old, "later.txt"), "do not merge");
  assert.equal(defaultDataRoot({ home }), root);
  assert.equal(fs.existsSync(path.join(root, "later.txt")), false);
});
test("live server blocks copying, but remains accessible to stop/status", t => {
  const home = fixture(t), old = path.join(home, ".parley");
  fs.mkdirSync(old); fs.writeFileSync(path.join(old, ".server.json"), JSON.stringify({ pid: process.pid }));
  assert.throws(() => defaultDataRoot({ home }), /moyeo stop/);
  assert.equal(defaultDataRoot({ home, migrate: false }), old);
  assert.equal(fs.existsSync(path.join(home, ".moyeo")), false);
});

test("MOA data takes priority and is backed up before cleanup", t => {
 const home=fixture(t);
 for(const name of [".moa", ".parley"]) { fs.mkdirSync(path.join(home,name)); fs.writeFileSync(path.join(home,name,"data.txt"),name); }
 const root=defaultDataRoot({home});
 assert.equal(fs.readFileSync(path.join(root,"data.txt"),"utf8"),".moa");
 assert.equal(fs.existsSync(path.join(home,".moa")),false);
 assert.equal(fs.readFileSync(path.join(home,".parley","data.txt"),"utf8"),".parley");
});

test("backup failure preserves source and does not publish destination", t => {
 const home=fixture(t), old=path.join(home,".moa");fs.mkdirSync(old);fs.writeFileSync(path.join(old,"data.txt"),"original");
 const cp=fs.cpSync;
 t.mock.method(fs,"cpSync",(source,destination,options)=>{
  if(path.basename(destination).startsWith(".moyeo-backup-"))throw new Error("backup failure");
  return cp(source,destination,options);
 });
 assert.throws(()=>defaultDataRoot({home}),/backup failure/);
 assert.equal(fs.readFileSync(path.join(old,"data.txt"),"utf8"),"original");
 assert.equal(fs.existsSync(path.join(home,".moyeo")),false);
});
