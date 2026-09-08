import { z } from 'zod';
export const id = z.string().min(1).max(128);
export const text = z.string().trim().min(1).max(8000);
const strings = z.array(text).max(32);
const anchor = z.object({id: id.max(64), detail: text, source: text.optional()}).strict();
const view = z.object({label: text, entities: strings, relationships: strings, invariants: strings,
  applicability: text, anchorIds: strings.min(1), omissions: strings, mismatches: strings}).strict();
const salience=z.enum(['low','medium','high']);
const shiftSpan=z.object({span:text.max(200),salience,notes:z.string().trim().min(1).max(1000).optional()}).strict();
const semanticShift=z.object({
  baselineArrivalIds:z.array(id).min(1).max(32),summary:text,newlySalient:z.array(shiftSpan).max(16),receded:z.array(shiftSpan).max(16),
  preservedInvariants:strings,unexpectedConnections:strings,newAffordances:strings,
  surprise:z.object({level:salience,notes:text.max(2000)}).strict()
}).strict();
export const proposal = z.object({localId:z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/).max(64),kind:z.enum(['excavation','question']),meaning:text,parentIds:strings.min(1),anchors:z.array(anchor).min(1).max(16),structuralViews:z.array(view).max(8),uncertainty:strings.min(1),nextQuestion:text,semanticShift:semanticShift.optional()}).strict();
export const output=z.object({positions:z.array(proposal).min(1).max(2)}).strict();
const frameInput=z.object({label:text.max(200),constraints:strings}).strict();
const frame=frameInput.extend({id,version:z.number().int().positive()});
const position=proposal.omit({localId:true}).extend({id,explorationId:id,kind:z.enum(['intention','excavation','question']),parentIds:strings,anchors:z.array(anchor),uncertainty:strings,originMoveId:id.nullable(),acceptance:z.literal('accepted'),epistemicStatus:z.enum(['user-intention','hypothesis']),createdAt:text});
const exploration=z.object({id,title:text,intention:text,rootId:id,frame,revision:z.number().int().positive(),createdAt:text}).strict();
const draft=z.object({id,explorationId:id,moveId:id,version:z.number().int().positive(),status:z.enum(['pending','reserved','landed','discarded']),output,createdAt:text}).strict();
const lineStatus=z.enum(['active','exploratory','intensifying','dormant','blocked','dissipated','transformed','reterritorialized']);
const line=z.object({id,explorationId:id,label:text.max(200),status:lineStatus,originPositionId:id,createdAt:text}).strict();
const membership=z.object({lineId:id,positionId:id,role:z.enum(['origin','arrival']),createdAt:text}).strict();
const transitionKind=z.enum(['walked-to','rewalked-to','excavated','branched','operation-applied','revealed-constraint','resonates','contradicts','weaves','converges','reterritorializes','transforms-question']);
const transition=z.object({id,explorationId:id,fromPositionId:id,toPositionId:id,lineId:id.nullable(),kind:transitionKind,createdAt:text}).strict();
const traversalContext=z.object({provenance:z.enum(['host-declared','human-declared','mixed','unspecified']),host:text.max(500).optional(),model:text.max(500).optional(),modelRevision:text.max(500).optional(),skillRevision:text.max(500).optional(),sessionLabel:text.max(500).optional(),notes:text.max(2000).optional()}).strict();
const traversal=z.object({id,explorationId:id,moveId:id,lineId:id,mode:z.enum(['walk','rewalk']),selectedPositionIds:z.array(id).min(1).max(4),routeWaypointId:id.optional(),rewalkOfPositionId:id.optional(),context:traversalContext.optional(),createdAt:text}).strict();
const directionProvenance=z.enum(['human-offered','walker-sensed','breakdown-emergent','operation-adjacent','resonance-detected']);
const waypoint=z.object({id,explorationId:id,fromPositionId:id,question:text,provenance:directionProvenance,status:z.enum(['sensed','visited','dissipated']),visitedPositionId:id.optional(),resolvedAt:text.optional(),resolutionNote:text.optional(),createdAt:text}).strict();

