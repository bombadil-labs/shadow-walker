import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { DomainError, requireThat } from '../../../packages/domain/src/index.ts';
import type { Snapshot } from '../../../packages/domain/src/index.ts';
import { Store } from '../../../packages/storage/src/index.ts';
import { inputs, outputs, UI_URI, TICKET_META } from '../../../packages/protocol/src/index.ts';

export function createMcpServer(store: Store, widgetHtml: string): McpServer {
  const server = new McpServer({name:'shadow-walker',version:'0.1.0'}, {instructions:
    'Shadow Walker is a guided discovery workbench. The host model proposes exactly one move; a human reviews it in the widget. Never call review_draft on behalf of the model, infer acceptance, automatically continue after Land, or describe acceptance as verification. No server-side model runs.'});
  const annotations = (readOnly: boolean) => ({readOnlyHint:readOnly,destructiveHint:false,openWorldHint:false});
  const ui = {ui:{resourceUri:UI_URI},'openai/outputTemplate':UI_URI,'openai/widgetAccessible':true};
  const safe = <T,>(fn: (args:T) => CallToolResult) => async (args:T): Promise<CallToolResult> => {
    try { return fn(args); }
    catch (error) {
      const known=error instanceof DomainError;
      if (!known) console.error('Shadow Walker tool failed:',error instanceof Error ? error.name : 'unknown');
      return {isError:true,content:[{type:'text',text:JSON.stringify({code:known?error.code:'INTERNAL_ERROR',
        message:known?error.message:'The operation failed. Reopen the exploration before continuing.'})}]};
    }
  };
  const result = (snapshot:Snapshot, draftId?:string):CallToolResult => {
    const d=draftId ? snapshot.drafts.find(d=>d.id===draftId) : undefined;
    requireThat(!draftId || d, 'NOT_FOUND', 'Draft is not in this exploration.');
    return {structuredContent:{snapshot,...(draftId?{focusedDraftId:draftId}:{})},
      content:[{type:'text',text:`${snapshot.exploration.title}: ${snapshot.positions.length} accepted positions. ${d?`Draft ${d.status}, revision ${d.version}. `:''}Acceptance is not verification. Wait for human direction before any next move.`}],
      ...(d && (d.status==='pending'||d.status==='reserved') ? {_meta:{[TICKET_META]:store.ticket(d.id)}} : {})};
  };
  registerAppTool(server,'create_exploration',{
    description:'Record an explicitly requested user intention and initial frame. This creates the root, not a generated finding.',
    inputSchema:inputs.create,outputSchema:outputs.snapshot,annotations:annotations(false),_meta:ui
  },safe<Parameters<Store['create']>[0]>(args=>result(store.create(args))));
  server.registerTool('list_explorations',{
    description:'List up to 100 most recently created explorations.',inputSchema:{},outputSchema:outputs.list,annotations:annotations(true)
  },safe(()=>({structuredContent:{explorations:store.list()},content:[{type:'text',text:'Saved explorations.'}]})));
  server.registerTool('read_exploration',{
    description:'Read accepted positions and draft history. Returns no review capability.',
    inputSchema:inputs.read,outputSchema:outputs.snapshot,annotations:annotations(true)
  },safe<{explorationId:string}>(args=>result(store.read(args.explorationId))));
  registerAppTool(server,'open_exploration',{
    description:'Open the inspector and human review UI. Review credentials are delivered only in widget metadata.',
    inputSchema:inputs.open,outputSchema:outputs.snapshot,annotations:annotations(false),_meta:ui
  },safe<{explorationId:string;draftId?:string}>(args=>{
    const snapshot=store.read(args.explorationId);
    return result(snapshot,args.draftId ?? snapshot.drafts.find(d=>d.status==='pending')?.id);
  }));
  server.registerTool('prepare_move',{
    description:'Prepare exactly one guided walk. The packet contains context and a one-move budget. Do not prepare again until human direction resumes the walk.',
    inputSchema:inputs.prepare,outputSchema:outputs.packet,annotations:annotations(false)
  },safe<Parameters<Store['prepare']>[0]>(args=>({structuredContent:{packet:store.prepare(args)},content:[{type:'text',text:'Perform one walk, submit one draft, then stop for human review.'}]})));
  registerAppTool(server,'submit_move',{
    description:'Save one or two proposed positions as an unaccepted draft. This does not land findings or start a follow-up.',
    inputSchema:inputs.submit,outputSchema:outputs.snapshot,annotations:annotations(false),_meta:ui
  },safe<Parameters<Store['submit']>[0]>(args=>{
    const draft=store.submit(args); return result(store.read(draft.explorationId),draft.id);
  }));
  registerAppTool(server,'review_draft',{
    description:'Human review UI only. Requires a single-use capability for this exact draft revision. Land accepts but does not verify.',
    inputSchema:inputs.review,outputSchema:outputs.snapshot,annotations:annotations(false),
    _meta:{...ui,ui:{resourceUri:UI_URI,visibility:['app']}}
  },safe<Parameters<Store['review']>[0]>(args=>result(store.review(args),args.draftId)));
  registerAppResource(server,'shadow-walker-review',UI_URI,{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{
    uri:UI_URI,mimeType:RESOURCE_MIME_TYPE,text:widgetHtml,
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}},
      'openai/widgetDescription':'Review one guided discovery move. Landing records acceptance, not truth.'}
  }]}));
  return server;
}
