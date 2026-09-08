export const MIGRATIONS = [
  `CREATE TABLE explorations (id TEXT PRIMARY KEY, body TEXT NOT NULL) STRICT;
   CREATE TABLE positions (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE moves (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), status TEXT NOT NULL, body TEXT NOT NULL) STRICT;
   CREATE UNIQUE INDEX one_live_move ON moves(exploration_id) WHERE status IN ('prepared','submitted');
   CREATE TABLE drafts (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), move_id TEXT NOT NULL UNIQUE REFERENCES moves(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE capabilities (hash TEXT PRIMARY KEY, draft_id TEXT NOT NULL REFERENCES drafts(id), version INTEGER NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0) STRICT;
   CREATE TABLE receipts (scope TEXT NOT NULL, key TEXT NOT NULL, hash TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(scope,key)) STRICT;
   CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, exploration_id TEXT NOT NULL REFERENCES explorations(id), kind TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
   CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
   CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
   CREATE TRIGGER positions_no_update BEFORE UPDATE ON positions BEGIN SELECT RAISE(ABORT,'Positions are immutable'); END;
   CREATE TRIGGER positions_no_delete BEFORE DELETE ON positions BEGIN SELECT RAISE(ABORT,'Positions are immutable'); END;`,
  `CREATE TABLE lines (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE line_memberships (line_id TEXT NOT NULL REFERENCES lines(id), position_id TEXT NOT NULL REFERENCES positions(id), role TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(line_id,position_id)) STRICT;
   CREATE TABLE transitions (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), from_position_id TEXT NOT NULL REFERENCES positions(id), to_position_id TEXT NOT NULL REFERENCES positions(id), line_id TEXT REFERENCES lines(id), kind TEXT NOT NULL, body TEXT NOT NULL) STRICT;
   CREATE INDEX line_memberships_position ON line_memberships(position_id);
   CREATE INDEX transitions_from ON transitions(from_position_id);
   CREATE INDEX transitions_to ON transitions(to_position_id);
   CREATE TRIGGER line_memberships_no_update BEFORE UPDATE ON line_memberships BEGIN SELECT RAISE(ABORT,'Line membership is historical'); END;
   CREATE TRIGGER line_memberships_no_delete BEFORE DELETE ON line_memberships BEGIN SELECT RAISE(ABORT,'Line membership is historical'); END;
   CREATE TRIGGER transitions_no_update BEFORE UPDATE ON transitions BEGIN SELECT RAISE(ABORT,'Transitions are historical'); END;
   CREATE TRIGGER transitions_no_delete BEFORE DELETE ON transitions BEGIN SELECT RAISE(ABORT,'Transitions are historical'); END;`,
  `CREATE TABLE observations (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), position_id TEXT REFERENCES positions(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE structural_constraints (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), discovered_at_position_id TEXT NOT NULL REFERENCES positions(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE operations (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE operation_applications (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), operation_id TEXT NOT NULL REFERENCES operations(id), line_id TEXT NOT NULL REFERENCES lines(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE encounters (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), body TEXT NOT NULL) STRICT;
   CREATE TABLE encounter_lines (encounter_id TEXT NOT NULL REFERENCES encounters(id), line_id TEXT NOT NULL REFERENCES lines(id), PRIMARY KEY(encounter_id,line_id)) STRICT;
   CREATE INDEX observations_exploration ON observations(exploration_id);
   CREATE INDEX constraints_exploration ON structural_constraints(exploration_id);
   CREATE INDEX operations_exploration ON operations(exploration_id);
   CREATE INDEX applications_exploration ON operation_applications(exploration_id);
   CREATE INDEX encounters_exploration ON encounters(exploration_id);
   CREATE TRIGGER observations_no_update BEFORE UPDATE ON observations BEGIN SELECT RAISE(ABORT,'Observations are historical'); END;
   CREATE TRIGGER observations_no_delete BEFORE DELETE ON observations BEGIN SELECT RAISE(ABORT,'Observations are historical'); END;
   CREATE TRIGGER structural_constraints_no_update BEFORE UPDATE ON structural_constraints BEGIN SELECT RAISE(ABORT,'Constraints are historical'); END;
   CREATE TRIGGER structural_constraints_no_delete BEFORE DELETE ON structural_constraints BEGIN SELECT RAISE(ABORT,'Constraints are historical'); END;
   CREATE TRIGGER operations_no_update BEFORE UPDATE ON operations BEGIN SELECT RAISE(ABORT,'Operations are historical'); END;
   CREATE TRIGGER operations_no_delete BEFORE DELETE ON operations BEGIN SELECT RAISE(ABORT,'Operations are historical'); END;
   CREATE TRIGGER operation_applications_no_update BEFORE UPDATE ON operation_applications BEGIN SELECT RAISE(ABORT,'Applications are historical'); END;
   CREATE TRIGGER operation_applications_no_delete BEFORE DELETE ON operation_applications BEGIN SELECT RAISE(ABORT,'Applications are historical'); END;
   CREATE TRIGGER encounters_no_update BEFORE UPDATE ON encounters BEGIN SELECT RAISE(ABORT,'Encounters are historical'); END;
   CREATE TRIGGER encounters_no_delete BEFORE DELETE ON encounters BEGIN SELECT RAISE(ABORT,'Encounters are historical'); END;
   CREATE TRIGGER encounter_lines_no_update BEFORE UPDATE ON encounter_lines BEGIN SELECT RAISE(ABORT,'Encounter membership is historical'); END;
   CREATE TRIGGER encounter_lines_no_delete BEFORE DELETE ON encounter_lines BEGIN SELECT RAISE(ABORT,'Encounter membership is historical'); END;`,
  `CREATE TABLE gesture_requests (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), kind TEXT NOT NULL, body TEXT NOT NULL) STRICT;
   CREATE TABLE gesture_resolutions (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), request_id TEXT NOT NULL UNIQUE REFERENCES gesture_requests(id), outcome TEXT NOT NULL, target_id TEXT, body TEXT NOT NULL) STRICT;
   CREATE TABLE weave_proposals (id TEXT PRIMARY KEY, exploration_id TEXT NOT NULL REFERENCES explorations(id), request_id TEXT NOT NULL UNIQUE REFERENCES gesture_requests(id), version INTEGER NOT NULL, status TEXT NOT NULL, body TEXT NOT NULL) STRICT;
   CREATE TABLE weave_capabilities (hash TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES weave_proposals(id), version INTEGER NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0) STRICT;
   CREATE INDEX gesture_requests_exploration ON gesture_requests(exploration_id);
   CREATE INDEX gesture_resolutions_exploration ON gesture_resolutions(exploration_id);
   CREATE INDEX weave_proposals_exploration ON weave_proposals(exploration_id);
   CREATE TRIGGER gesture_requests_no_update BEFORE UPDATE ON gesture_requests BEGIN SELECT RAISE(ABORT,'Gesture requests are historical'); END;
   CREATE TRIGGER gesture_requests_no_delete BEFORE DELETE ON gesture_requests BEGIN SELECT RAISE(ABORT,'Gesture requests are historical'); END;
   CREATE TRIGGER gesture_resolutions_no_update BEFORE UPDATE ON gesture_resolutions BEGIN SELECT RAISE(ABORT,'Gesture resolutions are historical'); END;
   CREATE TRIGGER gesture_resolutions_no_delete BEFORE DELETE ON gesture_resolutions BEGIN SELECT RAISE(ABORT,'Gesture resolutions are historical'); END;`
];
