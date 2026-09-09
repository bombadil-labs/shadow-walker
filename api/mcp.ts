import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

type VercelLikeRequest=IncomingMessage & {body?:unknown;query?:Record<string,string|string[]|undefined>};
type UnknownError={name?:unknown;code?:unknown;message?:unknown};
const HOSTED_WIDGET_DOMAIN='https://shadow-walker.vercel.app';

function querySecret(req:VercelLikeRequest):string|undefined{
  const fromQuery=req.query?.secret;if(typeof fromQuery==='string')return fromQuery;if(Array.isArray(fromQuery))return fromQuery[0];
  try{const url=new URL(req.url??'','https://shadow-walker.invalid');return url.searchParams.get('secret')??undefined;}catch{return undefined;}
}

function errorSummary(error:unknown):{name:string;code?:string;message?:string}{
  const value=(error&&typeof error==='object'?error:{}) as UnknownError;
  const name=typeof value.name==='string'?value.name:error instanceof Error?error.name:'UnknownError';
  const code=typeof value.code==='string'||typeof value.code==='number'?String(value.code):undefined;
  const rawMessage=typeof value.message==='string'?value.message:error instanceof Error?error.message:undefined;
  const message=rawMessage?.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi,'postgres://***@');
  return {name,...(code?{code}:{}),...(message?{message}:{})};
}

function unavailable(res:ServerResponse,stage:string,error:unknown):void{
  res.writeHead(500,{'content-type':'application/json','cache-control':'no-store'});
  res.end(JSON.stringify({status:'unavailable',stage,runtime:process.version,error:errorSummary(error)}));
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
  let hosted:typeof import('./_hosted.ts');
  try{hosted=await import('./_hosted.ts');}
  catch(error){console.error('Hosted Shadow Walker bootstrap module failed to load:',error);unavailable(res,'hosted-module',error);return;}

  if(!hosted.capabilityMatches(querySecret(req))){res.writeHead(404);res.end();return;}
  if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'});res.end();return;}
  if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end();return;}

  let body:unknown;
  try{body=await jsonBody(req);}catch(error){res.writeHead(error instanceof Error&&error.message==='REQUEST_TOO_LARGE'?413:400);res.end();return;}

  let createMcpServer:typeof import('../apps/server/src/mcp.ts')['createMcpServer'];
  try{({createMcpServer}=await import('../apps/server/src/mcp.ts'));}
  catch(error){console.error('Hosted Shadow Walker MCP module failed to load:',error);unavailable(res,'mcp-module',error);return;}

  let store:Awaited<ReturnType<typeof hosted.hostedStore>>|undefined;
  try{store=await hosted.hostedStore();}
  catch(error){console.error('Hosted Shadow Walker store failed to initialize:',error);unavailable(res,'database',error);return;}

  let server:ReturnType<typeof createMcpServer>|undefined;
  try{
    server=createMcpServer(store,hosted.widgetHtml(),HOSTED_WIDGET_DOMAIN);
    const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    await server.connect(transport);
    await transport.handleRequest(req,res,body);
  }catch(error){
    console.error('Hosted Shadow Walker MCP request failed:',error);
    if(!res.headersSent)unavailable(res,'mcp-request',error);
    else if(!res.writableEnded)res.end();
  }finally{
    if(server)await server.close().catch(error=>console.error('Hosted Shadow Walker MCP server close failed:',error));
    await store.close().catch(error=>console.error('Hosted Shadow Walker store close failed:',error));
  }
}
