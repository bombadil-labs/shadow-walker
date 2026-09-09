import type { IncomingMessage, ServerResponse } from 'node:http';
import { hostedStore } from './_hosted.ts';

type UnknownError={name?:unknown;code?:unknown};
function errorSummary(error:unknown):{name:string;code?:string}{
  const value=(error&&typeof error==='object'?error:{}) as UnknownError;
  const name=typeof value.name==='string'?value.name:error instanceof Error?error.name:'UnknownError';
  const code=typeof value.code==='string'||typeof value.code==='number'?String(value.code):undefined;
  return {name,...(code?{code}:{})};
}

export default async function handler(req:IncomingMessage,res:ServerResponse):Promise<void>{
  if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end();return;}
  const headers={'content-type':'application/json','cache-control':'no-store'};
  let store:Awaited<ReturnType<typeof hostedStore>>|undefined;
  try{
    store=await hostedStore();
    await store.list();
    res.writeHead(200,headers);res.end(JSON.stringify({status:'ok',mode:'vercel-neon',runtime:process.version}));
  }catch(error){
    console.error('Shadow Walker hosted database health check failed:',error);
    res.writeHead(503,headers);res.end(JSON.stringify({status:'unavailable',stage:'database',runtime:process.version,configured:{database:Boolean(process.env.DATABASE_URL),capability:Boolean(process.env.SHADOW_WALKER_MCP_SECRET)},error:errorSummary(error)}));
  }finally{if(store)await store.close().catch(error=>console.error('Shadow Walker hosted store close failed:',error));}
}
