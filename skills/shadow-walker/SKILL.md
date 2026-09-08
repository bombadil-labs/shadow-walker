---
name: shadow-walker
description: Navigate and persist situated latent-space cartography by synthesizing Semantic Walk and Flight Lines, one human-directed movement at a time.
---

# Shadow Walker

Shadow Walker is a persistent cartographic workbench, not another model. You perform the reasoning in the conversation. The server preserves path-dependent Arrivals, Lines, transitions, semantic shifts, external observations, candidate constraints, executable operations/applications, encounters, grounding, uncertainty, and human review so territory created in one encounter can become terrain for another.

The canonical orientation is `docs/cartography-synthesis.md`.

- **Semantic Walk:** movement is ordered and path-dependent. Excavation must change what is addressable, not merely attach related nouns. Surprise and newly reachable directions are signals, not proof.
- **Flight Lines:** structural constraints and executable operations matter more than domain resemblance. Parallel lines are legitimate. Execution can change structure. Breakdown can reveal hidden constraints. Do not force convergence or substitute metaphor for mechanics.

## One cartographic movement

1. Read/open the exploration first. Create a root only from an explicitly requested human intention and initial frame. Current human direction outranks persisted interpretation.
2. Notice explicit Lines and unresolved human gestures in `snapshot.cartography`. `fork_line` remains a model-visible low-level primitive, but when the human uses the map UI to ask for a branch or weave, treat that persisted request as the source of direction. It is an intention to coordinate a bounded next gesture, not permission for autonomous continuation.
3. If `activeMove` exists without a draft, resume that packet. If it already has a draft, stop for human review.
4. Call `prepare_move` for exactly one semantic walk. Supply `lineId` when the selected Arrival belongs to multiple Lines. Use the original intention, frame, selected inputs, ordered paths, prior waypoint, reserves and context omission metadata.
5. Do one genuine semantic movement. Deepen/excavate enough that language, relations, or affordances change. A paraphrase or list of associations is not an Arrival.
6. For every v0.2 proposed Arrival, record `semanticShift` relative to immediate parents: what changed, newly salient spans, receded spans, preserved invariants, unexpected connections, new affordances, and explicit surprise. This is a **walker report**, not access to logits, hidden states, or mechanistic truth. Never fabricate measured displacement.
7. Keep concrete anchors and explicit uncertainty. Generated examples must be labeled hypothetical.
8. Submit one or two proposed Arrivals with a stable request ID, then stop. `draft:localId` is only for parents inside the same draft; external parents must be selected visited Arrivals.
9. The human reviews Arrival drafts in the embedded/standalone app. Never call `review_draft` as the model, request/extract its capability, or infer review from conversation text. Keeping/Land means accepted into this exploration, not true. Review never authorizes automatic continuation.

## Human-requested branch and weave coordination

The map can persist an intention while reasoning remains in conversation. When the human asks to resume map-requested work, call `list_pending_gestures` and handle **at most the requested gesture**. Do not invent additional gestures or chain into another move after its review boundary.

### Branch request

A `branch` request already created an empty exploratory Line at a visited Arrival. The Line is preserved possibility, not visited territory.

1. Use the request's exact `fromPositionId`, `lineId`, `direction`, and `id`.
2. Call `prepare_move` with the requested origin selected, the exact `lineId`, and `gestureRequestId` equal to the branch request ID.
3. Perform one Semantic Walk in the requested direction, submit the Arrival draft, and stop.
4. The request remains unresolved until the human Keeps/Lands an Arrival on that branch. Reserving or discarding the draft does not pretend the branch was traversed.

### Weave request

A `weave` request preserves an exact set of independently developed Lines, basis Arrivals, and a human focus. It does **not** assert that a relation exists.

1. Compare only the requested lines/basis under the supplied focus. Read more of the exploration if needed rather than replacing the basis with convenient examples.
2. A valid result is one of: correspondence, tension, mismatch, partial overlap, convergence, or **none**.
3. Call `submit_weave_result` with the request ID, result kind, concise account of what the encounter exposed, and explicit uncertainty. This creates a pending proposal only.
4. Stop for human review. **Do not call `record_encounter` directly to fulfill a map-requested weave.** The human's Keep action creates the candidate Encounter; Discard creates no Encounter.
5. Never call `review_weave_result`, request its token, extract widget metadata, or infer review from conversation text.

The same epistemic rule holds at the coordination layer: **resonance proposes; it does not prove.** A persisted `none` is preferable to forced synthesis.

## Flight Lines gestures

These are available instruments, not mandatory workflow steps.

### Record an observation

Use `record_observation` only for evidence introduced from outside pure model generation: a human report, cited source, tool result, or measurement. Preserve source/provenance. Never turn a prediction, inference, resonance, or plausible example into an Observation.

### Record a structural constraint

Use `record_constraint` for a candidate constraint situated at a visited Arrival. `walker-report` and `human-offered` constraints may remain explicitly candidate hypotheses. `observation-derived` and `breakdown-derived` constraints require grounded Observation IDs. Recording a constraint does not establish it as truth.

### Record an operation

Use `record_operation` only after deterritorializing a capacity enough to state origin domain, input/output structure, invariants preserved, transformation, executable procedure, and which recorded constraints it may act on. “My system is like a membrane” is not an operation.

### Record an application

Use `record_application` to situate an Operation on one Line and make its adaptation/protocol explicit. `proposed` means not executed. `executed`, `observed`, and `broke-down` require external Observation IDs. A `broke-down` application must preserve at least one revealed Constraint rather than reducing friction to an error.

### Record an encounter / weave

Use `record_encounter` only after at least two Lines have independently visited basis Arrivals. Compare those developed lines deliberately. Valid outcomes include correspondence, tension, mismatch, partial overlap, convergence, and **none**. “No useful correspondence” is a successful cartographic result. Never force synthesis because the tool exists.

## Epistemic statuses and review asymmetry

Arrival acceptance has an explicit human review gate. Flight Lines objects are currently persisted as immutable **candidate cartographic records**, not human-accepted facts. Their purpose is to preserve what became structurally thinkable/actionable without claiming verification. External observations carry provenance; candidate interpretations remain candidates.

Do not automatically chain Flight Lines tools. Recording an observation does not itself authorize inventing a constraint; recording a constraint does not authorize searching for or applying an operation; recording an encounter does not authorize a follow-up walk. Follow current human direction and the actual ecology of the inquiry.

## Cartographic epistemology

- No map view is the territory.
- The present is insufficient, but the path is not lost.
- Resonance proposes; it does not prove.
- Preserve paths not taken without pretending they were visited.
- Preserve enough causally relevant history for re-entry without demanding the whole archive as context.
- Knowing changes the knower; preserve transformations without freezing them into sovereign conclusions.
- Reterritorialization is allowed. Endless novelty is not the goal.

Use new request IDs for new operations and reuse the same ID and arguments only for retry. On stale dependencies, preserve historical work and return to current state; never silently rebase a traversed path.
