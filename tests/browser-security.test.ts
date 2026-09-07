import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { createHash } from 'node:crypto';
import { browserSession, htmlPolicy, HttpError, readJsonBody } from '../apps/server/src/browser-security.ts';

async function host(check: boolean, limit = 100) {
  const session=browserSession();
  const server=createServer(async(req,res)=>{
    try {if(check)session.check(req); const body=await readJsonBody(req,limit);res.end(JSON.stringify(body));}
    catch(e){res.writeHead(e instanceof HttpError?e.status:500);res.end(e instanceof HttpError?e.code:'error');}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const addr=server.address();assert.ok(addr && typeof addr!=='string');
  const origin=`http://127.0.0.1:${addr.port}`;
  const send=(body:string,headers:Record<string,string>={},chunked=false)=>new Promise<{status:number;text:string}>((resolve,reject)=>{
    const req=request(origin,{method:'POST',headers:{'Content-Type':'application/json',...headers}},res=>{
      let text='';res.on('data',c=>text+=String(c));res.on('end',()=>resolve({status:res.statusCode!,text}));
    });req.on('error',reject);if(chunked){req.write(body.slice(0,10));req.write(body.slice(10));req.end();}else req.end(body);
  });
  const close=()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  return {send,close,origin,token:session.token};
}
test('browser session requires the exact origin and matching per-process token',async()=>{
  const h=await host(true);try{
    assert.equal((await h.send('{}')).status,403);
    assert.equal((await h.send('{}',{Origin:h.origin})).status,403);
    assert.equal((await h.send('{}',{Origin:h.origin,'X-Shadow-Walker-Session':'forged'})).status,403);
    assert.equal((await h.send('{}',{Origin:'https://evil.example','X-Shadow-Walker-Session':h.token})).status,403);
    assert.equal((await h.send('{}',{Origin:h.origin,'X-Shadow-Walker-Session':h.token})).status,200);
  }finally{await h.close();}
});
test('same-site but different-origin browser metadata is rejected even with a token',async()=>{
  const h=await host(true);try{
    assert.equal((await h.send('{}',{Origin:h.origin,'X-Shadow-Walker-Session':h.token,'Sec-Fetch-Site':'same-site'})).status,403);
    assert.equal((await h.send('{}',{Origin:h.origin,'X-Shadow-Walker-Session':h.token,'Sec-Fetch-Site':'same-origin'})).status,200);
    assert.notEqual(browserSession().token,h.token);
  }finally{await h.close();}
});
test('JSON reader rejects malformed input and unsupported media types',async()=>{
  const h=await host(false);try{
    assert.equal((await h.send('{')).status,400);
    assert.equal((await h.send('{}',{'Content-Type':'application/jsonp'})).status,415);
    assert.equal((await h.send('{}',{'Content-Type':'application/json; charset=utf-8'})).status,200);
  }finally{await h.close();}
});
test('body byte limit applies to both declared and chunked requests without closing the reply socket',async()=>{
  const h=await host(false,20);try{
    assert.equal((await h.send(JSON.stringify('界'.repeat(8)))).status,413);
    assert.equal((await h.send(JSON.stringify('x'.repeat(30)),{},true)).status,413);
    assert.equal((await h.send(JSON.stringify('x'.repeat(18)))).status,200);
  }finally{await h.close();}
});
test('HTML policy permits only the actual inline script hashes, not arbitrary inline scripts or eval',()=>{
  const script='console.log("fixture")';const policy=htmlPolicy(`<script type="module">${script}</script>`);
  assert.ok(policy.includes(`script-src 'sha256-${createHash('sha256').update(script).digest('base64')}'`));
  assert.ok(!policy.includes("script-src 'unsafe-inline'"));assert.ok(!policy.includes('unsafe-eval'));
  assert.ok(policy.includes("frame-ancestors 'none'"));assert.ok(policy.includes("connect-src 'self'"));
});
test('embedded resource policy disables network access and static pages need no scripts',()=>{
  assert.ok(htmlPolicy('<p>Only static text</p>').includes("script-src 'none'"));
  const policy=htmlPolicy('<script>0</script>',true);
  assert.ok(policy.includes("connect-src 'none'"));assert.ok(policy.includes("frame-ancestors 'self'"));
});
