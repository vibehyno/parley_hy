(function (global) {
  // Preview never changes the saved/pinned state or takes keyboard focus.
  function create({ button, panel, isPinned, show, hide }) {
    const hover = global.matchMedia('(hover: hover) and (pointer: fine)');
    let timer, active = false;
    function reset() {
      clearTimeout(timer);
      if (active) { active = false; hide(); }
    }
    function enter(event) {
      clearTimeout(timer);
      if (event.pointerType === 'touch' || !hover.matches || isPinned() || active) return;
      timer = setTimeout(() => {
        if (!isPinned() && hover.matches) { active = true; show(); }
      }, 180);
    }
    function leave(event) {
      clearTimeout(timer);
      if (button.contains(event.relatedTarget) || panel.contains(event.relatedTarget)) return;
      timer = setTimeout(reset, 220);
    }
    for (const el of [button, panel]) {
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
    }
    button.addEventListener('click', reset, true);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') reset(); });
    global.addEventListener('blur', reset);
    global.addEventListener('resize', reset);
    hover.addEventListener('change', reset);
    return { reset };
  }
  global.MoyeoPanelPreview = { create };
})(window);
