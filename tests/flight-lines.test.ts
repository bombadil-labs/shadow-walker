import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../packages/storage/src/index.ts';
import { DomainError } from '../packages/domain/src/index.ts';
import { seed, proposal } from './fixtures.ts';

const code=(expected:string)=>(error:unknown)=>error instanceof DomainError&&error.code===expected;

function land(store:Store, explorationId:string, parentId:string, lineId:string, requestPrefix:string){
  const packet=store.prepare({explorationId,selectedIds:[parentId],lineId,humanDirection:'Walk one grounded fixture step.',requestId:`${requestPrefix}-prepare`});
  const draft=store.submit({moveId:packet.moveId,output:proposal(parentId),requestId:`${requestPrefix}-submit`});
  const cap=store.ticket(draft.id);
  const snapshot=store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:`${requestPrefix}-land`});
  return snapshot.positions.at(-1)!;
}

test('new explorations expose empty first-class Flight Lines collections',()=>{
  const store=new Store();try{
    const s=store.create(seed);
    assert.deepEqual(s.cartography.observations,[]);assert.deepEqual(s.cartography.constraints,[]);assert.deepEqual(s.cartography.operations,[]);assert.deepEqual(s.cartography.applications,[]);assert.deepEqual(s.cartography.encounters,[]);
  }finally{store.close();}
});

test('observations require external provenance and may be situated at a visited arrival',()=>{
  const store=new Store();try{
    const s=store.create(seed);
    const after=store.recordObservation({explorationId:s.exploration.id,positionId:s.exploration.rootId,kind:'human-report',detail:'The user reports that the prototype failed when both writers changed the same record.',source:'User report in current conversation',requestId:'obs'});
    assert.equal(after.cartography.observations.length,1);assert.equal(after.cartography.observations[0]!.kind,'human-report');
    assert.throws(()=>store.recordObservation({explorationId:s.exploration.id,kind:'model-generated' as never,detail:'Invented',source:'model',requestId:'bad'}),code('INVALID_INPUT'));
  }finally{store.close();}
});

test('observation-derived and breakdown-derived constraints cannot float free of evidence',()=>{
  const store=new Store();try{
    const s=store.create(seed);
    assert.throws(()=>store.recordConstraint({explorationId:s.exploration.id,label:'Temporal coupling',description:'A claimed constraint.',discoveredAtPositionId:s.exploration.rootId,provenance:'observation-derived',observationIds:[],requestId:'missing'}),code('OBSERVATION_REQUIRED'));
    const withObs=store.recordObservation({explorationId:s.exploration.id,kind:'tool-result',detail:'Concurrent fixture writes produced a conflict.',source:'test harness result',requestId:'obs'});
    const obs=withObs.cartography.observations[0]!;
    const constrained=store.recordConstraint({explorationId:s.exploration.id,label:'Single-writer conflict',description:'Concurrent mutation creates a coordination constraint.',discoveredAtPositionId:s.exploration.rootId,provenance:'observation-derived',observationIds:[obs.id],requestId:'constraint'});
    assert.equal(constrained.cartography.constraints[0]!.epistemicStatus,'candidate');assert.deepEqual(constrained.cartography.constraints[0]!.observationIds,[obs.id]);
  }finally{store.close();}
});

test('an operation must preserve executable mechanics and target recorded constraints',()=>{
  const store=new Store();try{
    const s=store.create(seed);
    const constrained=store.recordConstraint({explorationId:s.exploration.id,label:'Mutation authority',description:'The write boundary is structurally ambiguous.',discoveredAtPositionId:s.exploration.rootId,provenance:'walker-report',observationIds:[],requestId:'constraint'});
    const constraint=constrained.cartography.constraints[0]!;
    assert.throws(()=>store.recordOperation({explorationId:s.exploration.id,name:'Cell membrane',originDomain:'biology',inputStructure:'unregulated crossing',outputStructure:'regulated crossing',preserves:[],transforms:['cross-boundary flow'],procedure:['Declare allowed crossings.'],constraintIds:[constraint.id],requestId:'bad-op'}),code('INVALID_INPUT'));
    const operated=store.recordOperation({explorationId:s.exploration.id,name:'Selective permeability',originDomain:'cell biology',inputStructure:'multiple actors crossing an autonomy boundary',outputStructure:'explicitly regulated crossings',preserves:['internal autonomy'],transforms:['implicit shared mutation into explicit boundary traffic'],procedure:['Enumerate boundary-crossing mutations.','Choose one owner for internal state.','Represent external changes as explicit messages.'],constraintIds:[constraint.id],requestId:'op'});
    assert.equal(operated.cartography.operations[0]!.name,'Selective permeability');assert.equal(operated.cartography.operations[0]!.epistemicStatus,'candidate');
  }finally{store.close();}
});

