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
   CREATE TRIGGER positions_no_delete BEFORE DELETE ON positions BEGIN SELECT RAISE(ABORT,'Positions are immutable'); END;`
];
