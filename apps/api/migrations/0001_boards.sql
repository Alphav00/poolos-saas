-- Boards brought over from Claude artifacts. Each board keeps the same
-- collection/document model it had in the artifact runtime, so the board
-- pages run unchanged. One row per document; data is the document as JSON.
CREATE TABLE board_docs (
  board       TEXT NOT NULL,
  collection  TEXT NOT NULL,
  id          TEXT NOT NULL,
  data        TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT NOT NULL,
  -- A delete keeps the row as a tombstone so polling clients see it go.
  deleted     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (board, collection, id)
);
CREATE INDEX board_docs_changed ON board_docs (board, collection, updated_at);

-- Append-only record of every write, for audit (DESIGN.md section 5.6).
CREATE TABLE board_writes (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  board       TEXT NOT NULL,
  collection  TEXT NOT NULL,
  id          TEXT NOT NULL,
  op          TEXT NOT NULL CHECK (op IN ('set', 'update', 'delete')),
  data        TEXT NOT NULL,
  at          TEXT NOT NULL,
  by          TEXT NOT NULL
);
CREATE TRIGGER board_writes_no_update BEFORE UPDATE ON board_writes
  BEGIN SELECT RAISE(ABORT, 'board_writes is append-only'); END;
CREATE TRIGGER board_writes_no_delete BEFORE DELETE ON board_writes
  BEGIN SELECT RAISE(ABORT, 'board_writes is append-only'); END;
