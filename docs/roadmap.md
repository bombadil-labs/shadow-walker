# Roadmap

## M0 — repository and environment

Recovered the design, inspected the existing repository, preserved its connection-test file, and created an isolated implementation branch. No pre-existing application or tests were present.

## M1 — guided walk and human review

Implementation includes intention/frame creation, persistent positions, a bounded move packet, draft submission, review-gated Land, revision/reserve/discard persistence, an inspector, and MCP tools plus UI resource. Core tests exercise restart persistence, graph validity, capabilities, and atomic review. The original combined M1 implementation passed the Node 24 CI workflow: typecheck, build, 42 core tests, 4 SDK transport tests, 2 context-schema tests, 4 sandboxed browser tests, and the dependency audit. Follow docs/verification.md and docs/bounded-context.md for the recorded runs; automated tests are not a live-host certification.

### Standalone workbench and first private live loop

The standalone dashboard, shared review widget, static landing/instructions page and site-only Vercel config are implemented. The combined workflow now passes 48 native tests, 14 integration tests and 7 browser tests. See [standalone verification](standalone-dashboard.md).

The user exercised the basic private ChatGPT draft/Land/readback/reported-restart/reopen loop. Full host behavior and Claude still require live testing; this is not a public-service security certification.

### Private hosted field test

A single-user hosted field test is now deployed on Vercel with Neon/PostgreSQL persistence and a capability-gated Streamable HTTP MCP endpoint. A real ChatGPT connection has completed list → create → read → open-widget against that hosted stack. The capability URL is a private bearer secret; this milestone deliberately does **not** add OAuth, account identity, public signup or cross-user isolation.

### Next release milestone — authenticated public beta

The [public-release plan](public-release.md) and [issue #5](https://github.com/bombadil-labs/shadow-walker/issues/5) now focus on the remaining public-product boundary: managed identity, principal-scoped storage/capabilities/receipts, MCP OAuth, two-account isolation tests, backups/privacy controls and tested ChatGPT/Claude onboarding. The hosted Postgres adapter and Vercel MCP path are field-tested infrastructure, not proof that the service is ready for untrusted multi-user ingress.

Package the detailed host skill when automatic discovery is needed; a connected MCP alone does not install the repository's SKILL.md.

## M2 — branching and weave

Add first-class branches and relations, divergent branch advancement, selected-input comparison, and a weave result that can be correspondence, mismatch, or none. A weave may propose at most three child questions; following one is a separately prepared, reviewed move. Preserve concrete anchors, omissions, and rejected analogies. Evolve the ordered inspector into selectable graph/path navigation without confusing derivation edges with semantic relations.

## M3 — grounding and reserve re-entry

Add human-entered observations with provenance, probe design without automatic real-world intervention, stable reserve branches, challenged/dormant statuses, and explicit frame adoption. Do not turn model-generated predictions into observations. Retain the original intention when a later frame changes representation. Add dedicated browsing of historical draft revisions already retained in the ledger.

## M4 — operation cards, trumps, and bounded scouting

Implement the seam between stalled operation search and semantic walking; a walk arrival may become an operation card. Ordered trumps remain explicit. Scouting requires user authorization, budgets, resumable checkpoints, and visible results. It is never described as hidden background agents.

## M5 — provisional consolidation and durability tools

For flight/hybrid consolidation require two genuinely diverged advanced lines, a persisted weave (including mismatch/none), and a separately reviewed follow-up derived from it. Preserve uncertainty, alternatives, and concrete anchors. Add validated import/export, migration/backup recovery, and deployment documentation. Full snapshot/ledger reads and snapshot receipts still grow with the exploration; pagination and compact receipts are separate performance work. No graph database, mandatory model API key, billing, or generic autonomous-agent platform is required.