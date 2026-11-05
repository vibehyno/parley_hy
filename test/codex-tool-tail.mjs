import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {watchCodexTools} from '../lib/codex-tool-tail.mjs';
test('resumed telemetry ignores history and private records, accepts split new tool records, stops on cleanup', async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'moyeo-tail-')),file=path.join(dir,'rollout.jsonl');
 const record=payload=>JSON.stringify({type:'response_item',payload})+'\n';
 fs.writeFileSync(file,record({type:'custom_tool_call',call_id:'old'}));
 const events=[],stop=watchCodexTools(file,e=>events.push(e));
 try{
  fs.appendFileSync(file,record({type:'reasoning',text:'PRIVATE'}));
  const line=record({type:'custom_tool_call',call_id:'new',name:'exec'});
  fs.appendFileSync(file,line.slice(0,20));
  await new Promise(r=>setTimeout(r,550));
  assert.equal(events.length,0);
  fs.appendFileSync(file,line.slice(20)); stop();
  assert.deepEqual(events.map(e=>e.call_id),['new']);
  fs.appendFileSync(file,record({type:'custom_tool_call',call_id:'after'}));
  await new Promise(r=>setTimeout(r,550));
  assert.equal(events.length,1);
 }finally{stop();fs.rmSync(dir,{recursive:true,force:true});}
});