const observationKind=z.enum(['human-report','source','tool-result','measurement']);
const observation=z.object({id,explorationId:id,positionId:id.optional(),kind:observationKind,detail:text,source:text,observedAt:text.max(200).optional(),createdAt:text}).strict();
const constraintProvenance=z.enum(['walker-report','human-offered','observation-derived','breakdown-derived']);
const constraint=z.object({id,explorationId:id,label:text.max(200),description:text,discoveredAtPositionId:id,provenance:constraintProvenance,observationIds:z.array(id).max(16),epistemicStatus:z.literal('candidate'),createdAt:text}).strict();
const operation=z.object({id,explorationId:id,name:text.max(200),originDomain:text.max(500),inputStructure:text,outputStructure:text,preserves:z.array(text).min(1).max(16),transforms:z.array(text).min(1).max(16),procedure:z.array(text).min(1).max(32),constraintIds:z.array(id).min(1).max(16),epistemicStatus:z.literal('candidate'),createdAt:text}).strict();
const applicationOutcome=z.enum(['proposed','executed','observed','broke-down']);
const application=z.object({id,explorationId:id,operationId:id,lineId:id,targetConstraintIds:z.array(id).min(1).max(16),adaptation:text,protocol:z.array(text).min(1).max(32),outcome:applicationOutcome,observationIds:z.array(id).max(16),revealedConstraintIds:z.array(id).max(16),createdAt:text}).strict();
const encounterKind=z.enum(['correspondence','tension','mismatch','partial-overlap','convergence','none']);
const encounter=z.object({id,explorationId:id,lineIds:z.array(id).min(2).max(8),basisPositionIds:z.array(id).min(2).max(16),kind:encounterKind,summary:text,uncertainty:z.array(text).min(1).max(16),epistemicStatus:z.literal('candidate'),createdAt:text}).strict();

const branchGesture=z.object({id,explorationId:id,kind:z.literal('branch'),fromPositionId:id,lineId:id,label:text.max(200),direction:text,createdAt:text}).strict();
const weaveGesture=z.object({id,explorationId:id,kind:z.literal('weave'),lineIds:z.array(id).min(2).max(8),basisPositionIds:z.array(id).min(2).max(16),focus:text,createdAt:text}).strict();
const gestureRequest=z.discriminatedUnion('kind',[branchGesture,weaveGesture]);
const gestureResolution=z.object({id,explorationId:id,requestId:id,outcome:z.enum(['branch-landed','weave-kept','dismissed']),targetId:id.optional(),createdAt:text}).strict();
const weaveProposal=z.object({id,explorationId:id,requestId:id,version:z.number().int().positive(),status:z.enum(['pending','kept','discarded']),kind:encounterKind,summary:text,uncertainty:z.array(text).min(1).max(16),createdAt:text}).strict();

const cartography=z.object({lines:z.array(line),memberships:z.array(membership),transitions:z.array(transition),traversals:z.array(traversal),waypoints:z.array(waypoint),observations:z.array(observation),constraints:z.array(constraint),operations:z.array(operation),applications:z.array(application),encounters:z.array(encounter),gestureRequests:z.array(gestureRequest),gestureResolutions:z.array(gestureResolution),weaveProposals:z.array(weaveProposal)}).strict();
const nonnegative=z.number().int().nonnegative();
const context=z.object({limits:z.object({maxOutputBytes:nonnegative,maxPacketBytes:nonnegative,maxPathsPerInput:nonnegative,maxPathDepth:nonnegative,maxAncestorVisitsPerInput:nonnegative,maxReservedDrafts:nonnegative}).strict(),paths:z.object({complete:z.boolean(),included:nonnegative,truncatedInputIds:z.array(id)}).strict(),reserves:z.object({total:nonnegative,included:nonnegative,omitted:nonnegative}).strict()}).strict();
const packet=z.object({protocolVersion:z.enum(['0.1','0.2']),moveId:id,kind:z.literal('walk'),explorationId:id,line:line.optional(),routeWaypoint:waypoint.optional(),traversal:traversal.optional(),gestureRequestId:id.optional(),frame,originalIntention:text,context:context.optional(),selectedInputs:z.array(position),orderedPaths:z.array(z.array(id)),reserves:z.array(draft),priorRecordedWaypoint:position,humanDirection:text,dependencyVersions:z.object({exploration:z.number().int(),frame:z.number().int()}),budget:z.object({maxMoves:z.literal(1),maxPositions:z.literal(2)}),instructions:strings,outputContract:z.object({kinds:z.tuple([z.literal('excavation'),z.literal('question')]),localParentPrefix:z.literal('draft:'),requiresSemanticShift:z.literal(true).optional()}).strict()}).strict();
export const snapshot=z.object({exploration,positions:z.array(position),drafts:z.array(draft),activeMove:packet.nullable(),cartography}).strict();

