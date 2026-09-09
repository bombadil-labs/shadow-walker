import test from 'node:test';
import assert from 'node:assert/strict';
import { PostgresStore } from '../packages/storage/src/postgres.ts';
import { POSTGRES_MIGRATIONS } from '../packages/storage/src/postgres-schema.ts';

const publicMethods=[
  'close','list','read','ledger','create','forkLine','recordWaypoint','dissipateWaypoint',
  'recordObservation','recordConstraint','recordOperation','recordApplication','recordEncounter',
  'requestBranch','requestWeave','dismissGesture','pendingGestures','submitWeaveResult',
  'weaveTicket','reviewWeaveResult','prepare','submit','ticket','review'
] as const;

test('hosted Postgres store exposes the SQLite behavioral surface asynchronously',()=>{
  for(const name of publicMethods)assert.equal(typeof PostgresStore.prototype[name],'function',`missing ${name}`);
  assert.equal(typeof PostgresStore.connect,'function');
});

test('Postgres schema preserves durable graph, review, receipt and cartography structures',()=>{
  const sql=POSTGRES_MIGRATIONS.flat().join('\n').toLowerCase();
  for(const table of [
    'explorations','positions','drafts','moves','events','receipts','capabilities','lines',
    'line_memberships','transitions','observations','structural_constraints','operations',
    'operation_applications','encounters','encounter_lines','waypoints','traversals',
    'gesture_requests','gesture_resolutions','weave_proposals','weave_capabilities'
  ])assert.match(sql,new RegExp(`create table ${table}\\b`),`missing ${table}`);
  assert.match(sql,/create unique index one_active_move/);
  assert.match(sql,/positions_no_update/);
  assert.match(sql,/events_no_delete/);
  assert.match(sql,/traversals_no_update/);
  assert.match(sql,/gesture_requests_no_update/);
  assert.doesNotMatch(sql,/\bpragma\b|\bstrict\s*;/);
});
