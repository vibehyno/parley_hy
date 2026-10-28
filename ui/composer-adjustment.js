"use strict";
(function initParleyComposerAdjustment(global) {
  function seatsFor(target, seats = []) {
    return target === "both" ? [...seats] : [target];
  }

  function activeSource(summary, target) {
    if (!summary) return null;
    const seats = seatsFor(target, summary.seats || []);
    const rows = (summary.busyInfo || [])
      .filter((row) => summary.workingPair || seats.includes(row.agent))
      .filter((row) => Number.isSafeInteger(row.rootN) || Number.isSafeInteger(row.sourceN));
    if (!rows.length) return null;
    const newest = rows.reduce((best, row) => {
      const current = Number.isSafeInteger(row.rootN) ? row.rootN : row.sourceN;
      const previous = Number.isSafeInteger(best.rootN) ? best.rootN : best.sourceN;
      return current > previous ? row : best;
    });
    return Number.isSafeInteger(newest.rootN) ? newest.rootN : newest.sourceN;
  }

  function shouldStage({ summary, target, text, attachmentCount = 0 }) {
    const value = String(text || "").trim();
    if (!value || value.startsWith("/") || attachmentCount > 0) return false;
    return Number.isSafeInteger(activeSource(summary, target));
  }

  global.ParleyComposerAdjustment = { activeSource, shouldStage };
})(typeof window === "undefined" ? globalThis : window);
