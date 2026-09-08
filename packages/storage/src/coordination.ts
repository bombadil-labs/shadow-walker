import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { requireThat, text } from '../../domain/src/index.ts';
import type {
  BranchGestureRequest,
  Encounter,
  GestureRequest,
  GestureResolution,
  Line,
  WeaveGestureRequest,
  WeaveProposal,
  WeaveReviewTicket,
} from '../../domain/src/cartography.ts';

type Row={body:string};
type EventFn=(explorationId:string,kind:string,body:unknown)=>void;
type RecordEncounterFn=(input:{explorationId:string;lineIds:string[];basisPositionIds:string[];kind:Encounter['kind'];summary:string;uncertainty:string[]})=>Encounter;
const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');

function uniqueStrings(value:unknown,name:string,min:number,max:number):asserts value is string[]{
  requireThat(Array.isArray(value)&&value.length>=min&&value.length<=max,'INVALID_INPUT',`${name} must contain ${min} to ${max} values.`);
  for(const item of value)text(item,name,128);
  requireThat(new Set(value).size===value.length,'INVALID_INPUT',`${name} must not contain duplicates.`);
}

export class CoordinationStore{
  private readonly db:DatabaseSync;
  private readonly stamp:()=>string;
  private readonly now:()=>number;
  private readonly event:EventFn;
  private readonly recordEncounter:RecordEncounterFn;
  constructor(db:DatabaseSync,stamp:()=>string,now:()=>number,event:EventFn,recordEncounter:RecordEncounterFn){this.db=db;this.stamp=stamp;this.now=now;this.event=event;this.recordEncounter=recordEncounter;}

  private bumpRevision(explorationId:string):void{
    const row=this.db.prepare('SELECT body FROM explorations WHERE id=?').get(explorationId) as Row|undefined;
    requireThat(row,'NOT_FOUND','Exploration not found.');const exploration=JSON.parse(row.body) as {revision:number};exploration.revision++;
    this.db.prepare('UPDATE explorations SET body=? WHERE id=?').run(JSON.stringify(exploration),explorationId);
  }
  private paused(explorationId:string):void{
    requireThat(!this.db.prepare("SELECT id FROM moves WHERE exploration_id=? AND status IN ('prepared','submitted')").get(explorationId),'MOVE_IN_PROGRESS','Finish or review the current walk before changing the map from the app.');
  }
  private position(explorationId:string,id:string):void{requireThat(this.db.prepare('SELECT id FROM positions WHERE id=? AND exploration_id=?').get(id,explorationId),'NOT_FOUND','Arrival is not in this exploration.');}
  private line(explorationId:string,id:string):Line{
    const row=this.db.prepare('SELECT body FROM lines WHERE id=? AND exploration_id=?').get(id,explorationId) as Row|undefined;requireThat(row,'INVALID_LINE','Line is not in this exploration.');return JSON.parse(row.body) as Line;
  }
  private unresolved(requestId:string):GestureRequest{
    const row=this.db.prepare('SELECT body FROM gesture_requests WHERE id=?').get(requestId) as Row|undefined;requireThat(row,'NOT_FOUND','Gesture request not found.');
    requireThat(!this.db.prepare('SELECT id FROM gesture_resolutions WHERE request_id=?').get(requestId),'GESTURE_RESOLVED','This gesture request is already resolved.');return JSON.parse(row.body) as GestureRequest;
  }
  private validateWeaveBasis(explorationId:string,lineIds:string[],basisPositionIds:string[]):void{
    uniqueStrings(lineIds,'lineIds',2,8);uniqueStrings(basisPositionIds,'basisPositionIds',2,16);
    for(const lineId of lineIds)this.line(explorationId,lineId);for(const positionId of basisPositionIds)this.position(explorationId,positionId);
    const memberships=this.db.prepare(`SELECT line_id,position_id,role FROM line_memberships WHERE line_id IN (${lineIds.map(()=>'?').join(',')})`).all(...lineIds) as Array<{line_id:string;position_id:string;role:string}>;
    for(const lineId of lineIds)requireThat(basisPositionIds.some(positionId=>memberships.some(m=>m.line_id===lineId&&m.position_id===positionId&&m.role==='arrival')),'INVALID_ENCOUNTER_BASIS','Each requested line needs at least one independently visited basis arrival beyond its origin.');
    requireThat(basisPositionIds.every(positionId=>memberships.some(m=>m.position_id===positionId&&m.role==='arrival')),'INVALID_ENCOUNTER_BASIS','Weave basis must use developed arrivals rather than shared line origins.');
  }

