# Shadow Walker: latent-space cartography

> **Shadow Walker maps not a space of concepts, but a history-dependent ecology of transformations: what became reachable, what remained invariant, what was lost, what was preserved, and what futures became possible from there.**

This document is the conceptual source of truth for the next architecture and UI. It supersedes the narrower interpretation of Shadow Walker as a persistent list of accepted findings. Existing M1 behavior remains useful infrastructure and must be migrated without destroying the user's saved explorations.

## Sources and authority

Shadow Walker synthesizes two canonical skills from `mbilokonsky/claude_skills`:

- **Semantic Walk** supplies local motion through meaning: ordered encounter, excavation, semantic displacement, surprise, path dependence, and the principle that the walk constructs the space in which the next thought can exist.
- **Flight Lines** supplies global topology and action: structural constraints, deterritorialized operations, parallel lines, structural rather than merely semantic composition, execution, breakdown, revision, dormancy, dissipation, and reterritorialization.

The September 2026 GOD THREAD context adds a third design requirement: **wetness**. The present is insufficient, but the path is not lost. Preserve enough causally relevant history to keep meaningful transformation available without turning history into sovereign archival closure. Resonance proposes; it does not prove.

Current user direction outranks every artifact. This is a design synthesis, not an authority over future walks.

## Product thesis

**Shadow Walker externalizes the path-dependent state of collaborative thought.**

The human, model, conversation, tools, retrieved artifacts, culture, history, technology, and external environment are all participants in a situated ecology. There is no God's-eye map of “the model's latent space.” A map records a traversal through an ecology whose affordances are changed by the traversal itself.

Shadow Walker therefore preserves transformations rather than merely conclusions.

- Semantic Walk asks: **what became reachable from here, and what changed in order for that to happen?**
- Flight Lines asks: **what structural capacities can act here, and how does acting change the structure?**
- Wetness asks: **which history remains causally relevant so that coherence survives without foreclosing further transformation?**

The persistent map is the medium in which those three questions can interact across conversations.

## Core loop

```text
walk / encounter
    ↓
semantic territory changes
    ↓
new constraints or affordances become visible
    ↓
operation / branch / probe / weave becomes possible
    ↓
execution, friction, observation or encounter changes structure
    ↓
semantic territory changes again
```

No mode is a mandatory wizard step. These are gestures available to a situated exploration.

## The core ontology

### Exploration

A durable field of inquiry. It retains the original intention even if later movement transforms the question. An exploration is not a transcript and does not require one canonical line.

### Arrival

The central unit of visited territory. An arrival is a place that became available because of a particular path.

An arrival records:

- what is visible from here;
- how we got here;
- what became newly salient;
- what receded;
- what remained invariant;
- what uncertainty remains;
- what directions became possible.

An arrival without its path is an incomplete representation of the territory.

### Semantic shift

A transition-relative record of movement, not a generic keyword summary.

V1 distinguishes **walker-reported** change from future **measured** change. The host does not expose internal logits or hidden-state geometry, so the model's report must never be presented as a mechanistic measurement.

A shift can retain:

- baseline arrival IDs;
- newly salient spans;
- receded spans;
- preserved invariants;
- unexpected connections;
- new affordances / possible directions;
- surprise level and notes;
- optional future measured displacement with method/model provenance.

The UI should expose “what entered here” and “what still held” before exposing schema details.

### Line

A developing trajectory through arrivals. A line is not merely a folder or a Git branch. Parallel lines are normal, not an advanced exception.

Useful states include active, exploratory, intensifying, dormant, blocked, dissipated, transformed, and reterritorialized. State is descriptive rather than a mandatory lifecycle.

### Transition

A typed movement between arrivals or between an arrival and another cartographic object. Generic ancestry remains available for integrity, but user-facing cartography should distinguish movements such as:

- `walked-to`
- `excavated`
- `branched`
- `operation-applied`
- `revealed-constraint`
- `resonates`
- `contradicts`
- `weaves`
- `converges`
- `reterritorializes`
- `transforms-question`

Only persist a relation the exploration actually established. Do not infer a rich semantic edge merely because two nodes share ancestry.

### Waypoint

A sensed but unvisited possibility. This is ontologically different from an Arrival. The future must not be rendered as already mapped territory.

A waypoint may become an arrival through a later reviewed move, remain latent, or dissipate.

### Structural constraint

A persistent articulation of what constrains transformation. Constraints may be visible before an operation, or revealed by friction/breakdown after one is tried.

### Operation

A deterritorialized executable capacity, not a metaphor. It records enough mechanics to evaluate structural fit:

- origin domain;
- input structure;
- output structure;
- invariants preserved;
- transformation performed;
- executable procedure;
- constraints it is proposed to act on.

“My system is like a mycelium” is not an operation. A reusable signaling/routing capacity extracted from mycorrhizal interaction might be.

### Application

A situated attempt to apply an Operation on a Line or constraint set. It records adaptation, protocol, outcome, observations and constraints revealed by friction. Breakdown is a cartographic result, not an error to erase.

### Observation

Something introduced from outside pure model generation: a human report, source, experiment, code result, physical probe, measurement or other grounded encounter. Provenance matters. A generated prediction must not silently become an Observation.

### Encounter / weave

