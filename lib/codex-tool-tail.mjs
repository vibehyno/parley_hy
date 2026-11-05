import fs from 'node:fs';
import { StringDecoder } from 'node:string_decoder';

// Resumed app-server threads lack the raw-events opt-in. Read only NEW records
// from the exact rollout path returned by that thread, while its turn is active.
export function watchCodexTools(file, accept) {
  if (!file) return () => {};
  let offset;
  try { offset = fs.statSync(file).size; } catch { return () => {}; }
  let buffer = '', stopped = false;
  const decoder = new StringDecoder('utf8');
  const poll = () => {
    if (stopped) return;
    let fd;
    try {
      const size = fs.statSync(file).size;
      if (size < offset) { offset = size; buffer = ''; return; }
      const length = Math.min(size - offset, 1024 * 1024);
      if (!length) return;
      fd = fs.openSync(file, 'r');
      const bytes = Buffer.alloc(length);
      const read = fs.readSync(fd, bytes, 0, length, offset); offset += read;
      buffer += decoder.write(bytes.subarray(0, read));
      let i;
      while ((i = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
        let record; try { record = JSON.parse(line); } catch { continue; }
        if (record.type === 'response_item' && /^(?:custom_tool_call|function_call)(?:_output)?$/.test(record.payload?.type)) accept(record.payload);
      }
      if (buffer.length > 4 * 1024 * 1024) buffer = '';
    } catch { /* Progress telemetry must never fail or restart a provider turn. */ }
    finally { if (fd !== undefined) fs.closeSync(fd); }
  };
  const timer = setInterval(poll, 500);
  return () => { poll(); stopped = true; clearInterval(timer); };
}
