# Neon-backed hosted field test

Shadow Walker keeps SQLite as the local/default store and adds `PostgresStore` for a hosted Vercel + Neon deployment. The hosted store mirrors the existing behavioral surface while using Postgres transactions for graph changes, append-only events, idempotency receipts, and review-capability consumption.

## Storage contract

- `PostgresStore.connect(pool)` initializes schema migrations against a Postgres-compatible pool and returns an async store. The Vercel slice supplies a Neon pool from `DATABASE_URL`.
- Hosted writes use `SERIALIZABLE` transactions.
- Same-request idempotency keys are serialized with a transaction-scoped Postgres advisory lock before checking/inserting the receipt.
- Arrival and weave review capabilities are selected `FOR UPDATE` and consumed inside the same transaction as the reviewed decision.
- Accepted Arrivals, transitions, traversals, observations, constraints, operations, applications, encounters, and gesture history retain database-level immutability guards equivalent to the SQLite triggers.
- Waypoints remain historically undeletable while allowing their explicit sensed → visited/dissipated lifecycle.
- JSONB stores the canonical domain body while relational columns preserve references, unique constraints, and query/index structure.

## Neon connection

For Vercel, use Neon's pooled connection string as `DATABASE_URL`. The deployment adapter will use `@neondatabase/serverless`'s `Pool` API because Shadow Walker needs interactive transactions rather than independent one-shot queries.

The first hosted field test is intentionally single-user. The remote MCP capability path planned in the next deployment slice is a temporary high-entropy access secret, **not production authentication**. OAuth, principals, per-user ownership, export/deletion controls, and two-account isolation remain part of the public-beta milestone.

## Verification boundary

The repository's normal CI can typecheck/import the hosted store and verify the Postgres schema contract without possessing external database credentials. A real Neon transaction smoke test is required after a database is attached; do not describe this implementation as runtime-verified against Neon until that test has actually run.
