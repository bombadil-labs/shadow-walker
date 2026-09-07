# Shadow Walker

A persistent, human-reviewed discovery workbench. **Follow what changes the next question.**

Shadow Walker brings Semantic Walk's one-step-at-a-time excavation together with Flight Lines' concrete anchors and structural comparisons. A useful discovery changes the direction of the next exploration; it is not merely decoration on a predetermined conclusion. The conversation's host model does the thinking. This server stores the exploration and mediates review: no separate model API key, background agent, or standalone prompt window.

## Intended use

Run the server, connect its MCP to a chat, explore an idea with the host model, and inspect the saved exploration in the rendered Shadow Walker app. Chat tools and the embedded app share one SQLite-backed record. The app is an exploration inspector, **not an automatic archive of every chat message or a separately hosted dashboard**. See the [user journey and current boundaries](docs/user-journey.md).

## First implementation: the M1 guided-walk foundation

The implemented path is:

`create_exploration → read_exploration → prepare_move → submit_move → human review → read_exploration`

A walk proposes one or two positions. The embedded MCP Apps widget offers **Land / Revise / Keep in reserve / Discard**, with **Meaning / Structure / Both** views, editable draft JSON, uncertainty, concrete anchors, ancestry, and saved drafts. Land records acceptance, not verification. There is no automatic next move. Earlier draft revisions remain in the event ledger; a dedicated revision-history browser is not yet implemented.

SQLite is authoritative. Accepted positions are immutable; materialized state, an append-only event ledger, capability consumption, and idempotency receipts are committed in one transaction. An interrupted prepared move and unreviewed drafts remain readable after restart.

**Status:** the combined M1/context implementation passed the Node 24 CI workflow: full typecheck, production build, 42 core tests, the integration suite (4 SDK-over-HTTP tests and 2 context-schema tests), and 4 sandboxed browser tests. The required dependency audit also passed. The 42 core tests were rerun successfully during self-review. A live ChatGPT session has **not** been validated. This is not a public deployment-ready or security-certified release. See [verification](docs/verification.md), [bounded-context verification](docs/bounded-context.md), [architecture](docs/architecture.md), and [roadmap](docs/roadmap.md).

## Bounded context

New guided-walk packets include bounded ancestry/reserve previews and explicit omission metadata. Selected findings and the full persisted graph are retained. Drafts have an aggregate UTF-8 byte limit, and oversized preparation or review fails atomically. See [bounded-context policy and verification](docs/bounded-context.md) for limits and compatibility.

## Run from the repository root

Use Node 24 LTS (24.11 or later in the 24.x line).

```sh
npm ci
npm run check
npm start
```

The default transport is stdio, intended for a trusted local MCP host. Build the widget before starting the server. Configure a stdio host to launch `node dist/apps/server/src/index.js` directly from the repository root, rather than an npm wrapper that might print to stdout. Server logs go to stderr. The database defaults to `data/shadow-walker.sqlite`; set `SHADOW_WALKER_DB` to change it. Preserve that database across restarts.

For a local MCP inspector using Streamable HTTP:

```sh
npm start -- --http
```

This binds **127.0.0.1 only**, at port 3001 (`PORT` overrides it). The endpoint is `/mcp`; `/healthz` reports local-only status. Host/Origin checks and a 1 MiB request limit are enabled. **Do not expose this unauthenticated listener through an arbitrary public tunnel.** Public deployment and user-scoped authorization are outstanding. For a private ChatGPT trial, current platform documentation also offers Secure MCP Tunnel; its credentials, access restrictions, and this application's UI behavior still need to be configured and verified. See [connection boundaries](docs/user-journey.md#first-private-chatgpt-trial-versus-public-hosting).

For browser checks after building:

```sh
npx playwright install chromium
npm run test:browser
```

The core can be tested without downloading packages:

```sh
npm run test:core
```

Dependency versions are explicit and `package-lock.json` preserves the registry-resolved graph validated by CI. Use `npm ci` for repeatable installs. Upgrade dependencies deliberately and rerun the audit and complete test suite.

## Repository map

- `packages/domain`: typed findings, frames, move packets, and graph validation; no SDK dependency.
- `packages/storage`: SQLite migrations, review transactions, capabilities, and event history.
- `packages/protocol`: Zod input/output contracts for MCP.
- `apps/server`: official MCP SDK adapters, stdio and local HTTP transport.
- `apps/widget`: React/Vite single-file MCP Apps review UI.
- `skills/shadow-walker`: host-model operating instructions.
- `tests`: core invariants, SDK transport integration, and browser host fixture.

The pre-existing `test.md` connection-test file is intentionally untouched. This project is distinct from Loam and groovy-commutator.
