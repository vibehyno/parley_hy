import { acquireLiveConnection } from './live-pool.mjs';
import { StringDecoder } from 'node:string_decoder';
import { randomUUID } from 'node:crypto';

// Keep provider input open for the active task. Never restart a failed task:
// its tools may already have changed files.
function connection(spec, args, options, setup) {
  return new Promise(resolve => {
    let lease, child, cleanup = () => {}, done = false, buffer = '', stderr = '', timedOut = false;
    const decoder = new StringDecoder('utf8');
    let receive = () => {}, closed = () => {};
    const finish = (code, error = '') => {
      if (done) return;
      done = true; clearTimeout(timer); options.onReady?.(null);
      closed(new Error(error || 'Provider connection closed'));
      cleanup();
      if (code === 0 && !child?.rtStopped) lease?.release(); else lease?.close();
      resolve({ code, stdout: '', stderr: error || stderr, timedOut, stopped: !!child?.rtStopped });
    };
    const timer = setTimeout(() => { timedOut = true; finish(-1, 'Provider timed out'); }, options.timeoutMs || 300000);
    try {
      lease = acquireLiveConnection(spec, args, options, { model: options.model, effort: options.effort, mode: options.mode });
      child = lease.child;
      options.onChild?.(child);
    } catch (error) { finish(-1, error.message); return; }
    const failure = error => finish(-1, error.message);
    const exited = code => finish(code || -1, stderr || 'Provider exited before the final result');
    const errorData = data => { stderr = (stderr + data.toString('utf8')).slice(-20000); };
    child.on('error', failure);
    child.on('close', exited);
    child.stderr.on('data', errorData);
    child.stdin.on('error', failure);
    const output = data => {
      buffer += decoder.write(data);
      let end;
      while (!done && (end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        let message; try { message = JSON.parse(line); } catch { continue; }
        try { receive(message); } catch (error) { finish(-1, error.message); }
      }
      if (buffer.length > 20_000_000) finish(-1, 'Provider response exceeded the line limit');
    };
    child.stdout.on('data', output);
    cleanup = () => { child.off('error', failure); child.off('close', exited); child.stderr.off('data', errorData); child.stdin.off('error', failure); child.stdout.off('data', output); };
    const write = message => new Promise((accept, reject) => {
      if (done || !child.stdin.writable) return reject(new Error('Provider connection closed'));
      child.stdin.write(JSON.stringify(message) + '\n', error => error ? reject(error) : accept());
    });
    setup({ data: lease.data, reused: lease.reused, write, finish, emit: message => options.onLine?.(JSON.stringify(message)),
      listen: callback => { receive = callback; }, onClose: callback => { closed = callback; } });
  });
}

export function runClaudeLive(spec, options) {
  return connection(spec, options.args, options, ({ data, reused, write, finish, emit, listen, onClose }) => {
    let sessionId = data.sessionId, ended = false, latestInput = null;
    const waiting = new Map();
    const steer = (text) => new Promise((accept, reject) => {
      if (ended || !sessionId) return reject(new Error('Claude task is no longer active'));
      const uuid = randomUUID();
      latestInput = uuid;
      waiting.set(uuid, { accept, reject, text });
      write({ type: 'user', uuid, session_id: sessionId, parent_tool_use_id: null,
        message: { role: 'user', content: text } }).catch(error => { waiting.delete(uuid); reject(error); });
    });
    onClose(error => { for (const item of waiting.values()) item.reject(error); waiting.clear(); });
    listen(message => {
      if (message.session_id) data.sessionId = sessionId = message.session_id;
      if (message.type === 'system' && message.subtype === 'init') options.onReady?.(steer);
      if (message.type === 'user' && !message.parent_tool_use_id) {
        const text = typeof message.message?.content === 'string' ? message.message.content : null;
        const match = waiting.has(message.uuid) ? message.uuid : [...waiting].find(([, item]) => item.text === text)?.[0];
        if (match) { waiting.get(match).accept({ threadId: sessionId, turnId: match }); waiting.delete(match); }
      }
      if (message.type === 'result' && !message.is_error) {
        if (message.queued_turn_count > 0) return;
        const covered = message.user_message_uuids || (message.user_message_uuid ? [message.user_message_uuid] : null);
        if (latestInput && covered && !covered.includes(latestInput)) return;
        if (waiting.size) { ended = true; finish(1, 'Claude ended before confirming the additional instruction'); return; }
      }
      emit(message);
      if (message.type === 'result') { ended = true; finish(message.is_error ? 1 : 0); }
    });
    write({ ...options.input, ...(sessionId ? { session_id: sessionId } : {}) })
      .then(() => { if (reused && !ended) options.onReady?.(steer); })
      .catch(error => finish(-1, error.message));
  });
}

export function runAgyLive(spec, options) {
  return connection(spec, options.args, options, ({ data, reused, write, finish, emit, listen, onClose }) => {
    let sessionId, generation = 0, ready = false, loading = true;
    let index = 0, textIndex = null, response = '', usage = {}, permissionDenied = false;
    const pending = new Map(), tools = new Map();
    const rpc = (method, params) => {
      const id = data.seq = (data.seq || 0) + 1;
      const result = new Promise((accept, reject) => pending.set(id, { accept, reject }));
      const sent = write({ jsonrpc: '2.0', id, method, params });
      sent.catch(error => { pending.get(id)?.reject(error); pending.delete(id); });
      return { result, sent };
    };
    onClose(error => { for (const request of pending.values()) request.reject(error); pending.clear(); });
    const prompt = (text, id) => {
      const own = ++generation;
      const request = rpc('session/prompt', { sessionId, prompt: [{ type: 'text', text }] });
      request.result.then(result => {
        // ACP resolves the old prompt when another prompt joins its work.
        // Only the newest prompt may complete this MoYEO task.
        for (const [key, value] of Object.entries(result.usage || {})) if (typeof value === 'number') usage[key] = (usage[key] || 0) + value;
        if (own !== generation) return;
        ready = false;
        if (permissionDenied) throw new Error('AGY 도구 승인이 필요합니다. 방의 권한 설정을 확인해 주세요.');
        if (result.stopReason !== 'end_turn') throw new Error(`AGY task ended: ${result.stopReason}`);
        emit({ event: 'result', result: { conversation_id: sessionId, status: 'SUCCESS', response,
          usage: { input_tokens: usage.inputTokens || 0, output_tokens: usage.outputTokens || 0,
            thinking_tokens: usage.thoughtTokens || 0, cache_read_tokens: usage.cachedReadTokens || 0 } } });
        finish(0);
      }).catch(error => finish(-1, error.message));
      return request.sent.then(() => ({ threadId: sessionId, turnId: id || String(own) }));
    };
    listen(message => {
      if (message.id != null && !message.method) {
        const request = pending.get(message.id); if (!request) return;
        pending.delete(message.id);
        message.error ? request.reject(new Error(message.error.message || JSON.stringify(message.error))) : request.accept(message.result);
        return;
      }
      if (message.id != null && message.method) {
        // Full access is set on the provider itself, never invented by the UI.
        // Other permission requests remain denied without explicit approval.
        if (message.method === 'session/request_permission') {
          permissionDenied = true;
          write({ jsonrpc: '2.0', id: message.id, result: { outcome: { outcome: 'cancelled' } } }).catch(() => {});
        } else write({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Unsupported client request' } }).catch(() => {});
        return;
      }
      if (loading || message.method !== 'session/update' || message.params?.sessionId !== sessionId) return;
      const update = message.params.update || {};
      if (update.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') {
        if (textIndex === null) { textIndex = ++index; if (response) response += '\n'; }
        response += update.content.text;
        emit({ event: 'step_update', step_update: { step_type: 'agent_response', step_index: textIndex, text_delta: update.content.text, state: 'ACTIVE' } });
      } else if (/^tool_call(?:_update)?$/.test(update.sessionUpdate)) {
        textIndex = null;
        const prior = tools.get(update.toolCallId) || { step_index: ++index };
        const tool = { ...prior, ...update }; tools.set(update.toolCallId, tool);
        emit({ event: 'step_update', step_update: { step_type: 'tool', step_index: tool.step_index,
          state: /completed|failed/.test(tool.status) ? 'DONE' : 'ACTIVE', tool_name: tool.name || tool.title,
          tool_info: { name: tool.name || tool.title, parameters: tool.rawInput || tool.args || {}, output: tool.rawOutput } } });
      }
    });
    (async () => {
      if (!reused) await rpc('initialize', { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: 'moyeo', version: '1' } }).result;
      const session = reused ? { sessionId: data.sessionId } : await rpc(options.sessionRef ? 'session/load' : 'session/new', {
        cwd: options.cwd, mcpServers: [], ...(options.sessionRef ? { sessionId: options.sessionRef } : {}),
      }).result;
      data.sessionId = sessionId = options.sessionRef || session.sessionId;
      if (!sessionId) throw new Error('AGY returned no session id');
      if (options.model) await rpc('session/set_model', { sessionId, modelId: options.model }).result;
      if (options.effort && !/-(low|medium|high|xhigh|max)$/i.test(options.model || '')) {
        await rpc('session/set_config_option', { sessionId, configId: 'thought_level', value: options.effort }).result;
      }
      await rpc('session/set_mode', { sessionId, modeId: options.mode === 'full' ? 'default' : options.mode }).result;
      loading = false; emit({ event: 'init', conversation_id: sessionId });
      const first = prompt(options.input);
      await first; ready = true;
      options.onReady?.((text, id) => {
        if (!ready) return Promise.reject(new Error('AGY task is no longer active'));
        return prompt(text, id);
      });
    })().catch(error => finish(-1, error.message));
  });
}
