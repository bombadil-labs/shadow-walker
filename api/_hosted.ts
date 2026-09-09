import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PostgresPool, PostgresStore } from '../packages/storage/src/postgres.ts';

let widget: string | undefined;

export function capabilityMatches(candidate: string | undefined): boolean {
  const expected=process.env.SHADOW_WALKER_MCP_SECRET;
  if(!expected || !candidate)return false;
  const left=createHash('sha256').update(candidate).digest();
  const right=createHash('sha256').update(expected).digest();
  return timingSafeEqual(left,right);
}

export function widgetHtml(): string {
  if(widget!==undefined)return widget;
  widget=readFileSync(join(process.cwd(),'dist/widget/index.html'),'utf8');
  return widget;
}

/**
 * Create one Neon pool/store for one serverless invocation.
 *
 * Keep the Postgres implementation behind an invocation-time import so the
 * Vercel entrypoint can start, authenticate, and report module-load failures
 * even when the hosted source graph was packaged incorrectly.
 */
export async function hostedStore(): Promise<PostgresStore> {
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('DATABASE_URL is not configured.');
  const [{Pool},{PostgresStore}]=await Promise.all([
    import('@neondatabase/serverless'),
    import('../packages/storage/src/postgres.ts'),
  ]);
  const pool=new Pool({connectionString});
  try{return await PostgresStore.connect(pool as unknown as PostgresPool);}
  catch(error){await pool.end().catch(()=>{});throw error;}
}
