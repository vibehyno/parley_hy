import assert from "node:assert/strict";
import test from "node:test";
import { changelogNotes, compareVersions, readRemoteUpdate } from "../lib/update-manager.mjs";

test("semantic versions compare numerically", () => {
  assert.equal(compareVersions("1.3.9", "1.4.0"), -1);
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("2.0.0", "2.0.0"), 0);
});

test("Korean changelog notes are extracted only from the requested version", () => {
  const markdown = "# 변경 이력\n\n## 1.4.0 — today\n\n- 첫 기능\n- 둘째 기능\n\n## 1.3.9 — before\n- 이전 기능\n";
  assert.deepEqual(changelogNotes(markdown, "1.4.0"), ["첫 기능", "둘째 기능"]);
});

test("remote update status compares package version and returns release notes", async () => {
  const fetchImpl = async (url) => ({
    ok: true,
    text: async () => url.endsWith("package.json")
      ? JSON.stringify({ version: "1.4.0" })
      : "## 1.4.0 — today\n\n- 선택형 업데이트\n",
  });
  const status = await readRemoteUpdate("1.3.9", fetchImpl);
  assert.equal(status.available, true);
  assert.equal(status.latestVersion, "1.4.0");
  assert.deepEqual(status.notes, ["선택형 업데이트"]);
});
