"use strict";
(() => {
  const key = "parley.theme";
  let theme = "dark";
  try { const saved = localStorage.getItem(key); if (saved === "light" || saved === "dark") theme = saved; } catch {}
  const fonts = ["pretendard", "nanum", "suit"];
  let font = "pretendard", size = "15";
  try { const saved = localStorage.getItem("parley.font"); if (fonts.includes(saved)) font = saved;
    const storedSize = localStorage.getItem("parley.fontSize"); if (["14","15","16","17","18"].includes(storedSize)) size = storedSize; } catch {}
  const apply = () => {
    document.documentElement.dataset.font = font;
    document.documentElement.style.setProperty("--chat-size", size + "px");
    if (document.getElementById("s_font")) document.getElementById("s_font").value = font;
    if (document.getElementById("s_fontSize")) document.getElementById("s_fontSize").value = size;
    document.documentElement.dataset.theme = theme;
    for (const button of document.querySelectorAll("[data-theme-choice]")) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  };
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("s_font")?.addEventListener("change", event => {
      if (!fonts.includes(event.target.value)) return;
      font = event.target.value; try { localStorage.setItem("parley.font", font); } catch {} apply();
    });
    document.getElementById("s_fontSize")?.addEventListener("change", event => {
      if (!["14","15","16","17","18"].includes(event.target.value)) return;
      size = event.target.value; try { localStorage.setItem("parley.fontSize", size); } catch {} apply();
    });
    for (const button of document.querySelectorAll("[data-theme-choice]")) button.addEventListener("click", () => {
      theme = button.dataset.themeChoice;
      try { localStorage.setItem(key, theme); } catch {}
      apply();
    });
  });
})();
