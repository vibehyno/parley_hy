export function updateFastMode(config, enabled) {
  const next = { ...(config || {}) };
  const wasEnabled = !!next.fastMode;
  next.fastMode = !!enabled;
  delete next.fastPreviousEffort;
  return { config: next, changed: wasEnabled !== enabled };
}

export function normalizeFastMode(config) {
  const next = { ...(config || {}), fastMode: !!config?.fastMode };
  // v1.3.7 implemented the button as an effort preset. Restore the effort it
  // captured during migration, then discard that legacy state. Fast mode is a
  // provider transport option now and must never rewrite reasoning effort.
  if (Object.prototype.hasOwnProperty.call(next, "fastPreviousEffort")) {
    if (next.fastMode && next.effort === "low") next.effort = next.fastPreviousEffort ?? null;
    delete next.fastPreviousEffort;
  }
  return next;
}
