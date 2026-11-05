import { acquireLiveConnection } from "./live-pool.mjs";
import { StringDecoder } from "node:string_decoder";
import { createCodexToolEvents } from "./codex-tool-events.mjs";
import { watchCodexTools } from "./codex-tool-tail.mjs";

// One native turn, with an open RPC channel for additional user instructions.
// The caller owns stop/process-tree cleanup just as it does for exec.
export function runCodexLive(spec, { cwd, timeoutMs, sessionRef, sandbox, model, effort,
  poolKey, poolSettings, idleMs, fastMode, config = {}, input, images = [], onLine, onChild, onReady, kill }) {
  return new Promise(resolve => {
    let lease, child, cleanup = () => {}, settled = false, buffer = "", stderr = "", threadId, turnId;
    let timedOut = false, usage = null, stopToolTail = () => {};
    const pending = new Map(), text = new Map();
    const emit = event => onLine?.(JSON.stringify(event));
    const rawToolEvent = createCodexToolEvents(emit);
    const finish = (code, error = "") => {
      if (settled) return;
      settled = true; clearTimeout(timer); onReady?.(null);
      stopToolTail();
      for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(error || "Codex connection closed")); }
      pending.clear();
      cleanup();
      if (code === 0 && !child?.rtStopped) lease?.release(); else lease?.close();
      resolve({ code, stdout: "", stderr: error || stderr, timedOut, stopped: !!child?.rtStopped });
    };
    const timer = setTimeout(() => { timedOut = true; finish(-1, "Codex timed out"); }, timeoutMs);
    const write = message => {
      if (settled || !child?.stdin.writable) throw new Error("Codex connection closed");
      child.stdin.write(JSON.stringify(message) + "\n");
    };
    const rpc = (method, params) => new Promise((accept, reject) => {
      const id = lease.data.seq = (lease.data.seq || 0) + 1;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method}: response not confirmed; do not automatically resend`));
      }, 30000);
      pending.set(id, { resolve: accept, reject, timer });
      try { write({ id, method, params }); }
      catch (e) { clearTimeout(timer); pending.delete(id); reject(e); }
    });
    const ready = () => onReady?.(async (value, clientUserMessageId) => {
      if (!turnId || settled) throw new Error("진행 중인 작업이 끝났습니다. 새 메시지로 보내 주세요.");
      const expectedTurnId = turnId;
      const result = await rpc("turn/steer", { threadId, expectedTurnId, clientUserMessageId,
        input: [{ type: "text", text: value }] });
      if (result.turnId !== expectedTurnId) throw new Error("추가 지시의 작업 ID를 확인하지 못했습니다.");
      return { ...result, threadId };
    });
    const handle = message => {
      if (message.id != null && pending.has(message.id)) {
        const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
        message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result);
        return;
      }
      if (message.id != null && message.method) {
        // Never silently grant approval or fabricate answers to provider questions.
        write({ id: message.id, error: { code: -32601, message: "Interactive approval is unavailable in this MoYEO turn" } });
        return;
      }
      const p = message.params || {}, method = message.method;
      if (method === "rawResponseItem/completed") rawToolEvent(p.item);
      if (method === "turn/started") { turnId = p.turn.id; ready(); emit({ type: "turn.started" }); }
      if (method === "thread/tokenUsage/updated") usage = p.tokenUsage?.total || usage;
      if (method === "item/agentMessage/delta") {
        const value = (text.get(p.itemId) || "") + p.delta; text.set(p.itemId, value);
        emit({ type: "item.updated", item: { type: "agent_message", id: p.itemId, text: value } });
      }
      if (method === "item/started" || method === "item/completed") {
        const item = p.item || {};
        const types = { agentMessage: "agent_message", commandExecution: "command_execution", fileChange: "file_change", mcpToolCall: "mcp_tool_call", webSearch: "web_search", dynamicToolCall: "tool_execution" };
        emit({ type: method.replace("/", "."), item: { ...item, type: types[item.type] || item.type, exit_code: item.exitCode } });
      }
      if (method === "turn/completed") {
        turnId = null; onReady?.(null);
        if (usage) emit({ type: "turn.completed", usage: {
          input_tokens: usage.inputTokens, cached_input_tokens: usage.cachedInputTokens,
          output_tokens: usage.outputTokens, reasoning_output_tokens: usage.reasoningOutputTokens,
        } });
        finish(p.turn.status === "completed" ? 0 : 1, p.turn.error?.message || (p.turn.status === "completed" ? "" : p.turn.status));
      }
    };
    try {
      lease = acquireLiveConnection(spec, ['app-server'], { cwd, poolKey, poolSettings, idleMs, sessionRef, kill },
        { sandbox, model, effort, fastMode, config });
      child = lease.child;
      onChild?.(child);
      const decoder = new StringDecoder("utf8");
      const output = chunk => {
        buffer += decoder.write(chunk);
        if (buffer.length > 20_000_000) return finish(1, "Codex event exceeded size limit");
        for (;;) {
          const i = buffer.indexOf("\n"); if (i < 0) break;
          const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
          let message; try { message = JSON.parse(line); } catch { continue; }
          try { handle(message); } catch (error) { finish(1, error.message); }
        }
      };
      const errorData = chunk => { stderr = (stderr + chunk.toString()).slice(-20000); };
      const failure = error => finish(1, error.message);
      const exited = code => finish(code || 1);
      child.stdout.on('data', output);
      child.stderr.on('data', errorData); child.stdin.on('error', failure);
      child.on('error', failure); child.on('close', exited);
      cleanup = () => { child.stdout.off('data', output); child.stderr.off('data', errorData); child.stdin.off('error', failure); child.off('error', failure); child.off('close', exited); };
      (async () => {
        if (!lease.reused) await rpc("initialize", { clientInfo: { name: "moyeo", version: "1.5.29" }, capabilities: { experimentalApi: true } });
        if (!lease.reused) write({ method: "initialized" });
        const params = { cwd, sandbox, approvalPolicy: "never", ...(model ? { model } : {}),
          config: { ...config, service_tier: fastMode ? "fast" : "default" } };
        const result = lease.reused ? { thread: { id: lease.data.sessionId } } : sessionRef
          ? await rpc("thread/resume", { ...params, threadId: sessionRef, excludeTurns: true })
          : await rpc("thread/start", { ...params, experimentalRawEvents: true });
        lease.data.sessionId = threadId = result.thread.id;
        lease.data.rolloutPath ||= result.thread.path;
        lease.data.rawEvents ??= !sessionRef;
        if (!lease.data.rawEvents) stopToolTail = watchCodexTools(lease.data.rolloutPath, rawToolEvent);
        emit({ type: "thread.started", thread_id: threadId });
        const started = await rpc("turn/start", { threadId, ...(effort ? { effort } : {}),
          input: [{ type: "text", text: input }, ...images.map(image => ({ type: "localImage", path: image.path }))] });
        if (!settled) { turnId = started.turn.id; ready(); }
      })().catch(error => finish(1, error.message));
    } catch (error) { finish(1, error.message); }
  });
}
