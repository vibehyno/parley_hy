import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultDataRoot } from "../lib/data-root.mjs";

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "moa-migration-test-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}
test("new installation resolves to .moa", t => {
  const home = fixture(t);
  assert.equal(defaultDataRoot({ home }), path.join(home, ".moa"));
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
  assert.ok(fs.existsSync(path.join(old, "한글 방", "state.json")));
  assert.equal(fs.existsSync(path.join(root, ".server.json")), false);
  fs.writeFileSync(path.join(old, "later.txt"), "do not merge");
  assert.equal(defaultDataRoot({ home }), root);
  assert.equal(fs.existsSync(path.join(root, "later.txt")), false);
});
test("live server blocks copying, but remains accessible to stop/status", t => {
  const home = fixture(t), old = path.join(home, ".parley");
  fs.mkdirSync(old); fs.writeFileSync(path.join(old, ".server.json"), JSON.stringify({ pid: process.pid }));
  assert.throws(() => defaultDataRoot({ home }), /moa stop/);
  assert.equal(defaultDataRoot({ home, migrate: false }), old);
  assert.equal(fs.existsSync(path.join(home, ".moa")), false);
});
