# Architecture and recovered design

## Provenance and intent

This is an implementation-oriented reconstruction of the plan recovered from the September 4, 2026 conversation **Abstract Skill Idea Review**, including summaries of `SHADOW-WALKER-SPEC.md` and `SHADOW_WALKER_HANDOFF.md`. It is not a verbatim import of the full conversation or the original attachments. The starting repository contained only `test.md`.

The recovered design combines Semantic Walk (editable waypoints, one move at a time, ordered trumps) and Flight Lines (concrete anchors, structural abstraction, operation cards). Cross-branch comparisons must change subsequent exploration and sometimes its frame. A weave can discover correspondence, mismatch, or nothing. A generated next question is not an explored result.

M1 deliberately implements one `walk` and the review/persistence seam. Weave, branches, scouting, trumps, operations, and synthesis are not silently represented as ordinary walks.

## Boundaries

The host model receives a bounded MovePacket, does one piece of exploration, and submits a draft. The server does not call an LLM. Domain code is TypeScript with defensive runtime validators independent of Zod; MCP has additional strict Zod input/output contracts. This allows the storage invariants to be tested with Node's built-in runner even without registry access. Vitest is used for SDK integration, Playwright for the browser fixture.

A position stores meaning, concrete anchors, structural views, uncertainty, a next question, parent IDs, origin move, acceptance, and epistemic status. Structural views reference concrete anchor IDs and record entities, relationships, invariants, applicability, omissions, and mismatches. M1 generated kinds are only excavation and question. All landed generated positions remain hypotheses. An anchor is not automatically evidence; source labels supplied by a model are not certified provenance.

The root is an explicit user-requested intention with an initial frame. Root creation is an intentional bootstrap exception to review of generated findings. Preparation, draft saving, review, and capability issuance necessarily write operational state; **Land is the only operation that appends generated positions to the accepted graph**. “Only Land mutates” must not be misread as forbidding durable draft recovery.

## Review and persistence

Review choices are Land, Revise, Keep in reserve, and Discard. Revise saves edited content as a new draft revision and requires another review before Land. Land does not accept unsaved client content. A reserved draft is retained outside the accepted graph. It can be re-entered only if dependencies are still current and no other move is active; otherwise its content must inform a newly prepared walk. Discard retains history rather than deleting it.

Each review capability is 256 random bits, stored only as a hash, scoped to a draft ID and exact revision, valid for ten minutes, and single-use. Any successful review invalidates all tickets for that draft. Validation and consumption happen inside the same storage transaction as the decision (SQLite locally, PostgreSQL in the hosted adapter). Same-request retries return the stored receipt; changed payloads with the same request ID fail. Tickets are never put into event bodies or idempotency receipts.

MCP returns tickets only under tool-result `_meta["shadowWalker/review"]`. `review_draft` is declared app-only with `_meta.ui.visibility = ["app"]`. The widget fails closed without the ticket. Read-only tools return no tickets. Opening the review UI can issue a ticket and is not annotated read-only.

**Trust boundary:** UI visibility is not authentication or proof of a human click. A raw MCP client can see metadata and impersonate a UI. Local mode trusts the local host/account boundary; the private hosted field test additionally relies on possession of one high-entropy capability URL by a single trusted operator. Neither arrangement is suitable for untrusted multi-user ingress. Before public release, authenticated principals must scope transport access, stored records, receipts and review capabilities. Never trust caller-supplied `userAgent` or a claimed `ui` flag as identity. Token concealment and app-only routing must be verified in the real host.

Local mode uses SQLite WAL, schema-versioned migrations, foreign keys, one-active-move constraints, immutable-position triggers, and append-only ledger triggers. Hosted mode uses a separate asynchronous PostgreSQL adapter with equivalent relational constraints/immutability triggers and transactional receipts/capability consumption. Parent validity is checked at the domain boundary; draft-local references are resolved in topological order. The event history is append-only, not a claim of cryptographic tamper resistance or a complete event-sourced replay engine. A process with direct database administration can defeat application controls.

## Transport and UI

The server uses the official TypeScript MCP SDK and MCP Apps server helpers. The React widget uses the official App bridge, bundled into one HTML resource with no external asset or fetch domains. React renders source content as text, not injected HTML. The UI never requests a next model message automatically.

Local stdio and loopback-only Streamable HTTP share the SQLite `Store`. The private hosted field test uses stateless Vercel Streamable HTTP handlers with a per-invocation Neon/PostgreSQL `PostgresStore`; durable state belongs to the database, not an HTTP session or function filesystem. The same MCP server/tool definitions sit above both storage adapters.

The current hosted endpoint is single-user and protected only by a high-entropy capability URL. Real ChatGPT list/create/read/open-widget has been exercised against it, but OAuth, principal-scoped multi-user isolation, public signup, backup/export UX and real Claude behavior are not included. A capability URL is not a public authentication design.

## Primary implementation references

- MCP Apps build guide: https://modelcontextprotocol.io/extensions/apps/build
- MCP Apps server helper: https://apps.extensions.modelcontextprotocol.io/api/functions/server-helpers.registerAppTool.html
- MCP Apps bridge: https://apps.extensions.modelcontextprotocol.io/api/classes/app-bridge.AppBridge.html
- OpenAI tool-result metadata and visibility: https://developers.openai.com/plugins/reference
- Node SQLite API: https://nodejs.org/api/sqlite.html

These documents informed protocol wiring. They do not establish that this particular application has passed host integration.