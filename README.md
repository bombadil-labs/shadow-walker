# Shadow Walker

A persistent, human-reviewed discovery workbench. **Follow what changes the next question.**

Shadow Walker brings Semantic Walk's one-step-at-a-time excavation together with Flight Lines' concrete anchors and structural comparisons. A useful discovery changes the direction of the next exploration; it is not merely decoration on a predetermined conclusion. The conversation's host model does the thinking. This server stores the exploration and mediates review: no separate model API key, background agent, or standalone prompt window.

## First implementation: the M1 guided-walk foundation

The implemented path is:

`create_exploration → read_exploration → prepare_move → submit_move → human review → read_exploration`

A walk proposes one or two positions. The embedded MCP Apps widget offers **Land / Revise / Keep in reserve / Discard**, with **Meaning / Structure / Both** views, editable draft JSON, uncertainty, concrete anchors, ancestry, and draft history. Land records acceptance, not verification. There is no automatic next move.

SQLite is authoritative. Accepted positions are immutable; materialized state, an append-only event ledger, capability consumption, and idempotency receipts are committed in one transaction. An interrupted prepared move and unreviewed drafts remain readable after restart.

**Status:** the full typecheck, production build, 22 core tests, 4 SDK-over-HTTP tests, and 4 sandboxed browser tests passed in GitHub Actions on Node 24. The validated dependency audit reported zero vulnerabilities. A live ChatGPT session has **not** been validated. This is not a remotely deployable or security-certified release. See [verification](docs/verification.md), [architecture](docs/architecture.md), and [roadmap](docs/roadmap.md).

## Run from the repository root

Use Node 24 LTS (24.11 or later in the 24.x line).

```sh
npm ci
npm run check
npm start
```

The default transport is stdio, intended for a trusted local MCP host. Logs go to stderr. Build the widget before starting the server. The database defaults to `data/shadow-walker.sqlite`; set `SHADOW_WALKER_DB` to change it. Run from the repository root so the bundled UI can be found.

For a local MCP inspector using Streamable HTTP:

```sh
npm start -- --http
```

This binds **127.0.0.1 only**, at port 3001 (`PORT` overrides it). The endpoint is `/mcp`; `/healthz` reports local-only status. Host/Origin checks and a 1 MiB request limit are enabled. **Do not publish it or tunnel it to ChatGPT without authenticated remote transport.** OAuth, authenticated principal scoping, and deployment are deliberately outstanding.

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
