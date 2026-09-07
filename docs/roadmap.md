# Roadmap

## M0 — repository and environment

Recovered the design, inspected the existing repository, preserved its connection-test file, and created an isolated implementation branch. No pre-existing application or tests were present.

## M1 — guided walk and human review

Implementation includes intention/frame creation, persistent positions, a bounded move packet, draft submission, review-gated Land, revision/reserve/discard persistence, an inspector, and MCP tools plus UI resource. Core tests exercise restart persistence, graph validity, capabilities, and atomic review. The combined implementation passes the Node 24 CI workflow: typecheck, build, 42 core tests, 4 SDK transport tests, 2 context-schema tests, 4 sandboxed browser tests, and the dependency audit. Follow docs/verification.md and docs/bounded-context.md for the recorded runs; automated tests are not a live-host certification.

### Next acceptance milestone — a real chat and rendered app

The [product contract](user-journey.md) is: run the server, connect its MCP to a chat, explore an idea, and inspect the saved exploration in the embedded app. It is not automatic full-transcript capture or a separate chat product.

Validate the first private, single-user round trip before claiming that experience works in ChatGPT. Current OpenAI documentation offers Secure MCP Tunnel as well as public HTTPS. A private tunnel must be configured with the right credentials and account/workspace access; the actual widget, private metadata, human review, and reopen/restart behavior must be tested. A native private tunnel is not the same as exposing the unauthenticated listener through a public forwarding service. Public/shared hosting still requires application authentication, authorization, and user-scoped review capabilities. No tunnel or remote deployment is currently provisioned by this project.

Package the detailed host skill when automatic skill discovery is needed. The current server supplies tool and initialization instructions, but connecting MCP alone does not install the repository's SKILL.md.

## M2 — branching and weave

Add first-class branches and relations, divergent branch advancement, selected-input comparison, and a weave result that can be correspondence, mismatch, or none. A weave may propose at most three child questions; following one is a separately prepared, reviewed move. Preserve concrete anchors, omissions, and rejected analogies. Evolve the ordered inspector into selectable graph/path navigation without confusing derivation edges with semantic relations.

## M3 — grounding and reserve re-entry

Add human-entered observations with provenance, probe design without automatic real-world intervention, stable reserve branches, challenged/dormant statuses, and explicit frame adoption. Do not turn model-generated predictions into observations. Retain the original intention when a later frame changes representation. Add dedicated browsing of historical draft revisions already retained in the ledger.

## M4 — operation cards, trumps, and bounded scouting

Implement the seam between stalled operation search and semantic walking; a walk arrival may become an operation card. Ordered trumps remain explicit. Scouting requires user authorization, budgets, resumable checkpoints, and visible results. It is never described as hidden background agents.

## M5 — provisional consolidation and durability tools

For flight/hybrid consolidation require two genuinely diverged advanced lines, a persisted weave (including mismatch/none), and a separately reviewed follow-up derived from it. Preserve uncertainty, alternatives, and concrete anchors. Add validated import/export, migration/backup recovery, and deployment documentation. Full snapshot/ledger reads and snapshot receipts still grow with the exploration; pagination and compact receipts are separate performance work. No graph database, mandatory model API key, billing, or generic autonomous-agent platform is required.
