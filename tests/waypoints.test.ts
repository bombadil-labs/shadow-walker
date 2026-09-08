import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../packages/storage/src/index.ts';
import { DomainError } from '../packages/domain/src/index.ts';
import { seed, proposal } from './fixtures.ts';

const code=(expected:string)=>(error:unknown)=>error instanceof DomainError&&error.code===expected;

function land(store:Store, explorationId:string, parentId:string, lineId:string, requestPrefix:string, waypointId?:string){
  const packet=store.prepare({explorationId,selectedIds:[parentId],lineId,waypointId,humanDirection:'Follow one bounded route.',requestId:`${requestPrefix}-prepare`});
  const draft=store.submit({moveId:packet.moveId,output:proposal(parentId),requestId:`${requestPrefix}-submit`});
  const cap=store.ticket(draft.id);
  return store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:`${requestPrefix}-land`});
}

test('new explorations do not fabricate a future route before any walk has opened one',()=>{
  const store=new Store();try{
    const s=store.create(seed);
    assert.deepEqual(s.cartography.waypoints,[]);
  }finally{store.close();}
});

test('landing an arrival persists its next question as a sensed walker waypoint',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    const landed=land(store,s.exploration.id,s.exploration.rootId,line.id,'first');
    const arrival=landed.positions.at(-1)!;
    const route=landed.cartography.waypoints.find(w=>w.fromPositionId===arrival.id);
    assert.ok(route);assert.equal(route.status,'sensed');assert.equal(route.provenance,'walker-sensed');
    assert.equal(route.question,arrival.nextQuestion);assert.equal(route.visitedPositionId,undefined);
  }finally{store.close();}
});

test('a persisted route can be followed explicitly and becomes visited only after human-reviewed landing',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    const first=land(store,s.exploration.id,s.exploration.rootId,line.id,'first');
    const parent=first.positions.at(-1)!;const route=first.cartography.waypoints.find(w=>w.fromPositionId===parent.id)!;
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[parent.id],lineId:line.id,waypointId:route.id,humanDirection:'Follow the saved question without assuming its answer.',requestId:'follow-prepare'});
    assert.equal(packet.routeWaypoint?.id,route.id);assert.equal(packet.routeWaypoint?.status,'sensed');
    const draft=store.submit({moveId:packet.moveId,output:proposal(parent.id),requestId:'follow-submit'});
    assert.equal(store.read(s.exploration.id).cartography.waypoints.find(w=>w.id===route.id)!.status,'sensed');
    const cap=store.ticket(draft.id);const after=store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:'follow-land'});
    const visited=after.cartography.waypoints.find(w=>w.id===route.id)!;const child=after.positions.at(-1)!;
    assert.equal(visited.status,'visited');assert.equal(visited.visitedPositionId,child.id);assert.ok(visited.resolvedAt);
    assert.ok(after.cartography.waypoints.some(w=>w.fromPositionId===child.id&&w.status==='sensed'));
  }finally{store.close();}
});

test('a followed waypoint must originate at one of the selected arrivals',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    const first=land(store,s.exploration.id,s.exploration.rootId,line.id,'first');const child=first.positions.at(-1)!;
    const route=store.recordWaypoint({explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,question:'An older alternative route?',provenance:'human-offered',requestId:'route'}).cartography.waypoints.at(-1)!;
    assert.throws(()=>store.prepare({explorationId:s.exploration.id,selectedIds:[child.id],lineId:line.id,waypointId:route.id,humanDirection:'Wrong origin.',requestId:'bad-follow'}),code('INVALID_WAYPOINT'));
  }finally{store.close();}
});

test('explicitly recording a new route changes the live ecology and stales an already prepared walk',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,humanDirection:'Prepared before the route existed.',requestId:'prepare'});
    const after=store.recordWaypoint({explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,question:'What if we follow the unchosen constraint?',provenance:'human-offered',requestId:'waypoint'});
    assert.equal(after.exploration.revision,s.exploration.revision+1);
    assert.throws(()=>store.submit({moveId:packet.moveId,output:proposal(s.exploration.rootId),requestId:'submit'}),code('STALE_DEPENDENCIES'));
  }finally{store.close();}
});

test('dissipated routes remain historical but cannot be followed',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    const withRoute=store.recordWaypoint({explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,question:'A route we choose not to keep live?',provenance:'human-offered',requestId:'route'});
    const route=withRoute.cartography.waypoints[0]!;
    const after=store.dissipateWaypoint({explorationId:s.exploration.id,waypointId:route.id,reason:'The human wants the possibility remembered but no longer on the active frontier.',requestId:'dissipate'});
    const closed=after.cartography.waypoints.find(w=>w.id===route.id)!;
    assert.equal(closed.status,'dissipated');assert.match(closed.resolutionNote??'',/remembered/);assert.ok(closed.resolvedAt);
    assert.throws(()=>store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,waypointId:route.id,humanDirection:'Try to reopen it implicitly.',requestId:'bad'}),code('WAYPOINT_CLOSED'));
  }finally{store.close();}
});

test('waypoint writes are idempotent and do not duplicate sensed routes on retry',()=>{
  const store=new Store();try{
    const s=store.create(seed);
    const input={explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,question:'Keep this fork visible?',provenance:'walker-sensed' as const,requestId:'same'};
    const one=store.recordWaypoint(input),two=store.recordWaypoint(input);
    assert.deepEqual(two,one);assert.equal(one.cartography.waypoints.length,1);
  }finally{store.close();}
});
