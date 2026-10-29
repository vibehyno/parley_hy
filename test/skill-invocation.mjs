import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { skillMarker, extractSkillMessage, applySkillInvocationPrompt } from "../lib/skill-invocation.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("creates and extracts a visible provider skill marker", () => {
  assert.equal(skillMarker("claude", "wait-what"), "[$claude:wait-what]");
  assert.deepEqual(extractSkillMessage("[$claude:wait-what] 구조적으로 설명해줘", "claude"), {
    seat: "claude",
    name: "wait-what",
    text: "구조적으로 설명해줘",
  });
  assert.deepEqual(extractSkillMessage("앞 내용 [$claude:wait-what] 구조적으로 설명해줘", "claude"), {
    seat: "claude",
    name: "wait-what",
    text: "앞 내용 구조적으로 설명해줘",
  });
  assert.equal(extractSkillMessage("[$claude:wait-what] 구조적으로 설명해줘", "codex"), null);
});

test("converts the marker to each CLI's real invocation prefix", () => {
  const skill = extractSkillMessage("[$claude:wait-what] 구조적으로 설명해줘", "claude");
  assert.equal(applySkillInvocationPrompt("claude", skill, "room context"), "/wait-what\n\nroom context");
  assert.equal(applySkillInvocationPrompt("codex", { name: "mattpocock:writing-for-agents" }, "room context"),
    "$mattpocock:writing-for-agents\n\nroom context");
});

test("the server applies native Skill invocation before launching a provider", () => {
  const server = fs.readFileSync(path.join(root, "parley.mjs"), "utf8");
  assert.match(server, /const selectedSkill = extractSkillMessage\(userTurn\.text, agent\)/);
  assert.match(server, /applySkillInvocationPrompt\(providerIdOf\(room, agent\), selectedSkill, assembled\)/);
  assert.doesNotMatch(server, /"--disable-slash-commands"/);
});
