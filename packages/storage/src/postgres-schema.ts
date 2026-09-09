/** Postgres schema for the hosted Shadow Walker store.
 *
 * The relational columns keep integrity/indexing useful while `body` remains the
 * canonical serialized domain object. Fresh hosted deployments run these
 * migrations transactionally; existing SQLite databases are not migrated by
 * this module.
 */
export const POSTGRES_MIGRATIONS: readonly (readonly string[])[] = [
  [
    `CREATE TABLE IF NOT EXISTS shadow_walker_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE OR REPLACE FUNCTION shadow_walker_reject_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION '%', TG_ARGV[0] USING ERRCODE='55000';
      END;
    $$ LANGUAGE plpgsql`,
    `CREATE TABLE explorations (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, body JSONB NOT NULL)`,
    `CREATE TABLE positions (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body JSONB NOT NULL)`,
    `CREATE TABLE moves (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), status TEXT NOT NULL, body JSONB NOT NULL)`,
    `CREATE TABLE drafts (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), move_id TEXT NOT NULL REFERENCES moves(id), body JSONB NOT NULL)`,
    `CREATE UNIQUE INDEX one_active_move ON moves(exploration_id) WHERE status IN ('prepared','submitted')`,
    `CREATE TABLE events (seq BIGSERIAL PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), kind TEXT NOT NULL, body JSONB NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE receipts (scope TEXT NOT NULL, key TEXT NOT NULL, hash TEXT NOT NULL, body JSONB NOT NULL, PRIMARY KEY(scope,key))`,
    `CREATE TABLE capabilities (hash TEXT PRIMARY KEY, draft_id TEXT NOT NULL REFERENCES drafts(id), version INTEGER NOT NULL, expires BIGINT NOT NULL, used INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE lines (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body JSONB NOT NULL)`,
    `CREATE TABLE line_memberships (seq BIGSERIAL UNIQUE NOT NULL, line_id TEXT NOT NULL REFERENCES lines(id), position_id TEXT NOT NULL REFERENCES positions(id), role TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(line_id,position_id))`,
    `CREATE TABLE transitions (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), from_position_id TEXT NOT NULL REFERENCES positions(id), to_position_id TEXT NOT NULL REFERENCES positions(id), line_id TEXT REFERENCES lines(id), kind TEXT NOT NULL, body JSONB NOT NULL)`,
    `CREATE INDEX line_memberships_position ON line_memberships(position_id)`,
    `CREATE INDEX transitions_from ON transitions(from_position_id)`,
    `CREATE INDEX transitions_to ON transitions(to_position_id)`,
    `CREATE TABLE observations (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), position_id TEXT REFERENCES positions(id), body JSONB NOT NULL)`,
    `CREATE TABLE structural_constraints (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), discovered_at_position_id TEXT NOT NULL REFERENCES positions(id), body JSONB NOT NULL)`,
    `CREATE TABLE operations (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body JSONB NOT NULL)`,
    `CREATE TABLE operation_applications (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), operation_id TEXT NOT NULL REFERENCES operations(id), line_id TEXT NOT NULL REFERENCES lines(id), body JSONB NOT NULL)`,
    `CREATE TABLE encounters (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body JSONB NOT NULL)`,
    `CREATE TABLE encounter_lines (seq BIGSERIAL UNIQUE NOT NULL, encounter_id TEXT NOT NULL REFERENCES encounters(id), line_id TEXT NOT NULL REFERENCES lines(id), PRIMARY KEY(encounter_id,line_id))`,
    `CREATE TABLE waypoints (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), from_position_id TEXT NOT NULL REFERENCES positions(id), status TEXT NOT NULL, body JSONB NOT NULL)`,
    `CREATE INDEX waypoints_exploration ON waypoints(exploration_id)`,
    `CREATE INDEX waypoints_origin ON waypoints(from_position_id)`,
    `CREATE TABLE traversals (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), move_id TEXT NOT NULL UNIQUE REFERENCES moves(id), line_id TEXT NOT NULL REFERENCES lines(id), rewalk_of_position_id TEXT REFERENCES positions(id), body JSONB NOT NULL)`,
    `CREATE INDEX traversals_exploration ON traversals(exploration_id)`,
    `CREATE INDEX traversals_rewalk_target ON traversals(rewalk_of_position_id)`,
    `CREATE TABLE gesture_requests (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), kind TEXT NOT NULL, body JSONB NOT NULL)`,
    `CREATE TABLE gesture_resolutions (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), request_id TEXT NOT NULL UNIQUE REFERENCES gesture_requests(id), outcome TEXT NOT NULL, target_id TEXT, body JSONB NOT NULL)`,
    `CREATE TABLE weave_proposals (seq BIGSERIAL UNIQUE NOT NULL, id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), request_id TEXT NOT NULL UNIQUE REFERENCES gesture_requests(id), version INTEGER NOT NULL, status TEXT NOT NULL, body JSONB NOT NULL)`,
    `CREATE TABLE weave_capabilities (hash TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES weave_proposals(id), version INTEGER NOT NULL, expires BIGINT NOT NULL, used INTEGER NOT NULL DEFAULT 0)`,
    `CREATE INDEX gesture_requests_exploration ON gesture_requests(exploration_id)`,
    `CREATE INDEX gesture_resolutions_exploration ON gesture_resolutions(exploration_id)`,
    `CREATE INDEX weave_proposals_exploration ON weave_proposals(exploration_id)`,
    `CREATE TRIGGER events_no_update BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Ledger is append-only')`,
    `CREATE TRIGGER events_no_delete BEFORE DELETE ON events FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Ledger is append-only')`,
    `CREATE TRIGGER positions_no_update BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Positions are immutable')`,
    `CREATE TRIGGER positions_no_delete BEFORE DELETE ON positions FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Positions are immutable')`,
    `CREATE TRIGGER line_memberships_no_update BEFORE UPDATE ON line_memberships FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Line membership is historical')`,
    `CREATE TRIGGER line_memberships_no_delete BEFORE DELETE ON line_memberships FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Line membership is historical')`,
    `CREATE TRIGGER transitions_no_update BEFORE UPDATE ON transitions FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Transitions are historical')`,
    `CREATE TRIGGER transitions_no_delete BEFORE DELETE ON transitions FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Transitions are historical')`,
    `CREATE TRIGGER observations_no_update BEFORE UPDATE ON observations FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Observations are historical')`,
    `CREATE TRIGGER observations_no_delete BEFORE DELETE ON observations FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Observations are historical')`,
    `CREATE TRIGGER structural_constraints_no_update BEFORE UPDATE ON structural_constraints FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Constraints are historical')`,
    `CREATE TRIGGER structural_constraints_no_delete BEFORE DELETE ON structural_constraints FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Constraints are historical')`,
    `CREATE TRIGGER operations_no_update BEFORE UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Operations are historical')`,
    `CREATE TRIGGER operations_no_delete BEFORE DELETE ON operations FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Operations are historical')`,
    `CREATE TRIGGER operation_applications_no_update BEFORE UPDATE ON operation_applications FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Applications are historical')`,
    `CREATE TRIGGER operation_applications_no_delete BEFORE DELETE ON operation_applications FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Applications are historical')`,
    `CREATE TRIGGER encounters_no_update BEFORE UPDATE ON encounters FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Encounters are historical')`,
    `CREATE TRIGGER encounters_no_delete BEFORE DELETE ON encounters FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Encounters are historical')`,
    `CREATE TRIGGER encounter_lines_no_update BEFORE UPDATE ON encounter_lines FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Encounter membership is historical')`,
    `CREATE TRIGGER encounter_lines_no_delete BEFORE DELETE ON encounter_lines FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Encounter membership is historical')`,
    `CREATE TRIGGER waypoints_no_delete BEFORE DELETE ON waypoints FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Waypoints are historical')`,
    `CREATE TRIGGER traversals_no_update BEFORE UPDATE ON traversals FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Traversals are historical')`,
    `CREATE TRIGGER traversals_no_delete BEFORE DELETE ON traversals FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Traversals are historical')`,
    `CREATE TRIGGER gesture_requests_no_update BEFORE UPDATE ON gesture_requests FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Gesture requests are historical')`,
    `CREATE TRIGGER gesture_requests_no_delete BEFORE DELETE ON gesture_requests FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Gesture requests are historical')`,
    `CREATE TRIGGER gesture_resolutions_no_update BEFORE UPDATE ON gesture_resolutions FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Gesture resolutions are historical')`,
    `CREATE TRIGGER gesture_resolutions_no_delete BEFORE DELETE ON gesture_resolutions FOR EACH ROW EXECUTE FUNCTION shadow_walker_reject_mutation('Gesture resolutions are historical')`
  ]
] as const;
