import test from "node:test";
import assert from "node:assert/strict";
import { checkActivityRunUi } from "./activity-run-harness.mjs";
test("commands collapse by default while preserving live expansion and seat separation", () => {
  checkActivityRunUi((message, passed) => assert.ok(passed, message));
});
