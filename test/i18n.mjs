import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = path.join(here, "..", "ui", "i18n.js");
const appFile = path.join(here, "..", "ui", "app.js");
const stylesFile = path.join(here, "..", "ui", "styles.css");
const indexFile = path.join(here, "..", "ui", "index.html");

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

test("Korean UI localizes known skill descriptions without changing invocation names", () => {
  const korean = loadI18n({ language: "ko-KR" }).api;
  assert.equal(korean.toolDescription("skill-creator", "Create or update a Codex skill."), "Codex Skill을 새로 만들거나 기존 Skill을 수정");
  assert.equal(korean.toolDescription("setup-uiautomator2", "Prepare Appium UiAutomator2."), "Appium UiAutomator2 환경 준비 및 검증");
  assert.equal(korean.toolDescription("migrate-to-shoehorn", "Migrate test files."), "테스트의 as 타입 단언을 @total-typescript/shoehorn 방식으로 변경");
  assert.equal(korean.toolDescription("writing-for-agents", "Write for agents."), "에이전트가 빠르게 이해할 수 있는 짧고 명확한 문서 작성");
  assert.equal(korean.toolDescription("unknown-new-skill", "New upstream description"), "New upstream description");

  const english = loadI18n({ language: "en-US" }).api;
  assert.equal(english.toolDescription("skill-creator", "Create or update a Codex skill."), "Create or update a Codex skill.");
});

test("tool catalog renders and searches localized skill descriptions while retaining the original as a tooltip", () => {
  const appSource = fs.readFileSync(appFile, "utf8");
  assert.match(appSource, /ParleyI18n\.toolDescription\(item\.name, item\.description/);
  assert.match(appSource, /title="\$\{esc\(originalDetail\)\}"/);
  assert.match(appSource, /item\.displayName\s*\|\|\s*item\.name/);
  assert.match(appSource, /item\.invokeName\s*\|\|\s*item\.name/);
  assert.match(appSource, /item\.source\?\.id/);
  assert.match(appSource, /item\.skillCount/);
  assert.match(appSource, /params\.set\("health",\s*"1"\)/);
  assert.match(appSource, /toolsHealth/);
});

test("composer Skill autocomplete loads before the app and owns selection before message sending", () => {
  const html = fs.readFileSync(indexFile, "utf8");
  const appSource = fs.readFileSync(appFile, "utf8");
  assert.ok(html.indexOf("/ui/skill-autocomplete.js") < html.indexOf("/ui/app.js"));
  assert.match(html, /id="skillAutocomplete"/);
  assert.match(appSource, /ParleySkillAutocomplete/);
  assert.match(appSource, /skillAutocompleteCheck\(\)/);
  assert.match(appSource, /if \(skillAutocompleteKeydown\(e\)\) return;[\s\S]*?if \(mentionKeydown\(e\)\) return;/);
  assert.match(appSource, /item\.invokeName\s*\|\|\s*item\.name/);
  assert.match(appSource, /\[\$\$\{seat\}:\$\{name\}\]/);
  assert.match(appSource, /class="skill-chip"/);
});

test("settings and tools modals use wider responsive layouts without wrapping button labels", () => {
  const styles = fs.readFileSync(stylesFile, "utf8");
  assert.match(styles, /\.modal\s*\{[^}]*width:\s*min\(880px,\s*calc\(100vw - 32px\)\)/s);
  assert.match(styles, /\.tools-modal\s*\{[^}]*width:\s*min\(1120px,\s*calc\(100vw - 32px\)\)/s);
  assert.match(styles, /\.tool-card\s*\{[^}]*padding:\s*11px 12px[^}]*margin-top:\s*8px/s);
  assert.match(styles, /\.tool-card b\s*\{[^}]*font-size:\s*14px/s);
  assert.match(styles, /\.tool-card span\s*\{[^}]*font-size:\s*12\.5px[^}]*line-height:\s*1\.5/s);
  assert.match(styles, /\.btn\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.mgrid,\s*\.tool-groups\s*\{\s*grid-template-columns:\s*1fr/);
});

test("Korean UI explains room modes and seat control icons in plain language", () => {
  const { api } = loadI18n({ language: "ko-KR" });
  assert.equal(api.t("mode.talkTitle"), "대화 모드 — 파일을 수정하지 않고 의견을 나누는 데 적합해요.");
  assert.equal(api.t("mode.workTitle"), "작업 모드 — 모델이 프로젝트 파일을 수정하고 명령을 실행할 수 있어요.");
  assert.equal(
    api.t("seat.lurkEnabledTitle", { seat: "AGY" }),
    "AGY 듣기 모드 켜짐 — 모든 대화를 듣고 필요한 경우 한 번 끼어들어요. 추가 호출이 발생할 수 있어요. 클릭하면 꺼져요.",
  );
  assert.equal(
    api.t("seat.lurkEnabledToast", { seat: "AGY" }),
    "👂 AGY 듣기 모드가 켜졌어요 — 대화를 듣다가 필요한 경우 끼어들어요.",
  );

  const appSource = fs.readFileSync(appFile, "utf8");
  for (const key of ["seat.lurkEnabledTitle", "seat.lurkDisabledTitle", "seat.sleepTitle", "seat.wakeTitle", "seat.lurkEnabledToast"]) {
    assert.match(appSource, new RegExp(`t\\(\\"${key.replaceAll(".", "\\.")}\\"`), `${key} is wired through t()`);
  }
});

test("runtime banners and folder notices use Korean UI strings while preserving variables", () => {
  const { api } = loadI18n({ language: "ko-KR" });
  assert.equal(api.t("folder.workspaceOpened"), "📁 작업 폴더를 탐색기에서 열었어. 앞에 보이지 않으면 작업 표시줄을 확인해줘.");
  assert.equal(api.t("folder.roomOpened"), "🗂️ 대화 저장 폴더를 탐색기에서 열었어. 앞에 보이지 않으면 작업 표시줄을 확인해줘.");
  assert.equal(api.t("banner.fullAccessTitle"), "전체 권한 사용 중");
  assert.equal(
    api.t("banner.fullAccessBody", { agents: "codex + claude", scope: "C:\\project", permissions: "codex: 전체 권한" }),
    "codex + claude 모델이 현재 OS 계정 권한으로 C:\\project 범위 밖에도 작업할 수 있어요 (codex: 전체 권한).",
  );
  const appSource = fs.readFileSync(appFile, "utf8");
  for (const key of ["runtime.restartTitle", "folder.workspaceOpened", "folder.roomOpened", "banner.fullAccessTitle", "banner.fullAccessBody", "folder.pickerOpening"]) {
    assert.match(appSource, new RegExp(`t\\(\\"${key.replaceAll(".", "\\.")}\\"`), `${key} is wired through t()`);
  }
});

test("opening a room settles the transcript at the newest message", () => {
  const appSource = fs.readFileSync(appFile, "utf8");
  assert.match(appSource, /function scrollBottom\(force, instant = false\)/);
  assert.match(appSource, /scrollBottom\(true, true\);/);
  assert.match(appSource, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
});
