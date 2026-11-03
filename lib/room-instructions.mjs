import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function readRoomInstructions(dir, seat) {
  // Server-selected seat IDs only; never accept a client-provided file path.
  if (!/^[a-zA-Z0-9_-]+$/.test(seat)) throw Object.assign(new Error('Invalid seat'), {status:400});
  const folder = path.join(dir, 'learned-instructions');
  const file = path.join(folder, seat + '.md');
  for (const target of [folder, file]) {
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Object.assign(new Error('Linked instruction paths are not supported'), {status:400});
  }
  if (fs.existsSync(file) && fs.statSync(file).size > 32000) throw Object.assign(new Error('Instruction file exceeds 32 KB'), {status:400});
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return {file, text, revision:crypto.createHash('sha256').update(text).digest('hex')};
}

export function saveRoomInstructions(dir, seat, text, revision) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 32000) throw Object.assign(new Error('Instructions must be text up to 32 KB'), {status:400});
  const current = readRoomInstructions(dir, seat);
  if (current.revision !== revision) throw Object.assign(new Error('지침이 변경되었습니다. 창을 다시 열어 확인해주세요.'), {status:409});
  fs.mkdirSync(path.dirname(current.file), {recursive:true});
  fs.writeFileSync(current.file, text, 'utf8');
  return readRoomInstructions(dir, seat);
}

export function communicationInstructions(mode) {
  return `Communication preferences only; never change execution permissions or authorize extra work. Within these preferences, follow the current user's explicit request first, then the room note, then room-specific persona and saved instructions, then this mode's defaults. A request for a concise final result does not by itself prohibit intermediate speech.\n` + (mode === 'task'
    ? `Task-focused mode: proceed with authorized work without routine opening acknowledgements or progress chatter. Speak when clarification, a material problem or user decision is needed, then give a concise final result. Preserve the persona's voice where you do speak. This overrides default requirements for an opening public update unless the user or room note requests one.`
    : `Conversational mode: respond naturally before starting requested work, continue work in the same invocation, share useful developments as they occur, and finish with the result. Use your room persona's personality and voice with the human and peers; do not impose canned wording. React to important peer opinions naturally without mandatory agreement or debate. Keep short tasks short. Do not create extra peer turns just to socialize.`);
}
