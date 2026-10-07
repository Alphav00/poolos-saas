-- Measure (liner and cover measuring, ported from Liner Measure Pro).
-- One row per job; data is the whole job as the API returns it (JSON), with a
-- few columns copied out for the job list.
CREATE TABLE measure_jobs (
  id             TEXT PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  dealer_name    TEXT NOT NULL,
  shape_type     TEXT NOT NULL,
  product_type   TEXT NOT NULL DEFAULT 'cover',
  status         TEXT NOT NULL DEFAULT 'draft',
  data           TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  created_by     TEXT NOT NULL,
  updated_by     TEXT NOT NULL
);
CREATE INDEX measure_jobs_updated ON measure_jobs (updated_at);

-- Every change to a measurement, with who and when (DESIGN.md module C:
-- "every measurement change is a commit with author and time"). Append-only.
CREATE TABLE measure_job_writes (
  seq     INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  TEXT NOT NULL,
  op      TEXT NOT NULL CHECK (op IN ('create', 'update', 'swap_ab', 'delete')),
  data    TEXT NOT NULL,
  at      TEXT NOT NULL,
  by      TEXT NOT NULL
);
CREATE INDEX measure_job_writes_job ON measure_job_writes (job_id, seq);
CREATE TRIGGER measure_job_writes_no_update BEFORE UPDATE ON measure_job_writes
  BEGIN SELECT RAISE(ABORT, 'measure_job_writes is append-only'); END;
CREATE TRIGGER measure_job_writes_no_delete BEFORE DELETE ON measure_job_writes
  BEGIN SELECT RAISE(ABORT, 'measure_job_writes is append-only'); END;
