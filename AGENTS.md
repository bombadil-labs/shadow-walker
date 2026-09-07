# Working on Shadow Walker

Read README.md, docs/architecture.md, docs/roadmap.md, and docs/verification.md before changing behavior. The project is a discovery workbench, not a generic autonomous agent platform. Do not import Loam/Kyber or cellular-automata architecture by analogy.

Preserve these invariants:

1. The host model proposes; the human reviews. Never put review tokens in model-visible content or add a model-accessible bypass for Land.
2. One guided move means one move. No automatic generation after Land, reserve, discard, or revision. No server-side model API dependency.
3. Acceptance and epistemic status are different. Generated findings remain hypotheses after Land. Model-generated observations and synthesis are not supported in M1.
4. Persist anchors, ancestry, uncertainty, unfinished questions, and original intentions. Draft revisions and discarded work remain addressable in history.
5. SQLite transactions must include materialized graph changes, append-only events, idempotency receipts, and capability consumption. Reject cycles, missing/cross-exploration parents, stale dependencies, and reused capabilities.
6. Never call an implementation, a generated specification, or a mocked host test proof of real ChatGPT integration. Record exactly which checks ran.

Keep changes scoped. Read the repository's current state before writing. Prefer a branch and pull request. Do not modify unrelated Bombadil Labs repositories or any work organization.

Run `npm run check` and `npm run test:browser` with installed dependencies. The offline fallback is `npm run test:core`; it does not validate the MCP/React adapters. Do not hide failed checks or substitute fake package/SDK declarations to claim a complete typecheck.
