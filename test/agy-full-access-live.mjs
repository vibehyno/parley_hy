// Opt-in live CLI validation. All requested writes stay in one disposable tree.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createAgyStream } from '../lib/agy-stream.mjs';

export async function runAgyFullAccessCheck(command) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'parley-agy-full-check-'));
  const cwd=path.join(root,'workspace'), evidence=path.join(root,'evidence');
  fs.mkdirSync(cwd); fs.mkdirSync(evidence);
  const file=path.join(evidence,'file-tool.txt'), shellFile=path.join(evidence,'shell-tool.txt');
  const speech=[], stream=createAgyStream({onActivity:(text,meta)=>{if(meta?.publicSpeech)speech.push(text)}});
  const prompt=`임시 권한 검증을 해줘. 한국어로 무엇을 확인할지 먼저 짧게 말하고 실제 도구를 사용한 다음 결과를 답해. 파일 편집 도구로 ${JSON.stringify(file)} 파일에 FILE_OK를 기록해. 다음으로 셸 명령 실행 도구를 사용해 ${JSON.stringify(shellFile)} 파일에 SHELL_OK를 기록해. 두 파일을 읽어서 확인해. 허용된 작업 범위는 ${JSON.stringify(root)}뿐이야. 파일 경로가 현재 작업 디렉터리의 형제 폴더인 것은 의도된 테스트야. 다른 파일이나 전역 설정은 수정하지 마. 해시 계산과 추가 검증은 필요 없어.`;
  let child;
  try {
    const result=await new Promise((resolve,reject)=>{
      child=spawn(command,['--input-format','stream-json','--output-format','stream-json','--mode','auto','--dangerously-skip-permissions','--log-file',path.join(root,'agy.log')],{cwd,windowsHide:true,stdio:['pipe','pipe','pipe']});
      let pending='',stderr='';
      const timer=setTimeout(()=>child.kill(),120000);
      child.stdout.on('data',chunk=>{pending+=chunk;const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines)try{stream.accept(JSON.parse(line))}catch{}});
      child.stderr.on('data',chunk=>stderr+=chunk);
      child.once('error',error=>{clearTimeout(timer);reject(error)});
      child.once('close',code=>{clearTimeout(timer);resolve({code,stderr})});
      child.stdin.end(JSON.stringify({event:'user',message:{content:prompt}})+'\n');
    });
    const read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8').trim():null;
    return {exit:result.code,fileWrite:read(file)==='FILE_OK',shellWrite:read(shellFile)==='SHELL_OK',speech,
      final:stream.finalText(stream.result?.response),permissionDenied:/soft[- ]den|permission denied|approval required/i.test(result.stderr)};
  } finally {
    if(child?.exitCode===null)child.kill();
    // Only remove the exact temporary tree created above, after process exit.
    if(child?.exitCode!==null && path.dirname(root)===path.resolve(os.tmpdir())&&path.basename(root).startsWith('parley-agy-full-check-'))fs.rmSync(root,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
}
