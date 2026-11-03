import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Keep Chrome's locked files outside room directories so room renames remain possible.
export function browserProfileDir(room) {
  if (!room.dir) return null; // Disposable standalone checks do not persist logins.
  const file = path.join(room.dir, 'browser-profile-id');
  let id;
  try { id = fs.readFileSync(file, 'utf8').trim(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (id && !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) throw new Error('공유 브라우저 프로필 식별자가 올바르지 않습니다.');
  if (!id) {
    id = crypto.randomUUID();
    fs.writeFileSync(file, id, { mode: 0o600, flag: 'wx' });
  }
  const dir = path.join(path.dirname(room.dir), '.browser-profiles', id);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
