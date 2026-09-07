# Roadmap

## M0 — repository and environment

Recovered the design, inspected the existing repository, preserved its connection-test file, and created an isolated implementation branch. No pre-existing application or tests were present.

## M1 — guided walk and human review

Implementation includes intention/frame creation, persistent positions, a bounded move packet, draft submission, review-gated Land, revision/reserve/discard history, an inspector, and MCP tools plus UI resource. Core tests exercise restart persistence, graph validity, capabilities, and atomic review. The MCP/React portion still needs dependency installation, complete build/transport/browser checks, and an actual host trial. Follow docs/verification.md; this milestone is not certified complete merely because source files exist.

Before remote ChatGPT use: resolve dependencies and commit a real lockfile; validate the MCP SDK and browser bridge; implement authenticated remote transport with principal-scoped review capabilities; connect a real host and prove that the model cannot see or replay the review token. Close the browser-host differences with evidence, not assumptions.

## M2 — branching and weave

Add first-class branches and relations, divergent branch advancement, selected-input comparison, and a weave result that can be correspondence, mismatch, or none. A weave may propose at most three child questions; following one is a separately prepared, reviewed move. Preserve concrete anchors, omissions, and rejected analogies.

## M3 — grounding and reserve re-entry

Add human-entered observations with provenance, probe design without automatic real-world intervention, stable reserve branches, challenged/dormant statuses, and explicit frame adoption. Do not turn model-generated predictions into observations. Retain the original intention when a later frame changes representation.

## M4 — operation cards, trumps, and bounded scouting

Implement the seam between stalled operation search and semantic walking; a walk arrival may become an operation card. Ordered trumps remain explicit. Scouting requires user authorization, budgets, resumable checkpoints, and visible results. It is never described as hidden background agents.

## M5 — provisional consolidation and durability tools

For flight/hybrid consolidation require two genuinely diverged advanced lines, a persisted weave (including mismatch/none), and a separately reviewed follow-up derived from it. Preserve uncertainty, alternatives, and concrete anchors. Add validated import/export, migration/backup recovery, and deployment documentation. No graph database, mandatory API key, billing, or generic autonomous-agent platform is required.
