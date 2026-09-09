import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from '../apps/server/src/mcp.ts';
import { capabilityMatches, hostedStore, widgetHtml } from './_hosted.ts';

type VercelLikeRequest=IncomingMessage & {body?:unknown;query?:Record<string,string|string[]|undefined>};

function querySecret(req:VercelLikeRequest):string|undefined{
  const fromQuery=req.query?.secret;if(typeof fromQuery==='string')return fromQuery;if(Array.isArray(fromQuery))return fromQuery[0];
  try{const url=new URL(req.url??'','https://shadow-walker.invalid');return url.searchParams.get('secret')??undefined;}catch{return undefined;}
}

async function jsonBody(req:VercelLikeRequest):Promise<unknown>{
  if(req.body!==undefined){
    if(typeof req.body==='string')return JSON.parse(req.body);
    if(Buffer.isBuffer(req.body))return JSON.parse(req.body.toString('utf8'));
    return req.body;
  }
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>1024*1024)throw new Error('REQUEST_TOO_LARGE');chunks.push(Buffer.from(chunk));}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req:VercelLikeRequest,res:ServerResponse):Promise<void>{
  if(!capabilityMatches(querySecret(req))){res.writeHead(404);res.end();return;}
  if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'});res.end();return;}
  if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end();return;}
  let body:unknown;
  try{body=await jsonBody(req);}catch(error){res.writeHead(error instanceof Error&&error.message==='REQUEST_TOO_LARGE'?413:400);res.end();return;}
  try{
    const store=await hostedStore();
    const server=createMcpServer(store,widgetHtml());
    const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    res.on('close',()=>{void server.close().catch(()=>{});});
    await server.connect(transport);
    await transport.handleRequest(req,res,body);
  }catch(error){
    console.error('Hosted Shadow Walker MCP request failed:',error instanceof Error?error.name:'unknown');
    if(!res.headersSent)res.writeHead(500);
    if(!res.writableEnded)res.end('MCP request failed.');
  }
}
