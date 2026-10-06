import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, conflict, notFound } from '../errors';
import { expectedVersion, newId, now, oneOf, optionalString, readJson, requireString } from '../util';

const CONSTRUCTION = ['vinyl', 'gunite', 'fiberglass', 'above_ground'] as const;
const VOLUME_SOURCE = ['measured', 'calculated', 'estimated'] as const;

export const customers = new Hono<AppEnv>();

customers.get('/customers', async (c) => {
  const { orgId } = c.get('user');
  const q = c.req.query('q');
  const stmt = q
    ? c.env.DB.prepare('SELECT * FROM customers WHERE org_id = ? AND name LIKE ? ORDER BY name LIMIT 200').bind(orgId, `%${q}%`)
    : c.env.DB.prepare('SELECT * FROM customers WHERE org_id = ? ORDER BY name LIMIT 200').bind(orgId);
  return c.json({ customers: (await stmt.all()).results });
});

customers.post('/customers', async (c) => {
  const { orgId } = c.get('user');
  const body = await readJson(c.req.raw);
  const t = now();
  const row = {
    id: newId(), org_id: orgId, name: requireString(body, 'name'),
    email: optionalString(body, 'email'), phone: optionalString(body, 'phone'),
    created_at: t, updated_at: t, version: 1,
  };
  await c.env.DB.prepare(
    'INSERT INTO customers (id, org_id, name, email, phone, created_at, updated_at, version) VALUES (?,?,?,?,?,?,?,1)',
  ).bind(row.id, orgId, row.name, row.email, row.phone, t, t).run();
  return c.json(row, 201);
});

customers.get('/customers/:id', async (c) => {
  const { orgId } = c.get('user');
  const id = c.req.param('id');
  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND org_id = ?').bind(id, orgId).first();
  if (!customer) throw notFound('Customer');
  const sites = (await c.env.DB.prepare('SELECT * FROM sites WHERE customer_id = ? AND org_id = ?').bind(id, orgId).all()).results;
  const pools = (await c.env.DB.prepare(
    'SELECT p.* FROM pools p JOIN sites s ON s.id = p.site_id WHERE s.customer_id = ? AND p.org_id = ?',
  ).bind(id, orgId).all()).results;
  return c.json({ ...customer, sites, pools });
});

customers.put('/customers/:id', async (c) => {
  const { orgId } = c.get('user');
  const id = c.req.param('id');
  const body = await readJson(c.req.raw);
  const version = expectedVersion(c.req.raw, body);
  const res = await c.env.DB.prepare(
    `UPDATE customers SET name = ?, email = ?, phone = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND org_id = ? AND version = ?`,
  ).bind(requireString(body, 'name'), optionalString(body, 'email'), optionalString(body, 'phone'), now(), id, orgId, version).run();
  const current = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND org_id = ?').bind(id, orgId).first();
  if (!current) throw notFound('Customer');
  if (res.meta.changes === 0) throw conflict(current);
  return c.json(current);
});

customers.post('/customers/:id/sites', async (c) => {
  const { orgId } = c.get('user');
  const customerId = c.req.param('id');
  const owner = await c.env.DB.prepare('SELECT id FROM customers WHERE id = ? AND org_id = ?').bind(customerId, orgId).first();
  if (!owner) throw notFound('Customer');
  const body = await readJson(c.req.raw);
  const row = {
    id: newId(), org_id: orgId, customer_id: customerId,
    address: requireString(body, 'address'), notes: optionalString(body, 'notes'), created_at: now(),
  };
  await c.env.DB.prepare('INSERT INTO sites (id, org_id, customer_id, address, notes, created_at) VALUES (?,?,?,?,?,?)')
    .bind(row.id, orgId, customerId, row.address, row.notes, row.created_at).run();
  return c.json(row, 201);
});

customers.post('/sites/:id/pools', async (c) => {
  const { orgId } = c.get('user');
  const siteId = c.req.param('id');
  const site = await c.env.DB.prepare('SELECT id FROM sites WHERE id = ? AND org_id = ?').bind(siteId, orgId).first();
  if (!site) throw notFound('Site');
  const body = await readJson(c.req.raw);
  const volume = body.volume_gal;
  if (volume !== undefined && volume !== null && (typeof volume !== 'number' || !(volume > 0) || volume > 2_000_000)) {
    throw badRequest('"volume_gal" must be a positive number of US gallons');
  }
  const hasVolume = typeof volume === 'number';
  const row = {
    id: newId(), org_id: orgId, site_id: siteId,
    label: optionalString(body, 'label') ?? 'Pool',
    construction: oneOf(body, 'construction', CONSTRUCTION),
    volume_gal: hasVolume ? volume : null,
    volume_source: hasVolume ? oneOf(body, 'volume_source', VOLUME_SOURCE) : null,
    created_at: now(),
  };
  await c.env.DB.prepare(
    'INSERT INTO pools (id, org_id, site_id, label, construction, volume_gal, volume_source, created_at) VALUES (?,?,?,?,?,?,?,?)',
  ).bind(row.id, orgId, siteId, row.label, row.construction, row.volume_gal, row.volume_source, row.created_at).run();
  return c.json(row, 201);
});
