import { randomUUID } from 'node:crypto';
import { POSTGRES_MIGRATIONS } from './postgres-schema.ts';
import { canonicalHash, dbJson, decode } from './postgres-driver.ts';
import type { PostgresClient, PostgresPool, PostgresQueryable } from './postgres-driver.ts';
import { requireThat, text } from '../../domain/src/index.ts';
import type { CartographySnapshot, Draft, Exploration, GestureRequest, GestureResolution, Line, LineMembership, MovePacket, Observation, Operation, OperationApplication, Position, Snapshot, StructuralConstraint, Transition, Traversal, Waypoint, WeaveProposal, Encounter } from '../../domain/src/index.ts';

type JsonRow={body:unknown};

export class PostgresContext {
  readonly pool:PostgresPool;
  readonly now:()=>number;
  constructor(pool:PostgresPool,now:()=>number){this.pool=pool;this.now=now;}
  stamp():string{return new Date(this.now()).toISOString();}

  async initialize():Promise<void>{
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('shadow-walker:migrations'))");
      await client.query('CREATE TABLE IF NOT EXISTS shadow_walker_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
      const versions=await client.query('SELECT version FROM shadow_walker_migrations ORDER BY version');
      const applied=new Set(versions.rows.map(row=>Number(row.version)));
      for(let i=0;i<POSTGRES_MIGRATIONS.length;i++){
        const version=i+1;if(applied.has(version))continue;
        for(const statement of POSTGRES_MIGRATIONS[i]!)await client.query(statement);
        await client.query('INSERT INTO shadow_walker_migrations(version) VALUES($1)',[version]);
      }
      await client.query('COMMIT');
    }catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}finally{client.release();}
  }
  async close():Promise<void>{await this.pool.end();}
  async transaction<T>(fn:(db:PostgresClient)=>Promise<T>):Promise<T>{
    const client=await this.pool.connect();
    try{await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');const value=await fn(client);await client.query('COMMIT');return value;}
    catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}finally{client.release();}
  }
  async event(db:PostgresQueryable,explorationId:string,kind:string,body:unknown):Promise<void>{await db.query('INSERT INTO events(exploration_id,kind,body,created_at) VALUES($1,$2,$3::jsonb,$4)',[explorationId,kind,dbJson(body),this.stamp()]);}
  async load<T>(db:PostgresQueryable,table:'explorations'|'moves'|'drafts',id:string):Promise<T>{text(id,'id',128);const result=await db.query(`SELECT body FROM ${table} WHERE id=$1`,[id]);const row=result.rows[0] as JsonRow|undefined;requireThat(row,'NOT_FOUND',`${table} record not found.`);return decode<T>(row.body);}
  async receipt<T>(db:PostgresQueryable,scope:string,key:string,input:unknown,fn:()=>Promise<T>):Promise<T>{
    text(key,'requestId',128);const digest=canonicalHash(input);
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[canonicalHash({scope,key})]);
    const prior=await db.query('SELECT hash,body FROM receipts WHERE scope=$1 AND key=$2',[scope,key]);const row=prior.rows[0];
    if(row){requireThat(String(row.hash)===digest,'IDEMPOTENCY_CONFLICT','This requestId was already used with different input.');return decode<T>(row.body);}
    const value=await fn();await db.query('INSERT INTO receipts(scope,key,hash,body) VALUES($1,$2,$3,$4::jsonb)',[scope,key,digest,dbJson(value)]);return value;
  }
  async bumpRevision(db:PostgresQueryable,explorationId:string):Promise<Exploration>{const exploration=await this.load<Exploration>(db,'explorations',explorationId);exploration.revision++;await db.query('UPDATE explorations SET body=$1::jsonb WHERE id=$2',[dbJson(exploration),explorationId]);return exploration;}
  async exists(db:PostgresQueryable,table:'explorations'|'positions'|'lines'|'observations'|'structural_constraints'|'operations',id:string,explorationId:string):Promise<boolean>{if(table==='explorations')return (await db.query('SELECT id FROM explorations WHERE id=$1',[id])).rows.length>0;return (await db.query(`SELECT id FROM ${table} WHERE id=$1 AND exploration_id=$2`,[id,explorationId])).rows.length>0;}

  async cartography(db:PostgresQueryable,explorationId:string):Promise<CartographySnapshot>{
    const rows=async<T>(table:string)=>(await db.query(`SELECT body FROM ${table} WHERE exploration_id=$1 ORDER BY seq`,[explorationId])).rows.map(r=>decode<T>(r.body));
    const lines=await rows<Line>('lines');
    const membershipRows=await db.query('SELECT lm.line_id,lm.position_id,lm.role,lm.created_at FROM line_memberships lm JOIN lines l ON l.id=lm.line_id WHERE l.exploration_id=$1 ORDER BY lm.seq',[explorationId]);
    const memberships=membershipRows.rows.map(r=>({lineId:String(r.line_id),positionId:String(r.position_id),role:String(r.role) as LineMembership['role'],createdAt:String(r.created_at)}));
    const transitions=await rows<Transition>('transitions');const traversals=await rows<Traversal>('traversals');const waypoints=await rows<Waypoint>('waypoints');
    const observations=await rows<Observation>('observations');const constraints=await rows<StructuralConstraint>('structural_constraints');const operations=await rows<Operation>('operations');const applications=await rows<OperationApplication>('operation_applications');const encounters=await rows<Encounter>('encounters');
    const gestureRequests=await rows<GestureRequest>('gesture_requests');const gestureResolutions=await rows<GestureResolution>('gesture_resolutions');const weaveProposals=await rows<WeaveProposal>('weave_proposals');
    return {lines,memberships,transitions,traversals,waypoints,observations,constraints,operations,applications,encounters,gestureRequests,gestureResolutions,weaveProposals};
  }
  async readTx(db:PostgresQueryable,id:string):Promise<Snapshot>{
    const exploration=await this.load<Exploration>(db,'explorations',id);
    const positions=(await db.query('SELECT body FROM positions WHERE exploration_id=$1 ORDER BY seq',[id])).rows.map(r=>decode<Position>(r.body));
    const drafts=(await db.query('SELECT body FROM drafts WHERE exploration_id=$1 ORDER BY seq',[id])).rows.map(r=>decode<Draft>(r.body));
    const active=await db.query("SELECT body FROM moves WHERE exploration_id=$1 AND status IN ('prepared','submitted') ORDER BY seq LIMIT 1",[id]);
    return {exploration,positions,drafts,activeMove:active.rows[0]?decode<MovePacket>(active.rows[0].body):null,cartography:await this.cartography(db,id)};
  }
  async resolveLine(db:PostgresQueryable,explorationId:string,selectedIds:string[],requested?:string):Promise<Line>{const map=await this.cartography(db,explorationId);const candidates=map.lines.filter(line=>selectedIds.every(id=>map.memberships.some(m=>m.lineId===line.id&&m.positionId===id)));if(requested){const line=candidates.find(candidate=>candidate.id===requested);requireThat(line,'INVALID_LINE','The requested line does not contain every selected arrival.');return line;}requireThat(candidates.length===1,'LINE_REQUIRED','Selected arrivals belong to multiple possible lines. Choose the line explicitly rather than collapsing them implicitly.');return candidates[0]!;}
  async addMembership(db:PostgresQueryable,line:Line,position:Position,role:LineMembership['role']='arrival'):Promise<void>{await db.query('INSERT INTO line_memberships(line_id,position_id,role,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(line_id,position_id) DO NOTHING',[line.id,position.id,role,position.createdAt]);}
  async addTransition(db:PostgresQueryable,line:Line,from:string,to:Position,kind?:Transition['kind']):Promise<Transition>{const transition:Transition={id:randomUUID(),explorationId:to.explorationId,fromPositionId:from,toPositionId:to.id,lineId:line.id,kind:kind??(to.kind==='excavation'?'excavated':'walked-to'),createdAt:to.createdAt};await db.query('INSERT INTO transitions(id,exploration_id,from_position_id,to_position_id,line_id,kind,body) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[transition.id,to.explorationId,from,to.id,line.id,transition.kind,dbJson(transition)]);return transition;}
  async addWaypoint(db:PostgresQueryable,input:{explorationId:string;fromPositionId:string;question:string;provenance:Waypoint['provenance']}):Promise<Waypoint>{text(input.question,'waypoint question');requireThat(['human-offered','walker-sensed','breakdown-emergent','operation-adjacent','resonance-detected'].includes(input.provenance),'INVALID_INPUT','Invalid waypoint provenance.');requireThat(await this.exists(db,'positions',input.fromPositionId,input.explorationId),'INVALID_PARENT','Waypoint origin must be a visited arrival in this exploration.');const waypoint:Waypoint={id:randomUUID(),explorationId:input.explorationId,fromPositionId:input.fromPositionId,question:input.question,provenance:input.provenance,status:'sensed',createdAt:this.stamp()};await db.query('INSERT INTO waypoints(id,exploration_id,from_position_id,status,body) VALUES($1,$2,$3,$4,$5::jsonb)',[waypoint.id,waypoint.explorationId,waypoint.fromPositionId,waypoint.status,dbJson(waypoint)]);await this.event(db,waypoint.explorationId,'waypoint.sensed',waypoint);return waypoint;}
  async loadWaypoint(db:PostgresQueryable,explorationId:string,waypointId:string):Promise<Waypoint>{text(waypointId,'waypointId',128);const result=await db.query('SELECT body FROM waypoints WHERE id=$1 AND exploration_id=$2',[waypointId,explorationId]);const row=result.rows[0] as JsonRow|undefined;requireThat(row,'NOT_FOUND','Waypoint is not in this exploration.');return decode<Waypoint>(row.body);}
  async resolveWaypointVisited(db:PostgresQueryable,waypoint:Waypoint,visitedPositionId:string):Promise<Waypoint>{requireThat(waypoint.status==='sensed','WAYPOINT_CLOSED','This route is no longer an open direction.');const updated:Waypoint={...waypoint,status:'visited',visitedPositionId,resolvedAt:this.stamp()};await db.query('UPDATE waypoints SET status=$1,body=$2::jsonb WHERE id=$3',[updated.status,dbJson(updated),updated.id]);await this.event(db,updated.explorationId,'waypoint.visited',updated);return updated;}
  fresh(packet:MovePacket,snapshot:Snapshot):void{requireThat(packet.dependencyVersions.exploration===snapshot.exploration.revision&&packet.dependencyVersions.frame===snapshot.exploration.frame.version,'STALE_DEPENDENCIES','Exploration changed. Preserve this draft and prepare a new move against the current state.');}
}
