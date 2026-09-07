# Standalone local dashboard

## Open it

From the same repository checkout and database used by the MCP:

```sh
git pull --ff-only
npm ci
npm run check
node dist/apps/server/src/index.js --http
```

Visit `http://localhost:3001/`. `PORT` changes both the dashboard and `/mcp` port. `SHADOW_WALKER_DB` selects the same database as before; do not remove `data/` when updating. In WSL, run the server inside WSL and open localhost from Windows. The existing private tunnel's `/mcp` target does not change.

Pick a saved exploration, inspect its recorded path, or review a pending draft. Refresh after changes made in chat. The address remembers the selected exploration ID and can be bookmarked; it contains no review token. The picker lists the 100 newest-created explorations (the existing Store limit), and an older known ID can still be opened using `/?exploration=ID`.

The inspector is the **same bundled MCP Apps widget**, hosted in a sandboxed local iframe. Meaning/Structure/Both, anchors, uncertainty, ancestry IDs, draft inspection, Revise/Land/reserve/discard behave through the same MCP implementation as in the chat. It does not create explorations or propose the next move; reasoning stays in chat. Unsaved edits and in-flight review disable picker/refresh controls to avoid overwriting an edit. A manual refresh reads the latest saved state; this version does not live-poll.

`/about` serves the standalone landing and connection guide. It is static and contains no actual saved exploration data.

## Architecture and local security

`apps/dashboard` is a small MCP Apps host using the official AppBridge. It forwards only four named operations (`list_explorations`, `read_exploration`, `open_exploration`, `review_draft`) through an in-process SDK Client into the existing `createMcpServer` with the same Store. It cannot forward arbitrary methods/URLs or create/prepare/submit a move. There is no second independent implementation of review or graph mutation.

The HTTP listener remains loopback-only with its Host/Origin checks. The browser surface additionally requires an exact-origin POST and a per-process CSRF value in a custom header; bootstrapping that value requires a same-origin custom-header request. No cross-origin CORS access is granted. The CSRF value is browser memory only, rotates with server restart, and is not an authenticated account. The dashboard can re-bootstrap it after restart without changing a review's idempotency key.

Responses are no-store with no-referrer and nosniff headers. Dashboard framing is denied. The widget iframe uses `sandbox="allow-scripts"` without same-origin privileges. CSP permits the hashes of the actual bundled inline scripts, not arbitrary inline JavaScript/eval; the widget's network access is disabled. User-provided titles are inserted as text. The only custom iframe status message carries two booleans (dirty/busy), and the parent checks its source window. Data and review tokens are not sent in those messages.

Review capabilities still require the exact draft revision, expiry, one-use semantics and transaction checks. Stale browser/embedded panels must refresh; having two panels open never authorizes duplicate acceptance. An arbitrary process on the trusted local machine can impersonate a local client: these controls are not multi-user authentication. Do not publicly tunnel or deploy this server as-is.

## Verification

Native unit tests cover exact-origin/CSRF checks, rotated bootstrap values, malformed JSON, strict media types, declared/chunked UTF-8 body limits, and script-hash CSP generation. The existing 42 domain/storage tests remain included.

New SDK/HTTP integration tests cover the production routes and private headers, same-store MCP/browser review readback, replay/stale capability rejection, restart persistence, restricted operations and invalid input. Browser tests use the production HTTP dashboard (a separate seeded fixture database), not the earlier toy browser host: pick, edit, revise, land, reload, bookmark and read the static landing page.

The execution container passed all **48 native tests** on Node 22.16.0. It has no cached application dependency graph and cannot resolve the GitHub/npm hosts; full-stack build and browser evidence must come from actual Node 24 CI, recorded in the PR after execution. Do not treat written tests as tests that ran.

## CI result

Implementation head `e3cb0b794ea0c1922877b023075105a952f9e16e` passed both [push CI](https://github.com/bombadil-labs/shadow-walker/actions/runs/34156659534) and [PR CI](https://github.com/bombadil-labs/shadow-walker/actions/runs/34156679111) on September 7, 2026. The required workflow uses Node 24 and npm ci, audits dependencies, typechecks/builds, runs 48 native tests and 14 integration tests, then runs 7 browser tests (including the 3 production-dashboard tests). No step is continue-on-error. The static landing was also rendered and visually inspected locally at desktop and mobile sizes. No live user database was touched by those fixtures, and no Vercel deployment was performed.
