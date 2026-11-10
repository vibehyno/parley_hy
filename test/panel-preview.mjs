import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('hover preview delays, bridges the gap, dismisses and never changes pinned state', () => {
  const node = () => ({ listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, contains(el) { return el === this; } });
  const window = node(), document = node(), button = node(), panel = node(), media = node();
  media.matches = true; window.matchMedia = () => media;
  let next = 0, pinned = false, shown = false;
  const timers = new Map();
  const flush = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); };
  vm.runInNewContext(fs.readFileSync(new URL('../ui/panel-preview.js', import.meta.url), 'utf8'), {
    window, document, setTimeout: fn => { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id),
  });
  const preview = window.MoyeoPanelPreview.create({ button, panel, isPinned: () => pinned, show: () => { shown = true; }, hide: () => { shown = false; } });
  button.listeners.pointerenter({}); assert.equal(shown, false);
  flush(); assert.equal(shown, true);
  button.listeners.pointerleave({ relatedTarget: null });
  panel.listeners.pointerenter({}); flush(); assert.equal(shown, true);
  panel.listeners.pointerleave({ relatedTarget: button }); flush(); assert.equal(shown, true);
  panel.listeners.pointerleave({ relatedTarget: null }); flush(); assert.equal(shown, false);
  button.listeners.pointerenter({}); flush(); button.listeners.click(); pinned = true;
  assert.equal(shown, false); button.listeners.pointerenter({}); flush(); assert.equal(shown, false);
  pinned = false; button.listeners.pointerenter({ pointerType: 'touch' }); flush(); assert.equal(shown, false);
  button.listeners.pointerenter({}); flush(); document.listeners.keydown({ key: 'Escape' }); assert.equal(shown, false);
  button.listeners.pointerenter({}); preview.reset(); flush(); assert.equal(shown, false);
});
