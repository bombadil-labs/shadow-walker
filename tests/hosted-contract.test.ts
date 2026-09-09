import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { capabilityMatches } from '../api/_hosted.ts';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('hosted MCP capability comparison requires the exact configured secret',()=>{
  const prior=process.env.SHADOW_WALKER_MCP_SECRET;
  try{process.env.SHADOW_WALKER_MCP_SECRET='field-test-secret-with-enough-entropy';assert.equal(capabilityMatches('field-test-secret-with-enough-entropy'),true);assert.equal(capabilityMatches('field-test-secret-with-enough-entropx'),false);assert.equal(capabilityMatches(undefined),false);}
  finally{if(prior===undefined)delete process.env.SHADOW_WALKER_MCP_SECRET;else process.env.SHADOW_WALKER_MCP_SECRET=prior;}
});

test('Vercel config builds the widget and packages the raw hosted TypeScript graph',()=>{
  const config=JSON.parse(source('vercel.json')) as {buildCommand?:string;functions?:Record<string,{includeFiles?:string}>;rewrites?:Array<{source:string;destination:string}>};
  assert.equal(config.buildCommand,'npm run build');
  const include=config.functions?.['api/mcp.ts']?.includeFiles??'';
  assert.match(include,/api\/_hosted\.ts/);
  assert.match(include,/apps\/server\/src\/mcp\.ts/);
  assert.match(include,/packages\/\*\*/);
  assert.match(include,/dist\/widget\/\*\*/);
  assert.ok(config.rewrites?.some(r=>r.source==='/mcp/:secret'&&r.destination==='/api/mcp?secret=:secret'));
  assert.ok(config.rewrites?.some(r=>r.source==='/healthz'&&r.destination==='/api/healthz'));
});

test('hosted entrypoint defers the raw source graph until invocation and keeps health independent',()=>{
  const hosted=source('api/_hosted.ts'),health=source('api/healthz.ts'),mcp=source('api/mcp.ts');
  assert.doesNotMatch(hosted,/storePromise/,'Neon stores must not be reused across serverless invocations');
  assert.match(hosted,/await Promise\.all\(\[/);
  assert.match(hosted,/import\('\.\.\/packages\/storage\/src\/postgres\.ts'\)/);
  assert.doesNotMatch(health,/\.\/_hosted\.ts/,'health must isolate Vercel\/Neon configuration from the application module graph');
  assert.match(mcp,/await import\('\.\/_hosted\.ts'\)/);
  assert.match(mcp,/await import\('\.\.\/apps\/server\/src\/mcp\.ts'\)/);
  assert.match(mcp,/await store\.close\(\)/);
});
