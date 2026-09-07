import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../packages/storage/src/index.ts';
import { DomainError, validateOutput } from '../packages/domain/src/index.ts';
import type { Draft, MoveOutput, MovePacket, Position, ReviewInput, Snapshot } from '../packages/domain/src/index.ts';
import { boundMoveContext, collectAncestryPaths } from '../packages/domain/src/context.ts';
import { jsonByteLength, WALK_LIMITS } from '../packages/domain/src/limits.ts';

const code = (expected: string) => (error: unknown) => error instanceof DomainError && error.code === expected;
function proposal(parentIds: string[] = ['root'], localId = 'arrival'): MoveOutput {
  return { positions: [{ localId, kind: 'excavation', meaning: 'A possible direction, not an established result.',
    parentIds, anchors: [{ id: 'concrete', detail: 'A concrete fixture retained in this exploration.' }], structuralViews: [],
    uncertainty: ['A human review records acceptance, not verification.'], nextQuestion: 'What would change the next question?',
    semanticShift: { baselineArrivalIds: [parentIds[0]!], summary: 'The fixture moves from a generic direction toward a testable changed question.',
      newlySalient: [{span:'changed question',salience:'medium'}], receded: [], preservedInvariants: ['Human review remains required.'],
      unexpectedConnections: [], newAffordances: ['Ask what changed.'], surprise: {level:'medium',notes:'Fixture shift for cartography tests.'} } }] };
}
function bigProposal(parentIds: string[], width = 7500): MoveOutput {
  const output = proposal(parentIds);
  output.positions[0]!.uncertainty = Array(8).fill('x'.repeat(width));
  validateOutput(output);
  return output;
}
function position(id: string, parentIds: string[] = [], explorationId = 'exploration'): Position {
  const { localId: _localId, ...p } = proposal(parentIds).positions[0]!;
  return { ...p, id, parentIds, explorationId, kind: parentIds.length ? 'excavation' : 'intention',
    originMoveId: null, acceptance: 'accepted', epistemicStatus: parentIds.length ? 'hypothesis' : 'user-intention', createdAt: '2026-09-07T00:00:00.000Z' };
}
function create(store: Store): Snapshot {
  return store.create({ title: 'Context tests', intention: 'Keep the next move bounded without losing unfinished work.',
    frame: { label: 'Test frame', constraints: ['Generated findings remain hypotheses.'] }, requestId: 'create' });
}
function review(store: Store, draft: Draft, action: ReviewInput['action'] = 'land'): Snapshot {
  const ticket = store.ticket(draft.id);
  return store.review({ draftId: draft.id, expectedVersion: ticket.version, token: ticket.token,
    action, requestId: `review-${draft.id}-${ticket.version}` });
}
function required(selected: Position[]): Omit<MovePacket, 'orderedPaths' | 'reserves' | 'context'> {
  return { protocolVersion: '0.1', moveId: 'move', kind: 'walk', explorationId: 'exploration',
    frame: {id:'frame',label:'Frame',constraints:[],version:1}, originalIntention: 'Retain uncertainty and ancestry.',
    selectedInputs:selected,priorRecordedWaypoint:selected[0]!,humanDirection:'One move only.',
    dependencyVersions:{exploration:1,frame:1},budget:{maxMoves:1,maxPositions:2},instructions:['Submit, then stop.'],
    outputContract:{kinds:['excavation','question'],localParentPrefix:'draft:'} };
}
function diamond(levels: number, longIds = false): { byId: Map<string, Position>; tips: Position[] } {
  const name = (id: string) => longIds ? id.padEnd(100, 'x') : id;
  const root = position(name('root'));
  const byId = new Map([[root.id, root]]);
  let tips = [root];
  for (let i = 0; i < levels; i++) {
    const parents = tips.map(p => p.id);
    tips = [position(name(`a-${i}`),parents),position(name(`b-${i}`),parents)];
    for (const p of tips) byId.set(p.id,p);
  }
  return {byId,tips};
}

