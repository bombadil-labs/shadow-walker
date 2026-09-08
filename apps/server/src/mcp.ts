import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { DomainError, requireThat } from '../../../packages/domain/src/index.ts';
import type { Snapshot } from '../../../packages/domain/src/index.ts';
import { Store } from '../../../packages/storage/src/index.ts';
import { inputs, outputs, UI_URI, TICKET_META } from '../../../packages/protocol/src/index.ts';

export function createMcpServer(store: Store, widgetHtml: string): McpServer {
  const server = new McpServer({name:'shadow-walker',version:'0.2.0'}, {instructions:
    'Shadow Walker is a persistent toolkit for situated latent-space cartography. The host model performs one path-dependent semantic move at a time; the server preserves arrivals, lines, transitions, anchors, uncertainty and human review. For every new v0.2 arrival, report the semantic shift relative to its immediate path: what became newly salient, what receded, what remained invariant, unexpected connections, new affordances and explicit surprise. Treat this as a walker report, not hidden-state measurement. Parallel lines are legitimate; fork them explicitly rather than collapsing them. Operations and structural correspondences must preserve mechanics, not mere metaphor. Resonance proposes; it does not prove. A human reviews drafts in the app. Never call review_draft as the model, infer acceptance, automatically continue after review, or describe acceptance as verification. No server-side model runs.'});
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
      content:[{type:'text',text:`${snapshot.exploration.title}: ${snapshot.positions.length} visited arrivals across ${snapshot.cartography.lines.length} line${snapshot.cartography.lines.length===1?'':'s'}. ${d?`Draft ${d.status}, revision ${d.version}. `:''}Acceptance is not verification. Wait for human direction before any next move.`}],
      ...(d && (d.status==='pending'||d.status==='reserved') ? {_meta:{[TICKET_META]:store.ticket(d.id)}} : {})};
  };
  registerAppTool(server,'create_exploration',{
    description:'Record an explicitly requested human intention and initial frame. Creates the root arrival and first line; it is not a generated finding.',
    inputSchema:inputs.create,outputSchema:outputs.snapshot,annotations:annotations(false),_meta:ui
  },safe<Parameters<Store['create']>[0]>(args=>result(store.create(args))));
  server.registerTool('list_explorations',{
    description:'List up to 100 most recently created explorations.',inputSchema:{},outputSchema:outputs.list,annotations:annotations(true)
  },safe(()=>({structuredContent:{explorations:store.list()},content:[{type:'text',text:'Saved explorations.'}]})));
  server.registerTool('read_exploration',{
    description:'Read visited arrivals, lines/transitions and draft history. Returns no review capability.',
    inputSchema:inputs.read,outputSchema:outputs.snapshot,annotations:annotations(true)
  },safe<{explorationId:string}>(args=>result(store.read(args.explorationId))));
  registerAppTool(server,'open_exploration',{
    description:'Open the cartographic map and human review UI. Review credentials are delivered only in widget metadata.',
    inputSchema:inputs.open,outputSchema:outputs.snapshot,annotations:annotations(false),_meta:ui
  },safe<{explorationId:string;draftId?:string}>(args=>{
    const snapshot=store.read(args.explorationId);
    return result(snapshot,args.draftId ?? snapshot.drafts.find(d=>d.status==='pending')?.id);
  }));
  server.registerTool('fork_line',{
    description:'Preserve an explicit alternative line starting from an already visited arrival. Call only when the human wants to keep a branch independently followable; this does not visit new territory or run another move.',
    inputSchema:inputs.fork,outputSchema:outputs.snapshot,annotations:annotations(false)
  },safe<Parameters<Store['forkLine']>[0]>(args=>result(store.forkLine(args))));
  server.registerTool('prepare_move',{
    description:'Prepare exactly one guided semantic walk on one explicit line. If a selected arrival belongs to multiple lines, supply lineId rather than implicitly collapsing them. Do not prepare again until human direction resumes the walk.',
    inputSchema:inputs.prepare,outputSchema:outputs.packet,annotations:annotations(false)
  },safe<Parameters<Store['prepare']>[0]>(args=>({structuredContent:{packet:store.prepare(args)},content:[{type:'text',text:'Perform one path-dependent walk, report its semantic shift, submit one draft, then stop for human review.'}]})));
  registerAppTool(server,'submit_move',{
    description:'Save one or two proposed arrivals as an unaccepted draft. New cartographic moves require semantic-shift reports. This does not land arrivals or start a follow-up.',
    inputSchema:inputs.submit,outputSchema:outputs.snapshot,annotations:annotations(false),_meta:ui
  },safe<Parameters<Store['submit']>[0]>(args=>{
    const draft=store.submit(args); return result(store.read(draft.explorationId),draft.id);
  }));
  registerAppTool(server,'review_draft',{
    description:'Human review UI only. Requires a single-use capability for this exact draft revision. Keeping/Landing accepts an arrival but does not verify it.',
    inputSchema:inputs.review,outputSchema:outputs.snapshot,annotations:annotations(false),
    _meta:{...ui,ui:{resourceUri:UI_URI,visibility:['app']}}
  },safe<Parameters<Store['review']>[0]>(args=>result(store.review(args),args.draftId)));
  registerAppResource(server,'shadow-walker-review',UI_URI,{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{
    uri:UI_URI,mimeType:RESOURCE_MIME_TYPE,text:widgetHtml,
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}},
      'openai/widgetDescription':'Map visited conceptual territory and review one proposed arrival. Keeping it records acceptance, not truth.'}
  }]}));
  return server;
}