  snapshot(explorationId:string):{gestureRequests:GestureRequest[];gestureResolutions:GestureResolution[];weaveProposals:WeaveProposal[]}{
    const rows=<T>(table:string)=>(this.db.prepare(`SELECT body FROM ${table} WHERE exploration_id=? ORDER BY rowid`).all(explorationId) as Row[]).map(r=>JSON.parse(r.body) as T);
    return {gestureRequests:rows<GestureRequest>('gesture_requests'),gestureResolutions:rows<GestureResolution>('gesture_resolutions'),weaveProposals:rows<WeaveProposal>('weave_proposals')};
  }
  pending(explorationId:string):GestureRequest[]{
    const {gestureRequests,gestureResolutions,weaveProposals}=this.snapshot(explorationId);const resolved=new Set(gestureResolutions.map(r=>r.requestId));const proposed=new Set(weaveProposals.map(p=>p.requestId));
    return gestureRequests.filter(r=>!resolved.has(r.id)&&(r.kind==='branch'||!proposed.has(r.id)));
  }

  requestBranch(input:{explorationId:string;fromPositionId:string;label:string;direction:string}):BranchGestureRequest{
    this.paused(input.explorationId);this.position(input.explorationId,input.fromPositionId);text(input.label,'branch label',200);text(input.direction,'branch direction');
    const createdAt=this.stamp();const line:Line={id:randomUUID(),explorationId:input.explorationId,label:input.label,status:'exploratory',originPositionId:input.fromPositionId,createdAt};
    this.db.prepare('INSERT INTO lines(id,exploration_id,body) VALUES(?,?,?)').run(line.id,line.explorationId,JSON.stringify(line));
    this.db.prepare('INSERT INTO line_memberships(line_id,position_id,role,created_at) VALUES(?,?,?,?)').run(line.id,input.fromPositionId,'origin',createdAt);
    const request:BranchGestureRequest={id:randomUUID(),explorationId:input.explorationId,kind:'branch',fromPositionId:input.fromPositionId,lineId:line.id,label:input.label,direction:input.direction,createdAt};
    this.db.prepare('INSERT INTO gesture_requests(id,exploration_id,kind,body) VALUES(?,?,?,?)').run(request.id,request.explorationId,request.kind,JSON.stringify(request));
    this.bumpRevision(request.explorationId);this.event(request.explorationId,'gesture.branch.requested',{request,line});return request;
  }

  requestWeave(input:{explorationId:string;lineIds:string[];basisPositionIds:string[];focus:string}):WeaveGestureRequest{
    this.paused(input.explorationId);this.validateWeaveBasis(input.explorationId,input.lineIds,input.basisPositionIds);text(input.focus,'weave focus');
    const request:WeaveGestureRequest={id:randomUUID(),explorationId:input.explorationId,kind:'weave',lineIds:input.lineIds,basisPositionIds:input.basisPositionIds,focus:input.focus,createdAt:this.stamp()};
    this.db.prepare('INSERT INTO gesture_requests(id,exploration_id,kind,body) VALUES(?,?,?,?)').run(request.id,request.explorationId,request.kind,JSON.stringify(request));
    this.bumpRevision(request.explorationId);this.event(request.explorationId,'gesture.weave.requested',request);return request;
  }

  submitWeave(input:{gestureRequestId:string;kind:Encounter['kind'];summary:string;uncertainty:string[]}):WeaveProposal{
    const request=this.unresolved(input.gestureRequestId);requireThat(request.kind==='weave','INVALID_GESTURE','Only weave requests accept a weave result.');this.paused(request.explorationId);
    requireThat(!this.db.prepare('SELECT id FROM weave_proposals WHERE request_id=?').get(request.id),'GESTURE_RESULT_EXISTS','This weave request already has a proposed result awaiting human review.');
    requireThat(['correspondence','tension','mismatch','partial-overlap','convergence','none'].includes(input.kind),'INVALID_INPUT','Invalid weave result kind.');text(input.summary,'weave summary');uniqueStrings(input.uncertainty,'weave uncertainty',1,16);
    const proposal:WeaveProposal={id:randomUUID(),explorationId:request.explorationId,requestId:request.id,version:1,status:'pending',kind:input.kind,summary:input.summary,uncertainty:input.uncertainty,createdAt:this.stamp()};
    this.db.prepare('INSERT INTO weave_proposals(id,exploration_id,request_id,version,status,body) VALUES(?,?,?,?,?,?)').run(proposal.id,proposal.explorationId,proposal.requestId,proposal.version,proposal.status,JSON.stringify(proposal));
    this.bumpRevision(proposal.explorationId);this.event(proposal.explorationId,'gesture.weave.proposed',proposal);return proposal;
  }

  ticket(proposalId:string):WeaveReviewTicket{
    const row=this.db.prepare('SELECT body FROM weave_proposals WHERE id=?').get(proposalId) as Row|undefined;requireThat(row,'NOT_FOUND','Weave proposal not found.');const proposal=JSON.parse(row.body) as WeaveProposal;requireThat(proposal.status==='pending','GESTURE_RESULT_CLOSED','This weave proposal is closed.');
    const token=randomBytes(32).toString('base64url'),expiresAt=this.now()+10*60*1000;this.db.prepare('DELETE FROM weave_capabilities WHERE expires < ?').run(this.now());this.db.prepare('INSERT INTO weave_capabilities(hash,proposal_id,version,expires) VALUES(?,?,?,?)').run(tokenHash(token),proposal.id,proposal.version,expiresAt);return {proposalId:proposal.id,version:proposal.version,token,expiresAt};
  }

