import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { changedFiles, fileDiff, resolveProjectFile, discoverRepositories, resolveRepository } from '../lib/work-changes.mjs';
import { subagentEvents } from '../lib/subagent-events.mjs';
import { isolatedServer } from './server-fixture.mjs';

const source = await fs.readFile(new URL('../ui/work-panel.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('diff rows align removals/additions, context and independent hunks', () => {
  const rows = window.ParleyWorkPanel.diffRows('--- a/x\n+++ b/x\n@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n same\n@@ -10 +11 @@\n-tail\n+end');
  assert.deepEqual(plain(rows[1]), { kind: 'change', before: { n: 1, text: 'old' }, after: { n: 1, text: 'new' } });
  assert.equal(rows[2].before, undefined);
  assert.equal(rows[3].before.n, 2);
  assert.equal(rows[3].after.n, 3);
  assert.equal(rows.at(-1).after.n, 11);
});

test('file status labels and inline changes preserve source and distinguish separate edits', () => {
  for (const [status, key] of [['??', 'new'], ['AM', 'new'], ['M', 'modified'], ['D', 'deleted'], ['UU', 'conflict'], ['AA', 'conflict'], ['DD', 'conflict']]) assert.equal(window.ParleyWorkPanel.fileStatusKey(status), key);
  const before = 'const title = "기존"; enabled = false; <script>';
  const after = 'const title = "새제목"; enabled = true; <script>';
  const parts = plain(window.ParleyWorkPanel.inlineParts(before, after));
  assert.equal(parts.before.map((part) => part.text).join(''), before);
  assert.equal(parts.after.map((part) => part.text).join(''), after);
  assert.deepEqual(parts.before.filter((part) => part.changed).map((part) => part.text), ['기존', 'false']);
  assert.deepEqual(parts.after.filter((part) => part.changed).map((part) => part.text), ['새제목', 'true']);
  const long = 'x '.repeat(1000);
  const bounded = window.ParleyWorkPanel.inlineParts(long + 'old', long + 'new');
  assert.equal(bounded.after.map((part) => part.text).join(''), long + 'new');
});

