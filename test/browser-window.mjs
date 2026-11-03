import test from 'node:test';
import assert from 'node:assert/strict';
import { focusBrowserWindow } from '../lib/browser-window.mjs';

function browser(processInfo) {
  let detached = false;
  return { detached: () => detached, newBrowserCDPSession: async () => ({
    send: async name => { assert.equal(name, 'SystemInfo.getProcessInfo'); return { processInfo }; },
    detach: async () => { detached = true; },
  }) };
}
test('focus passes only the actual browser PID and title as data to a hidden helper', async () => {
  const instance = browser([{ type: 'renderer', id: 1 }, { type: 'browser', id: 789 }]);
  const title = 'Shared "window" $(not-a-command)';
  await focusBrowserWindow(instance, { title: async () => title }, { platform: 'win32', execute(command, args, options, done) {
    assert.match(command, /powershell\.exe$/);
    assert.equal(options.env.PARLEY_BROWSER_PID, '789');
    assert.equal(options.env.PARLEY_BROWSER_TITLE, title);
    assert.equal(options.windowsHide, true);
    assert(!args.join(' ').includes(title));
    assert(instance.detached());
    done(null);
  } });
});
test('focus reports OS activation failures instead of claiming success', async () => {
  const instance = browser([{ type: 'browser', id: 789 }]);
  await assert.rejects(focusBrowserWindow(instance, { title: async () => '', url: () => 'about:blank' }, {
    platform: 'win32', execute(command, args, options, done) {
      assert.equal(options.env.PARLEY_BROWSER_TITLE, 'about:blank'); done(new Error('exit 1'));
    },
  }), /앞으로 가져오지 못했습니다/);
});
test('invalid PID never launches a native helper; non-Windows uses tab activation only', async () => {
  const instance = browser([{ type: 'renderer', id: 1 }]);
  const execute = () => { throw new Error('unexpected helper'); };
  await assert.rejects(focusBrowserWindow(instance, {}, { platform: 'win32', execute }), /프로세스/);
  assert(instance.detached());
  await focusBrowserWindow({}, {}, { platform: 'linux', execute });
});
