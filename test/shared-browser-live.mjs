import http from 'node:http';
import assert from 'node:assert/strict';
import { SharedBrowser } from '../lib/shared-browser.mjs';

export async function runBrowserCheck() {
  const manager = new SharedBrowser({ defaultMode: 'dedicated' }), room = {};
  const html = `<!doctype html><meta charset="utf-8"><title>Parley official MCP check</title><h1>Official MCP test</h1><label>Marker <input id="marker" aria-label="Marker"></label><button id="save">Save marker</button><button id="read">Read marker</button><output id="result"></output><script>function read(){document.querySelector('#result').textContent=(localStorage.getItem('parley-test')||'empty')+' | '+(document.cookie||'empty')};document.querySelector('#save').onclick=()=>{const value=document.querySelector('#marker').value;localStorage.setItem('parley-test',value);document.cookie='parley-test='+encodeURIComponent(value)+'; SameSite=Lax; Path=/';read()};document.querySelector('#read').onclick=read;read()</script>`;
  const site = http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});
  await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));
  const tokens={}, versions=new Map(), report=[];
  async function call(seat,name,args={},scope='shared') {
    const key=`${seat}:${scope}`;
    const result=await manager.call(tokens[seat],{name,args,scope,version:versions.get(key)});
    if(result.isError) throw Error(JSON.stringify(result.content));
    versions.set(key,JSON.parse(result.content.at(-1).text.slice(7)).version);
    return result.content.filter(item=>item.type==='text').map(item=>item.text).join('\n');
  }
  try {
    await manager.open(room);
    for (const seat of ['codex','claude','gemini']) tokens[seat]=manager.grant(room,seat);
    await call('codex','browser_snapshot');
    await call('codex','browser_navigate',{url:`http://127.0.0.1:${site.address().port}`});
    await call('codex','browser_type',{target:'#marker',text:'shared-A'});
    await call('codex','browser_click',{target:'#save'});
    for(const seat of ['claude','gemini']) assert.match(await call(seat,'browser_snapshot'),/shared-A/);
    report.push('Three seat capabilities read the same official MCP page');
    manager.setManual(room,true);
    const humanPage = manager.sessions.get(room).groups.get('shared').page;
    await humanPage.locator('#marker').fill('human-A');
    await humanPage.locator('#save').click();
    assert.match(await call('claude','browser_snapshot'),/human-A/);
    await assert.rejects(call('claude','browser_click',{target:'#save'}),/직접 조작/);
    report.push('Manual control permits model snapshots and blocks model clicks');
    manager.setManual(room,false);
    await Promise.all(['claude','gemini'].map(async seat=>{
      await call(seat,'browser_snapshot',{},'private');
      await call(seat,'browser_navigate',{url:`http://127.0.0.1:${site.address().port}`},'private');
      const initial=await call(seat,'browser_snapshot',{},'private');
      assert.match(initial,/empty/);assert.doesNotMatch(initial,/shared-A/);
      await call(seat,'browser_type',{target:'#marker',text:seat},'private');
      await call(seat,'browser_click',{target:'#save'},'private');
    }));
    assert.match(await call('claude','browser_snapshot',{},'private'),/claude/);
    assert.doesNotMatch(await call('claude','browser_snapshot',{},'private'),/parley-test=gemini/);
    assert.match(await call('codex','browser_snapshot'),/human-A/);
    report.push('Parallel private contexts isolate cookies and storage');
    assert.equal(manager.state(room).tabs.find(tab=>tab.scope==='shared').seen.length,3);
    report.push('Presence records all three seats with real timestamps');
    return report;
  } finally { await manager.closeAll();site.closeAllConnections();await new Promise(resolve=>site.close(resolve)); }
}
