(function (root) {
  function latestSeatError(entries, agent, resolved = {}, command = null, receipts = []) {
    if (command && !command.ok) return { id: "command", text: command.detail };
    const completedAfter = receipts.reduce((latest, receipt) =>
      receipt.agent === agent && ["text", "pass", "empty"].includes(receipt.outcome) &&
        Number.isSafeInteger(receipt.recordedAfterN)
        ? Math.max(latest, receipt.recordedAfterN) : latest, -1);
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.n <= completedAfter) return null;
      if (entry.kind === "agent" && entry.author === agent && !entry.meta?.error) return null;
      if (entry.meta?.agent !== agent || !entry.meta?.error || entry.meta?.stopped || resolved[String(entry.n)]) continue;
      return { id: entry.n, text: entry.meta.technicalError || entry.text };
    }
    return null;
  }
  function setPopoverOpen(box, open) {
    box.classList.toggle("open", open);
    box.querySelector("button").setAttribute("aria-expanded", String(open));
  }
  function bindPopovers(container) {
    const boxFor = event => event.target.closest?.(".seat-error");
    const closeAll = () => container.querySelectorAll(".seat-error.open").forEach(box => setPopoverOpen(box, false));
    container.addEventListener("pointerover", event => {
      const box = boxFor(event);
      if (box && event.pointerType !== "touch") setPopoverOpen(box, true);
    });
    container.addEventListener("pointerout", event => {
      const box = boxFor(event);
      if (box && !box.contains(event.relatedTarget)) setPopoverOpen(box, false);
    });
    container.addEventListener("focusin", event => {
      const box = boxFor(event);
      if (box && event.target.matches(":focus-visible")) setPopoverOpen(box, true);
    });
    container.addEventListener("focusout", event => {
      const box = boxFor(event);
      if (box && !box.contains(event.relatedTarget)) setPopoverOpen(box, false);
    });
    container.addEventListener("click", event => {
      const box = boxFor(event);
      if (box && event.target.closest(".seat-error-button")) {
        // Mouse focus must not pin a hover popup after the pointer leaves.
        setPopoverOpen(box, event.pointerType === "touch" ? !box.classList.contains("open") : true);
      }
    });
    container.ownerDocument.addEventListener("pointerdown", event => {
      if (!boxFor(event)) closeAll();
    });
    container.ownerDocument.addEventListener("keydown", event => {
      if (event.key === "Escape") closeAll();
    });
  }
  root.ParleySeatErrors = { latestSeatError, setPopoverOpen, bindPopovers };
})(typeof window === "undefined" ? globalThis : window);
