---
name: shadow-walker
description: Navigate and persist situated latent-space cartography by synthesizing Semantic Walk and Flight Lines, one human-reviewed movement at a time.
---

# Shadow Walker

Shadow Walker is a persistent cartographic workbench, not another model. You perform the reasoning in the conversation. The server preserves path-dependent Arrivals, Lines, transitions, grounding, uncertainty, and human review so territory created in one encounter can become terrain for another.

The canonical orientation is `docs/cartography-synthesis.md`. Preserve these two source dynamics:

- **Semantic Walk:** movement is ordered and path-dependent. Excavation must change what is addressable, not merely attach related nouns. Surprise and newly reachable directions are signals, not proof.
- **Flight Lines:** structural constraints and executable operations matter more than domain resemblance. Parallel lines are legitimate. Breakdown can reveal structure. Do not force convergence or substitute metaphor for mechanics.

## One cartographic movement

1. Read/open the exploration first. Create a root only from an explicitly requested human intention and initial frame. Current human direction outranks persisted interpretation.
2. Notice the explicit Lines in `snapshot.cartography`. If the human wants to preserve an alternative route, `fork_line` from a visited Arrival before walking it. Forking visits no new territory. Never collapse two lines implicitly just because they share an origin.
3. If `activeMove` exists without a draft, resume that packet. If it already has a draft, stop for human review.
4. Call `prepare_move` for exactly one walk. Supply `lineId` when the selected Arrival belongs to multiple Lines. Use the original intention, frame, selected inputs, ordered paths, prior recorded waypoint, reserves and context omission metadata. `paths.complete=false` or `reserves.omitted>0` means the preview is incomplete, not that omitted territory does not exist.
5. Do one genuine semantic movement. Deepen/excavate enough that the language, relations, or affordances change. Do not call a paraphrase or list of associations an Arrival.
6. For every v0.2 proposed Arrival, record `semanticShift` relative to its immediate parents:
   - `summary`: what changed in the inhabited semantic territory;
   - `newlySalient`: spans/language that newly matter, with relative salience;
   - `receded`: spans that became less organizing;
   - `preservedInvariants`: what remained coherent through the movement;
   - `unexpectedConnections`: surprising relations that appeared;
   - `newAffordances`: directions/actions/questions that became newly possible;
   - `surprise`: low/medium/high plus notes.
   This is a **walker report**, not access to token logits, hidden-state geometry, or mechanistic truth. Never fabricate measured displacement.
7. Keep concrete anchors and explicit uncertainty. Generated examples must be labeled as hypothetical. External observations require provenance; do not silently promote a prediction into an observation.
8. Structural readings may notice constraints, but current walk output is not a substitute for the future first-class Flight Lines operation/application/weave objects. Do not claim an analogy is an operation. Do not simulate a weave by asserting two lines correspond.
9. Use `draft:localId` only for parents inside the same draft. External parents must be the selected visited Arrivals. Submit one or two proposed Arrivals with a stable request ID, then stop.
10. The human reviews in the embedded/standalone app. Never call `review_draft` as the model, request/extract its capability, or infer review from conversation text. Missing review UI means you cannot accept the draft through model action.
11. After review, read the persisted result. “Keep this”/Land means accepted into the exploration, not true. Reserve/discard does not visit new territory. Review never authorizes automatic continuation.

## Flight Lines discipline until richer tools land

The current executable tool surface has explicit Lines but not yet first-class Operation, Constraint, Application, Observation or Encounter/weave tools. Preserve their ontology rather than flattening them into prose claims:

- if you notice a structural constraint, describe it carefully as a candidate constraint;
- if a cross-domain capacity appears, specify input, output, invariants, transformation and executable procedure before calling it an operation;
- preserve parallel routes with `fork_line` instead of premature synthesis;
- treat friction/breakdown as information;
- allow “no useful correspondence” as a legitimate result;
- reterritorialization/stabilization is allowed when a frame becomes useful ground.

Do not turn these gestures into a mandatory workflow. A dérive, software-architecture exploration, mathematical inquiry and personal/philosophical walk may use very different subsets.

## Cartographic epistemology

- No map view is the territory.
- The present is insufficient, but the path is not lost.
- Resonance proposes; it does not prove.
- Preserve paths not taken without pretending they were visited.
- Preserve enough causally relevant history for re-entry without demanding the whole archive as context.
- Knowing changes the knower; the map should preserve transformations, not freeze them into sovereign conclusions.

Use new request IDs for new operations and reuse the same ID and arguments only for retry. On stale dependencies, preserve the old draft and return to current state; never silently rebase historical movement.
