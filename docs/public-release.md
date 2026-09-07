# Public beta: a small product, explicit trust boundaries

## Shipping order

The local standalone dashboard is the first slice. The chat and browser use one MCP implementation and one durable Store, so user-visible review behavior does not fork into a separate REST implementation. The public landing page is independently deployable; accounts and a publicly reachable MCP are deliberately not enabled by publishing that page.

The beta target is: create an account; connect ChatGPT or Claude through OAuth; explore in chat; inspect and review the same private exploration in the browser; return from a later session. No separate model API key, billing platform, autonomous workers, collaboration permissions, or directory approval is required for that first product loop.

## Hosting decision

**Recommended shortest path:** Vercel for the static landing/instructions site, plus one persistent Node service on a durable volume for the app and MCP. Keep the tested SQLite transaction core for the first beta. Serve the authenticated app and its browser API from the same origin on that service. A managed identity provider supplies web login and MCP-compatible OAuth; provider selection and provisioning remain open.

**All-on-Vercel alternative:** deploy stateless app/MCP handlers backed by a managed database (for example PostgreSQL), not a local SQLite file. That requires an asynchronous storage adapter and concurrency/migration tests that preserve atomic review, capabilities, ownership and idempotency. Do not describe this as a config-only deployment of the current Store.

Why: Vercel supports MCP handlers, but its function instances do not share a durable local filesystem. Fluid Compute does not make a local SQLite file persistent shared state. The current server's `listen()` entrypoint also is not a Vercel function handler. Do not move the SQLite file into `/tmp` or enable anonymous public ingress as a workaround.

Primary references, checked September 7, 2026:
- https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel

## Deploy only the landing page on Vercel

The root `vercel.json` intentionally selects `apps/site` as static output with no install or build command and no API proxy/rewrite. Import this repository into a Vercel project, use the repository root and Framework Preset **Other**, and preserve the checked-in configuration. Review the preview before promoting it. The same page is served locally at `/about`.

This deploy contains explanatory copy and links, not SQLite, accounts, an MCP endpoint, an authentication flow or user data. There is no hosted signup button or fake production connector URL. `http://localhost:3001/` is explicitly the self-hosted dashboard on the visitor's own machine. A Vercel project, account, domain, or deployment has not been provisioned by this change.

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

The basic private ChatGPT path has now been exercised in the user's setup: draft submission, reported human Land, tool readback, reported server restart, and readback/reopen of the same IDs and content. That observation is narrower than a full security certification. Claude, fresh-account OAuth and public multi-user behavior remain untested.

Manual custom-connector setup is enough for an initial beta. Directory/marketplace submission, legal review of public policy text and any formal listing requirements are separate work; do not claim an official partnership or approval.

Onboarding references:
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
