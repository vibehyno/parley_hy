import test from 'node:test';
import assert from 'node:assert/strict';
import { workStatus } from '../lib/work-status.mjs';
import { createAgyStream } from '../lib/agy-stream.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
test('simple searches and reads expose only short arguments', () => {
 assert.deepEqual(workStatus('command_execution',{command:'rg "sessionRef" lib'},'running','1'), {action:'search',detail:'sessionRef',phase:'running',id:'1'});
 assert.equal(workStatus('Bash',{command:'rg -n "sessionRef" lib'}).detail,'sessionRef');
 assert.equal(workStatus('Read',{file_path:'C:\\project\\app.js'}).detail,'app.js');
 assert.equal(workStatus('Edit',{file_path:'/project/app.js',new_string:'private body'}).detail,'app.js');
});
test('compound commands, secrets and ambiguous flags never become search detail', () => {
 for(const command of ['rg "api_key=SECRET" lib','rg -g "*.js" private lib','rg foo lib; echo private','curl https://example.test/?token=SECRET']) {
  assert.equal(workStatus('Bash',{command}).detail,'');
 }
 assert.equal(workStatus('Grep',{pattern:'a'.repeat(100)}).detail,'');
 assert.equal(workStatus('unknown',{text:'private reasoning'}).detail,'');
});
test('completion and failure are distinct from execution', () => {
 assert.equal(workStatus('file_change',{path:'src/app.js'},'completed').phase,'completed');
 assert.equal(workStatus('Bash',{command:'npm test'},'failed').action,'test');
});

test('provider namespaced tools and JSON inputs use the same filename labels', () => {
 for (const name of ['Read','functions.read_file','mcp.read_file']) {
  assert.equal(workStatus(name,JSON.stringify({path:'C:/project/note.md'}),'running').detail,'note.md');
 }
 assert.equal(workStatus('edit',{path:'src/note.md'},'running').detail,'note.md');
 assert.equal(workStatus('read',null).detail,'');
 assert.equal(workStatus('read','invalid JSON').detail,'');
});
test('AGY reports observed tools without claiming completion or exposing private output', () => {
 const progress=[]; const s=createAgyStream({onProgress:p=>progress.push(p)});
 s.accept({event:'step_update',step_update:{step_type:'tool',step_index:2,tool_name:'run_command',tool_info:{parameters:{CommandLine:'rg "sessionRef" lib',output:'SECRET'}}}});
 assert.equal(progress.at(-1).work.detail,'sessionRef');
 assert.equal(progress.at(-1).work.phase,'observed');
 s.accept({event:'thinking',text:'PRIVATE'});
 assert.ok(!JSON.stringify(progress).includes('PRIVATE'));
 assert.ok(!JSON.stringify(progress).includes('SECRET'));
});

test('active work survives reasoning updates and an older concurrent tool completing', () => {
 const source=fs.readFileSync(new URL('../ui/app.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function updateActiveWork('),source.indexOf('function liveProgress('));
 const ctx={};vm.createContext(ctx);vm.runInContext(body,ctx);
 const live={};const update=(id,phase)=>ctx.updateActiveWork(live,{work:{id,phase}});
 update('read','running');update('edit','running');
 ctx.updateActiveWork(live,{kind:'reasoning'});update('read','completed');
 assert.equal([...live.activeWork.keys()].at(-1),'edit');
 update('edit','failed');assert.equal(live.activeWork.size,0);
});
