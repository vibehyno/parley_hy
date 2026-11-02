import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
export function checkActivityRunUi(ok) {
  const src = fs.readFileSync(path.join(here, "..", "ui", "app.js"), "utf8");
  const from = src.indexOf("function activityRunKey(");
  const to = src.indexOf("function appendEntryRange(");
  const block = from >= 0 && to > from ? src.slice(from, to) : "";

  class N {
    constructor(tag) {
      this.tagName = (tag || "div").toUpperCase();
      this.children = []; this.parentNode = null;
      this.dataset = {}; this.className = ""; this.type = ""; this.onclick = null;
      this._text = "";
      const classes = new Set();
      this.classList = {
        add: (...n) => n.forEach((c) => classes.add(c)),
        remove: (...n) => n.forEach((c) => classes.delete(c)),
        contains: (c) => classes.has(c),
      };
    }
    // Only the label markup the toggle writes: enough to give it element
    // children that the code then addresses by position.
    set innerHTML(v) {
      this.children = (String(v).match(/<span/g) || []).map(() => {
        const s = new N("span"); s.parentNode = this; return s;
      });
    }
    get firstElementChild() { return this.children[0] || null; }
    get lastElementChild() { return this.children[this.children.length - 1] || null; }
    setAttribute(name, value) { this[name] = value; }
    set textContent(v) { this._text = String(v); }
    get textContent() { return this._text; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    insertBefore(c, ref) {
      const i = this.children.indexOf(ref);
      c.parentNode = this;
      this.children.splice(i < 0 ? this.children.length : i, 0, c);
      return c;
    }
    before(node) { this.parentNode.insertBefore(node, this); }
    after(node) {
      const p = this.parentNode;
      node.parentNode = p;
      p.children.splice(p.children.indexOf(this) + 1, 0, node);
    }
    remove() {
      const p = this.parentNode;
      if (!p) return;
      p.children.splice(p.children.indexOf(this), 1);
      this.parentNode = null;
    }
    querySelectorAll(sel) {
      const want = [...String(sel).matchAll(/\[([\w-]+)="([^"]*)"]/g)].map(([, name, value]) =>
        [name.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]);
      return this.children.filter((c) => want.every(([k, v]) => String(c.dataset[k]) === v));
    }
  }

  const chat = new N("div");
  const state = { entries: [], expandedActivity: new Set(), live: {} };
  const entryEl = (e) => {
    const node = new N("div");
    node.dataset.n = String(e.n);
    node.className = `${e.kind} ${e.author}`;
    return node;
  };
  const entryIndexOf = (n) => state.entries.findIndex((e) => e.n === n);
  let runs = null;
  try {
    runs = block ? new Function("state", "chat", "document", "entryEl", "entryIndexOf",
      "renderedStartIndex", "isToolActivity", "t",
      `${block}; return { appendActivityEntry, appendActivityRun };`)(
      state, chat, { createElement: (t) => new N(t) }, entryEl, entryIndexOf, () => 0,
      e => e.kind === "activity" && !e.meta?.publicSpeech,
      key => key) : null;
  } catch { /* reported below */ }
  if (typeof (runs && runs.appendActivityEntry) !== "function") {
    return ok("the activity run functions load in isolation", false);
  }

  const arrive = (n, author) => {
    const e = { n, kind: "activity", author, text: `action ${n}` };
    state.entries.push(e);
    return runs.appendActivityEntry(e);
  };
  const runNodes = (startN) => chat.children.filter((c) => c.dataset.runStart !== undefined
    && (startN === undefined || String(c.dataset.runStart) === String(startN)));
  const label = (t) => t.lastElementChild.textContent;

  state.entries.push({ n: 0, kind: "user", author: "user", text: "go" });
  chat.appendChild(entryEl(state.entries[0]));
  const live = new N("div");
  live.dataset.liveAgent = "claude";
  chat.appendChild(live);

  arrive(1, "claude");
  const toggle = runNodes()[0];
  ok("first command is collapsed immediately", runNodes().length === 1 && !!toggle.dataset.activityRun && toggle["aria-expanded"] === "false");
  for (let n = 2; n <= 12; n++) arrive(n, "claude");
  ok("collapsed arrivals update the count without exposing commands", runNodes().length === 1 && runNodes()[0] === toggle && label(toggle) === "action 1");
  ok("live bubble remains last", chat.children.at(-1) === live);
  toggle.onclick();
  const first = runNodes()[0];
  ok("expanding shows all commands", runNodes().length === 12 && toggle["aria-expanded"] === "true");
  arrive(13, "claude");
  ok("expanded arrivals preserve existing rows", runNodes().length === 13 && runNodes()[0] === first);
  const rerendered = new N("div");
  runs.appendActivityRun(rerendered, state.entries.slice(1));
  ok("rerender retains expanded state", rerendered.children.length === 13);
  toggle.onclick();
  ok("collapse hides every command", runNodes().length === 1 && runNodes()[0] === toggle);
  arrive(14, "codex");
  arrive(15, "codex");
  ok("another model has a separate collapsed log", runNodes(14).length === 1 && runNodes().length === 2);
  const collapsed = new N("div");
  runs.appendActivityRun(collapsed, state.entries.slice(1, 14));
  ok("history starts collapsed too", collapsed.children.length === 1);
}
