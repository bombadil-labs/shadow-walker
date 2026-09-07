/** Test-only host. Never included in the production server build. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer as createVite } from 'vite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from '../apps/server/src/mcp.ts';
import { Store } from '../packages/storage/src/index.ts';
import type { Snapshot, MovePacket } from '../packages/domain/src/index.ts';
import { seed, proposal } from './fixtures.ts';

const html=readFileSync('dist/widget/index.html','utf8');const store=new Store();
const mcp=createMcpServer(store,html);const client=new Client({name:'browser-fixture',version:'0.1.0'});
const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
await mcp.connect(serverTransport);await client.connect(clientTransport);
const vite=await createVite({configFile:false,root:'tests/browser',server:{middlewareMode:true}});
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/', 'http://127.0.0.1:4175');
    const json=(body:unknown)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(body));};
    if(url.pathname==='/widget'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
    if(url.pathname==='/initial'){
      const c=CallToolResultSchema.parse(await client.callTool({name:'create_exploration',arguments:{...seed,requestId:randomUUID()}}));
      const snapshot=c.structuredContent!.snapshot as Snapshot;
      const p=CallToolResultSchema.parse(await client.callTool({name:'prepare_move',arguments:{explorationId:snapshot.exploration.id,selectedIds:[snapshot.exploration.rootId],humanDirection:'One fixture step.',requestId:randomUUID()}}));
      const packet=p.structuredContent!.packet as MovePacket;
      const result=await client.callTool({name:'submit_move',arguments:{moveId:packet.moveId,output:proposal(snapshot.exploration.rootId),requestId:randomUUID()}});
      if(url.searchParams.has('noMeta'))delete result._meta;
      json(result);return;
    }
    if(url.pathname==='/snapshot'){json(store.read(url.searchParams.get('id')??''));return;}
    if(url.pathname==='/call'&&req.method==='POST'){
      let body='';for await(const chunk of req){body+=String(chunk);if(body.length>1024*1024)throw new Error('Fixture request too large');}
      const args=JSON.parse(body) as {name:string;arguments:Record<string,unknown>};
      if(!['open_exploration','read_exploration','review_draft'].includes(args.name))throw new Error('Fixture allows review only');
      json(await client.callTool(args));return;
    }
    vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});
  }catch(error){res.writeHead(500);res.end(String(error));}
});
server.listen(4175,'127.0.0.1');
process.once('SIGTERM',()=>{server.close();void vite.close();void client.close();void mcp.close();store.close();});
