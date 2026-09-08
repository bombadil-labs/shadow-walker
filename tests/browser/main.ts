import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const params=new URLSearchParams(location.search);const flags=new URLSearchParams();if(params.has('noMeta'))flags.set('noMeta','1');if(params.has('flightLines'))flags.set('flightLines','1');const suffix=flags.size?`?${flags}`:'';
const initial=await fetch(`/initial${suffix}`).then(r=>r.json()) as CallToolResult;
const snapshot=initial.structuredContent!.snapshot as {exploration:{id:string}};
document.body.dataset.explorationId=snapshot.exploration.id;
const iframe=document.createElement('iframe');iframe.id='view';iframe.title='Shadow Walker review';
iframe.setAttribute('sandbox','allow-scripts');iframe.style.cssText='width:100%;height:1600px;border:0';document.body.append(iframe);
const bridge=new AppBridge(null,{name:'shadow-walker-browser-test',version:'0.1.0'},{serverTools:{}});
bridge.oncalltool=async params=>await fetch('/call',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params)}).then(r=>r.json()) as CallToolResult;
bridge.oninitialized=()=>{void bridge.sendToolResult(initial);};
await bridge.connect(new PostMessageTransport(iframe.contentWindow!,iframe.contentWindow!));
iframe.src='/widget';