  review(input:{proposalId:string;expectedVersion:number;token:string;action:'keep'|'discard'}):{proposal:WeaveProposal;encounter?:Encounter}{
    text(input.token,'weave review token',128);requireThat(Number.isSafeInteger(input.expectedVersion)&&input.expectedVersion>0,'INVALID_INPUT','Invalid weave proposal version.');requireThat(['keep','discard'].includes(input.action),'INVALID_INPUT','Invalid weave review action.');
    const cap=this.db.prepare('SELECT * FROM weave_capabilities WHERE hash=?').get(tokenHash(input.token));requireThat(cap&&cap.proposal_id===input.proposalId&&cap.version===input.expectedVersion&&cap.used===0&&Number(cap.expires)>this.now(),'REVIEW_REQUIRED','Weave review authorization is missing, expired, used, or stale. Reopen the exploration.');
    const row=this.db.prepare('SELECT body FROM weave_proposals WHERE id=?').get(input.proposalId) as Row|undefined;requireThat(row,'NOT_FOUND','Weave proposal not found.');const proposal=JSON.parse(row.body) as WeaveProposal;requireThat(proposal.status==='pending'&&proposal.version===input.expectedVersion,'STALE_DRAFT','The weave proposal changed or closed. Reopen it before reviewing.');
    const request=this.unresolved(proposal.requestId);requireThat(request.kind==='weave','INVALID_GESTURE','Weave proposal is not attached to a weave request.');let encounter:Encounter|undefined;
    if(input.action==='keep') encounter=this.recordEncounter({explorationId:request.explorationId,lineIds:request.lineIds,basisPositionIds:request.basisPositionIds,kind:proposal.kind,summary:proposal.summary,uncertainty:proposal.uncertainty});
    proposal.status=input.action==='keep'?'kept':'discarded';proposal.version++;
    this.db.prepare('UPDATE weave_proposals SET version=?,status=?,body=? WHERE id=?').run(proposal.version,proposal.status,JSON.stringify(proposal),proposal.id);
    const resolution:GestureResolution={id:randomUUID(),explorationId:proposal.explorationId,requestId:proposal.requestId,outcome:input.action==='keep'?'weave-kept':'dismissed',...(encounter?{targetId:encounter.id}:{}),createdAt:this.stamp()};
    this.db.prepare('INSERT INTO gesture_resolutions(id,exploration_id,request_id,outcome,target_id,body) VALUES(?,?,?,?,?,?)').run(resolution.id,resolution.explorationId,resolution.requestId,resolution.outcome,resolution.targetId??null,JSON.stringify(resolution));
    if(input.action==='discard')this.bumpRevision(proposal.explorationId);this.db.prepare('UPDATE weave_capabilities SET used=1 WHERE proposal_id=?').run(proposal.id);this.event(proposal.explorationId,`gesture.weave.${input.action}`,{proposal,resolution,encounter});return {proposal,encounter};
  }

  dismiss(requestId:string):GestureResolution{
    const request=this.unresolved(requestId);this.paused(request.explorationId);requireThat(!this.db.prepare("SELECT id FROM weave_proposals WHERE request_id=? AND status='pending'").get(requestId),'REVIEW_REQUIRED','Review the pending weave result instead of dismissing its request.');
    const resolution:GestureResolution={id:randomUUID(),explorationId:request.explorationId,requestId:request.id,outcome:'dismissed',createdAt:this.stamp()};
    this.db.prepare('INSERT INTO gesture_resolutions(id,exploration_id,request_id,outcome,target_id,body) VALUES(?,?,?,?,?,?)').run(resolution.id,resolution.explorationId,resolution.requestId,resolution.outcome,null,JSON.stringify(resolution));this.bumpRevision(request.explorationId);this.event(request.explorationId,'gesture.dismissed',resolution);return resolution;
  }

  branchRequest(requestId:string):BranchGestureRequest{
    const request=this.unresolved(requestId);requireThat(request.kind==='branch','INVALID_GESTURE','This gesture request is not a branch request.');return request;
  }
  resolveBranch(requestId:string,targetId:string):void{
    const request=this.unresolved(requestId);requireThat(request.kind==='branch','INVALID_GESTURE','This gesture request is not a branch request.');this.position(request.explorationId,targetId);
    const resolution:GestureResolution={id:randomUUID(),explorationId:request.explorationId,requestId:request.id,outcome:'branch-landed',targetId,createdAt:this.stamp()};
    this.db.prepare('INSERT INTO gesture_resolutions(id,exploration_id,request_id,outcome,target_id,body) VALUES(?,?,?,?,?,?)').run(resolution.id,resolution.explorationId,resolution.requestId,resolution.outcome,targetId,JSON.stringify(resolution));this.event(request.explorationId,'gesture.branch.landed',resolution);
  }
}
