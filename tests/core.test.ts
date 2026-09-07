import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../packages/storage/src/index.ts';
import type { ReviewInput } from '../packages/domain/src/index.ts';

import { seed, proposal } from './fixtures.ts';

function setup(s = new Store()) {
  const snapshot = s.create(seed);
  const packet = s.prepare({explorationId: snapshot.exploration.id, selectedIds: [snapshot.exploration.rootId], humanDirection: 'Take one step.', requestId: 'prepare-1'});
  const output = proposal(snapshot.exploration.rootId);
  const draft = s.submit({moveId: packet.moveId, output, requestId: 'submit-1'});
  return {s, snapshot, packet, output, draft};
}
function decision(s: Store, id: string, action: ReviewInput['action'] = 'land'): ReviewInput {
  const cap = s.ticket(id);
  return {draftId: id, expectedVersion: cap.version, token: cap.token, action, requestId: `review-${action}`};
}
const throws = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => (e as {code?: string}).code === code);

test('create/read/prepare/submit leave only the root accepted until human review', () => {
  const {s, snapshot, packet, draft} = setup();
  try {
    assert.equal(s.read(snapshot.exploration.id).positions.length, 1);
    assert.deepEqual(packet.budget, {maxMoves: 1, maxPositions: 2});
    assert.deepEqual(packet.orderedPaths, [[snapshot.exploration.rootId]]);
    const landed = s.review(decision(s, draft.id));
    assert.equal(landed.activeMove, null);
    assert.equal(landed.positions.length, 2); assert.equal(landed.exploration.revision, 2);
    assert.equal(landed.positions[1]!.epistemicStatus, 'hypothesis');
    assert.equal(landed.positions[1]!.acceptance, 'accepted');
    assert.equal(landed.positions[1]!.originMoveId, packet.moveId);
    assert.equal(s.ledger(snapshot.exploration.id).filter(e => e.kind === 'move.prepared').length, 1);
  } finally {s.close();}
});
test('landing and draft history survive a new server process', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shadow-walker-')); const path = join(dir, 'walk.sqlite');
  const {s, snapshot, draft} = setup(new Store(path));
  s.review(decision(s, draft.id)); s.close();
  try {
    const result = spawnSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e',
      `import {Store} from ${JSON.stringify(new URL('../packages/storage/src/index.ts', import.meta.url).href)}; const s=new Store(${JSON.stringify(path)}); console.log(JSON.stringify(s.read(${JSON.stringify(snapshot.exploration.id)}))); s.close();`], {encoding:'utf8'});
    assert.equal(result.status, 0, result.stderr);
    const restored = JSON.parse(result.stdout); assert.equal(restored.positions.length, 2); assert.equal(restored.drafts[0].status, 'landed');
  } finally {rmSync(dir, {recursive:true, force:true});}
});
test('pending drafts survive reopening SQLite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shadow-walker-')); const path = join(dir, 'walk.sqlite');
  const {s, snapshot, draft} = setup(new Store(path)); s.close();
  const reopened = new Store(path);
  try {assert.equal(reopened.read(snapshot.exploration.id).drafts[0]!.id, draft.id); assert.equal(reopened.read(snapshot.exploration.id).positions.length, 1);}
  finally {reopened.close(); rmSync(dir,{recursive:true,force:true});}
});
test('create, prepare, submit and review are idempotent, but changed payloads conflict', () => {
  const {s, snapshot, packet, output, draft} = setup();
  try {
    assert.equal(s.create(seed).exploration.id, snapshot.exploration.id);
    throws(() => s.create({...seed, title:'Changed'}), 'IDEMPOTENCY_CONFLICT');
    assert.equal(s.prepare({explorationId:snapshot.exploration.id, selectedIds:[snapshot.exploration.rootId], humanDirection:'Take one step.',requestId:'prepare-1'}).moveId,packet.moveId);
    assert.equal(s.submit({moveId:packet.moveId,output,requestId:'submit-1'}).id,draft.id);
    const input=decision(s,draft.id); const first=s.review(input);
    assert.deepEqual(s.review(input), first);
    throws(()=>s.review({...input,action:'discard'}),'IDEMPOTENCY_CONFLICT');
    assert.equal(s.read(snapshot.exploration.id).positions.length,2);
  } finally{s.close();}
});
test('a forged, missing, expired, or cross-draft review capability cannot mutate positions', () => {
  let now=1000; const {s,snapshot,draft}=setup(new Store(':memory:',()=>now));
  try {
    const input=decision(s,draft.id);
    throws(()=>s.review({...input,token:'forged'}),'REVIEW_REQUIRED');
    throws(()=>s.review({...input,token:''}),'INVALID_INPUT');
    throws(()=>s.review({...input,draftId:'another-draft'}),'REVIEW_REQUIRED');
    now+=600001; throws(()=>s.review(input),'REVIEW_REQUIRED');
    assert.equal(s.read(snapshot.exploration.id).positions.length,1);
  } finally{s.close();}
});
test('a used capability cannot authorize a different request, even with the same action', () => {
  const {s,draft}=setup();
  try {const input=decision(s,draft.id); s.review(input); throws(()=>s.review({...input,requestId:'replay'}),'REVIEW_REQUIRED');}
  finally{s.close();}
});
test('Revise keeps previous versions in the ledger and invalidates every old ticket', () => {
  const {s,snapshot,draft,output}=setup();
  try {
    const old=decision(s,draft.id); const edit=decision(s,draft.id,'revise');
    const changed=structuredClone(output); changed.positions[0]!.meaning='A human-edited hypothesis.';
    const revised=s.review({...edit,output:changed});
    assert.equal(revised.positions.length,1); assert.equal(revised.drafts[0]!.version,2);
    throws(()=>s.review(old),'REVIEW_REQUIRED');
    assert.equal(s.ledger(snapshot.exploration.id).filter(e=>e.kind==='draft.revise').length,1);
    assert.equal(s.ledger(snapshot.exploration.id).filter(e=>e.kind==='draft.submitted').length,1);
    assert.equal(s.review(decision(s,draft.id)).positions[1]!.meaning,'A human-edited hypothesis.');
  } finally{s.close();}
});
test('Land cannot silently replace content: edits must be revised and then reviewed', () => {
  const {s,draft,output}=setup();
  try {throws(()=>s.review({...decision(s,draft.id),output}),'INVALID_INPUT');}
  finally{s.close();}
});
for (const action of ['reserve','discard'] as const) test(`${action} preserves the draft but adds no accepted positions`, () => {
  const {s,snapshot,draft}=setup();
  try {
    const result=s.review(decision(s,draft.id,action)); assert.equal(result.positions.length,1);
    assert.equal(result.drafts[0]!.status,action==='reserve'?'reserved':'discarded');
    const next=s.prepare({explorationId:snapshot.exploration.id,selectedIds:[snapshot.exploration.rootId],humanDirection:'A separate step.',requestId:'next'});
    assert.equal(next.reserves.length,action==='reserve'?1:0);
  } finally{s.close();}
});
test('only one unreviewed move may be in progress', () => {
  const {s,snapshot}=setup();
  try {throws(()=>s.prepare({explorationId:snapshot.exploration.id,selectedIds:[snapshot.exploration.rootId],humanDirection:'Another step.',requestId:'next'}),'MOVE_IN_PROGRESS');}
  finally{s.close();}
});
test('reserved re-entry cannot bypass another active move', () => {
  const {s,snapshot,draft}=setup();
  try {
    s.review(decision(s,draft.id,'reserve'));
    s.prepare({explorationId:snapshot.exploration.id,selectedIds:[snapshot.exploration.rootId],humanDirection:'Another step.',requestId:'next'});
    throws(()=>s.review(decision(s,draft.id)),'MOVE_IN_PROGRESS');
  } finally{s.close();}
});
test('out-of-order child references land atomically in topological order', () => {
  const s=new Store();
  try {
    const snap=s.create(seed); const p=s.prepare({explorationId:snap.exploration.id,selectedIds:[snap.exploration.rootId],humanDirection:'One step.',requestId:'p'});
    const output=proposal(snap.exploration.rootId); const child={...structuredClone(output.positions[0]!),localId:'child',parentIds:['draft:arrival']}; output.positions.unshift(child);
    const d=s.submit({moveId:p.moveId,output,requestId:'s'}); const result=s.review(decision(s,d.id));
    assert.equal(result.positions.length,3); assert.deepEqual(result.positions[2]!.parentIds,[result.positions[1]!.id]);
  } finally{s.close();}
});
for(const mode of ['cycle','missing-parent','cross-exploration','budget','observation','bad-anchor','duplicate-id'] as const) test(`rejects ${mode} before persisting a draft`,()=>{
  const s=new Store();
  try {
    const snap=s.create(seed); const p=s.prepare({explorationId:snap.exploration.id,selectedIds:[snap.exploration.rootId],humanDirection:'One step.',requestId:'p'});
    const output=proposal(snap.exploration.rootId); const first=output.positions[0]!;
    if(mode==='cycle') first.parentIds=['draft:arrival'];
    if(mode==='missing-parent') first.parentIds=['draft:missing'];
    if(mode==='cross-exploration') first.parentIds=[s.create({...seed,requestId:'other'}).exploration.rootId];
    if(mode==='budget') output.positions=[first,first,first];
    if(mode==='observation') (first as {kind:string}).kind='observation';
    if(mode==='bad-anchor') first.structuralViews[0]!.anchorIds=['missing'];
    if(mode==='duplicate-id') output.positions=[first,first];
    assert.throws(()=>s.submit({moveId:p.moveId,output,requestId:'s'}));
    assert.equal(s.read(snap.exploration.id).drafts.length,0);
    assert.equal(s.read(snap.exploration.id).positions.length,1);
  } finally{s.close();}
});
test('stale dependencies fail atomically, leaving the ticket and graph unchanged',()=>{
  const dir=mkdtempSync(join(tmpdir(),'shadow-walker-')); const path=join(dir,'walk.sqlite'); const {s,snapshot,draft}=setup(new Store(path));
  const db=new DatabaseSync(path);
  try {
    const input=decision(s,draft.id); const changed={...snapshot.exploration,revision:2};
    db.prepare('UPDATE explorations SET body=? WHERE id=?').run(JSON.stringify(changed),changed.id);
    throws(()=>s.review(input),'STALE_DEPENDENCIES'); assert.equal(s.read(changed.id).positions.length,1);
    db.prepare('UPDATE explorations SET body=? WHERE id=?').run(JSON.stringify(snapshot.exploration),changed.id);
    assert.equal(s.review(input).positions.length,2);
  } finally{db.close();s.close();rmSync(dir,{recursive:true,force:true});}
});
test('ledger and accepted positions reject destructive SQL edits, and tokens never enter the ledger',()=>{
  const dir=mkdtempSync(join(tmpdir(),'shadow-walker-')); const path=join(dir,'walk.sqlite'); const {s,snapshot,draft}=setup(new Store(path)); const db=new DatabaseSync(path);
  try {
    const input=decision(s,draft.id); s.review(input);
    assert.equal(JSON.stringify(s.ledger(snapshot.exploration.id)).includes(input.token),false);
    assert.throws(()=>db.exec("UPDATE events SET kind='changed'"),/append-only/);
    assert.throws(()=>db.exec('DELETE FROM events'),/append-only/);
    assert.throws(()=>db.exec("UPDATE positions SET body='{}'"),/immutable/);
    assert.throws(()=>db.exec('DELETE FROM positions'),/immutable/);
  } finally{db.close();s.close();rmSync(dir,{recursive:true,force:true});}
});
