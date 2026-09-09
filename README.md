# Shadow Walker

A persistent, human-reviewed toolkit for **situated latent-space cartography**. **Follow what changes the next question.**

Shadow Walker synthesizes the core dynamics of Semantic Walk and Flight Lines: ordered semantic movement, explicit path dependence, preserved alternatives, parallel lines, structural constraints, executable cross-domain operations, breakdown as information, and human review without automatic continuation. The map records transformations rather than merely conclusions.

Think in your AI chat; keep the evolving territory in Shadow Walker. The MCP tools and embedded app share one cartographic record: local mode uses SQLite, while the private hosted field test uses Neon/PostgreSQL behind stateless Vercel MCP handlers. There is no separate model API key, hidden background agent, or transcript capture. The server preserves only what is explicitly recorded through Shadow Walker.

> **The present is insufficient, but the path is not lost.**

See [the cartography synthesis](docs/cartography-synthesis.md) for the conceptual source of truth.

## Open the standalone workbench

Use Node 24.11 or later in the 24.x line. From the repository root:

```sh
npm ci
npm run check
node dist/apps/server/src/index.js --http
```

Open **http://localhost:3001/**. Pick a saved exploration, inspect its map, or review a proposed arrival. Refresh after a change in chat. A selected exploration has a bookmarkable page address. The same server still exposes `/mcp`; existing private tunnel configuration does not change. `/about` contains the landing page and connection guide.

To update an existing checkout, stop only the app server, run `git pull --ff-only`, rebuild with the commands above and restart. Keep `data/`: the default database is `data/shadow-walker.sqlite`. `SHADOW_WALKER_DB` overrides the database location, and `PORT` overrides 3001. Schema migrations are automatic and preserve existing M1 explorations; legacy arrivals are placed on an explicit original line without inventing semantic-shift history that was never recorded.

**Local mode is single-user and unauthenticated.** The listener stays on 127.0.0.1. Browser-origin/CSRF protections are not account authentication. Do not expose it through arbitrary public forwarding or use the local Store on ephemeral function storage.

For a stdio MCP host, launch `node dist/apps/server/src/index.js` directly with the repository root as the working directory; do not use an npm wrapper that might write banners to protocol stdout. The standalone dashboard is served by HTTP mode. Server logs go to stderr.

## Cartographic movement, not premature closure

`create_exploration → read/open → [fork_line] → prepare_move → submit_move → human review → read/open`

An exploration begins with an intention and an explicit first Line. A guided walk proposes one or two **Arrivals**. New v0.2 arrivals include a walker-reported `semanticShift`: what became newly salient, what receded, what remained invariant, unexpected connections, new affordances, and an explicit surprise report relative to the immediate path.

That shift is **not** hidden-state or token-probability measurement. Mechanistic measurements are a future external projection with their own provenance; the host model must not fabricate them.

`fork_line` preserves a route without pretending it has been visited. If an arrival belongs to multiple lines, subsequent walking must choose the line explicitly instead of collapsing parallel trajectories. Current typed transitions record traversed semantic movement; richer operation/application/weave relations are being introduced incrementally rather than inferred from ancestry.

The shared map uses filled nodes for visited arrivals, ghost nodes for proposed/reserved arrivals, and hollow nodes for sensed but unvisited next directions. Hover/focus exposes **What entered here** and **What still held**. Clicking opens prose-first grounding, uncertainty, surprise, receded language and the next direction. Raw IDs/JSON live under developer disclosure rather than being the primary UX.

Human review is **Keep this / Change it / Save for later / Discard**. Keeping/Land means accepted into this exploration, not verified as true. Editing creates a separate saved revision before acceptance. Review never automatically launches another move.

## Persistence and epistemic boundaries

Accepted arrivals and traversed transitions are historical records. SQLite transactions include graph changes, line membership, event ledger updates, capability consumption and idempotency receipts. New move packets have bounded ancestry/reserve previews and explicit omission metadata; omitted context is not treated as nonexistent territory.

The long-term ontology includes first-class Waypoints, Structural Constraints, Operations, Applications, Observations and Encounters/weaves. These are deliberately not flattened into generic prose or claimed before their executable tools land. A weave must be allowed to yield correspondence, tension, mismatch, partial overlap, convergence, or **none** so the product does not structurally reward hallucinated synthesis.

## Verification and current status

The private hosted field test is live on Vercel with Neon/PostgreSQL persistence. A real ChatGPT connection has successfully listed the fresh hosted datastore, created an exploration, read it back, and opened the MCP App widget from the hosted endpoint. The hosted transport remains intentionally single-user and capability-gated; there is **no OAuth, account identity, or cross-user isolation yet**.

Recent UX work also made the review shell state-aware, moved branch/weave actions into context, and added left-to-right Map/Outline navigation with optional Evidence / Structure / Operations / Encounters layers. Final CI evidence is recorded on the corresponding pull requests and in [docs/verification.md](docs/verification.md).

This is still a field test, not public-service security certification. Real Claude behavior, OAuth, two-account isolation, backup/restore, privacy controls and clean-account onboarding remain outstanding.

```sh
npx playwright install chromium
npm run test:browser
```

Dependencies remain locked; use `npm ci` and rerun the audit and full suite for upgrades.

## Private hosted field test and public beta

`vercel.json` now builds the static landing page **and** private hosted MCP/health functions. Hosted state lives in Neon/PostgreSQL; the Vercel function does not depend on ephemeral local SQLite storage.

The current hosted MCP uses a high-entropy capability embedded in its private connector URL. Treat that URL as a bearer secret: do not publish it, commit it, paste it into issues, or reuse it as public authentication. This is sufficient for the present single-user field test, but it is not a substitute for accounts or OAuth.

The next release milestone is still an authenticated public beta: user ownership on every record, web login, MCP OAuth, two-account isolation tests, backup/restore, privacy controls and clean-account ChatGPT/Claude onboarding. See [public-release plan](docs/public-release.md) and [issue #5](https://github.com/bombadil-labs/shadow-walker/issues/5).

## Repository map

- `packages/domain`: cartographic domain model, move validation, bounded context.
- `packages/storage`: transactional SQLite local persistence plus the async PostgreSQL/Neon hosted adapter, migrations, lines/transitions, review capabilities and event history.
- `packages/protocol`: MCP schemas and UI contract.
- `apps/server`: MCP adapters, loopback HTTP and guarded local browser host API.
- `apps/widget`: shared map-first MCP Apps inspector/review UI; `apps/dashboard`: standalone AppBridge host.
- `apps/site`: static landing and field-test/self-hosted ChatGPT/Claude instructions; no user data or public signup.
- `skills/shadow-walker`, `docs`, `tests`: host guidance, cartographic synthesis, architecture/roadmap and verification.

The pre-existing `test.md` remains untouched. Shadow Walker is distinct from Loam and groovy-commutator.