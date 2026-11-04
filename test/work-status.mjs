import test from 'node:test';
import assert from 'node:assert/strict';
import { workStatus } from '../lib/work-status.mjs';
import { createAgyStream } from '../lib/agy-stream.mjs';
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
test('AGY reports observed tools without claiming completion or exposing private output', () => {
 const progress=[]; const s=createAgyStream({onProgress:p=>progress.push(p)});
 s.accept({event:'step_update',step_update:{step_type:'tool',step_index:2,tool_name:'run_command',tool_info:{parameters:{CommandLine:'rg "sessionRef" lib',output:'SECRET'}}}});
 assert.equal(progress.at(-1).work.detail,'sessionRef');
 assert.equal(progress.at(-1).work.phase,'observed');
 s.accept({event:'thinking',text:'PRIVATE'});
 assert.ok(!JSON.stringify(progress).includes('PRIVATE'));
 assert.ok(!JSON.stringify(progress).includes('SECRET'));
});
