export type ShiftSalience = 'low' | 'medium' | 'high';
export type ShiftSpan = { span: string; salience: ShiftSalience; notes?: string };

/**
 * A phenomenological/cartographic report made during the walk. This is not a
 * hidden-state measurement, token-probability claim, or mechanistic explanation.
 */
export type SemanticShift = {
  /** Immediate visited arrivals used as the reported baseline for this move. */
  baselineArrivalIds: string[];
  summary: string;
  newlySalient: ShiftSpan[];
  receded: ShiftSpan[];
  preservedInvariants: string[];
  unexpectedConnections: string[];
  newAffordances: string[];
  surprise: { level: ShiftSalience; notes: string };
};

/**
 * Future external measurement attached to an Arrival without rewriting its
 * immutable historical report. Mechinterp/embedding tooling owns the method and
 * provenance; model-generated walk output must never populate this object.
 */
export type RepresentationMeasurement = {
  id: string;
  explorationId: string;
  arrivalId: string;
  baselineArrivalIds: string[];
  kind: 'embedding-displacement' | 'activation-manifold' | 'feature-attribution' | 'other';
  method: string;
  model?: string;
  displacement?: number;
  salientSpans?: Array<{ span: string; deviation: number }>;
  artifactRef?: string;
  createdAt: string;
};

export type LineStatus = 'active' | 'exploratory' | 'intensifying' | 'dormant' | 'blocked' | 'dissipated' | 'transformed' | 'reterritorialized';
export type Line = {
  id: string;
  explorationId: string;
  label: string;
  status: LineStatus;
  originPositionId: string;
  createdAt: string;
};
export type LineMembership = { lineId: string; positionId: string; role: 'origin' | 'arrival'; createdAt: string };

export type TransitionKind =
  | 'walked-to'
  | 'rewalked-to'
  | 'excavated'
  | 'branched'
  | 'operation-applied'
  | 'revealed-constraint'
  | 'resonates'
  | 'contradicts'
  | 'weaves'
  | 'converges'
  | 'reterritorializes'
  | 'transforms-question';
export type Transition = {
  id: string;
  explorationId: string;
  fromPositionId: string;
  toPositionId: string;
  lineId: string | null;
  kind: TransitionKind;
  createdAt: string;
};

export type TraversalContext = {
  /** These labels are declared context, not a reproducibility or identity guarantee. */
  provenance: 'host-declared' | 'human-declared' | 'mixed' | 'unspecified';
  host?: string;
  model?: string;
  modelRevision?: string;
  skillRevision?: string;
  sessionLabel?: string;
  notes?: string;
};
export type Traversal = {
  id: string;
  explorationId: string;
  moveId: string;
  lineId: string;
  mode: 'walk' | 'rewalk';
  selectedPositionIds: string[];
  routeWaypointId?: string;
  rewalkOfPositionId?: string;
  context?: TraversalContext;
  createdAt: string;
};

export type DirectionProvenance = 'human-offered' | 'walker-sensed' | 'breakdown-emergent' | 'operation-adjacent' | 'resonance-detected';
export type Waypoint = {
  id: string;
  explorationId: string;
  fromPositionId: string;
  question: string;
  provenance: DirectionProvenance;
  status: 'sensed' | 'visited' | 'dissipated';
  visitedPositionId?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
};

/** External-to-model evidence. There is deliberately no `model-generated` provenance. */
export type Observation = {
  id: string;
  explorationId: string;
  positionId?: string;
  kind: 'human-report' | 'source' | 'tool-result' | 'measurement';
  detail: string;
  source: string;
  observedAt?: string;
  createdAt: string;
};

export type ConstraintProvenance = 'walker-report' | 'human-offered' | 'observation-derived' | 'breakdown-derived';
export type StructuralConstraint = {
  id: string;
  explorationId: string;
  label: string;
  description: string;
  discoveredAtPositionId: string;
  provenance: ConstraintProvenance;
  observationIds: string[];
  epistemicStatus: 'candidate';
  createdAt: string;
};

/** A deterritorialized executable capacity. A resemblance without mechanics is not an Operation. */
export type Operation = {
  id: string;
  explorationId: string;
  name: string;
  originDomain: string;
  inputStructure: string;
  outputStructure: string;
  preserves: string[];
  transforms: string[];
  procedure: string[];
  constraintIds: string[];
  epistemicStatus: 'candidate';
  createdAt: string;
};

export type OperationApplication = {
  id: string;
  explorationId: string;
  operationId: string;
  lineId: string;
  targetConstraintIds: string[];
  adaptation: string;
  protocol: string[];
  outcome: 'proposed' | 'executed' | 'observed' | 'broke-down';
  observationIds: string[];
  revealedConstraintIds: string[];
  createdAt: string;
};

export type EncounterKind = 'correspondence' | 'tension' | 'mismatch' | 'partial-overlap' | 'convergence' | 'none';
export type Encounter = {
  id: string;
  explorationId: string;
  lineIds: string[];
  basisPositionIds: string[];
  kind: EncounterKind;
  summary: string;
  uncertainty: string[];
  epistemicStatus: 'candidate';
  createdAt: string;
};


export type BranchGestureRequest = {
  id: string; explorationId: string; kind: 'branch'; fromPositionId: string; lineId: string; label: string; direction: string; createdAt: string;
};
export type WeaveGestureRequest = {
  id: string; explorationId: string; kind: 'weave'; lineIds: string[]; basisPositionIds: string[]; focus: string; createdAt: string;
};
export type GestureRequest = BranchGestureRequest | WeaveGestureRequest;
export type GestureResolution = {
  id: string; explorationId: string; requestId: string; outcome: 'branch-landed' | 'weave-kept' | 'dismissed'; targetId?: string; createdAt: string;
};
export type WeaveProposal = {
  id: string; explorationId: string; requestId: string; version: number; status: 'pending' | 'kept' | 'discarded';
  kind: EncounterKind; summary: string; uncertainty: string[]; createdAt: string;
};
export type WeaveReviewTicket = { proposalId: string; version: number; token: string; expiresAt: number };

export type CartographySnapshot = {
  lines: Line[];
  memberships: LineMembership[];
  transitions: Transition[];
  traversals: Traversal[];
  waypoints: Waypoint[];
  observations: Observation[];
  constraints: StructuralConstraint[];
  operations: Operation[];
  applications: OperationApplication[];
  encounters: Encounter[];
  gestureRequests: GestureRequest[];
  gestureResolutions: GestureResolution[];
  weaveProposals: WeaveProposal[];
};
