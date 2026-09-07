import { z } from 'zod';
export const id = z.string().min(1).max(128);
export const text = z.string().trim().min(1).max(8000);
const strings = z.array(text).max(32);
const anchor = z.object({id: id.max(64), detail: text, source: text.optional()}).strict();
const view = z.object({label: text, entities: strings, relationships: strings, invariants: strings,
  applicability: text, anchorIds: strings.min(1), omissions: strings, mismatches: strings}).strict();
export const proposal = z.object({localId: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/).max(64),
  kind: z.enum(['excavation','question']), meaning: text, parentIds: strings.min(1),
  anchors: z.array(anchor).min(1).max(16), structuralViews: z.array(view).max(8),
  uncertainty: strings.min(1), nextQuestion: text}).strict();
export const output = z.object({positions: z.array(proposal).min(1).max(2)}).strict();
const frameInput = z.object({label: text.max(200), constraints: strings}).strict();
const frame = frameInput.extend({id, version: z.number().int().positive()});
const position = proposal.omit({localId:true}).extend({id, explorationId:id, kind:z.enum(['intention','excavation','question']),
  parentIds:strings, anchors:z.array(anchor), uncertainty:strings, originMoveId:id.nullable(), acceptance:z.literal('accepted'),
  epistemicStatus:z.enum(['user-intention','hypothesis']),createdAt:text});
const exploration = z.object({id,title:text,intention:text,rootId:id,frame,revision:z.number().int().positive(),createdAt:text}).strict();
const draft = z.object({id,explorationId:id,moveId:id,version:z.number().int().positive(),status:z.enum(['pending','reserved','landed','discarded']),output,createdAt:text}).strict();
const nonnegative = z.number().int().nonnegative();
const context = z.object({
  limits: z.object({maxOutputBytes:nonnegative, maxPacketBytes:nonnegative, maxPathsPerInput:nonnegative, maxPathDepth:nonnegative,
    maxAncestorVisitsPerInput:nonnegative, maxReservedDrafts:nonnegative}).strict(),
  paths: z.object({complete:z.boolean(), included:nonnegative, truncatedInputIds:z.array(id)}).strict(),
  reserves: z.object({total:nonnegative, included:nonnegative, omitted:nonnegative}).strict(),
}).strict();
const packet = z.object({protocolVersion:z.literal('0.1'),moveId:id,kind:z.literal('walk'),explorationId:id,frame,originalIntention:text,
  context:context.optional(),selectedInputs:z.array(position),orderedPaths:z.array(z.array(id)),reserves:z.array(draft),priorRecordedWaypoint:position,
  humanDirection:text,dependencyVersions:z.object({exploration:z.number().int(),frame:z.number().int()}),
  budget:z.object({maxMoves:z.literal(1),maxPositions:z.literal(2)}),instructions:strings,
  outputContract:z.object({kinds:z.tuple([z.literal('excavation'),z.literal('question')]),localParentPrefix:z.literal('draft:')})}).strict();
export const snapshot = z.object({exploration,positions:z.array(position),drafts:z.array(draft),activeMove:packet.nullable()}).strict();
export const inputs = {
  create: {title:text.max(200),intention:text,frame:frameInput,requestId:id},
  read: {explorationId:id},
  open: {explorationId:id,draftId:id.optional()},
  prepare: {explorationId:id,selectedIds:z.array(id).min(1).max(4),humanDirection:text,requestId:id},
  submit: {moveId:id,output,requestId:id},
  review: {draftId:id,expectedVersion:z.number().int().positive(),token:id,requestId:id,
    action:z.enum(['land','revise','reserve','discard']),output:output.optional()}
};
export const outputs = {
  snapshot: {snapshot,focusedDraftId:id.optional()},
  list: {explorations:z.array(exploration)},
  packet: {packet}
};
export const UI_URI = 'ui://shadow-walker/review.html';
export const TICKET_META = 'shadowWalker/review';
