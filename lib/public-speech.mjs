// Public utterances only; never pass reasoning blocks to this collector.
export function createPublicSpeech({ onStream = () => {}, onActivity = () => {} } = {}) {
  let current = "", archived = false, itemId = null, source = "";
  const published = new Map();
  const remaining = text => {
    const prefix = itemId == null ? "" : published.get(itemId) || "";
    return prefix && text.startsWith(prefix) ? text.slice(prefix.length).trimStart() : text;
  };
  return {
    update(text, id = null) {
      itemId = id;
      source = String(text || "");
      current = remaining(source);
      onStream(current);
    },
    archive() {
      if (!current.trim()) return;
      onActivity(current.trim(), { publicSpeech: true });
      if (itemId != null) published.set(itemId, source);
      archived = true;
      current = "";
      onStream("");
    },
    finalText(response) {
      const full = String(response || ""), last = current.trim();
      if (itemId != null && full === source) return remaining(full);
      return archived && last && full.trim().endsWith(last) ? last : full;
    },
  };
}
