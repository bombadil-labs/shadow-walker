import { afterEach, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Store } from '../packages/storage/src/index.ts';
import type { ReviewTicket, Snapshot } from '../packages/domain/src/index.ts';
import { startHttp } from '../apps/server/src/http.ts';
import { seed, proposal } from './fixtures.ts';

const cleanup: (()=>Promise<void>)[]=[];
afterEach(async()=>{for(const f of cleanup.splice(0).reverse())await f();});
async function host(path=':memory:') {
  const store=new Store(path);
  const server=await startHttp(store,readFileSync('dist/widget/index.html','utf8'),0,{
    dashboard:readFileSync('dist/dashboard/index.html','utf8'),about:readFileSync('dist/site/index.html','utf8')});
  const addr=server.address();if(!addr||typeof addr==='string')throw new Error('TCP required');
  const origin=`http://127.0.0.1:${addr.port}`;
  const bootstrap=await fetch(`${origin}/api/session`,{headers:{'X-Shadow-Walker-Client':'dashboard'}});
  const token=(await bootstrap.json()).sessionToken as string;
  const headers={Origin:origin,'Content-Type':'application/json','X-Shadow-Walker-Session':token};
  const invoke=async(name:string,args:Record<string,unknown>={})=>{
    const res=await fetch(`${origin}/api/call`,{method:'POST',headers,body:JSON.stringify({name,arguments:args})});
    expect(res.status).toBe(200);return await res.json() as CallToolResult;
  };
  const client=new Client({name:'dashboard-integration',version:'0.1.0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`)));
  let closed=false;
  const close=async()=>{if(closed)return;closed=true;await client.close();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));store.close();};
  cleanup.push(close);
  return {store,server,origin,token,headers,invoke,client,close};
}
const snapshot=(result:CallToolResult)=>result.structuredContent!.snapshot as Snapshot;
function pending(store:Store) {
  const s=store.create(seed);const p=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One fixture step.',requestId:'p'});
  const draft=store.submit({moveId:p.moveId,output:proposal(s.exploration.rootId),requestId:'s'});
  return {s,draft};
}

