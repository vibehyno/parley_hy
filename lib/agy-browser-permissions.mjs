import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function object(text) {
  const value = JSON.parse(text.replace(/^\uFEFF/, '').trim() || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('AGY 설정은 JSON 객체여야 합니다.');
  return value;
}
// Merge existing rules; never remove an explicit deny/ask or edit global settings.
export function agyBrowserPermissions(args, { readOnly, cwd, settingsFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json') }) {
  let global = {};
  try { global = object(fs.readFileSync(settingsFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('AGY 권한 설정 파일을 읽지 못했습니다. 설정의 JSON 형식을 확인해주세요.'); }
  let settings = {}, remaining = [];
  const permissions = { allow: [], ask: [], deny: [] };
  const merge = value => {
    if (value.permissions !== undefined && (!value.permissions || typeof value.permissions !== 'object' || Array.isArray(value.permissions))) throw new Error('AGY permissions 설정 형식을 확인해주세요.');
    for (const key of Object.keys(permissions)) {
      const rules = value.permissions?.[key];
      if (rules !== undefined && (!Array.isArray(rules) || rules.some(rule => typeof rule !== 'string'))) throw new Error('AGY 권한 목록 형식을 확인해주세요.');
      permissions[key].push(...(rules || []));
    }
  };
  merge(global);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg !== '--settings' && !arg.startsWith('--settings=')) { remaining.push(arg); continue; }
    const value = arg === '--settings' ? args[++i] : arg.slice('--settings='.length);
    if (!value) throw new Error('AGY --settings 값이 없습니다.');
    const overlay = object(value.trim().startsWith('{') ? value : fs.readFileSync(path.resolve(cwd, value), 'utf8'));
    merge(overlay); settings = { ...settings, ...overlay };
  }
  permissions.allow.push(readOnly ? 'mcp(parley-browser/browser_snapshot)' : 'mcp(parley-browser/*)');
  for (const key of Object.keys(permissions)) permissions[key] = [...new Set(permissions[key])];
  return { args: remaining, settings: { ...settings, permissions: { ...global.permissions, ...settings.permissions, ...permissions } } };
}