export const inputs={
  create:{title:text.max(200),intention:text,frame:frameInput,requestId:id},
  read:{explorationId:id},
  open:{explorationId:id,draftId:id.optional()},
  fork:{explorationId:id,fromPositionId:id,label:text.max(200),requestId:id},
  requestBranch:{explorationId:id,fromPositionId:id,label:text.max(200),direction:text,requestId:id},
  requestWeave:{explorationId:id,lineIds:z.array(id).min(2).max(8),basisPositionIds:z.array(id).min(2).max(16),focus:text,requestId:id},
  dismissGesture:{gestureRequestId:id,requestId:id},
  pendingGestures:{explorationId:id},
  submitWeave:{gestureRequestId:id,kind:encounterKind,summary:text,uncertainty:z.array(text).min(1).max(16),requestId:id},
  reviewWeave:{proposalId:id,expectedVersion:z.number().int().positive(),token:id,action:z.enum(['keep','discard']),requestId:id},
  waypoint:{explorationId:id,fromPositionId:id,question:text,provenance:directionProvenance,requestId:id},
  dissipateWaypoint:{explorationId:id,waypointId:id,reason:text.max(2000),requestId:id},
  observation:{explorationId:id,positionId:id.optional(),kind:observationKind,detail:text,source:text,observedAt:text.max(200).optional(),requestId:id},
  constraint:{explorationId:id,label:text.max(200),description:text,discoveredAtPositionId:id,provenance:constraintProvenance,observationIds:z.array(id).max(16),requestId:id},
  operation:{explorationId:id,name:text.max(200),originDomain:text.max(500),inputStructure:text,outputStructure:text,preserves:z.array(text).min(1).max(16),transforms:z.array(text).min(1).max(16),procedure:z.array(text).min(1).max(32),constraintIds:z.array(id).min(1).max(16),requestId:id},
  application:{explorationId:id,operationId:id,lineId:id,targetConstraintIds:z.array(id).min(1).max(16),adaptation:text,protocol:z.array(text).min(1).max(32),outcome:applicationOutcome,observationIds:z.array(id).max(16),revealedConstraintIds:z.array(id).max(16),requestId:id},
  encounter:{explorationId:id,lineIds:z.array(id).min(2).max(8),basisPositionIds:z.array(id).min(2).max(16),kind:encounterKind,summary:text,uncertainty:z.array(text).min(1).max(16),requestId:id},
  prepare:{explorationId:id,selectedIds:z.array(id).min(1).max(4),humanDirection:text,lineId:id.optional(),waypointId:id.optional(),rewalkOfPositionId:id.optional(),traversalContext:traversalContext.optional(),gestureRequestId:id.optional(),requestId:id},
  submit:{moveId:id,output,requestId:id},
  review:{draftId:id,expectedVersion:z.number().int().positive(),token:id,requestId:id,action:z.enum(['land','revise','reserve','discard']),output:output.optional()}
};
export const outputs={snapshot:{snapshot,focusedDraftId:id.optional(),focusedWeaveProposalId:id.optional()},list:{explorations:z.array(exploration)},packet:{packet},pendingGestures:{requests:z.array(gestureRequest)},weaveProposal:{proposal:weaveProposal,snapshot}};
export const UI_URI='ui://shadow-walker/review.html';
export const TICKET_META='shadowWalker/review';
export const WEAVE_TICKET_META='shadowWalker/weaveReview';