test('small ancestry previews preserve all paths and recorded parent/selection order', () => {
  const root = position('root'); const a = position('a',['root']); const b = position('b',['root']);
  const c = position('c',['b','a']); const byId = new Map([root,a,b,c].map(p => [p.id,p]));
  assert.deepEqual(collectAncestryPaths([c,a],byId), {
    orderedPaths:[['root','b','c'],['root','a','c'],['root','a']],truncatedInputIds:[],
  });
});

test('exactly the per-input path limit is complete; additional paths are explicitly omitted', () => {
  const eight = diamond(4);
  assert.equal(collectAncestryPaths([eight.tips[0]!],eight.byId).orderedPaths.length,8);
  assert.deepEqual(collectAncestryPaths([eight.tips[0]!],eight.byId).truncatedInputIds,[]);
  const sixteen = diamond(5);
  const result = collectAncestryPaths(sixteen.tips,sixteen.byId);
  assert.equal(result.orderedPaths.length,2 * WALK_LIMITS.maxPathsPerInput);
  assert.deepEqual(result.truncatedInputIds,sixteen.tips.map(p => p.id));
});

test('a graph with exponentially many paths is bounded fairly for every selected input', () => {
  const {byId,tips} = diamond(50);
  const result = collectAncestryPaths(tips,byId);
  assert.equal(result.orderedPaths.length,16);
  for (const tip of tips) assert.equal(result.orderedPaths.filter(p => p.at(-1) === tip.id).length,8);
  assert.deepEqual(result.truncatedInputIds,tips.map(p => p.id));
});

test('a path exactly at the depth limit is complete; longer paths are never mislabeled complete', () => {
  const byId = new Map<string,Position>();
  for (let i=0;i<=WALK_LIMITS.maxPathDepth;i++) byId.set(String(i),position(String(i),i ? [String(i-1)] : []));
  const exact = collectAncestryPaths([byId.get(String(WALK_LIMITS.maxPathDepth-1))!],byId);
  assert.equal(exact.orderedPaths[0]!.length,WALK_LIMITS.maxPathDepth);
  assert.deepEqual(exact.truncatedInputIds,[]);
  const over = collectAncestryPaths([byId.get(String(WALK_LIMITS.maxPathDepth))!],byId);
  assert.deepEqual(over.orderedPaths,[]);
  assert.deepEqual(over.truncatedInputIds,[String(WALK_LIMITS.maxPathDepth)]);
});

test('20,000-deep ancestry does not recurse or visit the full chain', () => {
  class CountingMap extends Map<string,Position> {
    reads = 0;
    override get(id:string):Position|undefined { this.reads++; return super.get(id); }
  }
  const byId = new CountingMap(); let tip = position('0'); byId.set(tip.id,tip);
  for (let i=1;i<20_000;i++) { tip=position(String(i),[tip.id]); byId.set(tip.id,tip); }
  const result=collectAncestryPaths([tip],byId);
  assert.equal(byId.reads,WALK_LIMITS.maxPathDepth);
  assert.deepEqual(result.orderedPaths,[]);
  assert.deepEqual(result.truncatedInputIds,[tip.id]);
});

test('a rootless-within-budget search is capped by ancestor visits, not only completed paths', () => {
  const {byId,tips}=diamond(70); let reads=0;
  const originalGet=byId.get.bind(byId);
  byId.get=(id:string) => { reads++; return originalGet(id); };
  const result=collectAncestryPaths([tips[0]!],byId);
  assert.equal(reads,WALK_LIMITS.maxAncestorVisitsPerInput);
  assert.deepEqual(result.orderedPaths,[]);
  assert.deepEqual(result.truncatedInputIds,[tips[0]!.id]);
});

test('visited cycles, missing parents, and cross-exploration ancestry fail with domain errors', () => {
  const a=position('a',['b']); const b=position('b',['a']);
  assert.throws(() => collectAncestryPaths([a],new Map([[a.id,a],[b.id,b]])),code('CYCLE'));
  assert.throws(() => collectAncestryPaths([a],new Map([[a.id,a]])),code('INVALID_PARENT'));
  assert.throws(() => collectAncestryPaths([a],new Map([[a.id,a],[b.id,{...b,explorationId:'other'}]])),code('INVALID_PARENT'));
});

