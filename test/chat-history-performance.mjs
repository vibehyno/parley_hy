import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../ui/app.js', import.meta.url), 'utf8');
const section = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));

test('ten thousand folded actions create only a heading until opened, once', () => {
  let rendered = 0;
  const node = () => ({ children: [], appendChild(child) { this.children.push(child); } });
  const context = vm.createContext({ document: { createElement: node }, rowByN: new Map(),
    state: { expandedActivity: new Set() }, t: x => x,
    entryEl: e => { rendered++; return { dataset: { n: e.n } }; } });
  vm.runInContext('const deferredWorkByN = new Map();', context);
  vm.runInContext(section('function appendCompletedWork(', '// Translate legacy system notices'), context);
  const parent = node();
  const entries = Array.from({ length: 10000 }, (_, n) => ({ n, meta: { runId: 'long-run' } }));
  context.appendCompletedWork(parent, entries);
  const detail = parent.children[0];
  assert.equal(rendered, 0);
  assert.equal(detail.children.length, 1);
  assert.equal(vm.runInContext('deferredWorkByN.get(9999)', context), detail);
  detail.open = true; detail.ontoggle();
  assert.equal(rendered, 10000);
  detail.open = false; detail.ontoggle();
  detail.open = true; detail.ontoggle();
  assert.equal(rendered, 10000, 'reopening reuses the rendered details');
});

test('history pages reveal fifty entries without deleting or reordering the source', () => {
  const entries = Array.from({ length: 1000 }, (_, n) => ({ n }));
  const state = { entries, renderFromN: 950 };
  const context = vm.createContext({ state, HISTORY_PAGE: 50,
    renderPreservingAnchor: n => { state.renderFromN = n; } });
  vm.runInContext(section('function renderedStartIndex()', '// Widen the rendered window'), context);
  vm.runInContext(section('function expandHistory(', '// Widen just far enough'), context);
  context.expandHistory();
  assert.equal(state.renderFromN, 900);
  for (let i = 0; i < 18; i++) context.expandHistory();
  assert.equal(state.renderFromN, null);
  assert.equal(state.entries, entries);
  assert.equal(entries.length, 1000);
  assert.deepEqual(entries.map(e => e.n), Array.from({ length: 1000 }, (_, n) => n));
});

test('quote navigation materializes a folded target before scrolling', () => {
  const steps = [];
  const row = { scrollIntoView: () => steps.push('scroll'), classList: { remove() {}, add() {} } };
  const detail = { loadEntries: () => steps.push('load'), ontoggle: () => steps.push('open') };
  const context = vm.createContext({ revealEntry: () => steps.push('reveal'),
    deferredWorkByN: new Map([[7, detail]]), chat: { querySelector: () => row }, setTimeout() {} });
  vm.runInContext(section('function jumpToEntry(', 'document.addEventListener("click", (e) => {\n  const target = e.target.closest("[data-jump-n]")'), context);
  context.jumpToEntry(7);
  assert.deepEqual(steps, ['reveal', 'load', 'open', 'scroll']);
  assert.equal(detail.open, true);
});

test('viewport optimization excludes streaming replies and paging restores a message anchor', () => {
  const css = fs.readFileSync(new URL('../ui/styles.css', import.meta.url), 'utf8');
  assert.match(css, /#chat > \.msg\[data-n\]\s*\{\s*content-visibility: auto/);
  assert.match(css, /contain-intrinsic-block-size: auto 180px/);
  const paging = section('function renderPreservingAnchor(', '// Reveal one more page');
  assert.match(paging, /readerAnchor = readAnchor\(\)/);
  assert.equal((paging.match(/applyAnchor\(readerAnchor\)/g) || []).length, 2);
  assert.match(source, /const INITIAL_ENTRY_LIMIT = 50;/);
});
