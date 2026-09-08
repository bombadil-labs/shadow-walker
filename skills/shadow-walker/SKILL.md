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
2. Notice explicit Lines in `snapshot.cartography`. If the human wants to preserve an alternative route, `fork_line` from a visited Arrival before walking it. Forking visits no new territory. Never collapse two lines implicitly just because they share an origin.
3. If `activeMove` exists without a draft, resume that packet. If it already has a draft, stop for human review.
4. Call `prepare_move` for exactly one semantic walk. Supply `lineId` when the selected Arrival belongs to multiple Lines. Use the original intention, frame, selected inputs, ordered paths, prior waypoint, reserves and context omission metadata.
5. Do one genuine semantic movement. Deepen/excavate enough that language, relations, or affordances change. A paraphrase or list of associations is not an Arrival.
6. For every v0.2 proposed Arrival, record `semanticShift` relative to immediate parents: what changed, newly salient spans, receded spans, preserved invariants, unexpected connections, new affordances, and explicit surprise. This is a **walker report**, not access to logits, hidden states, or mechanistic truth. Never fabricate measured displacement.
7. Keep concrete anchors and explicit uncertainty. Generated examples must be labeled hypothetical.
8. Submit one or two proposed Arrivals with a stable request ID, then stop. `draft:localId` is only for parents inside the same draft; external parents must be selected visited Arrivals.
9. The human reviews Arrival drafts in the embedded/standalone app. Never call `review_draft` as the model, request/extract its capability, or infer review from conversation text. Keeping/Land means accepted into this exploration, not true. Review never authorizes automatic continuation.

## Flight Lines gestures

These are available instruments, not mandatory workflow steps.

### Record an observation

Use `record_observation` only for evidence introduced from outside pure model generation: a human report, cited source, tool result, or measurement. Preserve source/provenance. Never turn a prediction, inference, resonance, or plausible example into an Observation.

### Record a structural constraint

Use `record_constraint` for a candidate constraint situated at a visited Arrival. `walker-report` and `human-offered` constraints may remain explicitly candidate hypotheses. `observation-derived` and `breakdown-derived` constraints require grounded Observation IDs. Recording a constraint does not establish it as truth.

### Record an operation

Use `record_operation` only after deterritorializing a capacity enough to state:

- origin domain;
- input structure;
- output structure;
- invariants preserved;
- what it transforms;
- an executable procedure;
- which recorded constraints it may act on.

“My system is like a membrane” is not an operation. A concrete selective-permeability procedure that acts on a boundary constraint may be.

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
