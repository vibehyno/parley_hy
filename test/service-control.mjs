import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isolatedServer } from "./server-fixture.mjs";

const entry = fileURLToPath(new URL("../parley.mjs", import.meta.url));
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
