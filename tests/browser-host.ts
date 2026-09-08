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

function seedFlightLines(explorationId:string):{firstArrivalId:string;firstLineId:string;secondArrivalId:string;secondLineId:string}{
  let snapshot=store.read(explorationId);const root=snapshot.exploration.rootId;const firstLine=snapshot.cartography.lines[0]!;
  snapshot=store.recordObservation({explorationId,positionId:root,kind:'human-report',detail:'A real deployment constraint surfaced at the boundary.',source:'Fixture human report',requestId:randomUUID()});
  const observation=snapshot.cartography.observations.at(-1)!;
  snapshot=store.recordConstraint({explorationId,label:'External authority arrives asynchronously',description:'The system cannot assume that all apparent truth originates from one local writer.',discoveredAtPositionId:root,provenance:'observation-derived',observationIds:[observation.id],requestId:randomUUID()});
  const constraint=snapshot.cartography.constraints.at(-1)!;
  snapshot=store.recordOperation({explorationId,name:'Selective boundary protocol',originDomain:'Cell membranes / message-passing systems',inputStructure:'Multiple authorities can affect a shared boundary.',outputStructure:'Changes cross an explicit boundary protocol before becoming local state.',preserves:['Local autonomy'],transforms:['Implicit shared mutation into explicit messages'],procedure:['Identify the authoritative boundary.','Represent external changes as explicit messages.','Reconcile before committing local state.'],constraintIds:[constraint.id],requestId:randomUUID()});
  const operation=snapshot.cartography.operations.at(-1)!;
  snapshot=store.recordApplication({explorationId,operationId:operation.id,lineId:firstLine.id,targetConstraintIds:[constraint.id],adaptation:'Treat external reconciliation as a boundary event rather than a second writer.',protocol:['Receive external event.','Validate provenance.','Reconcile into local state.'],outcome:'proposed',observationIds:[],revealedConstraintIds:[],requestId:randomUUID()});
  snapshot=store.forkLine({explorationId,fromPositionId:root,label:'Alternative authority line',requestId:randomUUID()});
  const alternative=snapshot.cartography.lines.find(l=>l.label==='Alternative authority line')!;
  const landOn=(lineId:string,label:string)=>{const packet=store.prepare({explorationId,selectedIds:[root],lineId,humanDirection:label,requestId:randomUUID()});const output=proposal(root);output.positions[0]!.meaning=label;const draft=store.submit({moveId:packet.moveId,output,requestId:randomUUID()});const cap=store.ticket(draft.id);return store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:randomUUID()});};
  const a=landOn(firstLine.id,'One line makes authority explicit at the boundary.');const firstArrival=a.positions.at(-1)!;
  const b=landOn(alternative.id,'Another line distributes reconciliation across participants.');const secondArrival=b.positions.at(-1)!;
  store.recordEncounter({explorationId,lineIds:[firstLine.id,alternative.id],basisPositionIds:[firstArrival.id,secondArrival.id],kind:'mismatch',summary:'The two lines disagree about where reconciliation authority should live.',uncertainty:['The mismatch may depend on deployment topology.'],requestId:randomUUID()});
  return {firstArrivalId:firstArrival.id,firstLineId:firstLine.id,secondArrivalId:secondArrival.id,secondLineId:alternative.id};
}

const vite=await createVite({configFile:false,root:'tests/browser',server:{middlewareMode:true}});
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/', 'http://127.0.0.1:4175');
    const json=(body:unknown)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(body));};
    if(url.pathname==='/widget'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
    if(url.pathname==='/initial'){
      const c=CallToolResultSchema.parse(await client.callTool({name:'create_exploration',arguments:{...seed,requestId:randomUUID()}}));
      const snapshot=c.structuredContent!.snapshot as Snapshot;
      const seeded=url.searchParams.has('flightLines')?seedFlightLines(snapshot.exploration.id):undefined;
      let current=store.read(snapshot.exploration.id);
      if(url.searchParams.has('weaveReview')){
        if(!seeded)throw new Error('weaveReview fixture requires flightLines=1');
        current=store.requestWeave({explorationId:current.exploration.id,lineIds:[seeded.firstLineId,seeded.secondLineId],basisPositionIds:[seeded.firstArrivalId,seeded.secondArrivalId],focus:'Do these independently developed lines preserve the same authority invariant?',requestId:randomUUID()});
        const gesture=current.cartography.gestureRequests.at(-1)!;
        store.submitWeaveResult({gestureRequestId:gesture.id,kind:'tension',summary:'The lines agree that authority must be explicit but disagree about where reconciliation should live.',uncertainty:['The tension may depend on deployment topology.'],requestId:randomUUID()});
        const result=await client.callTool({name:'open_exploration',arguments:{explorationId:current.exploration.id}});if(url.searchParams.has('noMeta'))delete result._meta;json(result);return;
      }
      if(url.searchParams.has('noDraft')){const result=await client.callTool({name:'open_exploration',arguments:{explorationId:current.exploration.id}});if(url.searchParams.has('noMeta'))delete result._meta;json(result);return;}
      const line=seeded?current.cartography.lines.find(l=>l.id===seeded.firstLineId)!:current.cartography.lines[0]!;
      const selected=seeded?current.positions.find(p=>p.id===seeded.firstArrivalId)!:current.positions.at(-1)!;
      const p=CallToolResultSchema.parse(await client.callTool({name:'prepare_move',arguments:{explorationId:current.exploration.id,selectedIds:[selected.id],lineId:line.id,humanDirection:'One fixture step.',requestId:randomUUID()}}));
      const packet=p.structuredContent!.packet as MovePacket;
      const result=await client.callTool({name:'submit_move',arguments:{moveId:packet.moveId,output:proposal(selected.id),requestId:randomUUID()}});
      if(url.searchParams.has('noMeta'))delete result._meta;
      json(result);return;
    }
    if(url.pathname==='/snapshot'){json(store.read(url.searchParams.get('id')??''));return;}
    if(url.pathname==='/call'&&req.method==='POST'){
      let body='';for await(const chunk of req){body+=String(chunk);if(body.length>1024*1024)throw new Error('Fixture request too large');}
      const args=JSON.parse(body) as {name:string;arguments:Record<string,unknown>};
      if(!['open_exploration','read_exploration','review_draft','request_branch','request_weave','dismiss_gesture_request','review_weave_result'].includes(args.name))throw new Error('Fixture allows only human app actions');
      json(await client.callTool(args));return;
    }
    vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});
  }catch(error){res.writeHead(500);res.end(String(error));}
});
server.listen(4175,'127.0.0.1');
process.once('SIGTERM',()=>{server.close();void vite.close();void client.close();void mcp.close();store.close();});
