import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isolatedServer } from "./server-fixture.mjs";
import { claimService, readService } from "../lib/service-control.mjs";

test("ready retries a transient Windows file replacement denial", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moyeo-ready-test-"));
  const service = claimService(root);
  const rename = fs.renameSync;
  let attempts = 0;
  try {
    fs.renameSync = (...args) => {
      if (++attempts <= 2) throw Object.assign(new Error("temporarily locked"), { code: "EPERM" });
      return rename(...args);
    };
    service.ready(4141);
    assert.equal(attempts, 3);
    assert.equal(readService(root).port, 4141);
    assert.equal(readService(root).instance, service.info.instance);
  } finally {
    fs.renameSync = rename;
    service.release();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const entry = fileURLToPath(new URL("../parley.mjs", import.meta.url));
test("a longer Windows lock is repaired in the background", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moyeo-lock-test-"));
  const service = claimService(root), rename = fs.renameSync;
  try {
    fs.renameSync = () => { throw Object.assign(new Error('locked'), { code: 'EPERM' }); };
    service.ready(4141);
    assert.equal(readService(root).port, null);
    fs.renameSync = rename;
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(readService(root).port, 4141);
  } finally {
    fs.renameSync = rename; service.release();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("status recovers a listening server from its matching pending record", async () => {
  const server = await isolatedServer();
  try {
    const file = path.join(server.root, '.server.json');
    const ready = readService(server.root);
    const pending = file + '.' + ready.instance + '.tmp';
    fs.writeFileSync(pending, JSON.stringify(ready));
    fs.writeFileSync(file, JSON.stringify({ ...ready, port: null }));
    const result = await cli(['status', '--root', server.root]);
    assert.equal(result.code, 0, result.output);
    assert.equal(readService(server.root).port, ready.port);
    assert.equal(fs.existsSync(pending), false);
    assert.equal((await server.api('GET', '/api/service/status')).status, 200);
  } finally { await server.close(); }
});

test("pending records cannot impersonate a different running server", async () => {
  const server = await isolatedServer();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-pending-test-'));
  try {
    const ready = readService(server.root);
    const forged = { ...ready, root };
    const file = path.join(root, '.server.json');
    fs.writeFileSync(file, JSON.stringify({ ...forged, port: null }));
    fs.writeFileSync(file + '.' + forged.instance + '.tmp', JSON.stringify(forged));
    const result = await cli(['restart', '--root', root, '--no-open']);
    assert.equal(result.code, 1);
    assert.match(result.output, /일치하지 않아/);
    assert.equal(readService(root).port, null);
    assert.equal((await server.api('GET', '/api/service/status')).status, 200);
  } finally { await server.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

test("status clears only records belonging to an exited process", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moyeo-exited-test-'));
  try {
    const child = spawn(process.execPath, ['-e', ''], { windowsHide: true });
    await new Promise(resolve => child.once('close', resolve));
    const record = { pid: child.pid, instance: '12345678-1234-1234-1234-123456789abc', port: null, root };
    const file = path.join(root, '.server.json');
    fs.writeFileSync(file, JSON.stringify(record));
    fs.writeFileSync(file + '.' + record.instance + '.tmp', JSON.stringify(record));
    const result = await cli(['status', '--root', root]);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

function cli(args) {
  return new Promise((resolve, reject) => {
    // Run outside the checkout to exercise location-independent commands.
    const child = spawn(process.execPath, [entry, ...args], { cwd: os.tmpdir(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { output += data; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, output }));
  });
}

test("start/status/restart/stop preserve rooms and prevent duplicate managed servers", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "parley-service-test-"));
  try {
    const started = await cli(["start", "--root", root, "--port", "0", "--no-open"]);
    assert.equal(started.code, 0, started.output);
    const before = JSON.parse(fs.readFileSync(path.join(root, ".server.json"), "utf8"));
    const roomFile = path.join(root, "default", "room.json");
    const config = fs.readFileSync(roomFile, "utf8");
    const marker = path.join(root, "default", "workspace", "preserve.txt");
    fs.writeFileSync(marker, "keep me");
    assert.match((await cli(["status", "--root", root])).output, /실행 중/);
    const duplicate = await cli(["start", "--root", root, "--no-open"]);
    assert.equal(duplicate.code, 0, duplicate.output);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".server.json"), "utf8")).pid, before.pid);
    const restarted = await cli(["restart", "--root", root, "--no-open"]);
    assert.equal(restarted.code, 0, restarted.output);
    const after = JSON.parse(fs.readFileSync(path.join(root, ".server.json"), "utf8"));
    assert.notEqual(after.instance, before.instance);
    assert.equal(after.port, before.port);
    assert.equal(fs.readFileSync(roomFile, "utf8"), config);
    assert.equal(fs.readFileSync(marker, "utf8"), "keep me");
    const stopped = await cli(["stop", "--root", root]);
    assert.equal(stopped.code, 0, stopped.output);
    assert.equal(fs.existsSync(path.join(root, ".server.json")), false);
    assert.match((await cli(["status", "--root", root])).output, /실행 중이지 않습니다/);
  } finally {
    await cli(["stop", "--root", root]);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("control requires authentication and matching identity, and refuses to stop active work", async () => {
  const server = await isolatedServer({ env: { FAKE_DELAY_MS: "1800" } });
  try {
    const unauthorized = await fetch(server.url + "/api/service/stop", { method: "POST", body: "{}" });
    assert.equal(unauthorized.status, 403);
    const status = (await server.api("GET", "/api/service/status")).data;
    assert.equal((await server.api("POST", "/api/service/stop", { instance: "wrong" })).status, 409);
    await server.api("POST", "/api/message", { room: "default", text: "@claude SAY:BUSY", target: "auto" });
    const busy = await server.api("POST", "/api/service/stop", { instance: status.instance });
    assert.equal(busy.status, 409, JSON.stringify(busy.data));
    assert.match(busy.data.error, /작업/);
    assert.equal((await server.api("GET", "/api/service/status")).status, 200);
  } finally { await server.close(); }
});

test("stale identity cannot control a different server on the recorded port", async () => {
  const server = await isolatedServer();
  const otherRoot = fs.mkdtempSync(path.join(os.tmpdir(), "parley-stale-test-"));
  try {
    const record = JSON.parse(fs.readFileSync(path.join(server.root, ".server.json"), "utf8"));
    fs.writeFileSync(path.join(otherRoot, ".server.json"), JSON.stringify({ ...record, instance: "stale", root: otherRoot }));
    const result = await cli(["stop", "--root", otherRoot]);
    assert.equal(result.code, 1);
    assert.match(result.output, /일치하지 않아/);
    assert.equal((await server.api("GET", "/api/service/status")).status, 200);
  } finally {
    await server.close();
    fs.rmSync(otherRoot, { recursive: true, force: true });
  }
});
