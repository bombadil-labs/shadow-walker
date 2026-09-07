# Shadow Walker

A persistent, human-reviewed discovery workbench. **Follow what changes the next question.**

Think in your AI chat; keep the exploration in Shadow Walker. The MCP tools, embedded app and standalone browser dashboard share one SQLite-backed record. There is no separate model API key, hidden background agent, or automatic next move. This is deliberately recorded exploration—not an archive of every chat message.

## Open the standalone workbench

Use Node 24.11 or later in the 24.x line. From the repository root:

```sh
npm ci
npm run check
node dist/apps/server/src/index.js --http
```

Open **http://localhost:3001/**. Pick a saved exploration, inspect its findings, or review a pending draft. Refresh after a change in chat. A selected exploration has a bookmarkable page address. The same server still exposes `/mcp`; existing private tunnel configuration does not change. `/about` contains the landing page and connection guide.

To update an existing checkout, stop only the app server, run `git pull --ff-only`, rebuild with the commands above and restart. Keep `data/`: the default database is `data/shadow-walker.sqlite`. `SHADOW_WALKER_DB` overrides the database location, and `PORT` overrides 3001. The dashboard requires no database migration or import. See [standalone setup and trust boundaries](docs/standalone-dashboard.md).

**Local mode is single-user and unauthenticated.** The listener stays on 127.0.0.1. Browser-origin/CSRF protections are not account authentication. Do not expose it through arbitrary public forwarding or use the local Store on ephemeral function storage.

For a stdio MCP host, launch `node dist/apps/server/src/index.js` directly with the repository root as the working directory; do not use an npm wrapper that might write banners to protocol stdout. The standalone dashboard is served by HTTP mode. Server logs go to stderr.

## Guided discovery, not premature closure

`create_exploration → read_exploration → prepare_move → submit_move → human review → read_exploration`

A walk proposes one or two positions. The shared inspector offers **Meaning / Structure / Both** and **Land / Revise / Keep in reserve / Discard**. Findings retain concrete anchors, uncertainty, ancestry and a next question. Editing requires a separate saved revision before Land. Land means accepted into the exploration, not verified as true. The walk remains paused afterward.

Accepted positions are immutable. SQLite transactions include graph changes, an append-only event ledger, capability consumption and idempotency receipts. New move packets have bounded ancestry/reserve previews and explicit omission metadata; the full graph stays stored. Earlier draft revisions remain in the ledger; a dedicated historical revision browser, rich graph navigation, branching and weave remain future work.

## Verification and current status

The standalone implementation at `e3cb0b7` passed both Node 24 CI checks: full typecheck/build, **48 native tests, 14 integration tests and 7 browser tests**, plus the required dependency audit. The 48 native tests and a focused HTTP-security typecheck also passed locally. See [verification](docs/verification.md) and [standalone verification](docs/standalone-dashboard.md).

A basic private ChatGPT trial was exercised with the user: a draft, reported human Land, readback, reported server restart, and reopening the same saved finding. This is not full host/security certification. Real Claude behavior, hosted OAuth and two-account isolation have not been validated.

```sh
# Additional browser checks after building
npx playwright install chromium
npm run test:browser

# Dependency-free core/security tests
npm run test:core
```

Dependencies are locked; no new packages were added for the dashboard. Use `npm ci` and rerun the audit and full tests for upgrades.

## Public beta and Vercel

`vercel.json` deploys **only the static landing page in `apps/site`**. Import the repository root into Vercel with Framework Preset **Other** and preserve the checked-in settings. This does not expose the MCP, deploy the database, create accounts or provision an identity provider. No Vercel deployment was performed in this change.

The proposed shortest beta path is Vercel for the site plus a single durable Node/SQLite backend and managed identity. An all-on-Vercel backend requires a managed database/storage-adapter change. User ownership, web login, MCP OAuth, backup/restore, privacy controls and real host onboarding are release gates, not merely a login screen. See [public-release plan](docs/public-release.md) and [issue #5](https://github.com/bombadil-labs/shadow-walker/issues/5).

## Repository map

- `packages/domain`, `packages/storage`, `packages/protocol`: discovery model, transactional storage and MCP schemas.
- `apps/server`: MCP adapters, loopback HTTP and guarded local browser host API.
- `apps/widget`: shared React MCP Apps inspector; `apps/dashboard`: standalone AppBridge host.
- `apps/site`: static landing and self-hosted ChatGPT/Claude instructions; no user data or live signup.
- `skills/shadow-walker`, `docs`, `tests`: host guidance, architecture/roadmap and verification.

The pre-existing `test.md` remains untouched. Shadow Walker is distinct from Loam and groovy-commutator.
