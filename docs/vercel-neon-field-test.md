# Vercel + Neon hosted field test

This deployment mode exists to remove local infrastructure from the first Shadow Walker field test. It is intentionally single-user and capability-URL protected. It is **not** the public-beta authentication model.

## Runtime shape

```text
ChatGPT / MCP client
        |
        | Streamable HTTP
        v
https://<deployment>/mcp/<high-entropy-secret>
        |
        v
Vercel Node Function
        |
        v
Neon Postgres
```

The static landing site remains in the same Vercel project. The MCP function reuses the existing Shadow Walker MCP registration and bundled MCP App widget. `PostgresStore` is the authoritative hosted store; SQLite remains the local/default development store.

## Required Vercel environment

- `DATABASE_URL`: a Neon Postgres connection string. The Vercel Neon integration can provision this automatically; a manually copied Neon connection string is also valid.
- `SHADOW_WALKER_MCP_SECRET`: a long random URL-safe secret. Use at least 32 random bytes. Treat it like a password and rotate it after the field test.

The capability appears in the MCP URL and may therefore be visible to infrastructure access logs. This is acceptable only for the temporary single-user field test; it is not a substitute for OAuth or per-user ownership.

## Deployment behavior

- `npm run build` produces the single-file MCP App at `dist/widget/index.html` before Vercel bundles the function.
- `/mcp/:secret` rewrites to the stateless `/api/mcp` function. Incorrect or missing secrets return `404`.
- `/healthz` dynamically loads the hosted runtime so module-initialization failures become an explicit JSON health response rather than an opaque platform crash when possible.
- Each Vercel invocation creates and closes its own Neon Pool/PostgresStore. The Neon serverless driver carries Pool/Client traffic over WebSockets and requires those connections to remain scoped to one serverless invocation.
- `/healthz` initializes the Postgres store/migrations and performs a lightweight read; success returns `status: ok`. Failure reports only the stage, runtime version, environment-presence booleans, and an error name/code so secrets and connection strings are not exposed.
- Every MCP request creates a fresh stateless MCP transport/server and closes both the MCP server and Neon store before the invocation ends.
- Postgres migrations are serialized with an advisory lock, so concurrent cold starts do not race schema initialization.

## Verification boundary

CI verifies the hosted function compiles, the capability-route contract, widget bundling configuration, and all existing local behavioral suites. A deployment is not considered hosted-runtime verified until `/healthz` succeeds against an attached Neon database and an MCP client completes a create -> prepare -> submit -> human review -> readback smoke test against the Vercel URL.

If Vercel returns `FUNCTION_INVOCATION_FAILED` with no application logs, deploy the current `main` and retry `/healthz`. Hosted dependencies are loaded inside the handler so module-load failures can be reported from the function instead of escaping before the handler runs.

## After the field test

Replace the capability URL with OAuth 2.1 resource-server authentication and immutable per-user ownership before exposing Shadow Walker as a public multi-user service. Rotate/remove the temporary capability secret when that happens.
