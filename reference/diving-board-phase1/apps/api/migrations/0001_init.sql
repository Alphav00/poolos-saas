-- The Diving Board — initial schema.
--
-- Every tenant-owned row carries org_id, and every query filters on it.
-- Rows that can be edited from more than one device carry `version`; writes
-- must send the version they read and get 409 if someone saved in between,
-- so a phone that was offline can never silently overwrite newer data.

PRAGMA foreign_keys = ON;

-- An installer company. Its name and contact details head every order form.
CREATE TABLE orgs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  email       TEXT NOT NULL COLLATE NOCASE,
  name        TEXT,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'office', 'tech')),
  created_at  TEXT NOT NULL,
  UNIQUE (org_id, email)
);
CREATE INDEX users_email ON users(email);

CREATE TABLE customers (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX customers_org ON customers(org_id);

CREATE TABLE sites (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  address     TEXT NOT NULL,
  notes       TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX sites_org ON sites(org_id, customer_id);

CREATE TABLE pools (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs(id),
  site_id       TEXT NOT NULL REFERENCES sites(id),
  label         TEXT NOT NULL DEFAULT 'Pool',
  construction  TEXT NOT NULL CHECK (construction IN ('vinyl', 'gunite', 'fiberglass', 'above_ground')),
  -- Gallons are stored with how they were obtained: a guessed volume is the
  -- root of most dosing errors, so the UI must show it as an estimate.
  volume_gal    REAL,
  volume_source TEXT CHECK (volume_source IN ('measured', 'calculated', 'estimated')),
  created_at    TEXT NOT NULL
);
CREATE INDEX pools_org ON pools(org_id, site_id);

-- A measuring visit. `measurement` is the full capture (A/B points, walls,
-- profile, fittings, obstacles) as JSON; `closure` is the server-computed
-- result of the closure checks for that capture.
CREATE TABLE jobs (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES orgs(id),
  pool_id      TEXT NOT NULL REFERENCES pools(id),
  kind         TEXT NOT NULL CHECK (kind IN ('liner', 'cover', 'both')),
  status       TEXT NOT NULL DEFAULT 'measuring' CHECK (status IN ('measuring', 'review', 'ordered', 'closed')),
  measurement  TEXT NOT NULL DEFAULT '{}',
  closure      TEXT,
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX jobs_org ON jobs(org_id, status);

-- Built-in suppliers (Latham, Merlin, Loop-Loc, Garrett, generic) live in
-- packages/orders. This table holds each installer's own definitions: their
-- dealer-account contact and channel for a built-in, or a supplier they add.
CREATE TABLE tenant_suppliers (
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  supplier_id TEXT NOT NULL,
  definition  TEXT NOT NULL,                      -- JSON SupplierInput
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (org_id, supplier_id)
);

CREATE TABLE orders (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES orgs(id),
  job_id       TEXT NOT NULL REFERENCES jobs(id),
  supplier_id  TEXT NOT NULL,
  reference    TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL,
  payload      TEXT NOT NULL,                     -- the full order (packages/orders Order), audit trail included
  pdf_key      TEXT,                              -- R2 key of the PDF that was sent
  submitted_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX orders_org ON orders(org_id, status);
CREATE INDEX orders_job ON orders(org_id, job_id);

-- Append-only. Never UPDATE or DELETE rows here.
CREATE TABLE order_events (
  order_id     TEXT NOT NULL REFERENCES orders(id),
  seq          INTEGER NOT NULL,
  org_id       TEXT NOT NULL REFERENCES orgs(id),
  event        TEXT NOT NULL,
  detail       TEXT,                              -- JSON
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  actor        TEXT,
  at           TEXT NOT NULL,
  PRIMARY KEY (order_id, seq)
);
CREATE TRIGGER order_events_no_update BEFORE UPDATE ON order_events
  BEGIN SELECT RAISE(ABORT, 'order_events is append-only'); END;
CREATE TRIGGER order_events_no_delete BEFORE DELETE ON order_events
  BEGIN SELECT RAISE(ABORT, 'order_events is append-only'); END;
