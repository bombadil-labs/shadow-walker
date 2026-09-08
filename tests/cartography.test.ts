import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../packages/storage/src/index.ts';
import { MIGRATIONS } from '../packages/storage/src/schema.ts';
import { DomainError } from '../packages/domain/src/index.ts';
import { seed, proposal } from './fixtures.ts';

const code=(expected:string)=>(error:unknown)=>error instanceof DomainError&&error.code===expected;

test('new exploration starts on one explicit line and returns cartography',()=>{
  const store=new Store();try{
    const s=store.create(seed);assert.equal(s.cartography.lines.length,1);assert.equal(s.cartography.memberships.length,1);
    assert.equal(s.cartography.memberships[0]!.positionId,s.exploration.rootId);assert.equal(s.cartography.memberships[0]!.role,'origin');
    assert.deepEqual(s.cartography.transitions,[]);
  }finally{store.close();}
});

test('new walks are protocol 0.2, line-situated, and require a reported semantic shift',()=>{
  const store=new Store();try{
    const s=store.create(seed);const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'Move once.',requestId:'prepare'});
    assert.equal(packet.protocolVersion,'0.2');assert.equal(packet.line?.id,s.cartography.lines[0]!.id);assert.equal(packet.outputContract.requiresSemanticShift,true);
    const missing=proposal(s.exploration.rootId);delete missing.positions[0]!.semanticShift;
    assert.throws(()=>store.submit({moveId:packet.moveId,output:missing,requestId:'submit'}),code('SEMANTIC_SHIFT_REQUIRED'));
    assert.equal(store.read(s.exploration.id).drafts.length,0);
    const draft=store.submit({moveId:packet.moveId,output:proposal(s.exploration.rootId),requestId:'submit'});assert.equal(draft.status,'pending');
  }finally{store.close();}
});

test('walker-reported semantic shifts cannot smuggle mechanistic measurements',()=>{
  const store=new Store();try{
    const s=store.create(seed);const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'Move once.',requestId:'p'});
    const output=proposal(s.exploration.rootId);Object.assign(output.positions[0]!.semanticShift!,{measured:{method:'claimed hidden state',displacement:1}});
    assert.throws(()=>store.submit({moveId:packet.moveId,output,requestId:'s'}),code('INVALID_INPUT'));
    assert.equal(store.read(s.exploration.id).drafts.length,0);
  }finally{store.close();}
});

test('landing preserves shift, line membership and typed transition atomically',()=>{
  const store=new Store();try{
    const s=store.create(seed);const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'Move once.',requestId:'p'});
    const draft=store.submit({moveId:packet.moveId,output:proposal(s.exploration.rootId),requestId:'s'});const ticket=store.ticket(draft.id);
    const landed=store.review({draftId:draft.id,expectedVersion:ticket.version,token:ticket.token,action:'land',requestId:'land'});
    assert.equal(landed.positions.length,2);const arrival=landed.positions[1]!;assert.equal(arrival.semanticShift?.newlySalient[0]!.span,'mismatch');
    assert.deepEqual(arrival.semanticShift?.baselineArrivalIds,[s.exploration.rootId]);
    assert.equal(landed.cartography.memberships.filter(m=>m.positionId===arrival.id).length,1);
    assert.equal(landed.cartography.transitions.length,1);assert.equal(landed.cartography.transitions[0]!.kind,'excavated');
    assert.equal(landed.cartography.transitions[0]!.fromPositionId,s.exploration.rootId);assert.equal(landed.cartography.transitions[0]!.toPositionId,arrival.id);
  }finally{store.close();}
});

test('local draft baselines are remapped to the landed arrival IDs',()=>{
  const store=new Store();try{
    const s=store.create(seed);const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'Two linked arrivals.',requestId:'p'});
    const first=proposal(s.exploration.rootId).positions[0]!;const second=structuredClone(first);first.localId='first';second.localId='second';second.parentIds=['draft:first'];second.semanticShift={...second.semanticShift!,baselineArrivalIds:['draft:first'],summary:'The second arrival shifts relative to the first proposed arrival.'};
    const draft=store.submit({moveId:packet.moveId,output:{positions:[second,first]},requestId:'s'});const cap=store.ticket(draft.id);
    const landed=store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:'land'});
    assert.equal(landed.positions.length,3);assert.deepEqual(landed.positions[2]!.semanticShift?.baselineArrivalIds,[landed.positions[1]!.id]);
    assert.equal(landed.cartography.transitions.length,2);
  }finally{store.close();}
});

test('forking preserves parallel lines and makes an ambiguous origin require explicit line choice',()=>{
  const store=new Store();try{
    const s=store.create(seed);const forked=store.forkLine({explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,label:'Alternative line',requestId:'fork'});
    assert.equal(forked.cartography.lines.length,2);assert.equal(forked.cartography.memberships.filter(m=>m.positionId===s.exploration.rootId).length,2);
    assert.throws(()=>store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'Ambiguous.',requestId:'ambiguous'}),code('LINE_REQUIRED'));
    const alternative=forked.cartography.lines.find(l=>l.label==='Alternative line')!;
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:alternative.id,humanDirection:'Follow the alternative.',requestId:'explicit'});
    assert.equal(packet.line?.id,alternative.id);
  }finally{store.close();}
});

test('legacy M1 database is backfilled without fabricating semantic shift',()=>{
  const dir=mkdtempSync(join(tmpdir(),'shadow-cartography-'));const path=join(dir,'legacy.sqlite');
  try{
    const db=new DatabaseSync(path);db.exec('PRAGMA foreign_keys=ON;');db.exec(MIGRATIONS[0]!);db.exec('PRAGMA user_version=1');
    const exploration={id:'e',rootId:'root',title:'Legacy',intention:'Legacy intention',frame:{id:'frame',label:'Legacy',constraints:[],version:1},revision:2,createdAt:'2026-01-01T00:00:00.000Z'};
    const root={id:'root',explorationId:'e',kind:'intention',meaning:'Legacy intention',parentIds:[],anchors:[],structuralViews:[],uncertainty:[],nextQuestion:'Next',originMoveId:null,acceptance:'accepted',epistemicStatus:'user-intention',createdAt:exploration.createdAt};
    const child={id:'child',explorationId:'e',kind:'excavation',meaning:'Old arrival',parentIds:['root'],anchors:[{id:'a',detail:'Old anchor'}],structuralViews:[],uncertainty:['Old uncertainty'],nextQuestion:'Old next',originMoveId:'m',acceptance:'accepted',epistemicStatus:'hypothesis',createdAt:'2026-01-02T00:00:00.000Z'};
    db.prepare('INSERT INTO explorations(id,body) VALUES(?,?)').run('e',JSON.stringify(exploration));db.prepare('INSERT INTO positions(id,exploration_id,body) VALUES(?,?,?)').run('root','e',JSON.stringify(root));db.prepare('INSERT INTO positions(id,exploration_id,body) VALUES(?,?,?)').run('child','e',JSON.stringify(child));db.close();
    const store=new Store(path);try{const s=store.read('e');assert.equal(s.cartography.lines.length,1);assert.equal(s.cartography.memberships.length,2);assert.equal(s.cartography.transitions.length,1);assert.equal(s.positions[1]!.semanticShift,undefined);assert.equal(s.positions[1]!.meaning,'Old arrival');}finally{store.close();}
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('fork is idempotent and historical transition/membership rows reject destructive edits',()=>{
  const dir=mkdtempSync(join(tmpdir(),'shadow-cartography-'));const path=join(dir,'state.sqlite');
  try{const store=new Store(path);const s=store.create(seed);const input={explorationId:s.exploration.id,fromPositionId:s.exploration.rootId,label:'Keep open',requestId:'fork'};const one=store.forkLine(input);const two=store.forkLine(input);assert.deepEqual(two,one);
    const original=s.cartography.lines[0]!;const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:original.id,humanDirection:'Move once.',requestId:'p'});const draft=store.submit({moveId:packet.moveId,output:proposal(s.exploration.rootId),requestId:'s'});const cap=store.ticket(draft.id);store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:'land'});store.close();
    const db=new DatabaseSync(path);try{assert.throws(()=>db.exec('DELETE FROM line_memberships'),/historical/);assert.throws(()=>db.exec('DELETE FROM transitions'),/historical/);}finally{db.close();}
  }finally{rmSync(dir,{recursive:true,force:true});}
});
