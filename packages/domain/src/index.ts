import type { MoveContext } from './context.ts';
import { jsonByteLength, WALK_LIMITS } from './limits.ts';

/** Domain code has no SDK, UI, database, or model dependency. */
export type Anchor = { id: string; detail: string; source?: string };
export type StructuralView = {
  label: string; entities: string[]; relationships: string[]; invariants: string[];
  applicability: string; anchorIds: string[]; omissions: string[]; mismatches: string[];
};
export type Proposal = {
  localId: string; kind: 'excavation' | 'question'; meaning: string;
  parentIds: string[]; anchors: Anchor[]; structuralViews: StructuralView[];
  uncertainty: string[]; nextQuestion: string;
};
export type MoveOutput = { positions: Proposal[] };
export type Position = Omit<Proposal, 'localId' | 'kind'> & {
  id: string; explorationId: string; kind: 'intention' | Proposal['kind'];
  originMoveId: string | null; acceptance: 'accepted';
  epistemicStatus: 'user-intention' | 'hypothesis'; createdAt: string;
};
export type Frame = { id: string; label: string; constraints: string[]; version: number };
export type Exploration = {
  id: string; title: string; intention: string; rootId: string;
  frame: Frame; revision: number; createdAt: string;
};
export type Draft = {
  id: string; explorationId: string; moveId: string; version: number;
  status: 'pending' | 'reserved' | 'landed' | 'discarded'; output: MoveOutput;
  createdAt: string;
};
export type MovePacket = {
  protocolVersion: '0.1'; moveId: string; kind: 'walk'; explorationId: string;
  /** Optional only for reading persisted packets created before context budgeting. */
  context?: MoveContext;
  frame: Frame; originalIntention: string; selectedInputs: Position[];
  orderedPaths: string[][]; reserves: Draft[]; priorRecordedWaypoint: Position;
  humanDirection: string; dependencyVersions: { exploration: number; frame: number };
  budget: { maxMoves: 1; maxPositions: 2 }; instructions: string[];
  outputContract: { kinds: ['excavation', 'question']; localParentPrefix: 'draft:' };
};
export type Snapshot = { exploration: Exploration; positions: Position[]; drafts: Draft[]; activeMove: MovePacket | null };
export type ReviewTicket = { draftId: string; version: number; token: string; expiresAt: number };
export type ReviewInput = {
  draftId: string; expectedVersion: number; token: string; requestId: string;
  action: 'land' | 'revise' | 'reserve' | 'discard'; output?: MoveOutput;
};
export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'DomainError'; this.code = code; }
}
export function requireThat(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
export function text(value: unknown, name: string, max = 8000): asserts value is string {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    'INVALID_INPUT', `${name} must be nonempty text of at most ${max} characters.`);
}
function object(value: unknown): asserts value is Record<string, unknown> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null),
    'INVALID_INPUT', 'Expected a plain JSON object.');
}
function strings(value: unknown, name: string): asserts value is string[] {
  requireThat(Array.isArray(value) && value.length <= 32, 'INVALID_INPUT', `${name} must be an array of at most 32 strings.`);
  value.forEach(item => text(item, name));
}
/** Defensive runtime validation also applies to direct storage callers, not just MCP. */
export function validateOutput(value: unknown): asserts value is MoveOutput {
  object(value);
  requireThat(Object.keys(value).every(k => k === 'positions'), 'INVALID_INPUT', 'Unknown move output field.');
  requireThat(Array.isArray(value.positions) && value.positions.length >= 1 && value.positions.length <= 2,
    'BUDGET_EXCEEDED', 'A guided walk must propose one or two positions, never a subsequent move.');
  const ids = new Set<string>();
  for (const p of value.positions) {
    object(p);
    requireThat(Object.keys(p).every(k => ['localId','kind','meaning','parentIds','anchors','structuralViews','uncertainty','nextQuestion'].includes(k)),
      'INVALID_INPUT', 'Unknown proposal field.');
    text(p.localId, 'localId', 64);
    requireThat(/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(p.localId) && !ids.has(p.localId), 'INVALID_INPUT', 'localIds must be unique simple identifiers.');
    ids.add(p.localId);
    requireThat(p.kind === 'excavation' || p.kind === 'question', 'INVALID_KIND', 'M1 walk outputs are excavations or questions, not observations or syntheses.');
    text(p.meaning, 'meaning'); text(p.nextQuestion, 'nextQuestion');
    strings(p.parentIds, 'parentIds'); strings(p.uncertainty, 'uncertainty');
    requireThat(p.parentIds.length > 0 && new Set(p.parentIds).size === p.parentIds.length,
      'INVALID_PARENT', 'Every proposed position needs unique parents.');
    requireThat(p.uncertainty.length > 0, 'INVALID_INPUT', 'State uncertainty explicitly.');
    requireThat(Array.isArray(p.anchors) && p.anchors.length >= 1 && p.anchors.length <= 16,
      'INVALID_INPUT', 'Include one to sixteen concrete anchors.');
    const anchorIds = new Set<string>();
    for (const a of p.anchors) {
      object(a);
      requireThat(Object.keys(a).every(k => ['id','detail','source'].includes(k)), 'INVALID_INPUT', 'Unknown anchor field.');
      text(a.id, 'anchor id', 64); text(a.detail, 'anchor detail');
      requireThat(!anchorIds.has(a.id), 'INVALID_INPUT', 'Anchor IDs must be unique within a position.');
      anchorIds.add(a.id); if (a.source !== undefined) text(a.source, 'anchor source');
    }
    requireThat(Array.isArray(p.structuralViews) && p.structuralViews.length <= 8, 'INVALID_INPUT', 'At most eight structural views.');
    for (const v of p.structuralViews) {
      object(v);
      requireThat(Object.keys(v).every(k => ['label','entities','relationships','invariants','applicability','anchorIds','omissions','mismatches'].includes(k)),
        'INVALID_INPUT', 'Unknown structural view field.');
      text(v.label, 'structural label'); text(v.applicability, 'applicability');
      for (const k of ['entities','relationships','invariants','anchorIds','omissions','mismatches']) strings(v[k], k);
      requireThat((v.anchorIds as string[]).length > 0 && (v.anchorIds as string[]).every(id => anchorIds.has(id)),
        'INVALID_ANCHOR', 'Structural views must refer to concrete anchors on this position.');
    }
  }
  requireThat(jsonByteLength(value) <= WALK_LIMITS.maxOutputBytes, 'BUDGET_EXCEEDED',
    `A draft must fit in ${WALK_LIMITS.maxOutputBytes} serialized UTF-8 bytes. Shorten the proposal without removing its uncertainty or anchors.`);
}
/** Returns a topological order. Each proposal must lead back to an explicitly selected input. */
export function orderProposals(output: MoveOutput, existing: Position[], selected: string[]): Proposal[] {
  validateOutput(output);
  const known = new Set(existing.map(p => p.id));
  const chosen = new Set(selected);
  const local = new Map(output.positions.map(p => [`draft:${p.localId}`, p]));
  const visiting = new Set<string>(); const visited = new Set<string>(); const ordered: Proposal[] = [];
  function visit(id: string): void {
    if (visited.has(id)) return;
    requireThat(!visiting.has(id), 'CYCLE', 'Draft ancestry contains a cycle.');
    const p = local.get(id);
    requireThat(p, 'INVALID_PARENT', 'Draft parent is missing.');
    visiting.add(id);
    for (const parent of p.parentIds) {
      if (parent.startsWith('draft:')) visit(parent);
      else requireThat(known.has(parent) && chosen.has(parent), 'INVALID_PARENT',
        'External parents must be selected inputs in this exploration.');
    }
    visiting.delete(id); visited.add(id); ordered.push(p);
  }
  for (const id of local.keys()) visit(id);
  return ordered;
}
