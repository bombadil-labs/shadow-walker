# Product contract: chat and persistent exploration

Confirmed with the repository owner on September 7, 2026:

> Stand up the Shadow Walker server, connect its MCP to a chat, explore an idea in that chat, and inspect the resulting exploration in the rendered Shadow Walker app.

That is the intended product. The MCP tools and rendered app are two interfaces to the same persistent exploration, not two independent copies of a conversation.

## Intended experience

1. Run one Shadow Walker server with a persistent SQLite database. Connect its MCP using a host-supported, appropriately access-controlled transport.
2. Enable that connection in a chat and ask to explore an idea. The conversation's host model does the reasoning; Shadow Walker does not call another model API.
3. The model creates or reopens an exploration, prepares one bounded move, and submits a draft. Relevant ideas and context must be explicitly recorded through these tools.
4. The host renders the Shadow Walker component. Inspect the draft, edit it through Revise, then choose Land, Keep in reserve, or Discard. Land adds generated findings to the accepted graph; it does not verify them as true.
5. Inspect the accumulated exploration during or after the discussion. Return to chat to choose a next move. No review action automatically launches another move.
6. Reopen the same exploration later using `list_explorations` and `open_exploration`. A new chat connected to the same trusted server/database can reuse the saved exploration ID; it does not need the old chat transcript to read the saved findings.

## What the app contains

The durable record consists of the intention, frame, accepted positions, concrete anchors, structural readings, uncertainty, next questions, derivation parents, move packets, drafts, and recorded review events. The current UI displays the recorded positions in order, Meaning / Structure / Both views, ancestry IDs, and the latest saved state of each draft, including reserves and discarded drafts. Earlier draft revisions are retained in the event ledger but do not yet have a dedicated revision browser in the UI.

This is **not automatic capture of the complete ChatGPT conversation**. The server receives tool arguments and app actions, not every chat message. Chat text that is never included in a tool call is not independently stored by Shadow Walker. There is no general chat-history import or transcript-replay feature. An exploration is the structured, deliberately recorded result of a conversation, and it can outlive that conversation.

The target integration is an **embedded MCP Apps component inside the chat host**. The production server does not currently expose a standalone dashboard URL; opening the HTML without the host bridge is not the supported experience. The browser host under `tests/` is a test fixture, not a deployed application shell.

## Implemented versus outstanding

| Part of the experience | Current state |
| --- | --- |
| MCP tools and bundled UI resource | Implemented |
| Shared durable SQLite state and restart recovery | Implemented and tested |
| One-step reasoning in the chat host | Tool instructions and bounded packets implemented; real ChatGPT behavior not yet tested |
| Human review of drafts | Implemented; tested through the SDK and sandboxed browser host |
| Inspect recorded findings, uncertainty, anchors, ancestry IDs and reserves | Implemented as an ordered inspector |
| Rich graph navigation, clickable path selection, branches and weave | Future work; not implied by the current inspector |
| Browse all historical draft revisions in the UI | Ledger retains them; dedicated UI still outstanding |
| Connect this exact application to real ChatGPT | Not yet configured or validated |
| Public HTTPS deployment, OAuth and multi-user authorization | Not implemented |
| Automatic transcript capture or a separate standalone chat product | Not the current product contract |

The repository's `skills/shadow-walker/SKILL.md` is the detailed host workflow. Merely connecting this MCP does not automatically install that file as a ChatGPT skill. The server already supplies initialization instructions and tool/move guidance; packaging the full skill for host discovery is a separate integration task.

## First private ChatGPT trial versus public hosting

The current HTTP listener binds to `127.0.0.1`, has Host/Origin checks, and has no application authentication. Do not expose it using an arbitrary public forwarding URL. A public or shared service needs authenticated transport, authorization for the intended user, protected database storage, and review capabilities scoped to that identity. App-only tool visibility and hidden metadata are not substitutes for authentication.

OpenAI's current connection documentation supports either a public HTTPS MCP endpoint or **Secure MCP Tunnel** for private developer-mode testing. Secure MCP Tunnel can reach a local stdio or HTTP server without opening public ingress. It requires its own runtime credential, appropriate Platform tunnel permissions, and the correct ChatGPT workspace association. That credential is infrastructure authentication, not an API key used by Shadow Walker to generate model responses. This route is a candidate for the first single-user trial, not a tunnel already provisioned or tested by this repository. A tunnel also does not add per-user isolation to the current shared database.

For a local stdio host, build from the repository root and configure the host to launch `node dist/apps/server/src/index.js` with that working directory. Use the direct Node command, not an npm wrapper that might print script banners to stdout. Preserve the database path across restarts. Native tunnel setup must likewise preserve the server's working directory/environment. Do not broaden the current loopback Host/Origin allowlist just to make an unverified proxy work.

## First live-host acceptance

Use a harmless test idea. Connect the server; create an exploration; submit one draft; confirm the UI renders and receives its private review metadata. Confirm the model does not receive the review token. Revise and Land from the UI, then have the model read the same persisted result without preparing a next move. Inspect the result after reopening the component, restarting the server, and starting a fresh chat against the same database. Confirm that reserve/discard do not add accepted positions, old authorizations cannot accept revised content, and missing metadata leaves acceptance disabled.

Passing that scenario establishes the first chat-to-app vertical slice. It does not establish public multi-user readiness or complete the later graph/weave workflow.

## Primary platform references

Checked September 7, 2026. Platform support does not prove this application's integration.

- [Connect and test an MCP-backed plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Add UI to an MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
- [MCP server instructions and skill import](https://developers.openai.com/plugins/build/mcp-server)
