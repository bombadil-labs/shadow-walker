# Public beta: a small product, explicit trust boundaries

## Shipping order

The local standalone dashboard remains the self-hosted slice. A **private single-user hosted field test** is now also deployed: stateless Vercel MCP handlers use Neon/PostgreSQL persistence and serve the same MCP App resource/tool definitions as local mode. Publishing the landing page still does not create an account or grant access to the private MCP; the field-test capability URL is configured out-of-band and must be treated as a bearer secret.

The public-beta target remains: create an account; connect ChatGPT or Claude through OAuth; explore in chat; inspect and review the same private exploration in the browser; return from a later session. No separate model API key, billing platform, autonomous workers, collaboration permissions, or directory approval is required for that first product loop.

## Hosting decision

The field test selected the all-on-Vercel route: Vercel hosts the static site plus stateless MCP/health functions; Neon/PostgreSQL provides durable shared state through the asynchronous `PostgresStore` adapter. The deployed ChatGPT smoke test demonstrated list/create/read/open-widget against that stack.

Local mode continues to use the tested SQLite `Store`; hosted mode does **not** put SQLite in `/tmp` or depend on function filesystem persistence. The next hosting problem is therefore identity/operations rather than basic database durability: principal scoping, OAuth, backup/restore, privacy controls and multi-user concurrency/isolation evidence.

The current capability route is an intentionally temporary field-test access boundary. It is adequate for one trusted operator but must not become the public authentication mechanism.

Primary references, checked September 7, 2026:
- https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel

## Vercel field-test deployment

The root `vercel.json` builds the site and packages private MCP/health functions. `/healthz` probes Neon independently of the application graph; `/mcp/:secret` rewrites into the stateless MCP function and requires an exact configured capability. The connector secret and `DATABASE_URL` are Vercel environment configuration and must never be committed.

The public site contains explanatory copy and links, not user data or a signup flow. The hosted MCP exists for the current private field test, but there is no public connector URL: access requires the operator's secret capability URL. `http://localhost:3001/` remains the self-hosted dashboard on the visitor's own machine.

Reference: https://vercel.com/docs/project-configuration/vercel-json

## Accounts are not just a login screen

A managed login must result in a verified principal used by **every** server read/write. Use an immutable provider issuer/subject mapping, not user-supplied IDs or mutable email addresses. Browser sessions and MCP access tokens must resolve to the same internal account.

Before exposing an exploration publicly, implement ownership checks for exploration listing, positions, drafts, moves, ancestor selection, event history, review capabilities, and idempotency receipts. Include the principal in capability and receipt scope. Reject cross-owner IDs before loading or mutating private content, and do not reveal another user's record through an error. Browser sessions need Secure/HttpOnly cookies, logout/expiry handling and CSRF protection; the current local per-process CSRF token is **not** a login session.

Do not auto-assign the existing anonymous local database to the first signup. Keep hosted data separate; an explicitly authorized migration/export-import must be the only route for local private findings to move into a hosted account.

## MCP OAuth is a second integration, not another user database

Provide an OAuth 2.1-compatible authorization flow with PKCE, protected-resource metadata and authorization-server discovery. Verify access-token issuer, signature, audience/resource, expiry and scopes. Return a 401 challenge for unauthenticated protected access; do not silently fall back to anonymous mode. Use the identity provider's maintained implementation rather than writing token issuance or password storage from scratch.

Scope draft generation separately from human review. A model-visible access token must not become a bypass for Land. Retain the human review surface, exact-revision one-time capability and transaction semantics. Test actual metadata/tool-visibility behavior in each host; UI-only labels are not an authentication boundary against arbitrary MCP clients.

References:
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- https://developers.openai.com/plugins/build/auth

## Release gates

| Gate | Acceptance evidence required |
| --- | --- |
| Identity and isolation | Two real accounts; A cannot list/read/edit/land B's data using known IDs, parents, capabilities or receipt keys. |
| Login and MCP delegation | Browser and each host resolve to the same principal; PKCE/discovery, expired/revoked/wrong-audience tokens and logout tested. |
| Human review | Web and embedded review agree; stale windows cannot land obsolete drafts; retries do not duplicate findings; no automatic next move. |
| Durability | Database migration and rollback policy; backups and an actual restore drill; restart/deployment retains data. |
| Privacy and operations | Explicit data flow/retention policy; export/deletion behavior; no token/idea payloads in logs by default; quotas and request limits; incident contact. Append-only history is not an excuse to omit account deletion. |
| Host compatibility | Test a real ChatGPT and a real Claude account. Connecting tools alone is not proof that either host renders the UI identically. The browser review surface is the fallback, not automatic acceptance by the model. |
| Onboarding | Test the published instructions on a clean account; distinguish remote web connectors from local Desktop/CLI mechanisms and workspace restrictions. |

The basic private ChatGPT path has now been exercised both locally and through the Vercel/Neon field-test endpoint. The hosted smoke test included list, create, read and open-widget against persisted Neon state. Those observations are narrower than a full security certification. Claude, fresh-account OAuth and public multi-user behavior remain untested.

Manual custom-connector setup is enough for an initial beta. Directory/marketplace submission, legal review of public policy text and any formal listing requirements are separate work; do not claim an official partnership or approval.

Onboarding references:
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp