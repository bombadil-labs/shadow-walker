import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../packages/storage/src/index.ts';
import { DomainError } from '../packages/domain/src/index.ts';
import { seed, proposal } from './fixtures.ts';

const code=(expected:string)=>(error:unknown)=>error instanceof DomainError&&error.code===expected;
function land(store:Store, explorationId:string, parentId:string, lineId:string, prefix:string){
  const packet=store.prepare({explorationId,selectedIds:[parentId],lineId,humanDirection:'Move once.',requestId:`${prefix}-prepare`});
  const draft=store.submit({moveId:packet.moveId,output:proposal(parentId),requestId:`${prefix}-submit`});
  const cap=store.ticket(draft.id);
  return store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:`${prefix}-land`});
}

test('every new prepared move persists a situated traversal record',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,humanDirection:'Walk under declared conditions.',traversalContext:{provenance:'mixed',host:'ChatGPT',model:'declared model label',skillRevision:'shadow-walker-v0.5',sessionLabel:'field-test'},requestId:'prepare'});
    assert.equal(packet.traversal?.mode,'walk');assert.equal(packet.traversal?.moveId,packet.moveId);assert.equal(packet.traversal?.lineId,line.id);assert.deepEqual(packet.traversal?.selectedPositionIds,[s.exploration.rootId]);
    const traversal=store.read(s.exploration.id).cartography.traversals[0]!;assert.equal(traversal.id,packet.traversal?.id);assert.equal(traversal.context?.host,'ChatGPT');assert.equal(traversal.context?.provenance,'mixed');
  }finally{store.close();}
});

test('re-walk target must be visited and one of the selected arrivals',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;const first=land(store,s.exploration.id,s.exploration.rootId,line.id,'first'),arrival=first.positions.at(-1)!;
    assert.throws(()=>store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,rewalkOfPositionId:arrival.id,humanDirection:'Invalid re-walk selection.',requestId:'bad-selected'}),code('INVALID_REWALK'));
    assert.throws(()=>store.prepare({explorationId:s.exploration.id,selectedIds:[arrival.id],lineId:line.id,rewalkOfPositionId:'not-an-arrival',humanDirection:'Invalid target.',requestId:'bad-target'}),code('NOT_FOUND'));
  }finally{store.close();}
});

test('reviewed re-walk preserves the old arrival and lands a new arrival on a typed rewalked-to transition',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;const first=land(store,s.exploration.id,s.exploration.rootId,line.id,'first'),target=first.positions.at(-1)!;
    const beforeMeaning=target.meaning;const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[target.id],lineId:line.id,rewalkOfPositionId:target.id,humanDirection:'Revisit this arrival under current conditions and notice what changes.',traversalContext:{provenance:'host-declared',host:'test-host',model:'test-model'},requestId:'rewalk-prepare'});
    assert.equal(packet.traversal?.mode,'rewalk');assert.equal(packet.traversal?.rewalkOfPositionId,target.id);assert.ok(packet.instructions.some(v=>v.includes('explicit re-walk')));
    const out=proposal(target.id);out.positions[0]!.meaning='A later traversal makes a different affordance salient.';out.positions[0]!.semanticShift={...out.positions[0]!.semanticShift!,summary:'The revisit preserves revisability but shifts attention toward changed conditions.',newlySalient:[{span:'changed conditions',salience:'high'}]};
    const draft=store.submit({moveId:packet.moveId,output:out,requestId:'rewalk-submit'});const cap=store.ticket(draft.id);const after=store.review({draftId:draft.id,expectedVersion:cap.version,token:cap.token,action:'land',requestId:'rewalk-land'});
    assert.equal(after.positions.find(p=>p.id===target.id)?.meaning,beforeMeaning);const arrival=after.positions.at(-1)!;assert.notEqual(arrival.id,target.id);assert.equal(arrival.meaning,'A later traversal makes a different affordance salient.');
    const edge=after.cartography.transitions.find(t=>t.fromPositionId===target.id&&t.toPositionId===arrival.id);assert.equal(edge?.kind,'rewalked-to');
    assert.equal(after.cartography.traversals.at(-1)?.rewalkOfPositionId,target.id);
  }finally{store.close();}
});

test('declared traversal provenance is validated but remains optional',()=>{
  const store=new Store();try{
    const s=store.create(seed),line=s.cartography.lines[0]!;
    assert.throws(()=>store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,humanDirection:'Bad provenance.',traversalContext:{provenance:'fabricated' as never},requestId:'bad'}),code('INVALID_INPUT'));
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,humanDirection:'No declared provenance.',requestId:'plain'});assert.equal(packet.traversal?.context,undefined);
  }finally{store.close();}
});

test('traversal records are immutable historical rows',()=>{
  const dir=mkdtempSync(join(tmpdir(),'shadow-traversal-')),path=join(dir,'state.sqlite');try{
    const store=new Store(path);const s=store.create(seed),line=s.cartography.lines[0]!;store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],lineId:line.id,humanDirection:'Persist traversal.',requestId:'prepare'});store.close();
    const db=new DatabaseSync(path);try{assert.throws(()=>db.exec("UPDATE traversals SET body='{}'"),/historical/);assert.throws(()=>db.exec('DELETE FROM traversals'),/historical/);}finally{db.close();}
  }finally{rmSync(dir,{recursive:true,force:true});}
});