test('subagent state uses structured lifecycle records, not chat mentions or whole-turn completion', () => {
  assert.deepEqual(subagentEvents('gemini', { response: 'I started an agent' }), []);
  assert.deepEqual(subagentEvents('claude', { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Task' }] } }), []);
  assert.deepEqual(subagentEvents('claude', { type: 'system', subtype: 'task_started', task_id: 'shell', task_type: 'local_bash' }), []);
  const started = subagentEvents('claude', { type: 'system', subtype: 'task_started', task_id: 'a', task_type: 'local_agent', description: 'review' })[0];
  assert.equal(started.status, 'running');
  const done = subagentEvents('codex', { type: 'item.completed', item: { type: 'collab_tool_call', receiver_thread_ids: ['b'], agents_states: { b: { status: 'completed' } } } })[0];
  assert.equal(done.status, 'completed');
  const records = [{ author: 'claude', meta: { runId: 'r', subagent: started } }];
  assert.equal(window.ParleyWorkPanel.agentsFromEntries(records, [])[0].status, 'observed');
  assert.equal(window.ParleyWorkPanel.agentsFromEntries(records, [{ agent: 'claude', runId: 'r' }])[0].status, 'running');
});

test('read-only changes cover HEAD, staged/worktree edits, new/deleted files and reject outside paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'parley-diff-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8' });
  try {
    git('init', '-q');
    await fs.writeFile(path.join(root, '수정 파일.txt'), 'before\n');
    await fs.writeFile(path.join(root, 'deleted.txt'), 'old\n');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
    await fs.writeFile(path.join(root, '수정 파일.txt'), 'staged\n'); git('add', '.');
    await fs.writeFile(path.join(root, '수정 파일.txt'), 'current\n');
    await fs.unlink(path.join(root, 'deleted.txt'));
    await fs.writeFile(path.join(root, 'new.txt'), '<script>text</script>\n');
    await fs.writeFile(path.join(root, 'binary.dat'), Buffer.from([0, 1, 2]));
    const before = git('status', '--porcelain');
    const listing = await changedFiles(root);
    assert.equal(listing.available, true);
    assert.equal(listing.files.length, 4);
    assert.ok(listing.files.some((file) => file.path === '수정 파일.txt' && file.added === 1 && file.removed === 1));
    const diff = await fileDiff(root, '수정 파일.txt');
    assert.match(diff.patch, /-before/); assert.match(diff.patch, /\+current/);
    assert.match((await fileDiff(root, 'new.txt')).patch, /\+<script>/);
    assert.equal((await fileDiff(root, 'deleted.txt')).deleted, true);
    assert.equal((await fileDiff(root, 'binary.dat')).unavailable, 'binary');
    assert.equal(listing.files.find((file) => file.path === 'new.txt').added, 1);
    assert.equal(listing.files.find((file) => file.path === 'new.txt').removed, 0);
    assert.equal(listing.files.find((file) => file.path === 'binary.dat').added, undefined);
    await assert.rejects(resolveProjectFile(root, '../outside.txt'), /outside/);
    assert.equal(git('status', '--porcelain'), before);
    await fs.mkdir(path.join(root, 'sub'));
    await fs.writeFile(path.join(root, 'sub', 'local.txt'), 'sub\n');
    const sub = await changedFiles(path.join(root, 'sub'));
    assert.deepEqual(sub.files.map((file) => file.path), ['sub/local.txt']);
    await assert.rejects(resolveProjectFile(path.join(root, 'sub'), 'new.txt'), /outside/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('new-file line counts handle empty files, CRLF, missing final newline and unborn staged files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'parley-lines-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root, windowsHide: true });
    const fixtures = { 'empty.txt': ['', 0], 'crlf.txt': ['a\r\nb\r\n', 2], 'no-final.txt': ['a\nb', 2], 'blank.txt': ['\n', 1] };
    for (const [name, [content]] of Object.entries(fixtures)) await fs.writeFile(path.join(root, name), content);
    execFileSync('git', ['add', 'crlf.txt'], { cwd: root, windowsHide: true });
    await fs.writeFile(path.join(root, 'large.txt'), 'x'.repeat(512 * 1024 + 1));
    const { files } = await changedFiles(root);
    for (const [name, [, lines]] of Object.entries(fixtures)) {
      assert.equal(files.find((file) => file.path === name).added, lines);
      assert.equal(files.find((file) => file.path === name).removed, 0);
    }
    assert.equal(files.find((file) => file.path === 'large.txt').added, undefined);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('generated caches are omitted without hiding settings; large binary files are not treated as text', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'parley-cache-filter-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root, windowsHide: true });
    for (const name of ['.serena/cache/java/document_symbols.pkl', '__pycache__/x.pyc', 'src/.pytest_cache/item', '.serena/project.yml', '.serena/.gitignore', 'src/cache-service.js']) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), 'data\n');
    }
    await fs.writeFile(path.join(root, 'model.pkl'), Buffer.alloc(512 * 1024 + 1, 65));
    await fs.writeFile(path.join(root, 'opaque.dat'), Buffer.alloc(512 * 1024 + 1));
    await fs.writeFile(path.join(root, 'large.txt'), 'x'.repeat(512 * 1024 + 1));
    const names = (await changedFiles(root)).files.map((file) => file.path);
    assert.ok(names.includes('.serena/project.yml'));
    assert.ok(names.includes('.serena/.gitignore'));
    assert.ok(names.includes('src/cache-service.js'));
    assert.ok(!names.includes('.serena/cache/java/document_symbols.pkl'));
    assert.ok(!names.includes('__pycache__/x.pyc'));
    assert.ok(!names.includes('src/.pytest_cache/item'));
    assert.equal((await fileDiff(root, 'model.pkl')).unavailable, 'binary');
    assert.equal((await fileDiff(root, 'opaque.dat')).unavailable, 'binary');
    assert.equal((await fileDiff(root, 'large.txt')).unavailable, 'large');
    assert.equal(await fs.readFile(path.join(root, '.serena/project.yml'), 'utf8'), 'data\n');
    assert.equal(await fs.readFile(path.join(root, '.serena/cache/java/document_symbols.pkl'), 'utf8'), 'data\n');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('usage automatically reuses the server cache and only manual refresh bypasses it', async () => {
  const app = await fs.readFile(new URL('../ui/app.js', import.meta.url), 'utf8');
  const calls = [];
  const context = vm.createContext({
    state: { room: 'test' }, URLSearchParams, usageRequest: null,
    usageIsFresh: () => false, renderUsage() {}, $: () => ({}), tr: (_, fallback) => fallback,
    api: async (url) => { calls.push(url); return { room: 'test', providers: [] }; },
  });
  vm.runInContext(app.slice(app.indexOf('async function loadUsage('), app.indexOf('// The project manager')), context);
  await context.loadUsage(); await context.loadUsage(true);
  assert.equal(new URL(calls[0], 'http://localhost').searchParams.has('refresh'), false);
  assert.equal(new URL(calls[1], 'http://localhost').searchParams.get('refresh'), '1');
});

test('project change API and diff endpoint stay scoped to connected projects', async () => {
  const server = await isolatedServer({ env: { PATH: process.env.PATH } });
  try {
    const project = path.join(server.root, 'project');
    await fs.mkdir(project);
    execFileSync('git', ['init', '-q'], { cwd: project, windowsHide: true });
    await fs.writeFile(path.join(project, 'hello.txt'), 'hello\n');
    await server.configure('default', { projectDir: project, projectDirs: [project] });
    const listing = await server.api('GET', '/api/work-changes?room=default');
    assert.equal(listing.status, 200);
    assert.equal(listing.data.projects[0].files[0].path, 'hello.txt');
    const diff = await server.api('GET', '/api/work-diff?room=default&project=0&file=hello.txt');
    assert.equal(diff.status, 200);
    assert.match(diff.data.patch, /\+hello/);
    assert.equal((await server.api('GET', '/api/work-diff?room=default&project=99&file=hello.txt')).status, 403);
    assert.equal((await server.api('GET', '/api/work-diff?room=default&project=0&file=../outside')).status, 403);
    assert.equal((await server.api('POST', '/api/open', { room: 'default', what: 'project', path: project, application: 'default', file: '../outside' })).status, 403);
  } finally { await server.close(); }
});

test('nested repository discovery respects depth, excludes dependencies, refreshes cache and scopes diff', async () => {
  const server = await isolatedServer({ env: { PATH: process.env.PATH } });
  const parent = path.join(server.root, 'RAgentA');
  const init = async (name, content) => {
    const dir = path.join(parent, name);
    await fs.mkdir(dir, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: dir, windowsHide: true });
    await fs.writeFile(path.join(dir, 'same.txt'), content);
    return dir;
  };
  try {
    await init('web', 'web only\n');
    await init('services/api', 'api only\n');
    await init('a/b/third', 'third level\n');
    await init('deep/a/b/fourth', 'too deep\n');
    await init('node_modules/ignored', 'excluded\n');
    await server.configure('default', { projectDir: parent, projectDirs: [parent] });
    const repos = await discoverRepositories(parent);
    assert.deepEqual(repos.repositories.map((item) => item.relative).sort(), ['a/b/third', 'services/api', 'web']);
    await init('new-repo', 'new\n');
    assert.equal((await discoverRepositories(parent)).repositories.length, 3);
    assert.equal((await discoverRepositories(parent, { refresh: true })).repositories.length, 4);
    await assert.rejects(resolveRepository(parent, '../elsewhere'), /outside/);
    await assert.rejects(resolveRepository(parent, 'node_modules/ignored'), /not in/);
    const listing = await server.api('GET', '/api/work-changes?room=default');
    assert.equal(listing.status, 200);
    assert.ok(listing.data.projects.some((item) => item.repository === 'services/api'));
    const diff = await server.api('GET', '/api/work-diff?room=default&project=0&repository=services%2Fapi&file=same.txt');
    assert.equal(diff.status, 200);
    assert.match(diff.data.patch, /api only/);
    assert.doesNotMatch(diff.data.patch, /web only/);
    assert.equal((await server.api('GET', '/api/work-diff?room=default&project=0&repository=../outside&file=same.txt')).status, 403);
    assert.equal((await server.api('POST', '/api/open', { room: 'default', what: 'project', path: parent, repository: 'services/api', application: 'default', file: '../web/same.txt' })).status, 403);
  } finally { await server.close(); }
});


test('folder tree retains original diff indexes and nested duplicate filenames', () => {
  const files = [{path:'src/card.js'}, {path:'docs/card.js'}, {path:'README.md'}, {path:'src/deep/card.js'}, {path:'__proto__/safe.js'}, {path:'한글/안내.md'}];
  const tree = window.ParleyWorkPanel.fileTree(files);
  assert.equal(tree.files[0].name, 'README.md');
  assert.equal(tree.files[0].index, 2);
  assert.equal(tree.folders.get('src').files[0].index, 0);
  assert.equal(tree.folders.get('docs').files[0].index, 1);
  assert.equal(tree.folders.get('src').folders.get('deep').path, 'src/deep');
  assert.equal(tree.folders.get('src').folders.get('deep').files[0].index, 3);
  assert.equal(tree.folders.get('__proto__').files[0].index, 4);
  assert.equal(tree.folders.get('한글').files[0].name, '안내.md');
  assert.equal(window.ParleyWorkPanel.fileTree([]).folders.size, 0);
});
