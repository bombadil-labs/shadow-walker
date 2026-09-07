import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Exploration } from '../../../packages/domain/src/index.ts';
import './style.css';

function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const picker = element<HTMLSelectElement>('explorations');
const refresh = element<HTMLButtonElement>('refresh');
const iframe = element<HTMLIFrameElement>('view');
const status = element('status'); const error = element('error');
let sessionToken = ''; let selected = ''; let dirty = false; let widgetBusy = false; let loading = true;
let ready = false; let serial = 0;
const bridge = new AppBridge(null, { name: 'shadow-walker-local-dashboard', version: '0.1.0' }, { serverTools: {} });
const blocked = () => loading || dirty || widgetBusy;
function controls() { picker.disabled = blocked(); refresh.disabled = blocked(); element('editing').hidden = !dirty; }
function report(e: unknown) { error.textContent = e instanceof Error ? e.message : 'Unable to reach the local server.'; error.hidden = false; }
async function session() {
  const res = await fetch('/api/session', { headers: { 'X-Shadow-Walker-Client': 'dashboard' }, cache: 'no-store' });
  if (!res.ok) throw new Error('Could not initialize the local dashboard. Keep the server running and reload this page.');
  sessionToken = (await res.json() as { sessionToken: string }).sessionToken;
}
async function call(name: string, args: Record<string, unknown> = {}, retry = true): Promise<CallToolResult> {
  if (!sessionToken) await session();
  const res = await fetch('/api/call', { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-Shadow-Walker-Session': sessionToken }, body: JSON.stringify({ name, arguments: args }), cache: 'no-store' });
  const data = await res.json();
  if (res.status === 403 && data.error?.code === 'SESSION_EXPIRED' && retry) {
    // A server restart changes the CSRF token; preserve the operation's idempotency key.
    await session(); return call(name, args, false);
  }
  if (!res.ok) throw new Error(data.error?.message ?? `Request failed (${res.status}).`);
  return data as CallToolResult;
}
function successful(result: CallToolResult): CallToolResult {
  if (result.isError) throw new Error(result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n'));
  return result;
}
async function list() {
  const result = successful(await call('list_explorations'));
  const rows = result.structuredContent!.explorations as Exploration[];
  picker.replaceChildren();
  for (const row of rows) {
    const option = document.createElement('option'); option.value = row.id; option.textContent = row.title; picker.append(option);
  }
  if (!rows.length) { const option=document.createElement('option'); option.textContent='No saved explorations'; option.value=''; picker.append(option); }
  // Direct IDs remain usable when older than the server's latest-100 listing.
  if (selected && !rows.some(row=>row.id===selected)) {
    const option=document.createElement('option');option.value=selected;option.textContent='Exploration from this page’s address';picker.append(option);
  }
  if (!selected) selected=rows[0]?.id ?? '';
  picker.value=selected; element('empty').hidden=!!selected;
  return rows.length;
}
async function openSelected() {
  if (!ready || !selected) return;
  const generation=++serial; loading=true;controls();error.hidden=true;status.textContent='Opening saved exploration…';
  try {
    const result=successful(await call('open_exploration',{explorationId:selected}));
    if(generation!==serial)return;
    await bridge.sendToolResult(result);
    status.textContent='Showing saved state. Refresh after a new step or review in chat.';
    iframe.hidden=false;
    const url=new URL(location.href);url.searchParams.set('exploration',selected);history.replaceState(null,'',url);
  } catch(e) { iframe.hidden=true;report(e);status.textContent='Could not open that exploration. Choose another or refresh.'; }
  finally {loading=false;controls();}
}
bridge.oncalltool=async params=>{
  const result=await call(params.name,params.arguments ?? {});
  if(!result.isError)status.textContent='Saved on the same server used by your chat. The walk remains paused.';
  return result;
};
bridge.oninitialized=()=>{ready=true;void openSelected();};
window.addEventListener('message',event=>{
  if(event.source!==iframe.contentWindow || event.data?.type!=='shadow-walker/ui-state')return;
  if(typeof event.data.dirty!=='boolean' || typeof event.data.busy!=='boolean')return;
  dirty=event.data.dirty;widgetBusy=event.data.busy;controls();
});
window.addEventListener('beforeunload',event=>{if(dirty||widgetBusy){event.preventDefault();event.returnValue='';}});
picker.addEventListener('change',()=>{
  if(blocked()){picker.value=selected;return;}
  selected=picker.value;void openSelected();
});
refresh.addEventListener('click',async()=>{
  if(blocked())return;loading=true;controls();error.hidden=true;
  try {await list();if(selected)await openSelected();else status.textContent='No explorations saved yet.';}
  catch(e){report(e);}finally{loading=false;controls();}
});
async function start() {
  try {
    selected=new URL(location.href).searchParams.get('exploration') ?? '';
    await list();
    // Set up the host before navigating the sandboxed iframe so initialize is never lost.
    await bridge.connect(new PostMessageTransport(iframe.contentWindow!,iframe.contentWindow!));
    iframe.src='/app/widget';
    if(!selected)status.textContent='No explorations saved yet.';
  }catch(e){report(e);status.textContent='Connection unavailable.';}
  finally{loading=false;controls();}
}
void start();
