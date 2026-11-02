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

test("one search includes Skills, MCPs and plugins and inserts the right compact marker", () => {
  const catalog = {
    skills: [{ name: "play", displayName: "codex:play" }],
    mcps: [{ name: "playwright", status: "configured" }],
    plugins: [{ name: "play-tools" }],
  };
  const matches = api.filterTools(catalog, "PLAY");
  assert.deepEqual(plain(matches.map((item) => item.kind)), ["skill", "mcp", "plugin"]);
  assert.equal(api.prompt("codex", "playwright", "mcp"), "@codex [MCP:playwright] ");
  assert.equal(api.prompt("claude", "play-tools", "plugin"), "@claude [Plugin:play-tools] ");
});

test("typing during loading shares a request, uses the latest query and caches the inventory", async () => {
  const app = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
  const input = { value: "$codex p", selectionStart: 8 };
  let requests = 0, resolve;
  const rendered = [];
  const context = vm.createContext({
    SkillAutocomplete: api, input, URLSearchParams,
    state: { room: "test", toolCatalogs: {} },
    window: { ParleyI18n: { toolDescription: () => "" } },
    hideMention() {}, hideSkillAutocomplete() {},
    skillProviderOptions: () => [{ type: "provider", seat: "codex", provider: "codex", label: "Codex" }],
    toolLabel: (provider) => provider, tr: (_, fallback) => fallback,
    showSkillAutocompleteMessage() {},
    renderSkillAutocomplete: (_, rows) => rendered.push(rows),
    api: () => { requests++; return new Promise((done) => { resolve = done; }); },
  });
  vm.runInContext("let skillAcParsed; let skillAcRequest = 0; const toolCatalogPending = new Map();\n" +
    app.slice(app.indexOf("function skillAutocompleteCheck("), app.indexOf("function pickSkillAutocomplete(")), context);
  context.skillAutocompleteCheck();
  input.value = "$codex play"; input.selectionStart = input.value.length;
  context.skillAutocompleteCheck();
  assert.equal(requests, 1);
  resolve({ mcps: [{ name: "playwright" }, { name: "postgres" }] });
  await new Promise(setImmediate);
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].length, 1);
  assert.equal(rendered[0][0].item.name, "playwright");
  input.value = "$codex post"; input.selectionStart = input.value.length;
  context.skillAutocompleteCheck();
  assert.equal(requests, 1);
  assert.equal(rendered.at(-1)[0].item.name, "postgres");
});
