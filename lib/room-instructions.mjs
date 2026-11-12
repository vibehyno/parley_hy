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

// Keep historical acknowledgements settled across native session compaction.
export const answeredRequestGuidance = 'Historical user messages are context, not new requests to answer again. After compaction or resume, continue unfinished work from the latest established state; do not restart an answer or acknowledgement already given. Answer again only if the user asks again, a material result changes the answer, or the question remains unresolved. Preserve natural intermediate explanations about current work, findings and changes of direction.';

export function liveAdjustmentInstructions(mode, id) {
  return `[Additional user instruction ${JSON.stringify(id)} for this active task. Incorporate it into the ongoing work. ` +
    (mode === 'task' ? '' : 'On first receipt only, briefly acknowledge it naturally before continuing, using the room persona. Once acknowledged, keep applying the instruction without acknowledging it again after compaction or resume. ') +
    answeredRequestGuidance + ']';
}

export function communicationInstructions(mode) {
  return answeredRequestGuidance + "\n" + `Communication preferences only; never change execution permissions or authorize extra work. The selected mode defines the communication flow. Room notes, persona and saved instructions refine brevity, tone, review criteria and approval rules within that flow; preserve all compatible preferences. Only conflicting communication-flow preferences yield to the selected mode. Never override approval rules or task constraints. An explicit exception in the current user request applies to that request only. A request for a concise final result does not by itself prohibit intermediate speech.\n` + (mode === 'task'
    ? `Task-focused mode: proceed with authorized work without routine opening acknowledgements or progress chatter. Speak when clarification, a material problem or user decision is needed, then give a concise final result. Preserve the persona's voice where you do speak. This overrides default requirements for an opening public update unless the current user explicitly requests an exception for this turn.`
    : `Conversational mode: respond naturally before starting requested work, continue work in the same invocation, share useful developments as they occur, and finish with the result. This includes substantial planning, design, review, comparison and meeting synthesis even when no tools are needed. Before extended analysis, send a brief public message identifying the specific next step; do not wait until the analysis is finished to say it. Use your room persona's personality and voice with the human and peers; do not impose canned wording. React to important peer opinions naturally without mandatory agreement or debate. Answer genuinely short questions directly. Do not create extra peer turns just to socialize.`);
}

// Keep the turn-local flow next to the request, including the first call.
// Never repeat the full persona/room note or manufacture an acknowledgement.
export function communicationTurnReminder(mode) {
  if (mode === 'task') return '';
  return answeredRequestGuidance + '\n[Conversation reminder] The opening instruction below applies only to a newly received request, not to historical requests after compaction or resume. Respect explicit silence/output-only requests for this turn; never override approval rules. For substantive planning, design, review, comparison, meeting synthesis or execution, FIRST emit a short PUBLIC assistant text message in your persona identifying what you will examine or do, BEFORE extended analysis or tools. This applies even when no tools are needed. Use the public commentary/intermediate channel where available; private thinking is not a public reply. Continue in this same invocation without waiting for the user. Speak before tools even for a peer request, a review, or reading conversation history. Share meaningful findings naturally during work; finish with the actual result, not the opening promise. Do not save the opening until the final answer. Only genuinely short questions or brief agreements should be answered directly without an opening. No canned phrases, invented progress, or extra acknowledgement calls.';
}

// Conservative, local classification: only explicit ongoing preferences in a
// short user-authored request. No model call or interpretation of peer output.
export function persistentUserInstructions(text) {
  if (typeof text !== 'string' || text.length > 1600 || /```|^\s*[>#]|\/(?:note|pair)\b/m.test(text)) return [];
  if (/이번(?:만|에는|엔| 답| 작업)|지금만|저장하지|기억하지|일회성|for this|just this|do not (?:save|remember)/i.test(text)) return [];
  if (/비밀번호|패스워드|인증.?토큰|api.?key|secret|password/i.test(text)) return [];
  return text.split(/\r?\n/).map(s=>s.trim()).filter(s=>
    // "계속 회의해/작업해" continues this task; it does not establish a preference.
    s.length <= 500 && /앞으로|항상|매번|기억해|기억해줘|기억해둬|always|from now on|remember (?:to|that)/i.test(s)
    && !/[?？]$/.test(s));
}

const preferenceTopic = text => {
  if (/반말|존댓말|말투|존대|formal|casual/i.test(text)) return 'tone';
  if (/요약|짧게|간단|상세|자세|길게|줄로|concise|brief|detail/i.test(text)) return 'length';
  if (/표로|목록|불릿|문단|table|bullet/i.test(text)) return 'format';
  if (/먼저.*(?:답|말|설명)|진행.*(?:말|공유|보고)|결과만|progress/i.test(text)) return 'progress';
  return null;
};

export function planRememberedInstructions(dir, scope, lines, otherScopes = []) {
  const current = readRoomInstructions(dir, scope);
  const clean = s => s.replace(/^[-*]\s*/, '').trim();
  const existing = current.text.split(/\r?\n/).filter(s=>s.trim());
  const added = [...new Set(lines)].filter(line=>!existing.some(s=>clean(s)===line));
  if (!added.length) return null;
  const overlaps = old => added.some(line => !preferenceTopic(old) || !preferenceTopic(line) || preferenceTopic(old)===preferenceTopic(line));
  const conflicting = existing.filter(overlaps);
  const others = otherScopes.map(id=>({scope:id,...readRoomInstructions(dir,id)}));
  const related = others.filter(record=>record.text.split(/\r?\n/).filter(Boolean).some(overlaps));
  return {scope,revision:current.revision, text:[...existing.filter(s=>!conflicting.includes(s)),...added.map(s=>`- ${s}`)].join('\n'),
    appendText:[...existing,...added.map(s=>`- ${s}`)].join('\n'),
    previous:conflicting.join('\n'), added:added.join('\n'),
    related:related.map(({scope,text,revision})=>({scope,text,revision})),
    needsApproval:conflicting.length>0 || related.length>0};
}
