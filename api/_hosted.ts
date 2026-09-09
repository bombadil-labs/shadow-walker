import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from '@neondatabase/serverless';
import { PostgresStore } from '../packages/storage/src/postgres.ts';
import type { PostgresPool } from '../packages/storage/src/postgres.ts';

let storePromise: Promise<PostgresStore> | undefined;
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

export function hostedStore(): Promise<PostgresStore> {
  if(storePromise)return storePromise;
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('DATABASE_URL is not configured.');
  const pool=new Pool({connectionString});
  storePromise=PostgresStore.connect(pool as unknown as PostgresPool).catch(error=>{storePromise=undefined;throw error;});
  return storePromise;
}
