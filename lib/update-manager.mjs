const REMOTE_BASE = "https://raw.githubusercontent.com/vibehyno/parley_hy/main";

export function compareVersions(left, right) {
  const parse = (value) => String(value || "0").split("-")[0].split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < Math.max(a.length, b.length, 3); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0) ? -1 : 1;
  }
  return 0;
}

export function changelogNotes(markdown, version, limit = 6) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const escaped = String(version).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${escaped}(?:\\s|$)`).test(line.trim()));
  if (start < 0) return [];
  const notes = [];
  for (let i = start + 1; i < lines.length && notes.length < limit; i++) {
    const line = lines[i].trim();
    if (/^##\s+/.test(line)) break;
    if (/^[-*]\s+/.test(line)) notes.push(line.replace(/^[-*]\s+/, "").trim());
  }
  return notes;
}

async function fetchText(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "Parley-HY-update-check" },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`update check failed (${response.status})`);
  return response.text();
}

export async function readRemoteUpdate(currentVersion, fetchImpl = globalThis.fetch) {
  const [manifestText, changelog] = await Promise.all([
    fetchText(fetchImpl, `${REMOTE_BASE}/package.json`),
    fetchText(fetchImpl, `${REMOTE_BASE}/CHANGELOG.ko.md`),
  ]);
  const latestVersion = String(JSON.parse(manifestText).version || "").trim();
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(latestVersion)) {
    throw new Error("repository returned an invalid version");
  }
  return {
    currentVersion,
    latestVersion,
    available: compareVersions(currentVersion, latestVersion) < 0,
    notes: changelogNotes(changelog, latestVersion),
    repository: "https://github.com/vibehyno/parley_hy",
  };
}
