// Accept provider lifecycle records only, never infer agents from prose/tools.
export function subagentEvents(provider, event, known = new Set()) {
  if (provider === 'claude' && event?.type === 'system' && /^task_(started|progress|notification)$/.test(event.subtype || '') && event.task_id) {
    if (event.subtype === 'task_started' && ['local_agent', 'agent'].includes(event.task_type)) known.add(event.task_id);
    if (!known.has(event.task_id)) return [];
    const status = ['completed', 'failed', 'stopped'].includes(event.status) ? event.status : 'running';
    return [{ id: String(event.task_id), label: String(event.description || event.task_id).slice(0, 120), status }];
  }
  const item = event?.item;
  if (provider === 'codex' && item?.type === 'collab_tool_call' && ['item.started', 'item.completed', 'item.updated'].includes(event.type)) {
    const ids = item.receiver_thread_ids || [];
    return ids.filter((id) => typeof id === 'string').map((id) => {
      const state = item.agents_states?.[id]?.status;
      return { id, label: id.slice(0, 8), status: ['completed', 'failed', 'stopped'].includes(state) ? state : ['running', 'pending_init'].includes(state) ? 'running' : 'observed' };
    });
  }
  return [];
}
