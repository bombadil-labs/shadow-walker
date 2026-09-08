# Interactive branch and weave gestures

Shadow Walker's map is a coordination surface, not an autonomous agent. A human can leave an explicit intention on the map and later ask a connected conversation to perform exactly that bounded reasoning gesture.

## Branch

A branch request records:

- the visited Arrival from which the alternative departs;
- a newly created, empty exploratory Line;
- a human-readable line label;
- the direction the human wants the later walk to attend to.

Creating the request **does not prepare a move, run a model, or visit new territory**. The request stays pending.

When the human asks the conversation to resume it, the model reads `list_pending_gestures`, then calls `prepare_move` with the request's exact `lineId`, `gestureRequestId`, and origin Arrival. It performs one Semantic Walk, submits one Arrival draft, and stops for normal human review. The gesture resolves as `branch-landed` only after the human Keeps/Lands an Arrival. Reserve/discard does not pretend the route was traversed.

## Weave

A weave request records:

- at least two explicit Lines;
- at least one independently visited basis Arrival from every selected Line;
- the human's focus for the encounter.

Shared branch origins do not count as developed basis. Creating the request **does not create an Encounter or assert that the Lines correspond**.

When resumed in conversation, the model compares the exact requested basis under the supplied focus. Valid proposed results are:

- correspondence;
- tension;
- mismatch;
- partial overlap;
- convergence;
- `none`.

The model calls `submit_weave_result`; this persists a pending `WeaveProposal`, not an Encounter. It then stops.

The app receives a separate exact-version, expiring, single-use review capability. Human **Keep weave** converts the proposal into an immutable candidate Encounter using the original requested Lines/basis. **Discard weave** creates no Encounter. The model cannot call the review tool.

This makes `none` and mismatch successful cartographic outcomes and keeps the system from structurally rewarding forced synthesis.

## Safety and concurrency boundaries

- Human map gestures are rejected while an Arrival walk is prepared/submitted, so they cannot silently invalidate live reasoning.
- The standalone dashboard can invoke request/dismiss/review app actions, but cannot call `prepare_move`, `submit_move`, or `submit_weave_result`.
- `list_pending_gestures` is a model-facing handoff, not permission to process every queued request. Current human direction still determines which one to resume.
- A map-requested weave must not be fulfilled by directly calling `record_encounter`; the human review boundary is constitutive.
- Review never triggers a follow-up move.
- Gesture requests/resolutions are append-only history. Pending weave proposal status/version is mutable only through its review lifecycle.

## Product grammar

The intended loop is:

```text
human marks a possible movement on the map
                    ↓
        durable pending gesture
                    ↓
human asks a conversation to resume that gesture
                    ↓
       one bounded reasoning action
                    ↓
          pending human review
                    ↓
      map records what actually happened
```

The map holds intention between encounters. The conversation supplies situated reasoning. Neither silently substitutes for the other.
