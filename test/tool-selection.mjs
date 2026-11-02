import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../ui/app.js',import.meta.url),'utf8');
test('tool selections insert compact markers and preserve the user draft without sending',()=>{
 const input={value:'',focus(){},setSelectionRange(){}};
 const context=vm.createContext({$:()=>input,closeTools(){},autosize(){},updateRouteHint(){},mentionCheck(){}});
 vm.runInContext(app.slice(app.indexOf('function insertToolPrompt('),app.indexOf('function openTools(')),context);
 for(const [kind,name,marker] of [['skill','wait-what','[$claude:wait-what]'],['MCP server','playwright','[MCP:playwright]'],['plugin','superpowers','[Plugin:superpowers]']]){
  input.value='기존 요청';
  context.insertToolPrompt('claude',kind,name);
  assert.equal(input.value,`기존 요청\n@claude ${marker} `);
  assert.ok(!input.value.includes('Use the'));
 }
});
