(function (global) {
  'use strict';
  function fileStatusKey(status = '') {
    if (status.includes('U') || status === 'AA' || status === 'DD') return 'conflict';
    if (status === '??' || status.includes('A')) return 'new';
    if (status.includes('D')) return 'deleted';
    if (status.includes('R')) return 'renamed';
    if (status.includes('C')) return 'copied';
    if (status.includes('T')) return 'typeChanged';
    return 'modified';
  }
  function inlineParts(before, after) {
    const tokenize = (text) => text.match(/\s+|[\p{L}\p{N}_]+|[^\s]/gu) || [];
    const a = tokenize(before), b = tokenize(after);
    const left = [], right = [];
    // Bound work for generated/minified lines; preserve exact source text in all cases.
    if (a.length * b.length > 4096 || a.length + b.length > 256) {
      let start = 0, end = 0;
      while (start < before.length && start < after.length && before[start] === after[start]) start++;
      while (end < before.length - start && end < after.length - start && before.at(-1 - end) === after.at(-1 - end)) end++;
      const parts = (text) => [{ text: text.slice(0, start), changed: false }, { text: text.slice(start, text.length - end), changed: true }, { text: end ? text.slice(-end) : '', changed: false }].filter((part) => part.text);
      return { before: parts(before), after: parts(after) };
    }
    const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    const add = (parts, text, changed) => {
      if (parts.at(-1)?.changed === changed) parts.at(-1).text += text;
      else parts.push({ text, changed });
    };
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { add(left, a[i++], false); add(right, b[j++], false); }
      else if (i < a.length && (j === b.length || table[i + 1][j] >= table[i][j + 1])) add(left, a[i++], true);
      else add(right, b[j++], true);
    }
    return { before: left, after: right };
  }
  function diffRows(patch) {
    const rows = [];
    let oldLine = 0, newLine = 0, active = false, removed = [], added = [];
    const flush = () => {
      for (let i = 0; i < Math.max(removed.length, added.length); i++) rows.push({ kind: 'change', before: removed[i], after: added[i] });
      removed = []; added = [];
    };
    for (const line of String(patch || '').split('\n')) {
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) { flush(); oldLine = +hunk[1]; newLine = +hunk[2]; active = true; rows.push({ kind: 'hunk', text: line }); }
      else if (active && line.startsWith('-')) removed.push({ n: oldLine++, text: line.slice(1) });
      else if (active && line.startsWith('+')) added.push({ n: newLine++, text: line.slice(1) });
      else if (active && line.startsWith(' ')) { flush(); rows.push({ kind: 'context', before: { n: oldLine++, text: line.slice(1) }, after: { n: newLine++, text: line.slice(1) } }); }
    }
    flush(); return rows;
  }
  function agentsFromEntries(entries, busy = []) {
    const latest = new Map();
    for (const entry of entries || []) {
      const child = entry.meta?.subagent;
      if (!child?.id) continue;
      const key = `${entry.author}:${entry.meta.runId || ''}:${child.id}`;
      const prior = latest.get(key);
      // A wait event with no state must not erase a known completion.
      const status = child.status === 'observed' && prior ? prior.status : child.status;
      latest.set(key, { ...child, status, seat: entry.author, runId: entry.meta.runId });
    }
    return [...latest.values()].slice(-60).map((child) => ({ ...child,
      status: child.status === 'running' && !busy.some((run) => run.agent === child.seat && run.runId === child.runId) ? 'observed' : child.status,
    }));
  }
  function enableSectionOrder(container, t) {
    const key = 'parley.workSectionOrder';
    const sections = [...container.children].filter(node => node.matches('.work-section[data-section]'));
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) {
        const ordered = [...new Set(saved)].map(id => sections.find(section => section.dataset.section === id)).filter(Boolean);
        [...ordered, ...sections.filter(section => !ordered.includes(section))].forEach(section => container.append(section));
      }
    } catch {}
    let dragging = null, target = null, after = false, suppressClick = false;
    const save = () => {
      try { localStorage.setItem(key, JSON.stringify([...container.children].filter(node => sections.includes(node)).map(node => node.dataset.section))); } catch {}
    };
    const clearTarget = () => {
      sections.forEach(section => section.classList.remove('drop-before', 'drop-after'));
      target = null;
    };
    const finish = () => {
      dragging?.classList.remove('section-dragging');
      dragging = null; clearTarget();
      setTimeout(() => { suppressClick = false; }, 0);
    };
    sections.forEach(section => {
      const summary = section.querySelector(':scope > summary');
      summary.draggable = false;
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'work-section-handle';
      handle.textContent = '⠿';
      handle.draggable = true;
      handle.dataset.i18nTitle = 'workPanel.reorderHint';
      handle.dataset.i18nAriaLabel = 'workPanel.reorderHint';
      handle.title = t('workPanel.reorderHint');
      handle.setAttribute('aria-label', t('workPanel.reorderHint'));
      summary.append(handle);
      handle.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
      handle.addEventListener('dragstart', event => {
        event.stopPropagation();
        dragging = section; suppressClick = true;
        section.classList.add('section-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', section.dataset.section);
      });
      handle.addEventListener('dragend', finish);
      summary.addEventListener('click', event => {
        if (event.target.closest('button')) event.preventDefault();
        if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
      });
      summary.addEventListener('keydown', event => {
        if (![summary, handle].includes(event.target) || !event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const visible = [...container.children].filter(node => sections.includes(node) && !node.hidden);
        const next = visible[visible.indexOf(section) + (event.key === 'ArrowUp' ? -1 : 1)];
        if (!next) return;
        container.insertBefore(section, event.key === 'ArrowUp' ? next : next.nextSibling);
        save(); event.target.focus({ preventScroll: true });
      });
    });
    container.addEventListener('dragover', event => {
      if (!dragging) return;
      const candidate = event.target.closest('.work-section[data-section]');
      if (!candidate || candidate.parentElement !== container || candidate === dragging) { clearTarget(); return; }
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      clearTarget(); target = candidate;
      const box = target.getBoundingClientRect();
      after = event.clientY > box.top + box.height / 2;
      target.classList.add(after ? 'drop-after' : 'drop-before');
    });
    container.addEventListener('dragleave', event => { if (!container.contains(event.relatedTarget)) clearTarget(); });
    container.addEventListener('drop', event => {
      if (!dragging || !target) return;
      event.preventDefault();
      container.insertBefore(dragging, after ? target.nextSibling : target);
      save(); finish();
    });
  }
  function create({ state, api, t, esc, seatName, loadUsage, usageRows, usageAgo, checkedAt, openFile }) {
    const $ = (id) => document.getElementById(id);
    const panel = $('workPanel');
    let hunkIndex = 0;
    function syncHunkNavigation() {
      const hunks = [...$('workDiffCode').querySelectorAll('.diff-hunk')];
      $('workHunkNav').hidden = hunks.length === 0;
      hunkIndex = Math.max(0, Math.min(hunkIndex, hunks.length - 1));
      hunks.forEach((hunk, index) => hunk.classList.toggle('current', index === hunkIndex));
      $('workHunkPosition').textContent = hunks.length ? `${hunkIndex + 1} / ${hunks.length}` : '';
      $('workHunkPrev').disabled = hunkIndex === 0;
      $('workHunkNext').disabled = hunkIndex >= hunks.length - 1;
      return hunks;
    }
    function goToHunk(index) {
      hunkIndex = index;
      const hunks = syncHunkNavigation();
      const target = hunks[hunkIndex];
      if (!target) return;
      const scroller = $('workDiffCode');
      scroller.scrollTo({ top: scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top, behavior: 'instant' });
    }
    $('workHunkPrev').onclick = () => goToHunk(hunkIndex - 1);
    $('workHunkNext').onclick = () => goToHunk(hunkIndex + 1);
    let projects = [], selection = null, revision = 0, pending = null, lastCheck = 0, currentRoom = null;
    let visible = innerWidth > 1100;
    try { const saved = localStorage.getItem('parley.workPanel'); if (saved !== null) visible = saved === 'open'; } catch {}
    function setVisible(value) {
      visible = value; panel.hidden = !value;
      const toggle = $('workPanelToggle');
      const hadFocus = document.activeElement === toggle;
      toggle.setAttribute('aria-expanded', String(value));
      if (value) panel.querySelector('.work-panel-head').prepend(toggle);
      else $('archivesBtn').after(toggle);
      if (hadFocus) toggle.focus({ preventScroll: true });
      try { localStorage.setItem('parley.workPanel', value ? 'open' : 'closed'); } catch {}
      if (value) refresh();
    }
    const empty = (key) => `<p class="work-empty">${esc(t(key))}</p>`;
    function renderFiles() {
      const list = $('workProjects');
      const expanded = new Map([...list.querySelectorAll('details[data-key]')].map((el) => [el.dataset.key, el.open]));
      const open = (key, fallback) => (expanded.get(key) ?? fallback) ? 'open' : '';
      const groups = new Map();
      projects.forEach((project, index) => {
        if (!groups.has(project.id)) groups.set(project.id, []);
        groups.get(project.id).push({ project, index });
      });
      list.innerHTML = [...groups].map(([id, items]) => {
        const parent = items[0].project;
        const total = items.reduce((sum, { project }) => sum + project.files.length, 0);
        const contents = items.map(({ project, index }) => {
          const files = !project.available ? empty(project.reason === 'not-git' ? 'workPanel.notGit' : 'workPanel.readFailed') : project.files.map((file, fileIndex) =>
            `<button class="work-file" data-project="${index}" data-file="${fileIndex}" title="${esc(file.path)}"><span>${esc(file.path)}</span><small>${esc(t('workPanel.file.' + fileStatusKey(file.status)))}</small><span class="work-counts" title="${esc(t(Number.isFinite(file.added) ? 'workPanel.lineCounts' : 'workPanel.unknownCounts'))}">${Number.isFinite(file.added) ? `<i>+${file.added}</i> <b>−${file.removed}</b>` : '—'}</span></button>`).join('') || empty('workPanel.clean');
          const key = `${id}:${project.repository || ''}`;
          const body = files + (project.truncated ? empty('workPanel.truncated') : '');
          return project.repository ? `<details class="work-repository" data-key="${esc(key)}" ${open(key, items.length === 1)}><summary title="${esc(project.repository)}">${esc(project.repository)}<small>${project.files.length}</small></summary>${body}</details>` : body;
        }).join('');
        return `<details class="work-project" data-key="project:${id}" ${open(`project:${id}`, groups.size === 1)}><summary title="${esc(parent.path)}">${esc(parent.name)}<small>${total}</small></summary>${contents}${parent.discoveryTruncated ? empty('workPanel.discoveryTruncated') : ''}</details>`;
      }).join('') || empty('workPanel.noProjects');
      list.querySelectorAll('[data-file]').forEach((button) => button.onclick = () => {
        const project = projects[Number(button.dataset.project)];
        showDiff(project, project.files[Number(button.dataset.file)]);
      });
    }
    function renderAgents() {
      const agents = agentsFromEntries(state.entries, state.summary?.busyInfo);
      $('workAgentSection').hidden = agents.length === 0;
      const groups = (state.summary?.seats || []).map((seat) => {
        const items = agents.filter((child) => child.seat === seat);
        if (!items.length) return '';
        return `<div class="work-agent-group"><b>${esc(seatName(seat))}</b>` + (items.length ? items.map((child) =>
          `<div class="work-agent"><span title="${esc(child.id)}">${esc(child.label)}</span><small>${esc(t('workPanel.' + child.status))}</small></div>`).join('') : empty('workPanel.noAgents')) + '</div>';
      });
      const content = groups.join('');
      if ($('workAgents').innerHTML !== content) $('workAgents').innerHTML = content;
    }
    function renderUsage() {
      const usage = state.usage?.room === state.room ? state.usage : null;
      $('workUsageRefresh').disabled = state.usageLoading === state.room;
      $('workUsageTime').textContent = state.usageLoading === state.room ? t('usage.loading') : usage ? usageAgo(checkedAt(usage)) : t('usage.notChecked');
      let content = usage ? usage.providers.map((provider) => `<div class="work-usage-provider"><b>${esc(provider.label || provider.provider)}</b>` +
        (provider.error ? `<p class="usage-error">${esc(provider.error)}</p>` : '') + (usageRows(provider) || empty('usage.noData')) + '</div>').join('') : empty('usage.loading');
      if (state.usageError?.room === state.room) content = `<p class="usage-error">${esc(state.usageError.message)}</p>` + (usage ? content : '');
      if ($('workUsage').innerHTML !== content) $('workUsage').innerHTML = content;
    }
    async function refresh(force = false) {
      if (!state.summary || !visible || document.hidden) return;
      const room = state.room;
      if (pending?.room === room) return pending.promise;
      $('workRefresh').disabled = true;
      const promise = api('/api/work-changes?' + new URLSearchParams({ room, ...(force ? { refresh: '1' } : {}) }));
      pending = { room, promise };
      try {
        const data = await promise;
        if (state.room !== room) return;
        projects = data.projects; renderFiles();
      } catch (error) { if (state.room === room) $('workProjects').textContent = error.message; }
      finally { if (pending?.promise === promise) { pending = null; lastCheck = Date.now(); $('workRefresh').disabled = false; } }
    }
    function closeDiff() {
      revision++; selection = null; panel.classList.remove('with-diff');
      $('workOverview').hidden = false; $('workDiff').hidden = true;
    }
    async function showDiff(project, file) {
      const version = ++revision, room = state.room;
      selection = { project, file, room }; panel.classList.add('with-diff');
      $('workOverview').hidden = true; $('workDiff').hidden = false;
      $('workFilePath').textContent = file.path;
      $('workFilePath').title = `${project.path}${project.repository ? '/' + project.repository : ''} · ${t('workPanel.openDefault')}`;
      $('workDiffCode').textContent = t('workPanel.loading');
      hunkIndex = 0; syncHunkNavigation();
      $('workDiffStats').textContent = '';
      $('workDiffScope').textContent = t(project.baseline === 'empty' ? 'workPanel.emptyScope' : 'workPanel.scope');
      $('workFilePath').disabled = file.status.includes('D');
      try {
        const data = await api('/api/work-diff?' + new URLSearchParams({ room, project: project.id, repository: project.repository || '', file: file.path }));
        if (version !== revision || state.room !== room) return;
        if (data.unavailable || data.binary) { $('workDiffCode').textContent = t(data.unavailable === 'large' ? 'workPanel.large' : 'workPanel.binary'); return; }
        const cell = (part, kind, fragments) => `<div class="diff-cell ${part ? kind : 'empty'}">${part ? `<span class="diff-line">${part.n}</span><span class="diff-sign" aria-hidden="true">${kind === 'removed' ? '−' : kind === 'added' ? '+' : ''}</span><code>${fragments ? fragments.map((fragment) => fragment.changed ? `<mark>${esc(fragment.text)}</mark>` : esc(fragment.text)).join('') : esc(part.text)}</code>` : ''}</div>`;
        const rows = diffRows(data.patch);
        const changed = rows.filter((row) => row.kind === 'change');
        $('workDiffStats').innerHTML = `<i>+${changed.filter((row) => row.after).length}</i> <b>−${changed.filter((row) => row.before).length}</b>`;
        $('workDiffCode').innerHTML = rows.slice(0, 4000).map((row) => {
          if (row.kind === 'hunk') return `<div class="diff-hunk">${esc(row.text)}</div>`;
          const parts = row.kind === 'change' && row.before && row.after ? inlineParts(row.before.text, row.after.text) : null;
          return `<div class="diff-row ${row.kind}">${cell(row.before, row.kind === 'change' ? 'removed' : 'before', parts?.before)}${cell(row.after, row.kind === 'change' ? 'added' : 'after', parts?.after)}</div>`;
        }).join('') || empty('workPanel.clean');
        if (rows.length > 4000) $('workDiffCode').insertAdjacentHTML('beforeend', empty('workPanel.diffTruncated'));
        goToHunk(0);
      } catch (error) { if (version === revision) $('workDiffCode').textContent = error.message; }
    }
    $('workFilePath').onclick = async () => {
      const selected = selection;
      if (!selected) return;
      $('workFilePath').disabled = true;
      try { await openFile(selected.project.path, selected.file.path, selected.room, selected.project.repository || ''); }
      finally { if (selection === selected) $('workFilePath').disabled = false; }
    };
    $('workPanelToggle').onclick = () => setVisible(!visible);
    $('workClose').onclick = () => setVisible(false);
    $('workBack').onclick = closeDiff;
    $('workRefresh').onclick = (event) => { event.preventDefault(); event.stopPropagation(); refresh(true); };
    $('workDiffRefresh').onclick = () => selection && showDiff(selection.project, selection.file);
    $('workUsageRefresh').onclick = async (event) => {
      event.preventDefault(); event.stopPropagation();
      $('workUsageRefresh').disabled = true;
      try { await loadUsage(true); renderUsage(); } finally { $('workUsageRefresh').disabled = false; }
    };
    function roomChanged() {
      currentRoom = state.room; closeDiff(); projects = []; lastCheck = 0;
      renderFiles(); renderAgents(); renderUsage(); refresh();
      if (!document.hidden && state.summary) loadUsage();
    }
    enableSectionOrder($('workOverview'), t);
    panel.querySelectorAll('[data-section]').forEach((section) => {
      const key = `parley.workSection.${section.dataset.section}`;
      try { const saved = localStorage.getItem(key); if (saved !== null) section.open = saved === 'open'; } catch {}
      section.addEventListener('toggle', () => { try { localStorage.setItem(key, section.open ? 'open' : 'closed'); } catch {} });
    });
    setVisible(visible);
    setInterval(() => {
      if (document.hidden) return;
      if (currentRoom !== state.room) { roomChanged(); return; }
      if (visible) { renderAgents(); renderUsage(); if (!selection && Date.now() - lastCheck > 15000) refresh(); }
    }, 2000);
    setInterval(() => { if (!document.hidden && state.summary) loadUsage(); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && state.summary) { loadUsage(); refresh(); } });
    return { roomChanged, renderUsage };
  }
  global.ParleyWorkPanel = { create, diffRows, agentsFromEntries, fileStatusKey, inlineParts };
})(window);
