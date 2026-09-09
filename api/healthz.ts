import type { IncomingMessage, ServerResponse } from 'node:http';

type UnknownError={name?:unknown;code?:unknown;message?:unknown};
function errorSummary(error:unknown):{name:string;code?:string;message?:string}{
  const value=(error&&typeof error==='object'?error:{}) as UnknownError;
  const name=typeof value.name==='string'?value.name:error instanceof Error?error.name:'UnknownError';
  const code=typeof value.code==='string'||typeof value.code==='number'?String(value.code):undefined;
  const rawMessage=typeof value.message==='string'?value.message:error instanceof Error?error.message:undefined;
  const message=rawMessage?.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi,'postgres://***@');
  return {name,...(code?{code}:{}),...(message?{message}:{})};
}

export default async function handler(req:IncomingMessage,res:ServerResponse):Promise<void>{
  if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end();return;}

  const headers={'content-type':'application/json','cache-control':'no-store'};
  const configured={
    database:Boolean(process.env.DATABASE_URL),
    capability:Boolean(process.env.SHADOW_WALKER_MCP_SECRET),
  };

  if(!process.env.DATABASE_URL){
    res.writeHead(503,headers);
    res.end(JSON.stringify({status:'unavailable',stage:'configuration',runtime:process.version,configured,error:{name:'ConfigurationError',message:'DATABASE_URL is not configured.'}}));
    return;
  }

  try{
    // Keep the health probe independent of Shadow Walker's internal module graph.
    // This lets us distinguish Vercel/Neon configuration from MCP bundle failures.
    const {neon}=await import('@neondatabase/serverless');
    const sql=neon(process.env.DATABASE_URL);
    await sql`SELECT 1 AS ok`;
    res.writeHead(200,headers);
    res.end(JSON.stringify({status:'ok',mode:'vercel-neon',runtime:process.version,configured}));
  }catch(error){
    console.error('Shadow Walker Neon health probe failed:',error);
    res.writeHead(503,headers);
    res.end(JSON.stringify({status:'unavailable',stage:'neon-probe',runtime:process.version,configured,error:errorSummary(error)}));
  }
}