it('serves bundled dashboard and sandboxed widget with CSP, no-store and no embedded user data',async()=>{
  const h=await host();h.store.create({...seed,title:'Private title must not be in HTML'});
  const root=await fetch(h.origin);expect(root.status).toBe(200);
  expect(root.headers.get('cache-control')).toBe('no-store');
  expect(root.headers.get('content-security-policy')).toContain("script-src 'sha256-");
  expect(root.headers.get('x-frame-options')).toBe('DENY');
  const html=await root.text();expect(html).toContain('Your saved explorations');expect(html).not.toContain('Private title must not be in HTML');
  expect(html).not.toMatch(/<script[^>]+src=/);
  const widget=await fetch(`${h.origin}/app/widget`);
  expect(widget.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
  expect(widget.headers.get('content-security-policy')).toContain("connect-src 'none'");
  expect((await h.invoke('list_explorations')).structuredContent!.explorations).toHaveLength(1);
});
it('requires a same-origin browser bootstrap and CSRF session, including for reads',async()=>{
  const h=await host();
  expect((await fetch(`${h.origin}/api/session`)).status).toBe(403);
  expect((await fetch(`${h.origin}/api/session`,{headers:{'X-Shadow-Walker-Client':'dashboard','Sec-Fetch-Site':'cross-site'}})).status).toBe(403);
  const body=JSON.stringify({name:'list_explorations',arguments:{}});
  const attempts: Record<string,string>[] = [{'Content-Type':'application/json'}, {...h.headers,Origin:'https://evil.example'}, {...h.headers,'X-Shadow-Walker-Session':'wrong'}];
  for(const headers of attempts) {
    const res=await fetch(`${h.origin}/api/call`,{method:'POST',headers,body});expect(res.status).toBe(403);expect(res.headers.has('access-control-allow-origin')).toBe(false);
  }
  expect(h.store.list()).toEqual([]);
});
it('the browser surface cannot prepare, create, submit or invoke arbitrary MCP methods',async()=>{
  const h=await host();
  for(const name of ['create_exploration','prepare_move','submit_move','tools/call','fetch']) {
    const res=await fetch(`${h.origin}/api/call`,{method:'POST',headers:h.headers,body:JSON.stringify({name,arguments:seed})});expect(res.status).toBe(400);
  }
  expect(h.store.list()).toEqual([]);
});
it('rejects malformed requests, over-limit bodies and unexpected envelope fields',async()=>{
  const h=await host();
  expect((await fetch(`${h.origin}/api/call`,{method:'POST',headers:h.headers,body:'{'})).status).toBe(400);
  expect((await fetch(`${h.origin}/api/call`,{method:'POST',headers:h.headers,body:JSON.stringify({name:'list_explorations',arguments:{},endpoint:'https://evil.example'})})).status).toBe(400);
  expect((await fetch(`${h.origin}/api/call`,{method:'POST',headers:h.headers,body:JSON.stringify({x:'x'.repeat(1024*1024)})})).status).toBe(413);
  expect((await fetch(`${h.origin}/api/call`)).status).toBe(405);
});
it('browser Land is visible through real MCP and invalidates other windows without duplicate acceptance',async()=>{
  const h=await host();const {s,draft}=pending(h.store);
  const first=await h.invoke('open_exploration',{explorationId:s.exploration.id,draftId:draft.id});
  const second=await h.invoke('open_exploration',{explorationId:s.exploration.id,draftId:draft.id});
  const ticket=first._meta!['shadowWalker/review'] as ReviewTicket;
  const old=second._meta!['shadowWalker/review'] as ReviewTicket;
  expect(JSON.stringify(first.structuredContent)).not.toContain(ticket.token);
  const args={draftId:draft.id,expectedVersion:ticket.version,token:ticket.token,action:'land',requestId:'land'};
  const landed=await h.invoke('review_draft',args);expect(landed.isError).not.toBe(true);
  expect(snapshot(landed).positions).toHaveLength(2);expect(snapshot(landed).activeMove).toBeNull();
  const repeated=await h.invoke('review_draft',args);expect(snapshot(repeated)).toEqual(snapshot(landed));
  const stale=await h.invoke('review_draft',{...args,token:old.token,requestId:'other-window'});expect(stale.isError).toBe(true);
  const reread=await h.client.callTool({name:'read_exploration',arguments:{explorationId:s.exploration.id}}) as CallToolResult;
  expect(snapshot(reread)).toEqual(snapshot(landed));expect(reread._meta).toBeUndefined();
});
it('closed drafts can be inspected without receiving review authorization',async()=>{
  const h=await host();const {s,draft}=pending(h.store);const cap=h.store.ticket(draft.id);
  h.store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'discard',requestId:'discard'});
  const result=await h.invoke('open_exploration',{explorationId:s.exploration.id,draftId:draft.id});
  expect(snapshot(result).drafts[0]!.status).toBe('discarded');expect(result._meta).toBeUndefined();
  expect(snapshot(result).positions).toHaveLength(1);
});
it('server restart keeps the same graph but rotates the local CSRF token',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'shadow-dashboard-'));cleanup.push(async()=>rmSync(dir,{recursive:true,force:true}));
  const path=join(dir,'state.sqlite');const h=await host(path);const {s}=pending(h.store);
  const before=snapshot(await h.invoke('read_exploration',{explorationId:s.exploration.id}));
  await h.close();const next=await host(path);expect(next.token).not.toBe(h.token);
  expect(snapshot(await next.invoke('read_exploration',{explorationId:s.exploration.id}))).toEqual(before);
  const res=await fetch(`${next.origin}/api/call`,{method:'POST',headers:{...next.headers,'X-Shadow-Walker-Session':h.token},body:JSON.stringify({name:'list_explorations',arguments:{}})});
  expect(res.status).toBe(403);expect((await res.json()).error.code).toBe('SESSION_EXPIRED');
});
it('unknown explorations fail without mutating or exposing unrelated saved work',async()=>{
  const h=await host();const {s}=pending(h.store);
  const result=await h.invoke('open_exploration',{explorationId:'unknown'});
  expect(result.isError).toBe(true);expect(result.structuredContent).toBeUndefined();
  expect(h.store.read(s.exploration.id).positions).toHaveLength(1);
});
