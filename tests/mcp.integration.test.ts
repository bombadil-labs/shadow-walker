import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request as httpRequest } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { startHttp } from '../apps/server/src/http.ts';
import { Store } from '../packages/storage/src/index.ts';
import type { MovePacket, ReviewTicket, Snapshot } from '../packages/domain/src/index.ts';
import { UI_URI, TICKET_META } from '../packages/protocol/src/index.ts';
import { seed, proposal } from './fixtures.ts';

const cleanups:(()=>Promise<void>)[]=[];
afterEach(async()=>{for(const fn of cleanups.splice(0).reverse())await fn();});
async function host(path=':memory:'){
  const store=new Store(path); const html=readFileSync('dist/widget/index.html','utf8');
  const server=await startHttp(store,html,0);const address=server.address();
  if(!address||typeof address==='string')throw new Error('Expected TCP address');
  const url=new URL(`http://127.0.0.1:${address.port}/mcp`);
  const client=new Client({name:'shadow-walker-test-host',version:'0.1.0'});
  await client.connect(new StreamableHTTPClientTransport(url));
  let closed=false;
  const close=async()=>{if(closed)return;closed=true;await client.close();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));store.close();};
  cleanups.push(close);
  const call=async(name:string,args:Record<string,unknown>):Promise<CallToolResult>=>await client.callTool({name,arguments:args}) as CallToolResult;
  return {store,client,url,call,close};
}
const snapshot=(r:CallToolResult)=>r.structuredContent!.snapshot as Snapshot;
describe('real SDK client over Streamable HTTP',()=>{
  it('discovers schemas, app-only review metadata and the bundled UI resource',async()=>{
    const {client}=await host();const {tools}=await client.listTools();
    expect(tools.map(t=>t.name)).toEqual(expect.arrayContaining(['create_exploration','prepare_move','submit_move','review_draft']));
    expect((tools.find(t=>t.name==='review_draft')!._meta?.ui as {visibility:string[]}).visibility).toEqual(['app']);
    const resource=await client.readResource({uri:UI_URI});
    const content=resource.contents[0];
    if(!content || !('text' in content))throw new Error('Expected a text UI resource.');
    expect(content.mimeType).toContain('text/html');
    expect(content.text).toContain('Shadow Walker');
    expect(content.text).not.toMatch(/<script[^>]+src=/);
  });
  it('round-trips a reviewed walk and reads the same SQLite graph after server restart',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'shadow-walker-mcp-'));const path=join(dir,'walk.sqlite');
    cleanups.push(async()=>{rmSync(dir,{recursive:true,force:true});});
    const h=await host(path);const created=snapshot(await h.call('create_exploration',seed));
    const read=await h.call('read_exploration',{explorationId:created.exploration.id});expect(read._meta).toBeUndefined();
    const prepared=await h.call('prepare_move',{explorationId:created.exploration.id,selectedIds:[created.exploration.rootId],humanDirection:'Take one step.',requestId:'prepare'});
    const packet=prepared.structuredContent!.packet as MovePacket;
    const submitted=await h.call('submit_move',{moveId:packet.moveId,output:proposal(created.exploration.rootId),requestId:'submit'});
    expect(snapshot(submitted).positions).toHaveLength(1);
    const ticket=submitted._meta![TICKET_META] as ReviewTicket;
    expect(JSON.stringify(submitted.structuredContent)).not.toContain(ticket.token);
    expect(JSON.stringify(submitted.content)).not.toContain(ticket.token);
    // This raw SDK client is the trusted-host test driver, not proof of a human click.
    const landed=await h.call('review_draft',{draftId:ticket.draftId,expectedVersion:ticket.version,token:ticket.token,action:'land',requestId:'land'});
    expect(landed.isError).not.toBe(true);expect(snapshot(landed).positions).toHaveLength(2);
    expect(snapshot(landed).activeMove).toBeNull();await h.close();
    const next=await host(path);expect(snapshot(await next.call('read_exploration',{explorationId:created.exploration.id}))).toEqual(snapshot(landed));
  });
  it('does not accept a fabricated token even through a direct tools/call',async()=>{
    const h=await host();const created=snapshot(await h.call('create_exploration',seed));
    const result=await h.call('review_draft',{draftId:'fabricated',expectedVersion:1,token:'fabricated',action:'land',requestId:'no'});
    expect(result.isError).toBe(true);expect(h.store.read(created.exploration.id).positions).toHaveLength(1);
  });
  it('refuses hostile Origin/Host, malformed JSON, and unsupported methods',async()=>{
    const {url}=await host();
    expect((await fetch(url,{method:'POST',headers:{Origin:'https://evil.example','content-type':'application/json'},body:'{}'})).status).toBe(403);
    // Fetch may normalize Host. Use node:http to test the actual hostile wire header.
    const hostileHostStatus=await new Promise<number|undefined>((resolve,reject)=>{
      const req=httpRequest(url,{method:'POST',headers:{Host:'evil.example','content-type':'application/json'}},res=>{res.resume();resolve(res.statusCode);});
      req.on('error',reject);req.end('{}');
    });
    expect(hostileHostStatus).toBe(403);
    expect((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status).toBe(400);
    expect((await fetch(url)).status).toBe(405);
  });
});