test('seeded DAGs return only actual root-to-input paths without mutating source data', () => {
  let state=91;
  const random=() => { state=(Math.imul(state,1664525)+1013904223)>>>0; return state; };
  for (let trial=0;trial<40;trial++) {
    const rows=[position('root')];
    for (let i=1;i<80;i++) {
      const parents=[rows[random()%rows.length]!.id,rows[random()%rows.length]!.id];
      rows.push(position(String(i),[...new Set(parents)]));
    }
    const before=JSON.stringify(rows); const byId=new Map(rows.map(p=>[p.id,p]));
    const selected=rows.slice(-4); const result=collectAncestryPaths(selected,byId);
    assert.ok(result.orderedPaths.length<=selected.length*WALK_LIMITS.maxPathsPerInput);
    for (const path of result.orderedPaths) {
      assert.equal(path[0],'root'); assert.ok(selected.some(p=>p.id===path.at(-1)));
      for (let i=1;i<path.length;i++) assert.ok(byId.get(path[i]!)!.parentIds.includes(path[i-1]!));
    }
    assert.equal(JSON.stringify(rows),before);
  }
});

test('byte budgeting trims optional paths but never selected findings or the original frame', () => {
  const {byId,tips}=diamond(40,true);
  const selected=[...tips,...Array.from(byId.values()).slice(-4,-2)].map(p=>({...p,uncertainty:Array(6).fill('x'.repeat(7500))}));
  selected.forEach(p=>byId.set(p.id,p));
  const base=required(selected); const before=JSON.stringify(base);
  const available=collectAncestryPaths(selected,byId).orderedPaths.length;
  const packet=boundMoveContext(base,byId,[]);
  assert.ok(packet.orderedPaths.length<available);
  assert.ok(jsonByteLength(packet)<=WALK_LIMITS.maxPacketBytes);
  assert.equal(packet.context.paths.complete,false);
  assert.equal(packet.context.paths.included,packet.orderedPaths.length);
  assert.deepEqual(packet.selectedInputs,selected);
  assert.deepEqual(packet.frame,base.frame);
  assert.equal(JSON.stringify(base),before);
});

test('reserve previews report count and byte omissions without modifying any reserve', () => {
  const root=position('root'); const base=required([root]); base.humanDirection='x'.repeat(8000);
  const reserves:Draft[]=Array.from({length:7},(_,i)=>({id:`reserve-${i}`,moveId:`move-${i}`,explorationId:'exploration',
    version:2,status:'reserved',output:bigProposal(['root'],8000),createdAt:'2026-09-07T00:00:00.000Z'}));
  const before=JSON.stringify(reserves);
  const packet=boundMoveContext(base,new Map([[root.id,root]]),reserves);
  assert.ok(packet.reserves.length>0 && packet.reserves.length<4);
  assert.deepEqual(packet.reserves.map(d=>d.id),['reserve-6','reserve-5','reserve-4']);
  assert.deepEqual(packet.context.reserves,{total:7,included:3,omitted:4});
  assert.ok(jsonByteLength(packet)<=WALK_LIMITS.maxPacketBytes);
  assert.equal(JSON.stringify(reserves),before);
});

test('a 21-position persisted graph has bounded context and retains every position', () => {
  const store=new Store();
  try {
    let s=create(store); let ids=[s.exploration.rootId];
    for (let i=0;i<10;i++) {
      const packet=store.prepare({explorationId:s.exploration.id,selectedIds:ids,humanDirection:'One move.',requestId:`p${i}`});
      const output:MoveOutput={positions:[proposal(ids,'a').positions[0]!,proposal(ids,'b').positions[0]!]};
      const draft=store.submit({moveId:packet.moveId,output,requestId:`s${i}`});
      s=review(store,draft); ids=s.positions.slice(-2).map(p=>p.id);
    }
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:ids,humanDirection:'One move.',requestId:'final'});
    assert.equal(packet.orderedPaths.length,16);
    assert.deepEqual(packet.context!.paths.truncatedInputIds,ids);
    assert.ok(jsonByteLength(packet)<20_000);
    assert.deepEqual(store.read(s.exploration.id).positions,s.positions);
    assert.equal(s.positions.length,21);
    assert.ok(packet.instructions.some(i=>i.includes('priorRecordedWaypoint')));
  } finally { store.close(); }
});