test('non-proposed applications require grounded observations and breakdowns preserve revealed constraints',()=>{
  const store=new Store();try{
    const s=store.create(seed);const line=s.cartography.lines[0]!;
    const c1=store.recordConstraint({explorationId:s.exploration.id,label:'Shared mutation',description:'Two actors write one state.',discoveredAtPositionId:s.exploration.rootId,provenance:'walker-report',observationIds:[],requestId:'c1'}).cartography.constraints[0]!;
    const op=store.recordOperation({explorationId:s.exploration.id,name:'Single writer',originDomain:'distributed systems',inputStructure:'many writers',outputStructure:'one authoritative writer plus messages',preserves:['all requested mutations remain representable'],transforms:['shared mutation'],procedure:['Choose owner.','Route mutation requests to owner.'],constraintIds:[c1.id],requestId:'op'}).cartography.operations[0]!;
    assert.throws(()=>store.recordApplication({explorationId:s.exploration.id,operationId:op.id,lineId:line.id,targetConstraintIds:[c1.id],adaptation:'Assign service A as writer.',protocol:['Route all writes through A.'],outcome:'executed',observationIds:[],revealedConstraintIds:[],requestId:'ungrounded'}),code('OBSERVATION_REQUIRED'));
    const obs=store.recordObservation({explorationId:s.exploration.id,kind:'human-report',detail:'External reconciliation still changes apparent truth asynchronously.',source:'User report after trying the sketch',requestId:'obs'}).cartography.observations[0]!;
    const c2=store.recordConstraint({explorationId:s.exploration.id,label:'External authority',description:'An external system can revise apparent truth outside the proposed writer.',discoveredAtPositionId:s.exploration.rootId,provenance:'breakdown-derived',observationIds:[obs.id],requestId:'c2'}).cartography.constraints.at(-1)!;
    const applied=store.recordApplication({explorationId:s.exploration.id,operationId:op.id,lineId:line.id,targetConstraintIds:[c1.id],adaptation:'Assign service A as writer.',protocol:['Route all writes through A.'],outcome:'broke-down',observationIds:[obs.id],revealedConstraintIds:[c2.id],requestId:'breakdown'});
    assert.equal(applied.cartography.applications[0]!.outcome,'broke-down');assert.deepEqual(applied.cartography.applications[0]!.revealedConstraintIds,[c2.id]);
  }finally{store.close();}
});

test('encounters require developed basis on every selected line and may persist no correspondence',()=>{
  const store=new Store();try{
    const s=store.create(seed);const original=s.cartography.lines[0]!;
    const a=land(store,s.exploration.id,s.exploration.rootId,original.id,'a');
    const forked=store.forkLine({explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,label:'Alternative',requestId:'fork'});const alternative=forked.cartography.lines.find(l=>l.label==='Alternative')!;
    const b=land(store,s.exploration.id,s.exploration.rootId,alternative.id,'b');
    assert.throws(()=>store.recordEncounter({explorationId:s.exploration.id,lineIds:[original.id,alternative.id],basisPositionIds:[a.id,s.exploration.rootId],kind:'correspondence',summary:'Premature synthesis.',uncertainty:['The second line has no independent basis in this selection.'],requestId:'bad'}),code('INVALID_ENCOUNTER_BASIS'));
    const woven=store.recordEncounter({explorationId:s.exploration.id,lineIds:[original.id,alternative.id],basisPositionIds:[a.id,b.id],kind:'none',summary:'After comparing the two developed lines, no useful structural correspondence was found.',uncertainty:['Later movement could change this result.'],requestId:'none'});
    assert.equal(woven.cartography.encounters.length,1);assert.equal(woven.cartography.encounters[0]!.kind,'none');
  }finally{store.close();}
});

test('Flight Lines records are idempotent and reject foreign exploration references',()=>{
  const store=new Store();try{
    const a=store.create({...seed,requestId:'create-a'});const b=store.create({...seed,title:'Other',requestId:'create-b'});
    const input={explorationId:a.exploration.id,kind:'source' as const,detail:'A cited source says X.',source:'fixture://source',requestId:'obs'};
    const one=store.recordObservation(input),two=store.recordObservation(input);assert.deepEqual(two,one);assert.equal(one.cartography.observations.length,1);
    const foreign=store.recordObservation({explorationId:b.exploration.id,kind:'human-report',detail:'Other exploration evidence.',source:'fixture',requestId:'foreign'}).cartography.observations[0]!;
    assert.throws(()=>store.recordConstraint({explorationId:a.exploration.id,label:'Wrong evidence',description:'Should fail.',discoveredAtPositionId:a.exploration.rootId,provenance:'observation-derived',observationIds:[foreign.id],requestId:'bad'}),code('INVALID_OBSERVATION'));
  }finally{store.close();}
});
