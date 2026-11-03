import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../ui/shared-browser.js', import.meta.url), 'utf8');
function fixture({confirm = () => true, api}) {
  const nodes = new Map();
  const document = {getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {hidden: false, textContent: '', innerHTML: '', setAttribute() {}, querySelectorAll() {return []}});
    return nodes.get(id);
  }};
  const window = {confirm};
  vm.runInNewContext(source, {window, document, setInterval() {}, Date});
  const state = {room: 'test'};
  window.ParleySharedBrowser.create({state, api, t: key => key, esc: String, seatName: String});
  return {nodes, state};
}
const required = () => Object.assign(new Error('setup required'), {code: 'BROWSER_SETUP_REQUIRED'});

test('cancel makes no approved setup request; retry asks again', async () => {
  const calls = []; let confirmations = 0;
  const {nodes} = fixture({confirm: () => {confirmations++; return false}, api: async (_, body) => {calls.push(body); throw required()}});
  await nodes.get('browserOpen').onclick();
  assert.equal(calls.length, 1); assert.equal(confirmations, 1);
  assert.equal(calls[0].setupApproved, undefined);
  assert.equal(nodes.get('browserError').textContent, '');
  await nodes.get('browserOpen').onclick();
  assert.equal(confirmations, 2);
});

test('confirm approves exactly one setup request and ready browsers skip the dialog', async () => {
  const calls = []; let confirmations = 0;
  const {nodes} = fixture({confirm: () => {confirmations++; return true}, api: async (_, body) => {
    calls.push(body); if (calls.length === 1) throw required(); return {connected: true};
  }});
  await nodes.get('browserOpen').onclick();
  assert.equal(calls.length, 2); assert.equal(calls[1].setupApproved, true); assert.equal(confirmations, 1);
  assert.equal(nodes.get('browserOpen').hidden, true);
  const ready = fixture({confirm: () => {throw Error('unexpected confirmation')}, api: async () => ({connected: true})});
  await ready.nodes.get('browserOpen').onclick();
  assert.equal(ready.nodes.get('browserOpen').hidden, true);
});

test('failed setup exposes a retry without retaining approval', async () => {
  const calls = [];
  const {nodes} = fixture({api: async (_, body) => {
    calls.push(body); if (!body.setupApproved) throw required(); throw Error('installation failed');
  }});
  await nodes.get('browserOpen').onclick();
  assert.equal(nodes.get('browserError').textContent, 'installation failed');
  assert.equal(nodes.get('browserRetry').hidden, false);
  await nodes.get('browserRetry').onclick();
  assert.equal(calls[2].setupApproved, undefined);
});
