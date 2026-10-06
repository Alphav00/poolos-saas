import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, conflict, notFound } from '../errors';
import { evaluateMeasurement, type JobClosure } from '../measure';
import { expectedVersion, newId, now, oneOf, readJson } from '../util';

const KINDS = ['liner', 'cover', 'both'] as const;
const STATUSES = ['measuring', 'review', 'ordered', 'closed'] as const;

export const jobs = new Hono<AppEnv>();

interface JobRow {
  id: string; org_id: string; pool_id: string; kind: (typeof KINDS)[number]; status: (typeof STATUSES)[number];
  measurement: string; closure: string | null; created_by: string | null; created_at: string; updated_at: string; version: number;
}

function decode(row: JobRow) {
  return {
    ...row,
    measurement: JSON.parse(row.measurement) as Record<string, unknown>,
    closure: row.closure ? (JSON.parse(row.closure) as JobClosure) : null,
  };
}

async function load(c: { env: AppEnv['Bindings'] }, id: string, orgId: string) {
  const row = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ? AND org_id = ?').bind(id, orgId).first<JobRow>();
  if (!row) throw notFound('Job');
  return decode(row);
}

jobs.get('/jobs', async (c) => {
  const { orgId } = c.get('user');
  const status = c.req.query('status');
  const stmt = status
    ? c.env.DB.prepare('SELECT id, pool_id, kind, status, updated_at, version FROM jobs WHERE org_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 200').bind(orgId, status)
    : c.env.DB.prepare('SELECT id, pool_id, kind, status, updated_at, version FROM jobs WHERE org_id = ? ORDER BY updated_at DESC LIMIT 200').bind(orgId);
  return c.json({ jobs: (await stmt.all()).results });
});

jobs.post('/jobs', async (c) => {
  const user = c.get('user');
  const body = await readJson(c.req.raw);
  const poolId = body.pool_id;
  if (typeof poolId !== 'string') throw badRequest('"pool_id" is required');
  const pool = await c.env.DB.prepare('SELECT id FROM pools WHERE id = ? AND org_id = ?').bind(poolId, user.orgId).first();
  if (!pool) throw notFound('Pool');
  const id = body.id === undefined ? newId() : body.id;
  // Clients may mint the id offline so a retried create is idempotent.
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw badRequest('"id" must be a UUID');
  const existing = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<JobRow>();
  if (existing) {
    if (existing.org_id !== user.orgId) throw badRequest('"id" is already in use');
    return c.json(decode(existing), 200);
  }
  const t = now();
  const kind = oneOf(body, 'kind', KINDS);
  await c.env.DB.prepare(
    `INSERT INTO jobs (id, org_id, pool_id, kind, status, measurement, closure, created_by, created_at, updated_at, version)
     VALUES (?,?,?,?, 'measuring', '{}', NULL, ?, ?, ?, 1)`,
  ).bind(id, user.orgId, poolId, kind, user.id, t, t).run();
  return c.json(await load(c, id, user.orgId), 201);
});

jobs.get('/jobs/:id', async (c) => c.json(await load(c, c.req.param('id'), c.get('user').orgId)));

/**
 * Saves the capture. The server recomputes the closure checks from the
 * measurement itself; a client-sent closure result is ignored.
 */
jobs.put('/jobs/:id', async (c) => {
  const { orgId } = c.get('user');
  const id = c.req.param('id');
  const body = await readJson(c.req.raw);
  const version = expectedVersion(c.req.raw, body);
  const current = await load(c, id, orgId);
  if (current.version !== version) throw conflict(current);

  const measurement = body.measurement ?? current.measurement;
  if (measurement === null || typeof measurement !== 'object' || Array.isArray(measurement)) {
    throw badRequest('"measurement" must be an object');
  }
  const status = body.status === undefined ? current.status : oneOf(body, 'status', STATUSES);
  if (status === 'ordered' && current.status !== 'ordered') {
    throw badRequest('A job becomes "ordered" when an order is submitted, not by editing it');
  }
  const closure = evaluateMeasurement(current.kind, measurement as Record<string, unknown>);
  if (status === 'review' && closure.blocking.length > 0) {
    throw badRequest('Fix the blocking checks before sending this job to review', closure.blocking);
  }
  const res = await c.env.DB.prepare(
    `UPDATE jobs SET measurement = ?, closure = ?, status = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND org_id = ? AND version = ?`,
  ).bind(JSON.stringify(measurement), JSON.stringify(closure), status, now(), id, orgId, version).run();
  if (res.meta.changes === 0) throw conflict(await load(c, id, orgId));
  return c.json(await load(c, id, orgId));
});
