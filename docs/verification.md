# Verification record

## Performed locally on September 7, 2026

- `npm run test:core`: **22 passing tests**, no failures or skipped tests, using Node 22.16.0 available in the execution environment (experimental native SQLite/type stripping).
- Strict typecheck of the domain, storage, fixtures, and core tests using the available TypeScript 5.8.3 compiler and Node type declarations: passed.
- The restart test launches a separate Node process and reads the landed graph from the same on-disk database. A separate test reopens unreviewed drafts.

These checks cover acceptance versus hypothesis status, one active move, retained revisions/reserves/discards, idempotency and changed-payload conflicts, forged/expired/replayed/cross-draft capabilities, atomic stale-dependency rejection, missing parents/cycles/cross-exploration references, topological landing, budget and kind validation, concrete-anchor references, and immutable ledger/positions.

## Not yet established locally

The environment could not resolve `registry.npmjs.org`, so installing application dependencies was blocked. The declared target is Node 24 LTS, not the locally available Node 22 runtime. No claim is made here that the full application typecheck, Vite build, SDK transport tests, Playwright checks, dependency audit, or live ChatGPT test has passed. CI results, when available, are separate evidence and must be recorded explicitly.

Commands for a network-enabled environment:

```sh
npm install
npm run check
npx playwright install --with-deps chromium
npm run test:browser
```

Commit the generated lockfile only after successful resolution. The transport suite uses the real SDK Client over HTTP; the browser fixture exercises review via the actual widget and a test host. Neither substitutes for testing ChatGPT's own iframe sandbox, visibility filtering, confirmation flow, and private metadata delivery.

## Live-host acceptance checklist

Create an intention, read it, prepare one walk, and submit a draft. Verify that no generated position appears in the accepted graph before Land. Edit and revise; verify that an old ticket cannot land the previous revision. Land with a human click; verify that the UI and model read the same result and that the model cannot see the token. Verify that no next move is prepared. Restart the server, reopen the exploration, and verify the accepted position, anchors, ancestry, uncertainty, and live question. Repeat with reserve/discard and an interrupted prepared move. Test missing metadata and incompatible host behavior: acceptance must remain disabled.
