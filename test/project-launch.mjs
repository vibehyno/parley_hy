import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { projectLaunchSpec, launchVSCode } from "../lib/project-launch.mjs";
import { isolatedServer } from "./server-fixture.mjs";

test("CMD uses a visible console and cwd instead of interpolating project paths into a command", () => {
  const target = "C:\\projects\\QA & notes %TEMP%";
  const spec = projectLaunchSpec(target, "cmd", { platform: "win32", env: { SystemRoot: "C:\\Windows" } });
  assert.equal(spec.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(spec.args, ["/d", "/s", "/c", 'start "" "%COMSPEC%" /d /k']);
  assert.equal(spec.options.cwd, target);
  assert.equal(spec.options.windowsHide, true, "hide only the launcher; START opens the interactive console");
  assert.equal(spec.options.env.COMSPEC, spec.command);
  assert.equal(spec.options.windowsVerbatimArguments, true, "CMD receives the constant command without C-runtime quote escaping");
  assert.equal(spec.options.shell, undefined);
  assert.throws(() => projectLaunchSpec("\\\\server\\share", "cmd", { platform: "win32" }), /UNC/);
  assert.throws(() => projectLaunchSpec("/tmp/project", "cmd", { platform: "linux" }), /Windows/);
});

test("VS Code resolves custom PATH installs, uses separate arguments and reports missing installs", () => {
  const code = "D:\\Apps\\VS Code\\Code.exe";
  const cli = "D:\\Apps\\VS Code\\resources\\app\\out\\cli.js";
  const env = { PATH: "D:\\Apps\\VS Code\\bin", ELECTRON_RUN_AS_NODE: "1" };
  const spec = projectLaunchSpec("C:\\project & test", "vscode", { platform: "win32", env, exists: (file) => [code, cli].includes(file), readText: () => "" });
  assert.equal(spec.command, code);
  assert.deepEqual(spec.args, [cli, "--new-window", "C:\\project & test"]);
  assert.equal(spec.options.env.ELECTRON_RUN_AS_NODE, "1", "run the official CLI rather than launching Electron directly");
  assert.equal(env.ELECTRON_RUN_AS_NODE, "1");
  assert.throws(() => projectLaunchSpec("C:\\project", "vscode", { platform: "win32", env: {}, exists: () => false }), /VS Code를 찾지/);
  assert.throws(() => projectLaunchSpec("C:\\project", "anything"), /지원하지/);
});

test("VS Code supports versioned resources and an explicitly selected installation", () => {
  const code = "D:\\Tools\\Code.exe";
  const cli = "D:\\Tools\\abc123\\resources\\app\\out\\cli.js";
  const options = { platform: "win32", env: { VSCODE_DEV: "1", VSCODE_IPC_HOOK_CLI: "old-hook" }, executable: code,
    exists: (file) => [code, cli].includes(file),
    readText: () => '"%~dp0..\\Code.exe" "%~dp0..\\abc123\\resources\\app\\out\\cli.js" %*' };
  const spec = projectLaunchSpec("C:\\QA & project", "vscode", options);
  assert.equal(spec.command, code);
  assert.equal(spec.args[0], cli);
  assert.equal(spec.options.env.VSCODE_DEV, undefined);
  assert.equal(spec.options.env.VSCODE_IPC_HOOK_CLI, undefined);
  assert.throws(() => projectLaunchSpec("C:\\QA", "vscode", { ...options, readText: () => '"%~dp0..\\..\\outside\\resources\\app\\out\\cli.js"' }),
    (error) => error.code === "vscode-not-found", "the shim must not select a CLI outside its installation");
});

test("launch acknowledgement waits for exit and surfaces stderr, spawn errors and timeouts", async () => {
  const spec = (script) => ({ command: process.execPath, args: ["-e", script], options: { windowsHide: true } });
  await launchVSCode(spec("setTimeout(() => process.exit(0), 30)"));
  await assert.rejects(launchVSCode(spec('process.stderr.write("launch fixture failure"); process.exit(7)')),
    (error) => error.code === "vscode-launch-failed" && /7.*launch fixture failure/.test(error.message));
  await assert.rejects(launchVSCode({ command: "parley-nonexistent-vscode-fixture", args: [], options: {} }),
    (error) => error.code === "vscode-launch-failed");
  await assert.rejects(launchVSCode(spec("setInterval(() => {}, 1000)"), { timeoutMs: 60 }),
    (error) => error.code === "vscode-launch-timeout");
});

test("multiple connected projects require selection; single projects are selected automatically", () => {
  const source = fs.readFileSync(new URL("../ui/app.js", import.meta.url), "utf8");
  const begin = source.indexOf("function launchableProjects()");
  const end = source.indexOf("async function launchProjectApplication", begin);
  const nodes = new Map();
  const $ = (id) => { if (!nodes.has(id)) nodes.set(id, { value: "", innerHTML: "", disabled: false, hidden: false, focus() {} }); return nodes.get(id); };
  const state = { summary: { projectLinks: { links: [
    { name: "one", path: "C:/one", exists: true }, { name: "two", path: "C:/two", exists: true },
  ] } } };
  const launches = [];
  const context = vm.createContext({ $, state, esc: (text) => text, t: (key) => key, toast() {},
    launchProjectApplication: (...args) => launches.push(args), projectLaunchPending: false, projectLaunchApplication: null,
    projectLaunchFailure: null, projectLaunchContext: null, projectPickerPending: false,
    projectPathKey: (value) => value.toLowerCase() });
  vm.runInContext(source.slice(begin, end), context);
  context.showConnectionChoices();
  assert.equal($("connectionChoices").hidden, false);
  assert.equal($("connectionProjects").hidden, true);
  context.chooseProjectApplication("cmd");
  assert.equal($("connectionChoices").hidden, true);
  assert.equal($("connectionProjects").hidden, false);
  assert.equal(launches.length, 0);
  assert.equal($("projectLaunchPath").value, "");
  assert.equal($("projectLaunchConfirm").disabled, true);
  $("projectLaunchPath").value = "C:/two";
  context.renderProjectLaunch();
  assert.equal($("projectLaunchConfirm").disabled, false);
  assert.doesNotMatch($("projectLaunchPath").innerHTML, /unsaved/);
  state.summary.projectLinks.links.pop();
  context.renderProjectLaunch();
  assert.equal($("projectLaunchPath").value, "C:/one");
  context.chooseProjectApplication("vscode");
  assert.deepEqual(launches, [["vscode", "C:/one"]]);
  state.summary.projectLinks.links[0].exists = false;
  context.renderProjectLaunch();
  assert.equal($("projectLaunchConfirm").disabled, true);
  context.projectLaunchPending = true;
  context.projectLaunchApplication = "vscode";
  context.renderProjectLaunch();
  assert.equal($("projectOpenCode").textContent, "project.opening");
  assert.equal($("projectLaunchStatus").hidden, false);
  context.projectLaunchPending = false;
  context.projectLaunchFailure = { code: "vscode-not-found", message: "missing" };
  context.renderProjectLaunch();
  assert.equal($("projectPickCode").hidden, false);
  assert.equal($("projectLaunchStatus").textContent, "missing");
});

test("project launch API rejects unconnected paths, invalid applications and non-project requests", async () => {
  const server = await isolatedServer();
  try {
    const folder = path.join(server.root, "..", "connected");
    const other = path.join(server.root, "..", "other");
    fs.mkdirSync(folder); fs.mkdirSync(other);
    const configured = await server.api("POST", "/api/config", { room: "default", config: { projectDirs: [folder], projectDir: folder } });
    assert.equal(configured.status, 200);
    assert.equal((await server.api("POST", "/api/open", { room: "default", what: "project", path: other, application: "cmd" })).status, 403);
    assert.equal((await server.api("POST", "/api/open", { room: "default", what: "room", application: "cmd" })).status, 400);
    assert.equal((await server.api("POST", "/api/open", { room: "default", what: "project", path: folder, application: "unknown" })).status, 400);
  } finally { await server.close(); }
});
