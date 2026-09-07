# Verification record

## GitHub Actions: verified on September 7, 2026

Implementation commit `27f49db8e625683d7d88aee2d2a458a407e808d6` passed both push and pull-request CI runs. Evidence: [push run 34151603979](https://github.com/bombadil-labs/shadow-walker/actions/runs/34151603979) and [pull-request run 34151608181](https://github.com/bombadil-labs/shadow-walker/actions/runs/34151608181).

Runner: Ubuntu 24.04, Node **24.20.0**, npm **11.19.0**.

- Full strict TypeScript check: passed.
- Server compilation and Vite single-file widget build: passed.
- Native core suite: **22 passed**, no failures or skipped tests.
- Real MCP SDK Client over Streamable HTTP: **4 passed**.
- Playwright/Chromium with a sandboxed MCP Apps host and actual SQLite-backed server: **4 passed**.
- `npm audit --audit-level=high`: passed; the resolved graph reported **zero vulnerabilities** at the time of the run. This is not a guarantee against undisclosed vulnerabilities or future advisories.

The browser checks exercise Land, disabled acceptance when metadata is missing, edit/Revise/separate Land, and reserve without advancing the accepted graph. The transport suite tests resource/schema discovery, private metadata delivery, a reviewed round trip followed by server restart, fabricated-token rejection, and HTTP request guards. Node's Fetch implementation normalized a hostile Host header in an initial test; the corrected test uses node:http to send the actual header rather than weakening the expected rejection.

Initial CI exposed four test-harness type errors and outdated development dependencies. These were fixed, not bypassed: Vite was upgraded to 7.3.6 and Vitest to 4.1.11, and the audit is a required CI step. Earlier failed runs remain visible in the PR history.

## Local checks

The execution container could not resolve registry.npmjs.org, so it did not install the application dependencies. It independently passed all **22 core tests** on Node 22.16.0, using experimental native SQLite/type stripping, plus a strict core-only TypeScript check with the available compiler. Full-stack success above comes from the actual GitHub runner, not an assertion that the local environment ran those checks.

The core restart test launches a separate Node process against the same on-disk database. Another test reopens unreviewed drafts. Core checks also cover acceptance versus hypothesis status, one active move, retained revisions/reserves/discards, idempotency and changed-payload conflicts, forged/expired/replayed/cross-draft capabilities, atomic stale-dependency rejection, missing parents/cycles/cross-exploration references, topological landing, budgets and output kinds, concrete-anchor references, and immutable ledger/positions.

## Reproduce

Use Node 24 LTS:

```sh
npm ci
npm run check
npm audit --audit-level=high
npx playwright install --with-deps chromium
npm run test:browser
```

The committed lockfile was generated from the npm registry on the runner and preserved only after the complete suite passed. Its one-time bootstrap was scoped to the implementation branch, refused a changed branch head, and committed only package-lock.json. The bootstrap write job is removed from the final workflow; ordinary CI has read-only repository permissions and uses npm ci.

## Not established: live ChatGPT and remote deployment

Neither the SDK driver nor the sandboxed test host substitutes for ChatGPT's own iframe sandbox, tool visibility, private metadata delivery, or confirmation flow. No live ChatGPT session, OAuth deployment, authenticated principal isolation, or security certification is claimed. Stdio and loopback HTTP are for a trusted local host only; do not publish or tunnel the unauthenticated server.

Live-host acceptance: create an intention, read it, prepare one walk, and submit a draft. Verify that no generated position appears in the accepted graph before Land. Edit and revise; verify that an old ticket cannot land the previous revision. Land with a human click; verify that the UI and model read the same result and that the model cannot see the token. Verify that no next move is prepared. Restart the server, reopen the exploration, and verify the accepted position, anchors, ancestry, uncertainty, and live question. Repeat with reserve/discard and an interrupted prepared move. Test missing metadata and incompatible host behavior: acceptance must remain disabled.
