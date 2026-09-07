import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Snapshot, ReviewTicket, ReviewInput } from '../../../packages/domain/src/index.ts';
import './style.css';

const bridge=new App({name:'shadow-walker-review',version:'0.1.0'},{});
function Workbench(){
  const [snapshot,setSnapshot]=useState<Snapshot>();const [ticket,setTicket]=useState<ReviewTicket>();
  const [focused,setFocused]=useState<string>();const [editor,setEditor]=useState('');
  const [mode,setMode]=useState<'Meaning'|'Structure'|'Both'>('Both');
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
  const retry=useRef<{signature:string;requestId:string}|undefined>(undefined);
  const draft=snapshot?.drafts.find(d=>d.id===focused);
  const original=draft?JSON.stringify(draft.output,null,2):'';const dirty=editor!==original;
  const reviewable=draft?.status==='pending'||draft?.status==='reserved';
  const permitted=!!ticket && ticket.draftId===draft?.id && ticket.version===draft?.version;
  function receive(result:CallToolResult){
    if(result.isError)throw new Error(result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n'));
    const data=result.structuredContent as {snapshot?:Snapshot;focusedDraftId?:string}|undefined;
    if(!data?.snapshot)return;
    setSnapshot(data.snapshot);setFocused(data.focusedDraftId);
    const d=data.snapshot.drafts.find(d=>d.id===data.focusedDraftId);
    setEditor(d?JSON.stringify(d.output,null,2):'');
    setTicket(result._meta?.['shadowWalker/review'] as ReviewTicket|undefined);
    setError('');
  }
  useEffect(()=>{
    bridge.ontoolresult=result=>{try{receive(result);}catch(e){setError(String(e));}};
    void bridge.connect().catch(()=>setError('Open this view in a trusted MCP Apps host. No review actions are available without the host bridge.'));
    return()=>{void bridge.close();};
  },[]);
  async function reopen(draftId?:string){
    if(!snapshot)return;setBusy(true);setNotice('');
    try{receive(await bridge.callServerTool({name:'open_exploration',arguments:{explorationId:snapshot.exploration.id,...(draftId?{draftId}:{})}}));retry.current=undefined;}
    catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function review(action:ReviewInput['action']){
    if(!ticket||!draft||!permitted)return;setBusy(true);setError('');setNotice('');
    try{
      const args={draftId:draft.id,expectedVersion:draft.version,token:ticket.token,action,
        ...(action==='revise'?{output:JSON.parse(editor)}:{})};
      const signature=JSON.stringify(args);
      if(retry.current?.signature!==signature)retry.current={signature,requestId:crypto.randomUUID()};
      receive(await bridge.callServerTool({name:'review_draft',arguments:{...args,requestId:retry.current.requestId}}));
      retry.current=undefined;
      setNotice(action==='land'?'Step landed. It remains a hypothesis. The walk is paused.':action==='revise'?'Revision saved. Read it again before landing.':action==='reserve'?'Kept in reserve, not added to the accepted path.':'Draft discarded; its history remains addressable.');
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  return <main>
    <header><div><p className="eyebrow">A DISCOVERY WORKBENCH</p><h1>Shadow Walker</h1></div><span className="badge">Guided · one move</span></header>
    <p className="principle">Follow what changes the next question.</p>
    {error&&<p role="alert" className="error">{error}</p>}
    {notice&&<p role="status" className="notice">{notice}</p>}
    {!snapshot?<section><h2>Waiting for an exploration</h2><p>Open or create an exploration from your conversation. No separate model or prompt window is needed.</p></section>:<>
      <section><p className="eyebrow">ORIGINAL INTENTION · REVISION {snapshot.exploration.revision}</p><h2>{snapshot.exploration.title}</h2><p>{snapshot.exploration.intention}</p>
        <details><summary>Frame: {snapshot.exploration.frame.label}</summary><ul>{snapshot.exploration.frame.constraints.map((c,i)=><li key={i}>{c}</li>)}</ul></details></section>
      {snapshot.activeMove&&!snapshot.drafts.some(d=>d.moveId===snapshot.activeMove?.moveId)&&<p role="status">A move is prepared but has no draft yet. Resume it in the conversation using move ID <code>{snapshot.activeMove.moveId}</code>.</p>}
      <nav aria-label="View mode">{(['Meaning','Structure','Both'] as const).map(m=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m}</button>)}</nav>
      <section><h2>Recorded path <span className="count">{snapshot.positions.length}</span></h2>
        {snapshot.positions.map((p,i)=><article key={p.id}>
          <p className="eyebrow">{String(i+1).padStart(2,'0')} · {p.kind} · accepted · {p.epistemicStatus}</p>
          {mode!=='Structure'&&<p className="meaning">{p.meaning}</p>}
          {mode!=='Meaning'&&<details open={mode==='Structure'}><summary>Structure &amp; concrete anchors</summary>
            {p.structuralViews.map((v,i)=><div key={i}><h3>{v.label}</h3><p>{v.relationships.join('; ')}</p><p>Applies: {v.applicability}</p><p>Invariants: {v.invariants.join('; ')||'None recorded'}</p><p>Omissions: {v.omissions.join('; ')||'None recorded'}</p><p>Mismatches: {v.mismatches.join('; ')||'None recorded'}</p></div>)}
            {p.anchors.map(a=><p key={a.id}><strong>{a.id}:</strong> {a.detail} {a.source&&<small>Source: {a.source}</small>}</p>)}
          </details>}
          {p.uncertainty.length>0&&<p className="muted">Uncertainty: {p.uncertainty.join(' ')}</p>}
          <p><strong>Next question:</strong> {p.nextQuestion}</p>
          <details><summary>Ancestry &amp; address</summary><code>{p.id}</code><p>Parents: {p.parentIds.join(', ')||'Root intention'}</p><p>Origin move: {p.originMoveId??'User-requested root'}</p></details>
        </article>)}
      </section>
      {draft&&<section className="review"><p className="eyebrow">{draft.status.toUpperCase()} DRAFT · REVISION {draft.version}</p><h2>Review this step</h2>
        <p>Landing accepts a position into this exploration. It does not verify that it is true.</p>
        {draft.output.positions.map(p=><article key={p.localId}><h3>{p.kind}: {p.localId}</h3><p className="meaning">{p.meaning}</p><p><strong>Next question:</strong> {p.nextQuestion}</p><p>Uncertainty: {p.uncertainty.join(' ')}</p>
          <details><summary>Anchors, structure &amp; ancestry</summary><pre>{JSON.stringify({anchors:p.anchors,structuralViews:p.structuralViews,parentIds:p.parentIds},null,2)}</pre></details></article>)}
        {reviewable&&<><label htmlFor="draft-editor">Edit the full draft (JSON)</label><textarea id="draft-editor" spellCheck={false} value={editor} onChange={e=>setEditor(e.target.value)} disabled={busy}/>
          {dirty&&<p>Unsaved edits. Choose Revise, then review the saved version before landing.</p>}
          {!permitted&&<p role="status">No review capability was delivered. Reopen review in a compatible trusted host; acceptance is disabled.</p>}
          <div className="actions"><button className="primary" disabled={busy||!permitted||dirty} onClick={()=>void review('land')}>Land</button>
            <button disabled={busy||!permitted||!dirty} onClick={()=>void review('revise')}>Revise</button>
            <button disabled={busy||!permitted||dirty} onClick={()=>void review('reserve')}>Keep in reserve</button>
            <button disabled={busy||!permitted||dirty} onClick={()=>void review('discard')}>Discard</button></div>
          <button disabled={busy||dirty} onClick={()=>void reopen(draft.id)}>Refresh review authorization</button>
        </>}
      </section>}
      <section><h2>Draft history &amp; reserves</h2>{snapshot.drafts.length===0?<p>No proposed moves yet.</p>:snapshot.drafts.map(d=><div className="history" key={d.id}><span>{d.status} · revision {d.version} · <code>{d.id.slice(0,8)}</code></span><button disabled={busy||dirty} onClick={()=>void reopen(d.id)}>Inspect</button></div>)}</section>
      <footer>The walk is paused. Return to the conversation to choose the next move.</footer>
    </>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Workbench/>);
