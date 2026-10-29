import { spawn } from "node:child_process";

const [parentText, nodePath, entryPath, port, root] = process.argv.slice(2);
const parentPid = Number(parentText);

function parentAlive() {
  try { process.kill(parentPid, 0); return true; }
  catch { return false; }
}

const deadline = Date.now() + 15000;
while (parentAlive() && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

const child = spawn(nodePath, [entryPath, "--port", port, "--root", root, "--no-open"], {
  cwd: new URL("..", import.meta.url),
  detached: true,
  stdio: "ignore",
  windowsHide: true,
});
child.unref();
