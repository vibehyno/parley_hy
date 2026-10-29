import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const validId = (id) => typeof id === "string" && /^[0-9][0-9A-Za-z_.+ -]{0,99}$/.test(id) && !id.includes("..");

function archiveFile(dir, id, base, ext) {
  if (!validId(id)) throw fail("Invalid archive ID");
  const file = path.join(dir, `${base}-${id}.${ext}`);
  if (fs.existsSync(file) && !fs.lstatSync(file).isFile()) throw fail("Invalid archive file");
  return file;
}

export function listConversationArchives(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const match = /^events-(.+)\.jsonl$/.exec(item.name);
    if (!item.isFile() || !match || !validId(match[1])) return [];
    const id = match[1];
    const stat = fs.statSync(path.join(dir, item.name));
    const manifestPath = archiveFile(dir, id, "archive", "json");
    let metadata = null;
    try { metadata = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch { /* legacy or damaged metadata */ }
    return [{ id, createdAt: metadata?.createdAt || stat.mtime.toISOString(),
      hasSettings: !!metadata?.config?.agents, bytes: stat.size }];
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function readConversationArchive(dir, id) {
  const eventsPath = archiveFile(dir, id, "events", "jsonl");
  if (!fs.existsSync(eventsPath)) throw fail("Archive not found", 404);
  const events = fs.readFileSync(eventsPath, "utf8");
  const records = [];
  let previousN = 0;
  for (const line of events.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { throw fail("Archive contains invalid JSON", 422); }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw fail("Archive contains an invalid record", 422);
    if (entry.kind !== "receipt") {
      if (!Number.isSafeInteger(entry.n) || entry.n <= previousN || typeof entry.text !== "string") {
        throw fail("Archive message order is invalid", 422);
      }
      previousN = entry.n;
    }
    records.push(entry);
  }
  const manifestPath = archiveFile(dir, id, "archive", "json");
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
    catch { throw fail("Archive settings are unreadable", 422); }
    if (manifest?.version !== 1 || !manifest.config?.agents) throw fail("Archive settings are invalid", 422);
  }
  const transcriptPath = archiveFile(dir, id, "transcript", "md");
  const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf8")
    : records.filter((e) => e.kind !== "receipt").map((e) => `## ${e.author || e.kind} · ${e.ts || ""}\n\n${e.text}\n`).join("\n");
  return { events, transcript, records, manifest, maxEntryN: previousN };
}

export function archiveConversation(room) {
  const createdAt = new Date().toISOString();
  const id = `${createdAt.replace(/:/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const manifestPath = archiveFile(room.dir, id, "archive", "json");
  const temporary = `${manifestPath}.tmp`;
  const historyState = Object.fromEntries(["cancelledDeliveries", "interruptedResponses", "resolvedErrors", "lurkOutcomes"]
    .map((key) => [key, room.state[key]]));
  fs.writeFileSync(temporary, JSON.stringify({ version: 1, createdAt, config: room.cfg, historyState }, null, 2), { flag: "wx" });
  const moved = [];
  try {
    for (const [source, base, ext] of [[room.eventsFile, "events", "jsonl"], [room.transcriptFile, "transcript", "md"]]) {
      const destination = archiveFile(room.dir, id, base, ext);
      const existed = fs.existsSync(source);
      if (existed) fs.renameSync(source, destination);
      else fs.writeFileSync(destination, "", { flag: "wx" });
      moved.push({ source, destination, existed });
    }
    fs.renameSync(temporary, manifestPath);
    return id;
  } catch (error) {
    // Never reset the live room after a failed archive. Restore moved files.
    for (const item of moved.reverse()) {
      if (item.existed) fs.renameSync(item.destination, item.source);
      else fs.unlinkSync(item.destination);
    }
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw error;
  }
}
