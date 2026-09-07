# Verification record

## Standalone dashboard — September 7, 2026

Implementation head `e3cb0b794ea0c1922877b023075105a952f9e16e` passed both [push CI](https://github.com/bombadil-labs/shadow-walker/actions/runs/34156659534) and [PR CI](https://github.com/bombadil-labs/shadow-walker/actions/runs/34156679111). The required Node 24 workflow installs locked dependencies, audits, typechecks/builds and runs **48 native tests, 14 integration tests and 7 browser tests**. No checks are optional or continue-on-error. Subsequent self-review/final-head results are recorded in PR #4.

The dashboard tests exercise the production HTTP surface and the same SQLite/MCP implementation used by the embedded app. Coverage includes exact-origin/CSRF checks, CSP/no-cache headers, restricted operations, malformed/oversized bodies, browser Land readback through MCP, stale/replayed capabilities, server restart, picker/bookmark behavior, edit/Revise/Land, reload and the static landing page. The final review adds a regression check for stale notices after switching explorations and confines custom widget lifecycle messages to the standalone host.

The execution container independently ran **48 native tests successfully** on Node 22.16.0 and strictly typechecked the new dependency-free HTTP-security module/tests using TypeScript 5.8.3 and real installed Node declarations. GitHub/npm DNS was unavailable and the application packages were not cached, so full SDK/widget verification came from GitHub's Node 24 runners, not a local full build. The static landing was rendered and visually inspected locally at desktop/mobile sizes. No real user database was used in test fixtures.

## Basic live ChatGPT observation

The user configured their private tunnel and reported clicking Land in the rendered app. Tool readback showed a landed draft, two accepted positions, exploration revision 2, and no active move. After the user reported a server restart, reads and reopening returned the same IDs, content and timestamps. This supersedes the earlier statement that no live interaction had occurred. It is not an independent process audit or proof of all host/security behaviors.

A new-chat recovery test, the complete live revision/reserve/discard matrix, actual Claude integration, public OAuth, multi-user isolation and deployment remain outstanding. See [user journey](user-journey.md) and [public release](public-release.md). No Vercel deployment or identity provider was provisioned by PR #4.

## Historical M1 and bounded-context evidence

The original M1 implementation at `27f49db8e625683d7d88aee2d2a458a407e808d6` passed [push run 34151603979](https://github.com/bombadil-labs/shadow-walker/actions/runs/34151603979) and [PR run 34151608181](https://github.com/bombadil-labs/shadow-walker/actions/runs/34151608181) on Node 24.20.0/npm 11.19.0: full typecheck/build, 22 core tests, 4 MCP-over-HTTP tests, 4 browser tests, and an audit reporting zero vulnerabilities at that time. Initial harness type errors and vulnerable development dependency versions were corrected, not suppressed. The committed registry-resolved lockfile was preserved after the successful suite; ordinary CI is read-only and uses npm ci.

PR #3 added 20 native regression tests and 2 schema tests for bounded context, reaching 42 native / 6 integration / 4 browser tests. Both checks for head `96a1f7341d18e52ee646d5338dbffb6798aced5b` passed. Details are in [bounded-context verification](bounded-context.md).

PR #2's final head `1ed867fae77c25ff2db0be85b3f93cebb2320cae` passed push run 34152927132 and PR run 34152930207 before the owner-authorized merge into main.

## Reproduce

Use Node 24.11+ in the 24.x line, from the repository root:

```sh
npm ci
npm run check
npm audit --audit-level=high
npx playwright install --with-deps chromium
npm run test:browser
```

The dependency-free fallback is `npm run test:core`; it does not validate SDK, browser, or hosted integration. A green test run is not a guarantee against undisclosed vulnerabilities or future advisories.