test('store keeps all reserved drafts and presents the four newest-created previews', () => {
  const store=new Store();
  try {
    const s=create(store); const ids:string[]=[];
    for (let i=0;i<7;i++) {
      const p=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One move.',requestId:`p${i}`});
      const d=store.submit({moveId:p.moveId,output:proposal([s.exploration.rootId]),requestId:`s${i}`});
      ids.push(d.id); review(store,d,'reserve');
    }
    const p=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One move.',requestId:'last'});
    assert.deepEqual(p.reserves.map(d=>d.id),ids.slice(-4).reverse());
    assert.deepEqual(p.context!.reserves,{total:7,included:4,omitted:3});
    assert.equal(store.read(s.exploration.id).drafts.length,7);
    assert.equal(store.read(s.exploration.id).positions.length,1);
  } finally { store.close(); }
});

test('required context over budget saves no move, event, or idempotency receipt', () => {
  const store=new Store();
  try {
    let s=create(store);
    for (let i=0;i<4;i++) {
      const parents=[s.positions.at(-1)!.id];
      const p=store.prepare({explorationId:s.exploration.id,selectedIds:parents,humanDirection:'One move.',requestId:`p${i}`});
      s=review(store,store.submit({moveId:p.moveId,output:bigProposal(parents),requestId:`s${i}`}));
    }
    const request={explorationId:s.exploration.id,selectedIds:s.positions.slice(-4).map(p=>p.id),humanDirection:'One move.',requestId:'retryable'};
    const before=store.ledger(s.exploration.id);
    assert.throws(()=>store.prepare(request),code('CONTEXT_BUDGET_EXCEEDED'));
    assert.deepEqual(store.read(s.exploration.id),s);
    assert.deepEqual(store.ledger(s.exploration.id),before);
    const corrected={...request,selectedIds:[s.positions.at(-1)!.id]};
    const packet=store.prepare(corrected);
    assert.deepEqual(store.prepare(corrected),packet);
    assert.ok(jsonByteLength(packet)<=WALK_LIMITS.maxPacketBytes);
  } finally { store.close(); }
});

test('aggregate output budget counts UTF-8 bytes rather than code units', () => {
  const output=proposal(); output.positions[0]!.uncertainty=Array(3).fill('界'.repeat(7900));
  assert.ok(JSON.stringify(output).length<WALK_LIMITS.maxOutputBytes);
  assert.ok(jsonByteLength(output)>WALK_LIMITS.maxOutputBytes);
  assert.throws(()=>validateOutput(output),code('BUDGET_EXCEEDED'));
});

test('aggregate output budget accepts its exact byte boundary and rejects one byte more', () => {
  const output=bigProposal(['root']); const anchor=output.positions[0]!.anchors[0]!;
  anchor.detail+='x'.repeat(WALK_LIMITS.maxOutputBytes-jsonByteLength(output));
  assert.equal(jsonByteLength(output),WALK_LIMITS.maxOutputBytes);
  validateOutput(output);
  anchor.detail+='x';
  assert.throws(()=>validateOutput(output),code('BUDGET_EXCEEDED'));
});

test('domain validation rejects unknown anchor fields, unknown structural fields, and non-JSON prototypes', () => {
  const anchor=proposal(); Object.assign(anchor.positions[0]!.anchors[0]!,{verified:true});
  assert.throws(()=>validateOutput(anchor),code('INVALID_INPUT'));
  const structural=proposal(); structural.positions[0]!.structuralViews=[{label:'View',entities:[],relationships:[],invariants:[],
    applicability:'Test only',anchorIds:['concrete'],omissions:[],mismatches:[]}];
  Object.assign(structural.positions[0]!.structuralViews[0]!,{instructions:'An unexpected field.'});
  assert.throws(()=>validateOutput(structural),code('INVALID_INPUT'));
  const inherited=proposal(); Object.setPrototypeOf(inherited.positions[0]!.anchors[0]!,{source:'inherited'});
  assert.throws(()=>validateOutput(inherited),code('INVALID_INPUT'));
});

