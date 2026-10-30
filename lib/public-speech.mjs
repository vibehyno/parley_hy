// Public utterances only; never pass reasoning blocks to this collector.
export function createPublicSpeech({ onStream = () => {}, onActivity = () => {} } = {}) {
  let current = "", archived = false;
  return {
    update(text) { current = String(text || ""); onStream(current); },
    archive() {
      if (!current.trim()) return;
      onActivity(current.trim(), { publicSpeech: true });
      archived = true;
      current = "";
      onStream("");
    },
    finalText(response) {
      const full = String(response || ""), last = current.trim();
      return archived && last && full.trim().endsWith(last) ? last : full;
    },
  };
}
