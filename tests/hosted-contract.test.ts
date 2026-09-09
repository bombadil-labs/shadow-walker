import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { capabilityMatches } from '../api/_hosted.ts';

test('hosted MCP capability comparison requires the exact configured secret',()=>{
  const prior=process.env.SHADOW_WALKER_MCP_SECRET;
  try{process.env.SHADOW_WALKER_MCP_SECRET='field-test-secret-with-enough-entropy';assert.equal(capabilityMatches('field-test-secret-with-enough-entropy'),true);assert.equal(capabilityMatches('field-test-secret-with-enough-entropx'),false);assert.equal(capabilityMatches(undefined),false);}
  finally{if(prior===undefined)delete process.env.SHADOW_WALKER_MCP_SECRET;else process.env.SHADOW_WALKER_MCP_SECRET=prior;}
});

test('Vercel config builds the widget, bundles it into the MCP function, and hides the capability in the public route',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')) as {buildCommand?:string;functions?:Record<string,{includeFiles?:string}>;rewrites?:Array<{source:string;destination:string}>};
  assert.equal(config.buildCommand,'npm run build');
  assert.equal(config.functions?.['api/mcp.ts']?.includeFiles,'dist/widget/**');
  assert.ok(config.rewrites?.some(r=>r.source==='/mcp/:secret'&&r.destination==='/api/mcp?secret=:secret'));
  assert.ok(config.rewrites?.some(r=>r.source==='/healthz'&&r.destination==='/api/healthz'));
});