test('oversized initial frames leave no exploration or receipt and can be corrected', () => {
  const store=new Store();
  try {
    const input={title:'Test',intention:'Test intention',frame:{label:'Frame',constraints:Array(10).fill('x'.repeat(8000))},requestId:'same'};
    assert.throws(()=>store.create(input),code('BUDGET_EXCEEDED'));
    assert.deepEqual(store.list(),[]);
    const s=store.create({...input,frame:{...input.frame,constraints:[]}});
    assert.equal(store.list()[0]!.id,s.exploration.id);
  } finally { store.close(); }
});

test('oversized submission is recoverable and an oversized revision does not consume review authority', () => {
  const store=new Store();
  try {
    const s=create(store); const p=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One move.',requestId:'p'});
    const large=proposal([s.exploration.rootId]); large.positions[0]!.uncertainty=Array(16).fill('x'.repeat(8000));
    const before=store.ledger(s.exploration.id);
    assert.throws(()=>store.submit({moveId:p.moveId,output:large,requestId:'s'}),code('BUDGET_EXCEEDED'));
    assert.deepEqual(store.ledger(s.exploration.id),before);
    assert.equal(store.read(s.exploration.id).drafts.length,0);
    const draft=store.submit({moveId:p.moveId,output:proposal([s.exploration.rootId]),requestId:'s'});
    const ticket=store.ticket(draft.id);
    const base={draftId:draft.id,expectedVersion:ticket.version,token:ticket.token,requestId:'r'};
    assert.throws(()=>store.review({...base,action:'revise',output:large}),code('BUDGET_EXCEEDED'));
    assert.deepEqual(store.read(s.exploration.id).drafts,[draft]);
    const landed=store.review({...base,action:'land'});
    assert.equal(landed.positions.length,2);
    assert.equal(landed.positions[1]!.epistemicStatus,'hypothesis');
    assert.equal(landed.activeMove,null);
  } finally { store.close(); }
});

test('pending bounded context survives a separate-process restart unchanged', () => {
  const directory=mkdtempSync(join(tmpdir(),'shadow-context-')); const path=join(directory,'state.sqlite');
  let store:Store|undefined;
  try {
    store=new Store(path); const s=create(store);
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One move.',requestId:'p'});
    store.submit({moveId:packet.moveId,output:proposal([s.exploration.rootId]),requestId:'s'});
    const snapshot=store.read(s.exploration.id); store.close(); store=undefined;
    const moduleUrl=new URL('../packages/storage/src/index.ts',import.meta.url).href;
    const script=`import { Store } from ${JSON.stringify(moduleUrl)}; const s=new Store(process.argv[1]); try { console.log(JSON.stringify(s.read(process.argv[2]))); } finally { s.close(); }`;
    const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,path,s.exploration.id],{encoding:'utf8',timeout:10_000});
    assert.equal(child.status,0,child.stderr);
    assert.deepEqual(JSON.parse(child.stdout),snapshot);
    assert.deepEqual(JSON.parse(child.stdout).activeMove.context,packet.context);
  } finally { store?.close(); rmSync(directory,{recursive:true,force:true}); }
});

test('legacy prepared packets without context metadata remain resumable and reviewable', () => {
  const directory=mkdtempSync(join(tmpdir(),'shadow-legacy-')); const path=join(directory,'state.sqlite');
  let store:Store|undefined;
  try {
    store=new Store(path); const s=create(store);
    const packet=store.prepare({explorationId:s.exploration.id,selectedIds:[s.exploration.rootId],humanDirection:'One move.',requestId:'p'});
    delete packet.context; store.close(); store=undefined;
    const db=new DatabaseSync(path);
    try { db.prepare('UPDATE moves SET body=? WHERE id=?').run(JSON.stringify(packet),packet.moveId); } finally { db.close(); }
    store=new Store(path);
    assert.equal(store.read(s.exploration.id).activeMove!.context,undefined);
    const d=store.submit({moveId:packet.moveId,output:proposal([s.exploration.rootId]),requestId:'s'});
    assert.equal(review(store,d).positions.length,2);
  } finally { store?.close(); rmSync(directory,{recursive:true,force:true}); }
});
