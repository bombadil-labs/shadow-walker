import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from '@neondatabase/serverless';
import { PostgresStore } from '../packages/storage/src/postgres.ts';
import type { PostgresPool } from '../packages/storage/src/postgres.ts';

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
 * @neondatabase/serverless carries Pool/Client traffic over WebSockets and its
 * serverless guidance requires those connections to be created, used and
 * closed within the same request rather than cached across warm invocations.
 */
export async function hostedStore(): Promise<PostgresStore> {
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('DATABASE_URL is not configured.');
  const pool=new Pool({connectionString});
  try{return await PostgresStore.connect(pool as unknown as PostgresPool);}
  catch(error){await pool.end().catch(()=>{});throw error;}
}
