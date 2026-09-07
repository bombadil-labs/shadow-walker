import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Store } from '../../../packages/storage/src/index.ts';
import { createMcpServer } from './mcp.ts';
import { startHttp } from './http.ts';

const html=readFileSync(resolve('dist/widget/index.html'),'utf8');
const store=new Store(process.env.SHADOW_WALKER_DB ?? resolve('data/shadow-walker.sqlite'));
let close:()=>Promise<void>;
if(process.argv.includes('--http')){
  const port=Number(process.env.PORT ?? 3001);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1–65535.');
  const http=await startHttp(store,html,port);
  close=()=>new Promise<void>((resolve,reject)=>http.close(error=>error?reject(error):resolve()));
  console.error(`Shadow Walker local-only MCP: http://127.0.0.1:${port}/mcp`);
}else{
  const server=createMcpServer(store,html);await server.connect(new StdioServerTransport());close=()=>server.close();
}
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;try{await close();}finally{store.close();}}
process.once('SIGINT',()=>{void shutdown();});process.once('SIGTERM',()=>{void shutdown();});
