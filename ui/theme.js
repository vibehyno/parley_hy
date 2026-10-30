"use strict";
(() => {
  const key = "parley.theme";
  let theme = "dark";
  try { const saved = localStorage.getItem(key); if (saved === "light" || saved === "dark") theme = saved; } catch {}
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    for (const button of document.querySelectorAll("[data-theme-choice]")) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  };
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    for (const button of document.querySelectorAll("[data-theme-choice]")) button.addEventListener("click", () => {
      theme = button.dataset.themeChoice;
      try { localStorage.setItem(key, theme); } catch {}
      apply();
    });
  });
})();
