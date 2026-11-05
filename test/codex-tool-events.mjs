import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodexToolEvents } from '../lib/codex-tool-events.mjs';
import { workStatus } from '../lib/work-status.mjs';

test('raw custom tool calls report lifecycle without leaking code or output', () => {
 const events=[], accept=createCodexToolEvents(e=>events.push(e));
 accept({type:'reasoning',call_id:'private',text:'PRIVATE'});
 accept({type:'custom_tool_call',call_id:'1',name:'exec',input:'PRIVATE_CODE'});
 accept({type:'custom_tool_call_output',call_id:'1',output:'Script error: PRIVATE_OUTPUT'});
 assert.equal(events.length,2);
 assert.equal(events[0].type,'item.started');
 assert.equal(events[1].item.status,'failed');
 assert.ok(!JSON.stringify(events).includes('PRIVATE'));
 assert.equal(workStatus(events[0].item.tool).action,'command');
});
test('patch and JSON tool inputs yield file names, not file bodies', () => {
 const events=[],accept=createCodexToolEvents(e=>events.push(e));
 accept({type:'custom_tool_call',name:'apply_patch',call_id:'p',input:'*** Begin Patch\n*** Update File: src/app.js\n+PRIVATE\n*** End Patch'});
 const p=events[0].item;
 assert.equal(workStatus(p.tool,p.arguments).detail,'app.js');
 accept({type:'function_call',name:'read_file',call_id:'r',arguments:'{"path":"src/app.js"}'});
 const r=events[1].item;
 assert.equal(workStatus(r.tool,r.arguments).detail,'app.js');
 accept({type:'function_call_output',call_id:'r',output:'PRIVATE'});
 assert.equal(events.at(-1).item.status,'completed');
});
