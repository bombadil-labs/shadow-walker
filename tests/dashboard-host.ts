/** Test fixture: seeds a separate in-memory store; production has no seeding endpoint. */
import { readFileSync } from 'node:fs';
import { Store } from '../packages/storage/src/index.ts';
import { startHttp } from '../apps/server/src/http.ts';
import { seed, proposal } from './fixtures.ts';
const store=new Store();
store.create({...seed,title:'An earlier exploration',requestId:'older'});
const s=store.create({...seed,title:'Dashboard review fixture',requestId:'newer'});
const p=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One test step.',requestId:'p'});
store.submit({moveId:p.moveId,output:proposal(s.exploration.rootId),requestId:'s'});
const server=await startHttp(store,readFileSync('dist/widget/index.html','utf8'),4176,{
  dashboard:readFileSync('dist/dashboard/index.html','utf8'),about:readFileSync('dist/site/index.html','utf8')});
process.once('SIGTERM',()=>{server.close(()=>store.close());});
