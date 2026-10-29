(function (global) {
  "use strict";

  function parse(text, cursor) {
    const value = String(text || "");
    const end = Math.max(0, Math.min(Number(cursor) || 0, value.length));
    const before = value.slice(0, end);
    const match = /(^|\s)\$([a-z][a-z0-9-]*|)(?:[ \t]+([^\n]*))?$/i.exec(before);
    if (!match) return null;
    const provider = (match[2] || "").toLowerCase();
    const hasSkillQuery = match[3] !== undefined;
    return {
      start: match.index + match[1].length,
      end,
      stage: hasSkillQuery ? "skill" : "provider",
      providerQuery: provider,
      provider: hasSkillQuery ? provider : "",
      query: hasSkillQuery ? match[3].trim() : "",
    };
  }

  function filterSkills(skills, query, describe) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return [...(skills || [])];
    return (skills || []).filter((item) => {
      const localized = typeof describe === "function" ? describe(item) : "";
      return [item.displayName, item.name, item.source && item.source.id, item.description, localized]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }

  function replace(text, cursor, parsed, replacement) {
    const value = String(text || "");
    if (!parsed) return { text: value, cursor: Number(cursor) || 0 };
    const inserted = String(replacement || "");
    return {
      text: value.slice(0, parsed.start) + inserted + value.slice(parsed.end),
      cursor: parsed.start + inserted.length,
    };
  }

  function prompt(seat, skillName) {
    return `@${seat} [$${seat}:${skillName}] `;
  }

  global.ParleySkillAutocomplete = { parse, filterSkills, replace, prompt };
})(window);
