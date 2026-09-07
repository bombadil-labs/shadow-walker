# Bounded guided-walk context

## Why this change exists

The first M1 implementation enumerated every root-to-input path recursively and included every reserved draft in each move packet. Limiting a move to two proposed positions did not limit the work required to construct its input. A local reproduction with only 21 accepted positions produced 1,024 paths and a 444,112-byte packet. The same fixture now produces 16 preview paths in about 10 KiB, while all 21 positions remain in SQLite.

A second reproduction showed that independently valid text fields could form an oversized draft, and the direct domain validator accepted unexpected fields inside anchors and structural views. This change adds an aggregate UTF-8 byte budget and aligns those nested field checks with the strict MCP schemas.

## Current policy

The policy is defined once in `packages/domain/src/limits.ts`:

| Resource | Limit |
| --- | ---: |
| New draft output, serialized UTF-8 | 65,536 bytes |
| Initial create request, serialized UTF-8 | 65,536 bytes |
| New move packet, including metadata | 262,144 bytes |
| Complete ancestry preview paths per selected input | 8 |
| Positions per complete preview path | 64 |
| Ancestor visits per selected input | 2,048 |
| Reserved drafts considered for a preview | 4 newest-created drafts |

These are initial application policy choices, not empirically optimal model-context settings. Bytes are not tokens. HTTP request limits and a host's own context window remain separate constraints.

Ancestry traversal is iterative. Each selected input receives its own visit and path budget. Returned paths are complete root-to-input paths in recorded parent order; a depth-limited fragment is never mislabeled as a complete path. Cycles and invalid parents encountered during traversal raise domain errors. A bounded preview is not an exhaustive integrity audit of unvisited ancestry.

## Nothing disappears because it was omitted from a preview

Every new packet includes `context`:

```json
{
  "limits": {
    "maxOutputBytes": 65536,
    "maxPacketBytes": 262144,
    "maxPathsPerInput": 8,
    "maxPathDepth": 64,
    "maxAncestorVisitsPerInput": 2048,
    "maxReservedDrafts": 4
  },
  "paths": {
    "complete": false,
    "included": 16,
    "truncatedInputIds": ["selected-input-a", "selected-input-b"]
  },
  "reserves": { "total": 7, "included": 4, "omitted": 3 }
}
```

The selected positions, their direct parent IDs, the original intention, the frame, the prior recorded waypoint, and the human direction are never shortened to make a packet fit. Optional path previews are dropped first if necessary. Reserve previews are then included only when they fit. Every omission is reported; an exact total of omitted ancestry paths is deliberately not calculated, because calculating that total by enumeration would recreate the original problem.

The full graph, accepted anchors, uncertainty, drafts, and event history remain stored. `read_exploration` still returns the full snapshot, and the inspector still shows that snapshot. The skill instructs the model not to interpret missing preview content as nonexistent work or to automatically start another move.

If required context alone exceeds the packet budget, preparation fails with `CONTEXT_BUDGET_EXCEEDED`. It does not create a move, event, or idempotency receipt. Selecting fewer positions or shortening the human direction can then be retried. Oversized submissions and revisions likewise fail without partially applying a review or consuming its capability.

## Compatibility and limits of this work

`context` is optional in the TypeScript and Zod packet definitions solely for reading older persisted M1 packets. New preparation always emits it. A legacy packet with no metadata makes no completeness or size guarantee; it can still be resumed, submitted, and reviewed. No database migration, accepted-position edit, or historical rewrite is performed.

This change does **not** make all storage and transport operations bounded. Reading a full snapshot or ledger and storing full-snapshot idempotency receipts still grow with an exploration. The snapshot used while preparing a move is still loaded in full. Pagination, compact receipt design, and selective ancestry retrieval are separate future work. The review capability/host trust model is unchanged; this is not authentication, a deployment solution, or a security certification.

## Verification on September 7, 2026

Executed against the domain/storage core plus the original M1 test suite:

```sh
npm run test:core
```

Result: **42 passed, 0 failed, 0 skipped** — 22 original tests and 20 new regression tests. This includes actual on-disk SQLite and a separate-process restart, exact byte-boundary checks, Unicode byte counting, 20,000-deep ancestry, an ancestor-visit exhaustion case, fair per-input path limits, deterministic generated DAGs, reserve omissions, failure atomicity, and legacy prepared-packet recovery.

The focused core typecheck passed with TypeScript 5.8.3 and real locally installed `@types/node` 25.1.0 declarations, using:

```sh
tsc --noEmit -p tsconfig.core.json --typeRoots <local-directory-containing-@types-node>
```

The local runtime was Node 22.16.0. This does not substitute for the declared Node 24.11+/TypeScript 5.9.3 toolchain. No fake module declarations or alternate SDK implementation were used.

Two additional tests in `tests/context.integration.test.ts` exercise the real Zod packet/snapshot schemas, including legacy compatibility. They are wired into the existing Vitest integration suite but were **not executed locally**: the execution environment could not resolve `registry.npmjs.org`. The full application typecheck, MCP/React build, transport/browser tests, dependency audit, and live ChatGPT integration are not claimed to pass based on the core tests. Consult the PR checks for separate CI evidence.
