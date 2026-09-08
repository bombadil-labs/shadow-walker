import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MoveOutput, Position, Proposal, ReviewInput, ReviewTicket, SemanticShift, Snapshot } from '../../../packages/domain/src/index.ts';
import './style.css';

const bridge=new App({name:'shadow-walker-review',version:'0.2.0'},{});
const clone=<T,>(value:T):T=>structuredClone(value);
const short=(value:string,max=72)=>value.length<=max?value:`${value.slice(0,max-1).trimEnd()}…`;
const lines=(value:string)=>value.split('\n').map(v=>v.trim()).filter(Boolean);
const spans=(value:string)=>value.split(',').map(v=>v.trim()).filter(Boolean).slice(0,16).map(span=>({span,salience:'medium' as const}));

type VisualNode={
  id:string;type:'arrival'|'draft'|'waypoint';label:string;parentIds:string[];position?:Position;proposal?:Proposal;
  draftId?:string;draftStatus?:'pending'|'reserved'|'landed'|'discarded';question?:string;shift?:SemanticShift;index:number;
};
type Point={x:number;y:number;depth:number};

function mapNodes(snapshot:Snapshot):VisualNode[]{
  const nodes:VisualNode[]=snapshot.positions.map((position,index)=>({id:position.id,type:'arrival',label:position.kind==='intention'?snapshot.exploration.title:short(position.meaning),parentIds:position.parentIds,position,shift:position.semanticShift,index}));
  let index=nodes.length;
  for(const draft of snapshot.drafts.filter(d=>d.status==='pending'||d.status==='reserved')){
    const local=new Map(draft.output.positions.map(p=>[`draft:${p.localId}`,`proposal:${draft.id}:${p.localId}`]));
    for(const p of draft.output.positions) nodes.push({id:`proposal:${draft.id}:${p.localId}`,type:'draft',label:short(p.meaning),
      parentIds:p.parentIds.map(id=>local.get(id)??id),proposal:p,shift:p.semanticShift,draftId:draft.id,draftStatus:draft.status,index:index++});
  }
  for(const position of snapshot.positions){
    const hasChild=nodes.some(n=>n.parentIds.includes(position.id));
    if(!hasChild && position.nextQuestion){nodes.push({id:`waypoint:${position.id}`,type:'waypoint',label:short(position.nextQuestion),parentIds:[position.id],question:position.nextQuestion,index:index++});}
  }
  return nodes;
}
function layout(nodes:VisualNode[]):{points:Map<string,Point>;height:number}{
  const byId=new Map(nodes.map(n=>[n.id,n]));const memo=new Map<string,number>();
  const depth=(id:string,seen=new Set<string>()):number=>{
    if(memo.has(id))return memo.get(id)!;if(seen.has(id))return 0;seen.add(id);
    const node=byId.get(id);if(!node||!node.parentIds.length){memo.set(id,0);return 0;}
    const d=1+Math.max(0,...node.parentIds.map(parent=>depth(parent,new Set(seen))));memo.set(id,d);return d;
  };
  const groups=new Map<number,VisualNode[]>();for(const node of nodes){const d=depth(node.id);const group=groups.get(d)??[];group.push(node);groups.set(d,group);}
  const maxDepth=Math.max(0,...groups.keys());const height=Math.max(560,180+maxDepth*160);const points=new Map<string,Point>();
  for(const [d,group] of groups){group.sort((a,b)=>a.index-b.index);const usable=760;const start=120;const gap=group.length===1?0:usable/(group.length-1);
    group.forEach((node,i)=>points.set(node.id,{x:group.length===1?500:start+i*gap,y:height-90-d*150,depth:d}));}
  return {points,height};
}
function ShiftChips({shift,empty='Shift was not recorded for this earlier arrival.'}:{shift?:SemanticShift;empty?:string}){
  if(!shift)return <p className="muted compact">{empty}</p>;
  return <><div className="shift-row"><span className="micro">What entered</span><div className="chips">{shift.newlySalient.length?shift.newlySalient.map((s,i)=><span className="chip" key={`${s.span}-${i}`}>{s.span}</span>):<span className="muted">No new spans recorded</span>}</div></div>
    {shift.preservedInvariants.length>0&&<div className="shift-row"><span className="micro">Still holding</span><div className="chips">{shift.preservedInvariants.map((s,i)=><span className="chip invariant" key={`${s}-${i}`}>{s}</span>)}</div></div>}</>;
}
function Cartography({snapshot,selected,onSelect}:{snapshot:Snapshot;selected?:string;onSelect:(id:string)=>void}){
  const nodes=useMemo(()=>mapNodes(snapshot),[snapshot]);const {points,height}=useMemo(()=>layout(nodes),[nodes]);
  return <div className="map-scroll" role="region" aria-label="Exploration map" tabIndex={0}><div className="map-plane" style={{height}}>
    <svg className="map-edges" viewBox={`0 0 1000 ${height}`} aria-hidden="true">
      {nodes.flatMap(node=>node.parentIds.map(parent=>{const a=points.get(parent),b=points.get(node.id);if(!a||!b)return null;const mid=(a.y+b.y)/2;
        return <path key={`${parent}->${node.id}`} className={`edge ${node.type==='draft'?'proposed':node.type==='waypoint'?'sensed':''}`} d={`M ${a.x} ${a.y} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`}/>;}))}
    </svg>
    {nodes.map(node=>{const p=points.get(node.id)!;const root=node.position?.kind==='intention';return <button key={node.id} type="button" className={`map-node ${node.type} ${root?'root':''} ${selected===node.id?'selected':''}`} style={{left:p.x,top:p.y}} onClick={()=>onSelect(node.id)} aria-label={`${node.type==='waypoint'?'Unvisited direction':node.type==='draft'?'Proposed arrival':'Visited arrival'}: ${node.label}`}>
      <span className="node-glyph" aria-hidden="true">{node.type==='waypoint'?'◇':node.type==='draft'?'◌':root?'◆':'●'}</span><span className="node-label">{node.label}</span>
      <span className="node-tooltip"><strong>{node.type==='waypoint'?'Possible direction':node.type==='draft'?'Proposed arrival':'Arrival'}</strong>{node.type!=='waypoint'?<ShiftChips shift={node.shift}/>:<span>{node.question}</span>}</span>
    </button>;})}
  </div></div>;
}
function ArrivalDetail({node}:{node?:VisualNode}){
  if(!node)return <section className="detail-card empty-detail"><p className="eyebrow">MAP READING</p><h2>Select an arrival</h2><p>Choose a visited node, proposed step, or open direction. The map keeps schema details behind the territory.</p></section>;
  if(node.type==='waypoint')return <section className="detail-card"><p className="eyebrow">UNVISITED DIRECTION</p><h2>{node.question}</h2><p>This route is visible from the current territory, but it has not been walked. It is not an accepted finding.</p></section>;
  const source=node.position??node.proposal!;const shift=node.shift;
  const missingShiftCopy=node.position?.kind==='intention'?'The root intention is the starting place; it has no prior semantic shift.':'This arrival predates semantic-shift recording. Shadow Walker will not invent a historical shift after the fact.';
  return <section className="detail-card"><p className="eyebrow">{node.type==='draft'?(node.draftStatus==='reserved'?'SAVED FOR LATER':'PROPOSED STEP'):'VISITED ARRIVAL'}</p><h2>{source.meaning}</h2>
    {shift?<><p className="shift-summary">{shift.summary}</p><ShiftChips shift={shift}/>{shift.receded.length>0&&<div className="detail-block"><h3>What receded</h3><p>{shift.receded.map(s=>s.span).join(' · ')}</p></div>}
      <div className="detail-block"><h3>Surprise</h3><p><strong>{shift.surprise.level}</strong> · {shift.surprise.notes}</p></div>
      {shift.unexpectedConnections.length>0&&<div className="detail-block"><h3>Unexpected connections</h3><ul>{shift.unexpectedConnections.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}</>:<p className="legacy-note">{missingShiftCopy}</p>}
    {source.anchors.length>0&&<div className="detail-block"><h3>Grounding</h3>{source.anchors.map(a=><p key={a.id}>{a.detail}{a.source&&<small>{a.source}</small>}</p>)}</div>}
    {source.uncertainty.length>0&&<div className="detail-block"><h3>What we're unsure about</h3><ul>{source.uncertainty.map((u,i)=><li key={i}>{u}</li>)}</ul></div>}
    <div className="next"><span className="micro">Where this leads</span><p>{source.nextQuestion}</p></div>
    <details><summary>Patterns &amp; developer details</summary>{source.structuralViews.map((v,i)=><div className="structure" key={i}><h3>{v.label}</h3><p>{v.relationships.join('; ')}</p><p><strong>Applies:</strong> {v.applicability}</p><p><strong>Mismatches:</strong> {v.mismatches.join('; ')||'None recorded'}</p></div>)}{node.position&&<><code>{node.position.id}</code><p>Parents: {node.position.parentIds.join(', ')||'Root intention'}</p></>}</details>
  </section>;
}
function defaultShift(p:Proposal):SemanticShift{return {baselineArrivalIds:[p.parentIds[0]!],summary:'Describe how the semantic territory changed at this step.',newlySalient:[],receded:[],preservedInvariants:[],unexpectedConnections:[],newAffordances:[],surprise:{level:'medium',notes:'Describe what was surprising or unsurprising about the movement.'}};}

function Workbench(){
  const [snapshot,setSnapshot]=useState<Snapshot>();const [ticket,setTicket]=useState<ReviewTicket>();const [focused,setFocused]=useState<string>();
  const [selected,setSelected]=useState<string>();const [editing,setEditing]=useState(false);const [editOutput,setEditOutput]=useState<MoveOutput>();
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const retry=useRef<{signature:string;requestId:string}|undefined>(undefined);
  const draft=snapshot?.drafts.find(d=>d.id===focused);const original=draft?JSON.stringify(draft.output):'';const dirty=!!editOutput&&JSON.stringify(editOutput)!==original;
  const reviewable=draft?.status==='pending'||draft?.status==='reserved';const permitted=!!ticket&&ticket.draftId===draft?.id&&ticket.version===draft?.version;
  const visualNodes=useMemo(()=>snapshot?mapNodes(snapshot):[],[snapshot]);const selectedNode=visualNodes.find(n=>n.id===selected);
  useEffect(()=>{if(window.parent!==window&&window.location.pathname==='/app/widget')window.parent.postMessage({type:'shadow-walker/ui-state',dirty,busy},'*');},[dirty,busy]);
  function receive(result:CallToolResult){
    if(result.isError)throw new Error(result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n'));
    const data=result.structuredContent as {snapshot?:Snapshot;focusedDraftId?:string}|undefined;if(!data?.snapshot)return;
    setSnapshot(data.snapshot);setFocused(data.focusedDraftId);const d=data.snapshot.drafts.find(d=>d.id===data.focusedDraftId);
    setEditOutput(d?clone(d.output):undefined);setTicket(result._meta?.['shadowWalker/review'] as ReviewTicket|undefined);setEditing(false);setError('');setNotice('');
    if(d&&(d.status==='pending'||d.status==='reserved'))setSelected(`proposal:${d.id}:${d.output.positions[0]?.localId}`);else setSelected(data.snapshot.positions.at(-1)?.id);
  }
  useEffect(()=>{bridge.ontoolresult=result=>{try{receive(result);}catch(e){setError(String(e));}};void bridge.connect().catch(()=>setError('Open this view in a trusted MCP Apps host. Review actions require the host bridge.'));return()=>{void bridge.close();};},[]);
  async function reopen(draftId?:string){if(!snapshot)return;setBusy(true);setNotice('');try{receive(await bridge.callServerTool({name:'open_exploration',arguments:{explorationId:snapshot.exploration.id,...(draftId?{draftId}:{})}}));retry.current=undefined;}catch(e){setError(String(e));}finally{setBusy(false);}}
  async function review(action:ReviewInput['action']){if(!ticket||!draft||!permitted)return;setBusy(true);setError('');setNotice('');try{
    const args={draftId:draft.id,expectedVersion:draft.version,token:ticket.token,action,...(action==='revise'?{output:editOutput}:{})};const signature=JSON.stringify(args);
    if(retry.current?.signature!==signature)retry.current={signature,requestId:crypto.randomUUID()};receive(await bridge.callServerTool({name:'review_draft',arguments:{...args,requestId:retry.current.requestId}}));retry.current=undefined;
    setNotice(action==='land'?'Kept. This arrival remains a hypothesis, and the walk is paused.':action==='revise'?'Revision saved. Read the changed step again before keeping it.':action==='reserve'?'Saved for later without adding it to visited territory.':'Discarded from the live map; its history remains recorded.');
  }catch(e){setError(String(e));}finally{setBusy(false);}}
  function updateProposal(index:number,fn:(p:Proposal)=>Proposal){if(!editOutput)return;const output=clone(editOutput);output.positions[index]=fn(output.positions[index]!);setEditOutput(output);}
  return <main className="workbench"><header><div><p className="eyebrow">LATENT-SPACE CARTOGRAPHY</p><h1>Shadow Walker</h1></div><span className="badge">The map is made by walking</span></header>
    <p className="principle">Follow what changes the next question. Preserve the paths not taken.</p>{error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
    {!snapshot?<section><h2>Waiting for an exploration</h2><p>Begin in conversation. Shadow Walker will map only territory the walk actually reaches.</p></section>:<>
      <section className="intention"><p className="eyebrow">ORIGINAL INTENTION · REVISION {snapshot.exploration.revision}</p><h2>{snapshot.exploration.title}</h2><p>{snapshot.exploration.intention}</p><div className="line-strip">{snapshot.cartography.lines.map(line=><span className="line-pill" key={line.id}>{line.label} · {line.status}</span>)}</div>
        <details><summary>Working frame</summary><p>{snapshot.exploration.frame.label}</p><ul>{snapshot.exploration.frame.constraints.map((c,i)=><li key={i}>{c}</li>)}</ul></details></section>
      {snapshot.activeMove&&!snapshot.drafts.some(d=>d.moveId===snapshot.activeMove?.moveId)&&<p role="status" className="notice">A walk is prepared on {snapshot.activeMove.line?.label??'a legacy line'} but has no proposed arrival yet. Resume it in the conversation.</p>}
      <div className="map-layout"><section className="map-card"><div className="map-heading"><div><p className="eyebrow">TERRITORY</p><h2>{snapshot.positions.length} visited arrival{snapshot.positions.length===1?'':'s'}</h2></div><p>Hover or focus a node to see what entered there. Hollow nodes are sensed, not visited.</p></div><Cartography snapshot={snapshot} selected={selected} onSelect={setSelected}/></section><ArrivalDetail node={selectedNode}/></div>
      {draft&&<section className="review-card"><p className="eyebrow">{draft.status==='reserved'?'SAVED FOR LATER':'PROPOSED STEP'} · REVISION {draft.version}</p><h2>Do you want this movement to become part of the map?</h2><p>Keeping it records that this arrival belongs to the exploration. It does not establish that the claim is true.</p>
        {draft.output.positions.map((p,i)=><article className="proposal-card" key={p.localId}><h3>{p.meaning}</h3>{p.semanticShift&&<><p className="shift-summary">{p.semanticShift.summary}</p><ShiftChips shift={p.semanticShift}/></>}<div className="next"><span className="micro">Question opened</span><p>{p.nextQuestion}</p></div><p className="muted">{p.uncertainty.join(' ')}</p>
          {editing&&editOutput&&<div className="human-editor"><label>Main idea<textarea value={editOutput.positions[i]!.meaning} onChange={e=>updateProposal(i,p=>({...p,meaning:e.target.value}))}/></label><label>Question this opens<textarea value={editOutput.positions[i]!.nextQuestion} onChange={e=>updateProposal(i,p=>({...p,nextQuestion:e.target.value}))}/></label><label>What we're unsure about <span>(one per line)</span><textarea value={editOutput.positions[i]!.uncertainty.join('\n')} onChange={e=>updateProposal(i,p=>({...p,uncertainty:lines(e.target.value)}))}/></label>
            <fieldset><legend>Semantic movement</legend><label>What changed<textarea value={(editOutput.positions[i]!.semanticShift??defaultShift(p)).summary} onChange={e=>updateProposal(i,p=>({...p,semanticShift:{...(p.semanticShift??defaultShift(p)),summary:e.target.value}}))}/></label><label>New language / spans <span>(comma separated)</span><input value={(editOutput.positions[i]!.semanticShift??defaultShift(p)).newlySalient.map(s=>s.span).join(', ')} onChange={e=>updateProposal(i,p=>({...p,semanticShift:{...(p.semanticShift??defaultShift(p)),newlySalient:spans(e.target.value)}}))}/></label><label>What receded <span>(comma separated)</span><input value={(editOutput.positions[i]!.semanticShift??defaultShift(p)).receded.map(s=>s.span).join(', ')} onChange={e=>updateProposal(i,p=>({...p,semanticShift:{...(p.semanticShift??defaultShift(p)),receded:spans(e.target.value)}}))}/></label><label>What still held <span>(one per line)</span><textarea value={(editOutput.positions[i]!.semanticShift??defaultShift(p)).preservedInvariants.join('\n')} onChange={e=>updateProposal(i,p=>({...p,semanticShift:{...(p.semanticShift??defaultShift(p)),preservedInvariants:lines(e.target.value)}}))}/></label><label>Surprise<select value={(editOutput.positions[i]!.semanticShift??defaultShift(p)).surprise.level} onChange={e=>updateProposal(i,p=>({...p,semanticShift:{...(p.semanticShift??defaultShift(p)),surprise:{...(p.semanticShift??defaultShift(p)).surprise,level:e.target.value as 'low'|'medium'|'high'}}}))}><option>low</option><option>medium</option><option>high</option></select></label><label>Surprise notes<textarea value={(editOutput.positions[i]!.semanticShift??defaultShift(p)).surprise.notes} onChange={e=>updateProposal(i,p=>({...p,semanticShift:{...(p.semanticShift??defaultShift(p)),surprise:{...(p.semanticShift??defaultShift(p)).surprise,notes:e.target.value}}}))}/></label></fieldset>
            <fieldset><legend>Grounding</legend>{editOutput.positions[i]!.anchors.map((a,ai)=><div className="anchor-edit" key={a.id}><label>Anchor<textarea value={a.detail} onChange={e=>updateProposal(i,p=>{const anchors=clone(p.anchors);anchors[ai]={...anchors[ai]!,detail:e.target.value};return {...p,anchors};})}/></label><label>Source / provenance<input value={a.source??''} onChange={e=>updateProposal(i,p=>{const anchors=clone(p.anchors);anchors[ai]={...anchors[ai]!,source:e.target.value||undefined};return {...p,anchors};})}/></label></div>)}</fieldset>
          </div>}
          <details><summary>Patterns &amp; developer details</summary><pre>{JSON.stringify(p,null,2)}</pre></details></article>)}
        {reviewable&&<><div className="review-actions">{editing?<><button className="primary" disabled={busy||!permitted||!dirty} onClick={()=>void review('revise')}>Save revision</button><button disabled={busy} onClick={()=>{setEditOutput(clone(draft.output));setEditing(false);}}>Cancel changes</button></>:<><button className="primary" disabled={busy||!permitted||dirty} onClick={()=>void review('land')}>Keep this</button><button disabled={busy||!permitted} onClick={()=>setEditing(true)}>Change it</button><button disabled={busy||!permitted||dirty} onClick={()=>void review('reserve')}>Save for later</button><button disabled={busy||!permitted||dirty} onClick={()=>void review('discard')}>Discard</button></>}</div>{!permitted&&<p role="status">Review authorization is unavailable or stale. Refresh this proposed step before acting.</p>}<button className="quiet" disabled={busy||dirty} onClick={()=>void reopen(draft.id)}>Refresh this proposed step</button></>}
      </section>}
      <section className="history-card"><h2>Saved routes &amp; draft history</h2>{snapshot.drafts.length===0?<p>No proposed moves yet.</p>:snapshot.drafts.map(d=><div className="history" key={d.id}><span>{d.status==='landed'?'kept':d.status==='reserved'?'saved for later':d.status} · revision {d.version}</span><button disabled={busy||dirty} onClick={()=>void reopen(d.id)}>Inspect</button></div>)}</section>
      <footer>The territory is unfinished by design. Return to the conversation when you want to move again.</footer>
    </>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Workbench/>);
