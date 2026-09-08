# Flight Lines cartographic surface

This slice makes the structural ecology visible on the same map as semantic Arrivals. It does not introduce a second dashboard or flatten Flight Lines into a record list.

## Visual grammar

- **Arrival**: the existing filled route node.
- **Grounded observation**: a small star tethered to its visited Arrival. It is explicitly external-to-model provenance.
- **Structural pressure / constraint**: a small angular marker tethered to the Arrival where the candidate constraint became visible.
- **Operation**: a gear-like marker situated near the constraints it is proposed to act on. Its detail panel exposes origin domain, input/output structures, invariants, transformations and executable procedure; resemblance alone is not rendered as an Operation.
- **Operation application**: a marker on the latest visited point of its Line. Proposed applications remain visually distinct from executed/broken-down outcomes. A breakdown is a productive cartographic landmark rather than an application error.
- **Encounter / weave**: a cross-line relation drawn only from a persisted Encounter basis. Mismatch and `none` use interrupted line treatment; convergence may render more strongly. The UI never invents cross-line relations from shared ancestry.
- **Waypoint**: remains hollow and unvisited.

Clicking a feature opens prose-first details. IDs and raw schema remain secondary. Candidate structural records are not presented as verified truth, and `none` is explicitly described as a legitimate weave result rather than a synthesis failure.

## Layout constraints

The current map layout is deterministic and intentionally modest. Structural features use local offsets/tethers around existing route nodes so this slice does not introduce a force-directed graph or imply metric geometry that has not been measured. Future layout work can become line-aware and multi-resolution without changing the persisted ontology.

Operations without any situated constraint cannot exist under the current storage validation, so every rendered Operation can be tethered to at least one visited Arrival through its target constraints. Observations without a position remain persisted but are not falsely attached to a map location.

## Test fixture

The embedded-app browser fixture has an opt-in `flightLines=1` mode that creates two developed Lines, one grounded observation, an observation-derived constraint, one structurally specified Operation, a proposed Application and a persisted mismatch Encounter. Normal review tests continue using the simpler fixture. The fixture exists only under `tests/` and is never part of the production server build.