A deliberate relation between independently developed lines. The result can be correspondence, tension, mismatch, partial overlap, convergence, or **none**. The schema must permit “nothing useful connected” so the product does not structurally reward hallucinated synthesis.

## Two kinds of novelty

### Semantic novelty

A meaningful change in what is addressable from the current position. High lexical rarity is not enough. The relevant baseline is the inhabited semantic neighborhood and path.

### Operational novelty

A structurally coherent action that the original domain framing would not have suggested. Structural fit and executable fidelity outrank surface analogy.

A strong exploration may cycle between both: semantic movement reveals a constraint; a cross-domain operation changes the situation; the changed situation makes new semantic territory reachable.

## Wet memory

Shadow Walker should resist both forgetting and archival totalization.

Do not stuff the entire event history into every move. Do not collapse history to a noun-only summary either. Preserve and retrieve the causally relevant path at the scale required for the next gesture, with explicit omission metadata when context is bounded.

This motivates multi-resolution cartography. “Zoom” should eventually change semantic scale, not merely pixel scale: a local arrival can sit inside a line, a line inside a recurring structural motif, a motif inside a longer personal/project/history trajectory. Different scales expose different causal histories.

## Map-first interaction grammar

The primary UI is a map of conceptual movement, inspired by route maps such as Slay the Spire but without teleology or a predetermined boss/path.

- filled node: visited Arrival;
- hollow node: sensed Waypoint;
- solid edge: traversed/applied movement;
- dashed edge: proposed/untraversed movement;
- fork: preserved alternatives;
- merge: actual convergence, not visual convenience;
- side/dim line: dormant or reserved trajectory;
- productive breakdown: visible cartographic landmark;
- weave/encounter: cross-line relation with typed result;
- current open question: visually prominent open edge.

The graph should be event-grown. Do not pre-generate a giant future tech tree. Territory exists because the walk reached it; possible futures remain visibly different from visited places.

### Arrival hover / focus

Default micro-inspection should answer:

- What is this?
- **What entered here?** (newly salient spans)
- **What still held?** (preserved invariants)
- What receded?
- How surprising was the step?
- What became possible next?

Click/focus opens the full human-readable detail surface: meaning, grounding, uncertainty, path, constraints, operations and routes outward. Raw IDs/JSON belong under developer details.

## Human/model asymmetry

The human and model are participants, not interchangeable actors and not sovereign controllers.

The model can sense/propose movement; the human can redirect, revise, reject, preserve or introduce grounded observations. The durable artifact can later redirect both. Human acceptance is not epistemic verification, and review never causes automatic continuation.

Possible provenance for a direction includes human-offered, walker-sensed, breakdown-emergent, operation-adjacent and resonance-detected. This provenance may become useful cartographic data.

## Governing invariants

1. No Arrival without a path.
2. A traversed path is historical record and is not silently rewritten.
3. Naming a token is not equivalent to excavating it.
4. A semantic step records what changed, not only what was said.
5. Reported semantic shift is not represented as measured hidden-state geometry.
6. Unfollowed directions remain available without pretending they were visited.
7. Parallel Lines are not forced into premature synthesis.
8. An Operation specifies mechanics, not merely resemblance.
9. Structural fit outranks domain similarity.
10. Execution may revise the map.
11. Breakdowns persist as discoveries.
12. A weave may legitimately find no correspondence.
13. Reterritorialization is allowed; endless novelty is not the goal.
14. Human acceptance is not verification.
15. Review never automatically continues the walk.
16. The original intention remains addressable after the question transforms.
17. Preserve enough causal history to reconstruct why something became visible without making the entire archive mandatory context.
18. Current human direction outranks persisted interpretation.
19. Resonance proposes; it does not prove.
20. No map view is the territory.

## Mechanistic-interpretability horizon

A future export from any Arrival should be capable of becoming a **coordinate chart around that arrival**, not merely one embedding vector.

The export should preserve path, baseline, sibling/counterfactual contrasts, semantic shift, anchors and stimuli so an instrumented model can produce a local activation manifold across layers/features. This enables experiments such as path-conditioned activation differences, feature/circuit attribution, ablation/steering and cross-model comparison.

The mechanistic manifold is one projection onto one participant's internal computation. It must never be represented as the ontological truth of the ecological Arrival.

Architectural consequence now: preserve enough path, contrast, context and semantic displacement that future mechinterp tooling can construct meaningful experimental contrasts without reconstructing them from an impoverished summary.

## Migration posture

The existing M1 implementation got several foundations right and they remain invariants:

- durable append-only history;
- explicit human review;
- acceptance != verification;
- anchors and uncertainty;
- bounded context;
- reserves;
- no automatic continuation;
- host-model reasoning separated from persistence;
- working chat ↔ app ↔ database loop.

The course correction is primarily ontological and representational:

- `Position` becomes a compatibility representation of an Arrival, not the long-term product noun;
- semantic Shift becomes first-class for new movement;
- the UI becomes map-first rather than record-list-first;
- Lines/typed Transitions are foundational in the schema even while operations/weaves are introduced incrementally;
- structural constraints/operations/applications/encounters become first-class instead of prose-only annotations.

Migration must preserve the already-saved exploration. Legacy Positions without Shift metadata render as arrivals whose historical shift was not recorded; the system must not fabricate one after the fact.
