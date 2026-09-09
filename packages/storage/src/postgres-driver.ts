import { createHash } from 'node:crypto';
import { requireThat, text } from '../../domain/src/index.ts';

export type PgRow = Record<string, unknown>;
export type QueryResult = { rows: PgRow[] };
export type PostgresQueryable = { query(sql:string, values?:unknown[]):Promise<QueryResult> };
export type PostgresClient = PostgresQueryable & { release():void };
export type PostgresPool = PostgresQueryable & { connect():Promise<PostgresClient>; end():Promise<void> };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export const canonicalHash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const dbJson=(value:unknown)=>JSON.stringify(value);
export function decode<T>(body:unknown):T{return (typeof body==='string'?JSON.parse(body):body) as T;}

export function stringList(value:unknown,name:string,options:{min?:number;max?:number}={}):asserts value is string[]{
  const min=options.min??0,max=options.max??32;
  requireThat(Array.isArray(value)&&value.length>=min&&value.length<=max,'INVALID_INPUT',`${name} must contain ${min} to ${max} strings.`);
  for(const item of value)text(item,name);
  requireThat(new Set(value).size===value.length,'INVALID_INPUT',`${name} must not contain duplicates.`);
}
export function uniqueStrings(value:unknown,name:string,min:number,max:number):asserts value is string[]{
  requireThat(Array.isArray(value)&&value.length>=min&&value.length<=max,'INVALID_INPUT',`${name} must contain ${min} to ${max} values.`);
  for(const item of value)text(item,name,128);
  requireThat(new Set(value).size===value.length,'INVALID_INPUT',`${name} must not contain duplicates.`);
}
