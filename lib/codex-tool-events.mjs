// Raw model tool calls supplement app-server's structured tool events.
// Never forward reasoning, message bodies or tool output to status consumers.
export function createCodexToolEvents(emit) {
  const calls = new Map();
  const seen = new Set();
  return item => {
    if (!item?.call_id) return;
    if (["function_call", "custom_tool_call"].includes(item.type)) {
      if (seen.has(item.call_id)) return;
      seen.add(item.call_id);
      let args = {};
      if (item.type === "function_call") {
        try { args = JSON.parse(item.arguments); } catch {}
      } else if (item.name === "apply_patch") args = { patch: item.input };
      const call = { type: "tool_execution", id: `raw:${item.call_id}`, tool: item.name, arguments: args };
      calls.set(item.call_id, call);
      emit({ type: "item.started", item: call });
    } else if (["function_call_output", "custom_tool_call_output"].includes(item.type)) {
      const call = calls.get(item.call_id);
      if (!call) return;
      calls.delete(item.call_id);
      const output = typeof item.output === "string" ? item.output : JSON.stringify(item.output || "");
      const failed = /Script error:|Process exited with code [1-9]|"isError"\s*:\s*true/.test(output);
      emit({ type: "item.completed", item: { ...call, status: failed ? "failed" : "completed" } });
    }
  };
}
