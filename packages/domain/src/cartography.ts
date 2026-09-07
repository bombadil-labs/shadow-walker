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

export type CartographySnapshot = {
  lines: Line[];
  memberships: LineMembership[];
  transitions: Transition[];
};

/** Future first-class objects. Declared now so the ontology does not collapse them into prose annotations. */
export type Waypoint = {
  id: string; explorationId: string; fromPositionId: string; question: string;
  provenance: 'human-offered' | 'walker-sensed' | 'breakdown-emergent' | 'operation-adjacent' | 'resonance-detected';
  status: 'sensed' | 'visited' | 'dissipated'; createdAt: string;
};
export type StructuralConstraint = {
  id: string; explorationId: string; label: string; description: string;
  discoveredAtPositionId: string; status: 'active' | 'revised' | 'resolved'; createdAt: string;
};
export type Operation = {
  id: string; explorationId: string; name: string; originDomain: string;
  inputStructure: string; outputStructure: string; preserves: string[]; transforms: string[];
  procedure: string[]; createdAt: string;
};
export type OperationApplication = {
  id: string; explorationId: string; operationId: string; lineId: string;
  targetConstraintIds: string[]; adaptation: string; protocol: string[];
  outcome: 'proposed' | 'executed' | 'observed' | 'broke-down';
  observationIds: string[]; revealedConstraintIds: string[]; createdAt: string;
};
export type Encounter = {
  id: string; explorationId: string; lineIds: string[];
  kind: 'correspondence' | 'tension' | 'mismatch' | 'partial-overlap' | 'convergence' | 'none';
  summary: string; createdAt: string;
};
