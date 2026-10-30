// Bound onboarding only. Existing sessions and unread ongoing work stay intact.
export function initialContext(entries, { cursor, sessionRef, rootN, held = false, maxEntries = 40, maxChars = 16000 }) {
  if (cursor > 0 || sessionRef || held) return { entries, from: cursor, omitted: 0 };
  let start = entries.length, chars = 0;
  while (start > 0 && entries.length - start < maxEntries) {
    const cost = String(entries[start - 1].text || "").length + 160;
    if (chars + cost > maxChars) break;
    chars += cost;
    start--;
  }
  // Retry of an older root must not claim an omitted older root was received
  // through a contiguous range. Leave this less common path unchanged.
  if (entries.slice(start).some(e => e.n > rootN)) return { entries, from: cursor, omitted: 0 };
  return { entries: entries.slice(start), from: start ? (entries[start]?.n ?? rootN) - 1 : cursor, omitted: start };
}
