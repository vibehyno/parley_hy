// Recover only an unambiguous direct request, not a mention or a promise to ask.
export function plainPeerRequest(text, peers, author) {
  const owners = new Map();
  for (const peer of peers) for (const raw of [peer.id, peer.alias, peer.label]) {
    const name = String(raw || "").trim().toLowerCase();
    if (!name) continue;
    if (!owners.has(name)) owners.set(name, peer.id);
    else if (owners.get(name) !== peer.id) owners.set(name, null);
  }
  const names = [...owners.keys()].sort((a, b) => b.length - a.length);
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const line of String(text).split(/\n/)) {
    for (const name of names) {
      const target = owners.get(name);
      if (!target || target === author) continue;
      const match = new RegExp(`^\\s*[*_~]*${escape(name)}(?:아|야)?[*_~]*(?:\\s*[,，:：—–-]\\s*|\\s+)(.+)$`, "iu").exec(line);
      if (!match) continue;
      const request = match[1];
      if (/(?:해\s*줘(?:요)?|해\s*주세요|해\s*줄래|부탁해(?:요)?|부탁드립니다|어때|어떻게\s*생각해)[.!?。？\s]*$/u.test(request) ||
          /^(?:please\s+(?:review|check|verify|implement|fix|reply)|(?:can|could|would)\s+you\s)/i.test(request)) return target;
    }
  }
  return null;
}
