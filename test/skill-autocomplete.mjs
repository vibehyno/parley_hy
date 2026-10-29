import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "ui", "skill-autocomplete.js"), "utf8");
const window = {};
vm.runInNewContext(source, { window });
const api = window.ParleySkillAutocomplete;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("parses the active dollar expression without treating currency as a Skill trigger", () => {
  assert.deepEqual(plain(api.parse("$", 1)), { start: 0, end: 1, stage: "provider", providerQuery: "", provider: "", query: "" });
  assert.equal(api.parse("$cod", 4).providerQuery, "cod");
  const phrase = "앞 문장 $codex supe";
  assert.deepEqual(plain(api.parse(phrase, phrase.length)), {
    start: 5, end: phrase.length, stage: "skill", providerQuery: "codex", provider: "codex", query: "supe",
  });
  assert.equal(api.parse("가격 $100", 7), null);
  assert.equal(api.parse("붙은$codex", 10), null);
});

test("filters display names, source names and localized descriptions case-insensitively", () => {
  const skills = [
    { name: "brainstorming", displayName: "superpowers:brainstorming", source: { id: "superpowers" }, description: "Explore ideas" },
    { name: "writing-for-agents", displayName: "mattpocock:writing-for-agents", source: { id: "mattpocock" }, description: "Write for agents" },
  ];
  assert.equal(api.filterSkills(skills, "SUPE", () => "")[0].name, "brainstorming");
  assert.equal(api.filterSkills(skills, "에이전트", (item) => item.name === "writing-for-agents" ? "에이전트 문서 작성" : "")[0].name, "writing-for-agents");
});

test("replacement preserves text after the cursor and prompt uses the selected seat and invocation name", () => {
  const text = "검토 $codex supe 뒤 문장";
  const cursor = "검토 $codex supe".length;
  const parsed = api.parse(text, cursor);
  const replacement = api.prompt("reviewer", "superpowers:brainstorming");
  const result = api.replace(text, cursor, parsed, replacement);
  assert.equal(replacement, "@reviewer [$reviewer:superpowers:brainstorming] ");
  assert.equal(result.text, "검토 @reviewer [$reviewer:superpowers:brainstorming]  뒤 문장");
  assert.equal(result.cursor, "검토 @reviewer [$reviewer:superpowers:brainstorming] ".length);
});
