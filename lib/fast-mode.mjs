export function updateFastMode(config, enabled) {
  const next = { ...(config || {}) };
  const wasEnabled = !!next.fastMode;
  if (enabled) {
    if (!wasEnabled) next.fastPreviousEffort = next.effort ?? null;
    next.fastMode = true;
    next.effort = "low";
  } else {
    next.fastMode = false;
    if (wasEnabled) next.effort = next.fastPreviousEffort ?? null;
    next.fastPreviousEffort = null;
  }
  return { config: next, changed: wasEnabled !== enabled };
}

export function normalizeFastMode(config) {
  const next = { ...(config || {}), fastMode: !!config?.fastMode };
  if (next.fastMode) next.effort = "low";
  return next;
}
