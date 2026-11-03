// Opt-in real subscription CLI check, using a disposable page and fresh sessions.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { SharedBrowser } from '../lib/shared-browser.mjs';
import { browserCliArgs, browserInstruction } from '../lib/shared-browser-config.mjs';
import { agyBrowserPermissions } from '../lib/agy-browser-permissions.mjs';
import { createAgyStream } from '../lib/agy-stream.mjs';

export async function runProviderCheck(commands) {
  const manager = new SharedBrowser(), room = {};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parley-provider-check-'));
  const marker = 'PARLEY_WINDOW_CHECK_1427';
  const calls = [];
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') { res.end(`<title>${marker}</title><h1>${marker}</h1>`); return; }
    if (req.url !== '/api/browser/tool') { res.writeHead(404); res.end(); return; }
    try {
      let body = ''; for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      calls.push({seat:manager.authorize(token).seat, tool:input.name});
      const result = await manager.call(token, input);
      res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(result));
    } catch (error) { res.writeHead(403); res.end(JSON.stringify({error:error.message})); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port = server.address().port;
  try {
    await manager.open(room);
    await manager.sessions.get(room).groups.get('shared').page.goto(`http://127.0.0.1:${port}/`);
    return await Promise.all(Object.entries(commands).map(async ([seat, command]) => {
      const token = manager.grant(room,seat,{readOnly:true});
      const prompt = '우리는 친구야. 한국어 반말로 답해. 지금 공유 화면 제목을 확인해줘. 도구 호출 전에 무엇을 할지 짧게 한 문장 말하고, browser_snapshot을 한 번 호출한 뒤 실제 제목을 최종 답변으로 말해. 다른 도구나 작업은 필요 없어.' + browserInstruction(`${port}/${token}`);
      let args, input;
      if (seat === 'gemini') {
        const overlay = agyBrowserPermissions([], {readOnly:true,cwd:dir});
        const file = path.join(dir,'settings.json'); fs.writeFileSync(file,JSON.stringify(overlay.settings));
        args = ['--input-format','stream-json','--output-format','stream-json','--mode','plan','--sandbox','--settings',file,'--log-file',path.join(dir,'agy.log')];
        input = JSON.stringify({event:'user',message:{content:prompt}})+'\n';
      } else {
        args = ['-p','--output-format','stream-json','--verbose','--include-partial-messages','--permission-mode','plan',...browserCliArgs('claude')];
        input = prompt;
      }
      const events = [], publicText = [];
      const stream = createAgyStream({onActivity:(text,meta)=>{if(meta?.publicSpeech)publicText.push(text)}});
      const result = await new Promise((resolve,reject)=>{
        const child = spawn(command,args,{cwd:dir,windowsHide:true,stdio:['pipe','pipe','pipe']});
        let stdout='',stderr='',pending='';
        const timer=setTimeout(()=>{child.kill();reject(Error(`${seat} check timed out`))},120000);
        child.stdout.on('data',chunk=>{
          stdout+=chunk;pending+=chunk;
          const lines=pending.split(/\r?\n/);pending=lines.pop();
          for(const line of lines)try{const obj=JSON.parse(line);events.push(obj);stream.accept(obj)}catch{}
        });
        child.stderr.on('data',chunk=>stderr+=chunk);
        child.on('error',error=>{clearTimeout(timer);reject(error)});
        child.on('close',code=>{clearTimeout(timer);resolve({code,stderr})});
        child.stdin.end(input);
      });
      const final = seat === 'gemini' ? stream.finalText(stream.result?.response) : events.findLast(event=>event.type==='result')?.result || '';
      const sequence = seat === 'gemini' ? events.filter(event=>event.event==='step_update').map(event=>event.step_update).filter(step=>['agent_response','tool'].includes(step.step_type)).map(step=>step.step_type)
        : events.filter(event=>event.type==='assistant').flatMap(event=>event.message?.content || []).map(part=>part.type);
      const textKind = seat === 'gemini' ? 'agent_response' : 'text';
      const toolKind = seat === 'gemini' ? 'tool' : 'tool_use';
      return {seat,exit:result.code,publicSpeechBeforeTools:sequence.indexOf(textKind)>=0&&sequence.indexOf(textKind)<sequence.indexOf(toolKind),
        snapshotReachedServer:calls.some(call=>call.seat===seat&&call.tool==='browser_snapshot'),
        finalContainsObservedTitle:final.includes(marker),final:final.slice(0,500),
        permissionDenied:/soft[- ]den(?:ied|ying)/i.test(result.stderr)};
    }));
  } finally {
    await manager.closeAll(); await new Promise(resolve=>server.close(resolve));
    // The directory is created by this check and never supplied externally.
    if(path.dirname(path.resolve(dir))===path.resolve(os.tmpdir())&&path.basename(dir).startsWith('parley-provider-check-')) fs.rmSync(dir,{recursive:true,force:true});
  }
}
