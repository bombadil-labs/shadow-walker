import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { requireThat, text } from '../../domain/src/index.ts';
import type {
  CartographySnapshot,
  Encounter,
  Observation,
  Operation,
  OperationApplication,
  StructuralConstraint,
} from '../../domain/src/cartography.ts';

type Row = { body: string };
type EventFn = (explorationId: string, kind: string, body: unknown) => void;

function stringList(value: unknown, name: string, options: { min?: number; max?: number } = {}): asserts value is string[] {
  const min=options.min ?? 0; const max=options.max ?? 32;
  requireThat(Array.isArray(value) && value.length >= min && value.length <= max, 'INVALID_INPUT', `${name} must contain ${min} to ${max} strings.`);
  for(const item of value) text(item,name);
  requireThat(new Set(value).size===value.length,'INVALID_INPUT',`${name} must not contain duplicates.`);
}

export class FlightLinesStore {
  private readonly db: DatabaseSync;
  private readonly stamp: () => string;
  private readonly event: EventFn;

  constructor(db: DatabaseSync, stamp: () => string, event: EventFn) {
    this.db=db; this.stamp=stamp; this.event=event;
  }

  private exists(table: 'explorations'|'positions'|'lines'|'observations'|'structural_constraints'|'operations', id: string, explorationId: string): boolean {
    const column=table==='lines'||table==='observations'||table==='structural_constraints'||table==='operations'?'exploration_id':table==='positions'?'exploration_id':null;
    if(table==='explorations') return !!this.db.prepare('SELECT id FROM explorations WHERE id=?').get(id);
    return !!this.db.prepare(`SELECT id FROM ${table} WHERE id=? AND ${column}=?`).get(id,explorationId);
  }

  snapshot(explorationId: string): Pick<CartographySnapshot,'observations'|'constraints'|'operations'|'applications'|'encounters'> {
    const rows=<T>(table:string)=>(this.db.prepare(`SELECT body FROM ${table} WHERE exploration_id=? ORDER BY rowid`).all(explorationId) as Row[]).map(r=>JSON.parse(r.body) as T);
    return {
      observations:rows<Observation>('observations'),
      constraints:rows<StructuralConstraint>('structural_constraints'),
      operations:rows<Operation>('operations'),
      applications:rows<OperationApplication>('operation_applications'),
      encounters:rows<Encounter>('encounters'),
    };
  }

  recordObservation(input:{ explorationId:string; positionId?:string; kind:Observation['kind']; detail:string; source:string; observedAt?:string }): Observation {
    requireThat(this.exists('explorations',input.explorationId,input.explorationId),'NOT_FOUND','Exploration not found.');
    if(input.positionId) requireThat(this.exists('positions',input.positionId,input.explorationId),'NOT_FOUND','Observation arrival is not in this exploration.');
    requireThat(['human-report','source','tool-result','measurement'].includes(input.kind),'INVALID_INPUT','Observation provenance must be external to model generation.');
    text(input.detail,'observation detail'); text(input.source,'observation source');
    if(input.observedAt!==undefined) text(input.observedAt,'observedAt',200);
    const observation:Observation={id:randomUUID(),explorationId:input.explorationId,kind:input.kind,detail:input.detail,source:input.source,createdAt:this.stamp(),...(input.positionId?{positionId:input.positionId}:{}),...(input.observedAt?{observedAt:input.observedAt}:{})};
    this.db.prepare('INSERT INTO observations(id,exploration_id,position_id,body) VALUES(?,?,?,?)').run(observation.id,observation.explorationId,observation.positionId??null,JSON.stringify(observation));
    this.event(observation.explorationId,'observation.recorded',observation); return observation;
  }

