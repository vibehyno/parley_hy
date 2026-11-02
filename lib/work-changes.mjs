import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const LIMIT = 512 * 1024;
const generatedCache = (file) => /(?:^|\/)(?:\.serena\/cache|__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache)(?:\/|$)/i.test(file);
const binaryExtension = (file) => /\.(?:pkl|pickle|png|jpe?g|gif|webp|ico|pdf|zip|gz|7z|exe|dll|woff2?|ttf)$/i.test(file);
const inside = (root, file) => { const rel = path.relative(root, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
async function git(cwd, args) {
  const { stdout } = await exec('git', ['--no-pager', '-c', 'core.fsmonitor=false', ...args], {
    cwd, windowsHide: true, encoding: 'utf8', timeout: 8000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_LITERAL_PATHSPECS: '1' },
  });
  return stdout;
}
async function repository(project) {
  const dir = await fs.realpath(project);
  const root = (await git(dir, ['rev-parse', '--show-toplevel'])).trim();
  return { dir, root: await fs.realpath(root) };
}
async function headExists(dir) { try { await git(dir, ['rev-parse', '--verify', 'HEAD']); return true; } catch { return false; } }

const discoveryCache = new Map();
const discoveryPending = new Map();
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.venv', 'venv', 'vendor', 'coverage', '__pycache__']);
export async function discoverRepositories(project, { refresh = false } = {}) {
  const root = await fs.realpath(project);
  const cached = discoveryCache.get(root);
  if (!refresh && cached && Date.now() - cached.at < 300000) return cached.value;
  if (discoveryPending.has(root)) return discoveryPending.get(root);
  const pending = (async () => {
    const repositories = [];
    let visited = 0, truncated = false;
    // A connected subdirectory of an existing repository remains scoped to that directory.
    try { await repository(root); repositories.push({ path: root, relative: '' }); } catch {}
    async function visit(dir, depth) {
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (!entry.isDirectory() || ignoredDirectories.has(entry.name.toLowerCase())) continue;
        if (++visited > 1000 || repositories.length >= 100) { truncated = true; return; }
        const child = path.join(dir, entry.name);
        // Do not follow symlinks or junctions outside the connected project.
        const real = await fs.realpath(child).catch(() => null);
        if (!real || !inside(root, real)) continue;
        const marker = await fs.lstat(path.join(child, '.git')).catch(() => null);
        if (marker && !marker.isSymbolicLink()) {
          try {
            const repo = await repository(child);
            if (repo.root === real) repositories.push({ path: real, relative: path.relative(root, child).split(path.sep).join('/') });
          } catch {}
        }
        if (depth < 3) await visit(child, depth + 1);
        if (truncated) return;
      }
    }
    await visit(root, 1);
    const value = { repositories, truncated };
    if (discoveryCache.size >= 64) discoveryCache.delete(discoveryCache.keys().next().value);
    discoveryCache.set(root, { at: Date.now(), value });
    return value;
  })();
  discoveryPending.set(root, pending);
  try { return await pending; } finally { discoveryPending.delete(root); }
}

export async function resolveRepository(project, relative = '') {
  if (typeof relative !== 'string' || relative.includes('\0') || path.isAbsolute(relative)) throw Object.assign(new Error('Invalid repository path'), { status: 403 });
  const root = await fs.realpath(project);
  const target = path.resolve(root, relative);
  if (!inside(root, target)) throw Object.assign(new Error('Repository is outside the connected project'), { status: 403 });
  const real = await fs.realpath(target);
  if (!inside(root, real)) throw Object.assign(new Error('Repository is outside the connected project'), { status: 403 });
  const found = (await discoverRepositories(project)).repositories.find((repo) => repo.relative === relative && repo.path === real);
  if (!found) throw Object.assign(new Error('Repository is not in the connected project list'), { status: 403 });
  return real;
}

