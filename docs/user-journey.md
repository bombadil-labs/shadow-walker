# Product contract: chat and persistent exploration

The owner-confirmed workflow is: run Shadow Walker, connect its MCP to a chat, explore an idea, and inspect or steer the resulting exploration in the rendered app. The embedded app and standalone dashboard are now two hosts for the same inspector and persistent data—not independent copies of a conversation.

## Intended experience

1. Run the server with a durable database. Connect MCP using a host-supported, access-controlled transport.
2. Ask the chat model to create or reopen an exploration and take one step. The model does the reasoning; Shadow Walker does not call another model API.
3. Review the draft in the chat's embedded component or in the standalone browser at `http://localhost:3001/`. Revise, Land, keep in reserve or discard. Land accepts a hypothesis into this exploration; it does not verify it.
4. Inspect the recorded findings, concrete anchors, structural readings, uncertainty, derivation parents and next questions. Return to chat to choose a next move; a review never automatically launches one.
5. Reopen later from the dashboard picker or from a chat using `list_explorations`/`open_exploration`. A bookmarked dashboard address stores only the exploration ID. A fresh chat connected to the same server can read the saved findings without importing the previous transcript.

## What is and is not stored

The durable record contains the intention, frame, accepted positions, concrete anchors, structural views, uncertainty, next questions, ancestry, move packets, drafts and recorded review events. The current inspector shows positions in order and each draft's latest state, including reserves/discards. Earlier revisions remain in the event ledger; their dedicated browser is future work.

This is **not automatic capture of the entire conversation**. The server receives tool arguments and app actions. Ordinary chat text never sent through the tools is not stored independently. There is no transcript-import/replay feature and no second standalone chat product.

## Current surfaces

The MCP host can render the bundled widget. The production HTTP server also serves a real standalone AppBridge host at `/`, the same widget at `/app/widget`, and a static connection guide at `/about`. The standalone picker lists the latest 100 explorations; known older IDs can still be opened directly. Manual refresh reads changes made in another panel. Unsaved edits/in-flight review disable picker and refresh to protect the edit.

The dashboard has no reasoning window and cannot create/prepare/submit moves. Its restricted server route invokes the same MCP implementation for list/read/open/review, so there is no parallel review/acceptance code path. See [standalone dashboard](standalone-dashboard.md).

## Live validation versus platform support

On September 7, 2026, the user connected the server to ChatGPT using their private tunnel. The assistant submitted one draft; the user reported clicking Land; tool readback showed the landed draft, two accepted positions, revision 2, and no active move. After the user reported restarting the server, reads and reopening returned the same IDs, content and timestamps. This establishes the observed basic loop, not an independent process audit or full security certification.

The standalone dashboard has production-route integration/browser coverage. Real Claude behavior, a completely new ChatGPT conversation, the complete live-host revision/reserve/discard matrix, public OAuth and multi-user isolation remain separate acceptance work. Rich graph navigation and weave remain product milestones.

The detailed host workflow is in `skills/shadow-walker/SKILL.md`. Connecting MCP alone does not automatically install that file as a host skill; initialization/tool instructions already provide the bounded workflow, and full packaging is separate.

## Private local use versus hosted accounts

The local listener binds only to 127.0.0.1 and is not an authenticated account service. Its Host/Origin/CSRF controls do not replace user authentication. The private tunnel has its own credentials/workspace restrictions; it does not add per-user ownership to the shared database. Do not turn local mode into a public anonymous service.

The public-beta plan adds verified identity, ownership checks throughout storage, browser sessions and MCP OAuth. Publishing the static Vercel site does not perform that migration or expose private local data. See [public release](public-release.md).

Platform references, checked September 7, 2026:
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/build/auth
- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