  recordConstraint(input:{ explorationId:string; label:string; description:string; discoveredAtPositionId:string; provenance:StructuralConstraint['provenance']; observationIds:string[] }): StructuralConstraint {
    requireThat(this.exists('explorations',input.explorationId,input.explorationId),'NOT_FOUND','Exploration not found.');
    requireThat(this.exists('positions',input.discoveredAtPositionId,input.explorationId),'NOT_FOUND','Constraint must be situated at a visited arrival.');
    text(input.label,'constraint label',200); text(input.description,'constraint description');
    requireThat(['walker-report','human-offered','observation-derived','breakdown-derived'].includes(input.provenance),'INVALID_INPUT','Invalid constraint provenance.');
    stringList(input.observationIds,'constraint observationIds',{max:16});
    for(const id of input.observationIds) requireThat(this.exists('observations',id,input.explorationId),'INVALID_OBSERVATION','Constraint observation is not in this exploration.');
    if(input.provenance==='observation-derived'||input.provenance==='breakdown-derived') requireThat(input.observationIds.length>0,'OBSERVATION_REQUIRED','Observation-derived and breakdown-derived constraints need grounded observations.');
    const constraint:StructuralConstraint={id:randomUUID(),explorationId:input.explorationId,label:input.label,description:input.description,discoveredAtPositionId:input.discoveredAtPositionId,provenance:input.provenance,observationIds:input.observationIds,epistemicStatus:'candidate',createdAt:this.stamp()};
    this.db.prepare('INSERT INTO structural_constraints(id,exploration_id,discovered_at_position_id,body) VALUES(?,?,?,?)').run(constraint.id,constraint.explorationId,constraint.discoveredAtPositionId,JSON.stringify(constraint));
    this.event(constraint.explorationId,'constraint.recorded',constraint); return constraint;
  }

  recordOperation(input:{ explorationId:string; name:string; originDomain:string; inputStructure:string; outputStructure:string; preserves:string[]; transforms:string[]; procedure:string[]; constraintIds:string[] }): Operation {
    requireThat(this.exists('explorations',input.explorationId,input.explorationId),'NOT_FOUND','Exploration not found.');
    text(input.name,'operation name',200); text(input.originDomain,'operation origin domain',500); text(input.inputStructure,'operation input structure'); text(input.outputStructure,'operation output structure');
    stringList(input.preserves,'operation preserves',{min:1,max:16}); stringList(input.transforms,'operation transforms',{min:1,max:16}); stringList(input.procedure,'operation procedure',{min:1,max:32}); stringList(input.constraintIds,'operation constraintIds',{min:1,max:16});
    for(const id of input.constraintIds) requireThat(this.exists('structural_constraints',id,input.explorationId),'INVALID_CONSTRAINT','Operation constraint is not in this exploration.');
    const operation:Operation={id:randomUUID(),explorationId:input.explorationId,name:input.name,originDomain:input.originDomain,inputStructure:input.inputStructure,outputStructure:input.outputStructure,preserves:input.preserves,transforms:input.transforms,procedure:input.procedure,constraintIds:input.constraintIds,epistemicStatus:'candidate',createdAt:this.stamp()};
    this.db.prepare('INSERT INTO operations(id,exploration_id,body) VALUES(?,?,?)').run(operation.id,operation.explorationId,JSON.stringify(operation));
    this.event(operation.explorationId,'operation.recorded',operation); return operation;
  }

