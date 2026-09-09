import type { IncomingMessage, ServerResponse } from 'node:http';
import { hostedStore } from './_hosted.ts';

export default async function handler(req:IncomingMessage,res:ServerResponse):Promise<void>{
  if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end();return;}
  try{const store=await hostedStore();await store.list();res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({status:'ok',mode:'vercel-neon'}));}
  catch{res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({status:'unavailable'}));}
}
