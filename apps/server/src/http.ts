import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Store } from '../../../packages/storage/src/index.ts';
import { createMcpServer } from './mcp.ts';

/** Local development transport only. Never put this unauthenticated endpoint behind a public tunnel. */
export async function startHttp(store: Store, html: string, port=3001): Promise<Server> {
  const http=createServer(async(req,res)=>{
    const address=http.address();
    const actualPort=typeof address==='object' && address ? address.port : port;
    const hosts=[`127.0.0.1:${actualPort}`,`localhost:${actualPort}`];
    const host=req.headers.host ?? '';
    if(!hosts.includes(host) || (req.headers.origin && !hosts.map(h=>`http://${h}`).includes(req.headers.origin))) {
      res.writeHead(403); res.end('Untrusted Host or Origin.'); return;
    }
    if(req.method==='GET' && req.url==='/healthz') {
      res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ok',mode:'local-only'}));return;
    }
    if(req.url!=='/mcp'){res.writeHead(404);res.end();return;}
    if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'});res.end();return;}
    if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end();return;}
    try {
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>1024*1024){res.writeHead(413);res.end();return;}chunks.push(Buffer.from(chunk));}
      let body:unknown;
      try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{res.writeHead(400);res.end('Invalid JSON.');return;}
      const server=createMcpServer(store,html);
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.on('close',()=>{void server.close().catch(()=>{});});
      await server.connect(transport);
      await transport.handleRequest(req,res,body);
    } catch {
      if(!res.headersSent)res.writeHead(500);
      if(!res.writableEnded)res.end('MCP request failed.');
    }
  });
  http.requestTimeout=15_000;http.headersTimeout=10_000;
  await new Promise<void>((resolve,reject)=>{http.once('error',reject);http.listen(port,'127.0.0.1',()=>{http.off('error',reject);resolve();});});
  return http;
}
