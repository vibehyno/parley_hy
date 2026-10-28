import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = path.join(here, "..", "ui", "i18n.js");
const appFile = path.join(here, "..", "ui", "app.js");

function loadI18n({ language = "en-US", stored = null } = {}) {
  const values = new Map(stored === null ? [] : [["parley.locale", stored]]);
  const nodes = {
    text: { dataset: { i18n: "settings.title" }, textContent: "", setAttribute() {} },
    placeholder: { dataset: { i18nPlaceholder: "composer.placeholder" }, setAttribute(name, value) { this[name] = value; } },
  };
  const document = {
    documentElement: { lang: "" },
    querySelectorAll(selector) {
      if (selector === "[data-i18n]") return [nodes.text];
      if (selector === "[data-i18n-placeholder]") return [nodes.placeholder];
      return [];
    },
  };
  const navigator = { language };
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const window = { document, navigator, localStorage };
  const sandbox = {
    window, document,
    navigator, localStorage,
  };
  vm.createContext(sandbox);
  const source = fs.existsSync(sourceFile) ? fs.readFileSync(sourceFile, "utf8") : "";
  if (source) vm.runInContext(source, sandbox, { filename: "ui/i18n.js" });
  return { api: window.ParleyI18n, values, nodes, document };
}

test("Korean browser gets Korean UI by default and applies translated DOM text", () => {
  const { api, nodes, document } = loadI18n({ language: "ko-KR" });
  assert.ok(api, "ParleyI18n browser API exists");
  assert.equal(api.currentLocale(), "ko");
  assert.equal(api.t("settings.title"), "방 설정");
  api.applyLocale();
  assert.equal(nodes.text.textContent, "방 설정");
  assert.equal(nodes.placeholder.placeholder, "메시지를 입력하세요… (@claude, @codex, @both)");
  assert.equal(document.documentElement.lang, "ko");
});

test("saved English overrides a Korean browser and persists later changes", () => {
  const { api, values } = loadI18n({ language: "ko-KR", stored: "en" });
  assert.ok(api, "ParleyI18n browser API exists");
  assert.equal(api.currentLocale(), "en");
  assert.equal(api.t("settings.title"), "Room settings");
  api.setLocale("ko");
  assert.equal(values.get("parley.locale"), "ko");
  assert.equal(api.currentLocale(), "ko");
});

test("invalid saved locale falls back to browser language and missing keys fall back to English", () => {
  const { api } = loadI18n({ language: "en-GB", stored: "broken" });
  assert.ok(api, "ParleyI18n browser API exists");
  assert.equal(api.currentLocale(), "en");
  assert.equal(api.t("tools.title"), "Provider tools");
  assert.equal(api.t("missing.key"), "missing.key");
});

test("Korean catalog covers the main navigation, settings, tools and status surfaces", () => {
  const { api } = loadI18n({ language: "ko-KR" });
  assert.deepEqual({
    rooms: api.t("sidebar.rooms"),
    create: api.t("room.create"),
    project: api.t("settings.projectFolder"),
    permission: api.t("settings.permissionMode"),
    tools: api.t("tools.searchPlaceholder"),
    stop: api.t("stop.response"),
    retry: api.t("action.retry"),
    queue: api.t("queue.title"),
    status: api.t("tools.status", { label: "Codex", seat: "codex" }),
  }, {
    rooms: "방 목록",
    create: "방 만들기",
    project: "프로젝트 폴더",
    permission: "권한 모드",
    tools: "Skill, MCP, Plugin 검색…",
    stop: "응답 중지",
    retry: "다시 시도",
    queue: "대기 중인 작업",
    status: "Codex · @codex · 클릭하면 입력창에 추가",
  });
});

test("automatic-turn projections and tooltips use translated UI strings", () => {
  const { api } = loadI18n({ language: "ko-KR" });
  assert.equal(api.t("hop.projectionPair"), "페어 모드는 검토 라운드를 사용하므로 이 후속 발언 설정이 주기를 제어하지 않아요.");
  assert.equal(api.t("hop.sendBoth"), "두 자리 모두에게 보내기");
  const appSource = fs.readFileSync(appFile, "utf8");
  for (const key of ["hop.soloAria", "hop.projectionPair", "hop.projectionUnavailable", "hop.projectionEstimate", "hop.soloTitle", "hop.defaultTitle", "hop.overrideTitle", "hop.soloBothTitle", "hop.sendBoth"]) {
    assert.match(appSource, new RegExp(`tr\\(\\"${key.replaceAll(".", "\\.")}\\"`), `${key} is wired through tr()`);
  }
});
