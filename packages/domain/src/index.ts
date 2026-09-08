import type { MoveContext } from './context.ts';
import { jsonByteLength, WALK_LIMITS } from './limits.ts';
import type { CartographySnapshot, Line, SemanticShift, Traversal, Waypoint } from './cartography.ts';
export type { BranchGestureRequest, CartographySnapshot, Encounter, GestureRequest, GestureResolution, Line, LineMembership, LineStatus, Observation, Operation, OperationApplication, RepresentationMeasurement, SemanticShift, ShiftSalience, ShiftSpan, StructuralConstraint, Transition, TransitionKind, Traversal, TraversalContext, Waypoint, WeaveGestureRequest, WeaveProposal, WeaveReviewTicket } from './cartography.ts';

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
  /** Optional only for legacy compatibility at the storage boundary. New v0.2 moves must report it. */
  semanticShift?: SemanticShift;
};
export type MoveOutput = { positions: Proposal[] };
export type Position = Omit<Proposal, 'localId' | 'kind'> & {
  id: string; explorationId: string; kind: 'intention' | Proposal['kind'];
  originMoveId: string | null; acceptance: 'accepted';
  epistemicStatus: 'user-intention' | 'hypothesis'; createdAt: string;
};
/** Product-facing name. Position remains the compatibility/storage shape during migration. */
export type Arrival = Position;
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
  protocolVersion: '0.1' | '0.2'; moveId: string; kind: 'walk'; explorationId: string;
  /** Optional only for reading persisted packets created before context budgeting. */
  context?: MoveContext;
  /** New v0.2 moves are situated on an explicit line. */
  line?: Line;
  /** Optional sensed route that this move is explicitly following. */
  routeWaypoint?: Waypoint;
  /** Situated provenance for this particular walk/re-walk. */
  traversal?: Traversal;
  /** Present only when this walk is fulfilling a human-initiated branch request. */
  gestureRequestId?: string;
  frame: Frame; originalIntention: string; selectedInputs: Position[];
  orderedPaths: string[][]; reserves: Draft[]; priorRecordedWaypoint: Position;
  humanDirection: string; dependencyVersions: { exploration: number; frame: number };
  budget: { maxMoves: 1; maxPositions: 2 }; instructions: string[];
  outputContract: { kinds: ['excavation', 'question']; localParentPrefix: 'draft:'; requiresSemanticShift?: true };
};
export type Snapshot = {
  exploration: Exploration; positions: Position[]; drafts: Draft[]; activeMove: MovePacket | null;
  /** Persisted cartographic topology. Positions remain for protocol compatibility. */
  cartography: CartographySnapshot;
};
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
function validateShift(value: unknown, parentIds: string[]): asserts value is SemanticShift {
  object(value);
  requireThat(Object.keys(value).every(k => ['baselineArrivalIds','summary','newlySalient','receded','preservedInvariants','unexpectedConnections','newAffordances','surprise'].includes(k)),
    'INVALID_INPUT', 'Unknown semantic shift field. Mechanistic measurements are separate artifacts, not walker reports.');
  strings(value.baselineArrivalIds,'semantic baseline');
  requireThat(value.baselineArrivalIds.length > 0 && value.baselineArrivalIds.every(id => parentIds.includes(id)),
    'INVALID_SHIFT_BASELINE', 'Semantic shift baselines must be immediate parents of this arrival.');
  text(value.summary,'semantic shift summary');
  for (const key of ['preservedInvariants','unexpectedConnections','newAffordances']) strings(value[key],key);
  for (const key of ['newlySalient','receded'] as const) {
    requireThat(Array.isArray(value[key]) && value[key].length <= 16,'INVALID_INPUT',`${key} must contain at most 16 spans.`);
    for (const span of value[key]) {
      object(span); requireThat(Object.keys(span).every(k=>['span','salience','notes'].includes(k)),'INVALID_INPUT','Unknown semantic span field.');
      text(span.span,'semantic span',200); requireThat(['low','medium','high'].includes(String(span.salience)),'INVALID_INPUT','Invalid semantic span salience.');
      if(span.notes!==undefined)text(span.notes,'semantic span notes',1000);
    }
  }
  object(value.surprise); requireThat(Object.keys(value.surprise).every(k=>['level','notes'].includes(k)),'INVALID_INPUT','Unknown surprise field.');
  requireThat(['low','medium','high'].includes(String(value.surprise.level)),'INVALID_INPUT','Invalid surprise level.'); text(value.surprise.notes,'surprise notes',2000);
}
/** Defensive runtime validation also applies to direct storage callers, not just MCP. */
export function validateOutput(value: unknown, options: { requireSemanticShift?: boolean } = {}): asserts value is MoveOutput {
  object(value);
  requireThat(Object.keys(value).every(k => k === 'positions'), 'INVALID_INPUT', 'Unknown move output field.');
  requireThat(Array.isArray(value.positions) && value.positions.length >= 1 && value.positions.length <= 2,
    'BUDGET_EXCEEDED', 'A guided walk must propose one or two arrivals, never a subsequent move.');
  const ids = new Set<string>();
  for (const p of value.positions) {
    object(p);
    requireThat(Object.keys(p).every(k => ['localId','kind','meaning','parentIds','anchors','structuralViews','uncertainty','nextQuestion','semanticShift'].includes(k)),
      'INVALID_INPUT', 'Unknown arrival proposal field.');
    text(p.localId, 'localId', 64);
    requireThat(/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(p.localId) && !ids.has(p.localId), 'INVALID_INPUT', 'localIds must be unique simple identifiers.');
    ids.add(p.localId);
    requireThat(p.kind === 'excavation' || p.kind === 'question', 'INVALID_KIND', 'Walk outputs are excavations or questions, not observations or syntheses.');
    text(p.meaning, 'meaning'); text(p.nextQuestion, 'nextQuestion');
    strings(p.parentIds, 'parentIds'); strings(p.uncertainty, 'uncertainty');
    requireThat(p.parentIds.length > 0 && new Set(p.parentIds).size === p.parentIds.length,
      'INVALID_PARENT', 'Every proposed arrival needs unique parents.');
    requireThat(p.uncertainty.length > 0, 'INVALID_INPUT', 'State uncertainty explicitly.');
    if(options.requireSemanticShift) requireThat(p.semanticShift,'SEMANTIC_SHIFT_REQUIRED','New cartographic arrivals must record what changed relative to their immediate path.');
    if(p.semanticShift!==undefined)validateShift(p.semanticShift,p.parentIds);
    requireThat(Array.isArray(p.anchors) && p.anchors.length >= 1 && p.anchors.length <= 16,
      'INVALID_INPUT', 'Include one to sixteen concrete anchors.');
    const anchorIds = new Set<string>();
    for (const a of p.anchors) {
      object(a);
      requireThat(Object.keys(a).every(k => ['id','detail','source'].includes(k)), 'INVALID_INPUT', 'Unknown anchor field.');
      text(a.id, 'anchor id', 64); text(a.detail, 'anchor detail');
      requireThat(!anchorIds.has(a.id), 'INVALID_INPUT', 'Anchor IDs must be unique within an arrival.');
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
        'INVALID_ANCHOR', 'Structural views must refer to concrete anchors on this arrival.');
    }
  }
  requireThat(jsonByteLength(value) <= WALK_LIMITS.maxOutputBytes, 'BUDGET_EXCEEDED',
    `A draft must fit in ${WALK_LIMITS.maxOutputBytes} serialized UTF-8 bytes. Shorten the proposal without removing its uncertainty or anchors.`);
}
/** Returns a topological order. Each proposal must lead back to an explicitly selected input. */
export function orderProposals(output: MoveOutput, existing: Position[], selected: string[], requireSemanticShift=false): Proposal[] {
  validateOutput(output,{requireSemanticShift});
  const known = new Set(existing.map(p => p.id));
  const chosen = new Set(selected);
  const local = new Map(output.positions.map(p => [`draft:${p.localId}`, p]));
  const ordered: Proposal[] = []; const visiting = new Set<string>(); const done = new Set<string>();
  function visit(p: Proposal) {
    const key = `draft:${p.localId}`; requireThat(!visiting.has(key), 'CYCLE', 'Draft ancestry cannot contain a cycle.');
    if (done.has(key)) return; visiting.add(key);
    let reachesSelected = false;
    for (const parent of p.parentIds) {
      if (local.has(parent)) { visit(local.get(parent)!); reachesSelected = true; }
      else { requireThat(known.has(parent) && chosen.has(parent), 'INVALID_PARENT', 'External parents must be selected existing arrivals.'); reachesSelected = true; }
    }
    requireThat(reachesSelected, 'INVALID_PARENT', 'Each proposed arrival must connect to the selected walk.');
    visiting.delete(key); done.add(key); ordered.push(p);
  }
  output.positions.forEach(visit); return ordered;
}
