(function (global) {
  'use strict';
  function create({ state, api, t, esc, seatName }) {
    const $ = id => document.getElementById(id);
    let currentRoom = null, revision = 0, pending = null, changing = false, retryOpen = false, info = {};
    function render() {
      $('browserOpen').hidden = !!info.connected;
      $('browserRetry').hidden = !retryOpen;
      $('browserDisconnect').hidden = !info.connected && !info.opening && !changing;
      $('browserMode').disabled = !!info.connected || changing || !!info.opening;
      $('browserManual').hidden = !info.connected;
      $('browserManual').textContent = t(info.manual ? 'browser.resume' : 'browser.manual');
      $('browserManual').setAttribute('aria-pressed', String(!!info.manual));
      $('browserStatus').textContent = t(info.phase ? `browser.phase.${info.phase}` : changing ? 'browser.working' : info.connected ? (info.manual ? 'browser.paused' : 'browser.connected') : 'browser.disconnected');
      $('browserTabs').innerHTML = (info.tabs || []).map(tab => {
        const label = tab.scope === 'shared' ? t('browser.shared') : `${seatName(tab.scope.slice(8))} · ${t('browser.private')}`;
        const activity = tab.activity?.reading ? 'browser.reading' : 'browser.busy';
        const elapsed = Math.max(0, Math.floor((Date.now() - (tab.activity?.startedAt || Date.now())) / 1000));
        const duration = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
        const seen = (tab.seen || []).map(item => {
          const time = new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return `<small class="browser-seen">${esc(seatName(item.seat))} · ${esc(t(item.reading ? 'browser.lastRead' : 'browser.lastAction'))} ${esc(time)}</small>`;
        }).join('');
        return `<button type="button" class="shared-browser-tab" data-scope="${esc(tab.scope)}" title="${esc(t('browser.focus'))}"><b>${esc(label)}</b><span>${esc(tab.url)}</span>${tab.busy ? `<small class="browser-active" role="status">● ${esc(seatName(tab.busy))} · ${esc(t(activity))} <span data-browser-started="${Number(tab.activity?.startedAt) || Date.now()}">${duration}</span></small>` : ''}${seen}</button>`;
      }).join('');
      for (const button of $('browserControls').querySelectorAll('button')) button.disabled = changing && button.id !== 'browserDisconnect';
    }
    async function refresh() {
      if (!state.room || pending) return;
      const room = state.room, version = revision;
      const request = api(`/api/browser?room=${encodeURIComponent(room)}`);
      pending = request;
      try { const result = await request; if (room === state.room && version === revision) { info = result; if (info.connected || info.opening) $('browserMode').value = info.mode || 'chrome'; render(); } }
      catch (error) { if (room === state.room && version === revision) $('browserError').textContent = error.message; }
      finally { if (pending === request) pending = null; }
    }
    async function action(name, extra = {}) {
      if ((changing && name !== 'close') || !state.room) return;
      if (name === 'open') extra.mode = $('browserMode').value || 'chrome';
      const room = state.room, version = ++revision;
      changing = true; retryOpen = false; $('browserExtension').hidden = true; $('browserError').textContent = ''; render();
      try {
        let result;
        try { result = await api('/api/browser', { room, action: name, ...extra }); }
        catch (error) {
          if (name !== 'open' || error.code !== 'BROWSER_SETUP_REQUIRED') throw error;
          if (state.room !== room || version !== revision) return;
          if (!global.confirm(`${t('browser.setupTitle')}\n\n${t('browser.setupConfirm')}`)) return;
          result = await api('/api/browser', { room, action: 'open', ...extra, setupApproved: true });
        }
        if (state.room === room && version === revision) info = result;
      }
      catch (error) { if (state.room === room && version === revision) { $('browserError').textContent = error.message; retryOpen = name === 'open'; const needsExtension = name === 'open' && error.code === 'BROWSER_EXTENSION_REQUIRED'; $('browserExtension').hidden = !needsExtension; if (needsExtension) $('browserSetupDialog').showModal(); } }
      finally { if (version === revision) { changing = false; render(); } }
    }
    function roomChanged() { currentRoom = state.room; revision++; pending = null; changing = false; retryOpen = false; info = {}; $('browserMode').value = 'chrome'; $('browserExtension').hidden = true; $('browserError').textContent = ''; render(); refresh(); }
    $('browserHelp').onclick = () => $('browserSetupDialog').showModal();
    $('browserSetupClose').onclick = () => $('browserSetupDialog').close();
    $('browserSetupConnect').onclick = () => { $('browserSetupDialog').close(); $('browserMode').value = 'chrome'; return action('open'); };
    $('browserSetupDedicated').onclick = () => { $('browserSetupDialog').close(); $('browserMode').value = 'dedicated'; return action('open'); };
    $('browserOpen').onclick = () => action('open');
    $('browserRetry').onclick = () => action('open');
    $('browserDisconnect').onclick = () => action('close');
    $('browserManual').onclick = () => action('manual', { manual: !info.manual });
    $('browserControls').onclick = event => { event.preventDefault(); event.stopPropagation(); };
    $('browserTabs').onclick = event => { const button = event.target.closest('[data-scope]'); if (button) action('focus', { scope: button.dataset.scope }); };
    setInterval(() => { if (document.hidden) return; if (state.room !== currentRoom) roomChanged(); else refresh(); }, 1500);
    setInterval(() => {
      for (const node of $('browserTabs').querySelectorAll('[data-browser-started]')) {
        const seconds = Math.max(0, Math.floor((Date.now() - Number(node.dataset.browserStarted)) / 1000));
        node.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }
    }, 1000);
    render();
    return { roomChanged };
  }
  global.ParleySharedBrowser = { create };
})(window);