  recordApplication(input:{ explorationId:string; operationId:string; lineId:string; targetConstraintIds:string[]; adaptation:string; protocol:string[]; outcome:OperationApplication['outcome']; observationIds:string[]; revealedConstraintIds:string[] }): OperationApplication {
    requireThat(this.exists('explorations',input.explorationId,input.explorationId),'NOT_FOUND','Exploration not found.');
    requireThat(this.exists('operations',input.operationId,input.explorationId),'INVALID_OPERATION','Operation is not in this exploration.');
    requireThat(this.exists('lines',input.lineId,input.explorationId),'INVALID_LINE','Application line is not in this exploration.');
    stringList(input.targetConstraintIds,'application targetConstraintIds',{min:1,max:16}); stringList(input.protocol,'application protocol',{min:1,max:32}); stringList(input.observationIds,'application observationIds',{max:16}); stringList(input.revealedConstraintIds,'application revealedConstraintIds',{max:16});
    text(input.adaptation,'application adaptation'); requireThat(['proposed','executed','observed','broke-down'].includes(input.outcome),'INVALID_INPUT','Invalid application outcome.');
    for(const id of [...input.targetConstraintIds,...input.revealedConstraintIds]) requireThat(this.exists('structural_constraints',id,input.explorationId),'INVALID_CONSTRAINT','Application constraint is not in this exploration.');
    for(const id of input.observationIds) requireThat(this.exists('observations',id,input.explorationId),'INVALID_OBSERVATION','Application observation is not in this exploration.');
    if(input.outcome!=='proposed') requireThat(input.observationIds.length>0,'OBSERVATION_REQUIRED','Executed, observed, or broken-down applications require external observation provenance.');
    if(input.outcome==='broke-down') requireThat(input.revealedConstraintIds.length>0,'CONSTRAINT_REQUIRED','A recorded breakdown must preserve at least one revealed structural constraint.');
    const application:OperationApplication={id:randomUUID(),explorationId:input.explorationId,operationId:input.operationId,lineId:input.lineId,targetConstraintIds:input.targetConstraintIds,adaptation:input.adaptation,protocol:input.protocol,outcome:input.outcome,observationIds:input.observationIds,revealedConstraintIds:input.revealedConstraintIds,createdAt:this.stamp()};
    this.db.prepare('INSERT INTO operation_applications(id,exploration_id,operation_id,line_id,body) VALUES(?,?,?,?,?)').run(application.id,application.explorationId,application.operationId,application.lineId,JSON.stringify(application));
    this.event(application.explorationId,'application.recorded',application); return application;
  }

  recordEncounter(input:{ explorationId:string; lineIds:string[]; basisPositionIds:string[]; kind:Encounter['kind']; summary:string; uncertainty:string[] }): Encounter {
    requireThat(this.exists('explorations',input.explorationId,input.explorationId),'NOT_FOUND','Exploration not found.');
    stringList(input.lineIds,'encounter lineIds',{min:2,max:8}); stringList(input.basisPositionIds,'encounter basisPositionIds',{min:2,max:16}); stringList(input.uncertainty,'encounter uncertainty',{min:1,max:16}); text(input.summary,'encounter summary');
    requireThat(['correspondence','tension','mismatch','partial-overlap','convergence','none'].includes(input.kind),'INVALID_INPUT','Invalid encounter kind.');
    for(const id of input.lineIds) requireThat(this.exists('lines',id,input.explorationId),'INVALID_LINE','Encounter line is not in this exploration.');
    for(const id of input.basisPositionIds) requireThat(this.exists('positions',id,input.explorationId),'INVALID_PARENT','Encounter basis arrival is not in this exploration.');
    const memberships=this.db.prepare(`SELECT line_id,position_id FROM line_memberships WHERE line_id IN (${input.lineIds.map(()=>'?').join(',')})`).all(...input.lineIds) as Array<{line_id:string;position_id:string}>;
    for(const lineId of input.lineIds) requireThat(input.basisPositionIds.some(positionId=>memberships.some(m=>m.line_id===lineId&&m.position_id===positionId)),'INVALID_ENCOUNTER_BASIS','Each encountered line needs at least one visited basis arrival.');
    requireThat(input.basisPositionIds.every(positionId=>memberships.some(m=>m.position_id===positionId)),'INVALID_ENCOUNTER_BASIS','Encounter basis arrivals must belong to one of the selected lines.');
    const encounter:Encounter={id:randomUUID(),explorationId:input.explorationId,lineIds:input.lineIds,basisPositionIds:input.basisPositionIds,kind:input.kind,summary:input.summary,uncertainty:input.uncertainty,epistemicStatus:'candidate',createdAt:this.stamp()};
    this.db.prepare('INSERT INTO encounters(id,exploration_id,body) VALUES(?,?,?)').run(encounter.id,encounter.explorationId,JSON.stringify(encounter));
    for(const lineId of encounter.lineIds) this.db.prepare('INSERT INTO encounter_lines(encounter_id,line_id) VALUES(?,?)').run(encounter.id,lineId);
    this.event(encounter.explorationId,'encounter.recorded',encounter); return encounter;
  }
}
