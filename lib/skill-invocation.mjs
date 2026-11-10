const SKILL_MARKER = /(^|\s)\[\$([a-z][a-z0-9_-]*):([a-z0-9][a-z0-9:_-]*)\][ \t]*/i;

export function skillMarker(seat, name) {
  const safeSeat = String(seat || "").trim().toLowerCase();
  const safeName = String(name || "").trim();
  if (!/^[a-z][a-z0-9_-]*$/.test(safeSeat) || !/^[a-z0-9][a-z0-9:_-]*$/i.test(safeName)) return "";
  return `[$${safeSeat}:${safeName}]`;
}

export function extractSkillMessage(text, seat) {
  const source = String(text || "");
  const match = SKILL_MARKER.exec(source);
  if (!match || match[2].toLowerCase() !== String(seat || "").toLowerCase()) return null;
  const cleaned = source.slice(0, match.index) + match[1] + source.slice(match.index + match[0].length);
  return {
    seat: match[2].toLowerCase(),
    name: match[3],
    text: cleaned.trim(),
  };
}

export function applySkillInvocationPrompt(provider, skill, prompt) {
  if (!skill) return String(prompt || "");
  const command = String(provider || "").toLowerCase() === "codex"
    ? `$${skill.name}`
    : `/${skill.name}`;
  const location = skill.path
    ? `\nSelected skill document: ${JSON.stringify(skill.path)}. Read this SKILL.md and follow its instructions for this request. If it is missing from the session skill list, check this exact file before reporting it unavailable. Report any actual access failure; do not claim the skill ran without reading it.\n`
    : "";
  return `${command}\n${location}\n${String(prompt || "")}`;
}
