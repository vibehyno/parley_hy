import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { normalizeProjectDirs, projectLinksStatus, sameProjectPath } from "../lib/project-links.mjs";

test("keeps multiple unique project folders and always includes the active folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "parley-projects-"));
  const one = path.join(root, "one");
  const two = path.join(root, "two");
  fs.mkdirSync(one); fs.mkdirSync(two);
  const dirs = normalizeProjectDirs([one, one], two);
  assert.equal(dirs.length, 2);
  assert.ok(dirs.some((value) => sameProjectPath(value, one)));
  assert.ok(dirs.some((value) => sameProjectPath(value, two)));
  fs.rmSync(root, { recursive: true, force: true });
});

test("marks missing or runtime-mismatched active paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "parley-projects-"));
  const current = path.join(root, "current");
  const other = path.join(root, "other");
  fs.mkdirSync(current); fs.mkdirSync(other);
  assert.equal(projectLinksStatus([current, other], current, current).mismatch, false);
  assert.equal(projectLinksStatus([current, other], current, other).mismatch, true);
  assert.equal(projectLinksStatus([path.join(root, "missing")], path.join(root, "missing"), path.join(root, "missing")).mismatch, true);
  fs.rmSync(root, { recursive: true, force: true });
});