export async function changedFiles(project) {
  let repo;
  try { repo = await repository(project); } catch { return { available: false, files: [], reason: 'not-git' }; }
  const { dir, root } = repo;
  const status = await git(dir, ['status', '--porcelain=v1', '-z', '--no-renames', '--untracked-files=all', '--', '.']);
  const baseline = await headExists(dir);
  const stats = new Map();
  if (baseline) {
    const nums = await git(dir, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--numstat', '-z', 'HEAD', '--', '.']);
    for (const row of nums.split('\0')) {
      const match = /^(\d+|-)\t(\d+|-)\t([\s\S]+)$/.exec(row);
      if (match) stats.set(match[3], { added: match[1] === '-' ? null : +match[1], removed: match[2] === '-' ? null : +match[2] });
    }
  }
  const files = status.split('\0').filter(Boolean).map((row) => ({ path: row.slice(3), status: row.slice(0, 2).trim() }))
    .filter((file) => !generatedCache(file.path) && inside(dir, path.resolve(root, file.path)))
    .map((file) => ({ ...file, ...stats.get(file.path) }));
  const visible = files.slice(0, 500);
  for (const file of visible) {
    if ((file.status !== '??' && baseline) || binaryExtension(file.path)) continue;
    try {
      const target = path.resolve(root, file.path);
      const stat = await fs.lstat(target);
      if (!stat.isFile() || stat.size > LIMIT || !inside(dir, await fs.realpath(target))) continue;
      const handle = await fs.open(target, 'r');
      let bytes;
      try {
        const buffer = Buffer.alloc(LIMIT + 1);
        let length = 0;
        while (length < buffer.length) {
          const read = await handle.read(buffer, length, buffer.length - length, null);
          if (!read.bytesRead) break;
          length += read.bytesRead;
        }
        bytes = buffer.subarray(0, length);
      } finally { await handle.close(); }
      if (bytes.length > LIMIT || bytes.includes(0)) continue;
      const content = bytes.toString('utf8');
      file.added = content.length ? content.split('\n').length - (content.endsWith('\n') ? 1 : 0) : 0;
      file.removed = 0;
    } catch { /* Missing/unreadable files have unknown counts, never invented zeroes. */ }
  }
  return { available: true, baseline: baseline ? 'HEAD' : 'empty', files: visible, truncated: files.length > 500 };
}

export async function resolveProjectFile(project, file, { allowMissing = false } = {}) {
  if (typeof file !== 'string' || !file || file.includes('\0') || path.isAbsolute(file)) throw Object.assign(new Error('Invalid file path'), { status: 400 });
  const { dir, root } = await repository(project);
  const target = path.resolve(root, file);
  if (!inside(dir, target)) throw Object.assign(new Error('File is outside the connected project'), { status: 403 });
  try {
    const real = await fs.realpath(target);
    if (!inside(dir, real) || !(await fs.stat(real)).isFile()) throw Object.assign(new Error('File is outside the connected project or is not a regular file'), { status: 403 });
  } catch (error) { if (!(allowMissing && error.code === 'ENOENT')) throw error; }
  return { dir, root, target };
}

export async function fileDiff(project, file) {
  const { root, target } = await resolveProjectFile(project, file, { allowMissing: true });
  const listing = await changedFiles(project);
  const selected = listing.files.find((item) => item.path === file);
  if (!selected) throw Object.assign(new Error('File is no longer changed; refresh the list'), { status: 409 });
  let patch;
  if (selected.status === '??' || listing.baseline === 'empty') {
    const stat = await fs.stat(target);
    if (binaryExtension(file)) return { file, unavailable: 'binary' };
    const handle = await fs.open(target, 'r');
    try {
      const sample = Buffer.alloc(Math.min(stat.size, 8192));
      const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
      if (sample.subarray(0, bytesRead).includes(0)) return { file, unavailable: 'binary' };
    } finally { await handle.close(); }
    if (stat.size > LIMIT) return { file, unavailable: 'large' };
    const bytes = await fs.readFile(target);
    if (bytes.includes(0)) return { file, unavailable: 'binary' };
    const lines = bytes.toString('utf8').split('\n');
    if (lines.at(-1) === '') lines.pop();
    patch = `--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n` + lines.map((line) => '+' + line).join('\n');
  } else {
    patch = await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--no-color', '--unified=3', 'HEAD', '--', file]);
  }
  if (Buffer.byteLength(patch) > LIMIT) return { file, unavailable: 'large' };
  return { file, patch, deleted: selected.status.includes('D'), binary: /^Binary files /m.test(patch) };
}
