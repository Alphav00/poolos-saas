import { beforeEach, describe, expect, it } from 'vitest';
import { FIXTURES } from '@diving-board/measure-core';
import { createApp } from '../src/index';
import type { Env } from '../src/env';
import { createTestD1, createTestR2 } from './d1';

// Tests sign in by naming the user in a header; production verifies a
// Cloudflare Access JWT instead (see auth.ts).
const app = createApp(async (req) => req.headers.get('X-Test-User'));

let env: Env;

async function call(method: string, path: string, opts: { user?: string; body?: unknown; version?: number } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.user !== undefined) headers['X-Test-User'] = opts.user;
  if (opts.version !== undefined) headers['If-Match'] = String(opts.version);
  const res = await app.request(path, { method, headers, ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}) }, env);
  const type = res.headers.get('Content-Type') ?? '';
  const data = type.includes('json') ? await res.json() : new Uint8Array(await res.arrayBuffer());
  return { status: res.status, data: data as any, res };
}

const OWNER = 'owner@blue-water.test';
const TECH = 'tech@blue-water.test';
const RIVAL = 'owner@rival.test';

beforeEach(() => {
  env = { DB: createTestD1(), FILES: createTestR2(), ENVIRONMENT: 'test', ACCESS_TEAM_DOMAIN: '' };
  const db = (env.DB as unknown as { raw: import('node:sqlite').DatabaseSync }).raw;
  db.exec(`
    INSERT INTO orgs (id, name, phone, email, created_at) VALUES
      ('org-1', 'Blue Water Liners', '555-0100', 'office@blue-water.test', '2026-01-01'),
      ('org-2', 'Rival Pools', NULL, NULL, '2026-01-01');
    INSERT INTO users (id, org_id, email, role, created_at) VALUES
      ('u-owner', 'org-1', '${OWNER}', 'owner', '2026-01-01'),
      ('u-tech', 'org-1', '${TECH}', 'tech', '2026-01-01'),
      ('u-rival', 'org-2', '${RIVAL}', 'owner', '2026-01-01');
  `);
});

/** Customer → site → pool → liner job, returning the job. */
async function newJob(kind: 'liner' | 'cover' | 'both' = 'liner', user = OWNER) {
  const customer = await call('POST', '/api/customers', { user, body: { name: 'Test Customer One', phone: '555-0199' } });
  const site = await call('POST', `/api/customers/${customer.data.id}/sites`, { user, body: { address: '12 Lake Rd' } });
  const pool = await call('POST', `/api/sites/${site.data.id}/pools`, { user, body: { construction: 'vinyl' } });
  const job = await call('POST', '/api/jobs', { user, body: { pool_id: pool.data.id, kind } });
  expect(job.status).toBe(201);
  return job.data;
}

function linerCapture() {
  const f = FIXTURES['rectangular-liner']();
  return { ...f.measurement, liner_spec: f.liner_spec };
}

describe('sign-in and tenancy', () => {
  it('rejects a request with no verified identity', async () => {
    expect((await call('GET', '/api/me')).status).toBe(401);
  });

  it('rejects an email that is not set up for any organisation', async () => {
    expect((await call('GET', '/api/me', { user: 'stranger@example.com' })).status).toBe(403);
  });

  it('never shows one installer another installer\'s records', async () => {
    const job = await newJob();
    expect((await call('GET', `/api/jobs/${job.id}`, { user: RIVAL })).status).toBe(404);
    expect((await call('GET', '/api/customers', { user: RIVAL })).data.customers).toEqual([]);
    const put = await call('PUT', `/api/jobs/${job.id}`, { user: RIVAL, version: 1, body: { measurement: {} } });
    expect(put.status).toBe(404);
  });
});

describe('measuring jobs', () => {
  it('computes the closure checks on the server and passes a clean capture', async () => {
    const job = await newJob();
    const saved = await call('PUT', `/api/jobs/${job.id}`, { user: TECH, version: 1, body: { measurement: linerCapture() } });
    expect(saved.status).toBe(200);
    expect(saved.data.version).toBe(2);
    expect(saved.data.closure.blocking).toEqual([]);
    expect(saved.data.closure.takeoff.total_material_sqft).toBeGreaterThan(0);
    const names = saved.data.closure.checks.map((c: { name: string }) => c.name).join(' | ');
    expect(names).toMatch(/Profile/i);
    expect(names).toMatch(/Hopper/i);
  });

  it('ignores a closure result sent by the client', async () => {
    const job = await newJob();
    const saved = await call('PUT', `/api/jobs/${job.id}`, {
      user: TECH, version: 1, body: { measurement: {}, closure: { checks: [], blocking: [] } },
    });
    expect(saved.data.closure.blocking.length).toBeGreaterThan(0);
  });

  it('blocks review when the floor profile does not close', async () => {
    const job = await newJob();
    const m = linerCapture();
    m.liner!.profile_segments![0]!.horizontal_run_ft = 2; // a run several feet short
    const saved = await call('PUT', `/api/jobs/${job.id}`, { user: TECH, version: 1, body: { measurement: m } });
    expect(saved.data.closure.blocking.length).toBeGreaterThan(0);
    const review = await call('PUT', `/api/jobs/${job.id}`, { user: TECH, version: 2, body: { status: 'review' } });
    expect(review.status).toBe(400);
  });

  it('refuses readings that are not numbers instead of computing with them', async () => {
    const job = await newJob();
    const m = linerCapture() as any;
    m.perimeter_points[0].a_distance_ft = '12 ft-ish';
    const saved = await call('PUT', `/api/jobs/${job.id}`, { user: TECH, version: 1, body: { measurement: m } });
    expect(saved.data.closure.blocking[0].name).toBe('Input');
    expect(saved.data.closure.reconstruction).toBeNull();
  });

  it('returns 409 with the latest copy when another device saved first', async () => {
    const job = await newJob();
    await call('PUT', `/api/jobs/${job.id}`, { user: TECH, version: 1, body: { measurement: linerCapture() } });
    const stale = await call('PUT', `/api/jobs/${job.id}`, { user: OWNER, version: 1, body: { measurement: {} } });
    expect(stale.status).toBe(409);
    expect(stale.data.error.code).toBe('version_conflict');
    expect(stale.data.error.details.version).toBe(2);
    expect(stale.data.error.details.measurement.perimeter_points.length).toBeGreaterThan(0);
  });

  it('treats a retried create with the same id as the same job', async () => {
    const first = await newJob();
    const again = await call('POST', '/api/jobs', { user: OWNER, body: { id: first.id, pool_id: first.pool_id, kind: 'liner' } });
    expect(again.status).toBe(200);
    expect(again.data.id).toBe(first.id);
    expect((await call('GET', '/api/jobs', { user: OWNER })).data.jobs).toHaveLength(1);
  });
});

describe('suppliers', () => {
  it('lists the built-in manufacturers without guessed contact details', async () => {
    const { data } = await call('GET', '/api/suppliers', { user: OWNER });
    const names = data.suppliers.map((s: { name: string }) => s.name).join(', ');
    for (const n of ['Latham', 'Merlin', 'Loop-Loc', 'Garrett']) expect(names).toContain(n);
    const latham = data.suppliers.find((s: { name: string }) => s.name.includes('Latham'));
    expect(latham.channel).toBeNull();
    expect(latham.contact.orderEmail).toBeNull();
    expect(latham.verified).toBe(false);
  });

  it('keeps each installer\'s dealer details to themselves', async () => {
    const { data } = await call('GET', '/api/suppliers', { user: OWNER });
    const id = data.suppliers.find((s: { name: string }) => s.name.includes('Latham')).id;
    const put = await call('PUT', `/api/suppliers/${id}`, {
      user: OWNER, body: { channel: 'email_pdf', contact: { orderEmail: 'orders@dealer-desk.test' }, verified: true },
    });
    expect(put.status).toBe(200);
    expect(put.data.contact.orderEmail).toBe('orders@dealer-desk.test');
    const rival = await call('GET', '/api/suppliers', { user: RIVAL });
    expect(rival.data.suppliers.find((s: { id: string }) => s.id === id).contact.orderEmail).toBeNull();
  });

  it('only lets office roles change supplier details', async () => {
    expect((await call('PUT', '/api/suppliers/latham', { user: TECH, body: { channel: 'email_pdf' } })).status).toBe(403);
  });
});

describe('ordering a liner', () => {
  async function measuredJob() {
    const job = await newJob();
    await call('PUT', `/api/jobs/${job.id}`, { user: TECH, version: 1, body: { measurement: linerCapture() } });
    const { data } = await call('GET', '/api/suppliers', { user: OWNER });
    const supplierId = data.suppliers.find((s: { name: string }) => s.name.includes('Latham')).id as string;
    return { job, supplierId };
  }

  async function configure(supplierId: string) {
    await call('PUT', `/api/suppliers/${supplierId}`, {
      user: OWNER, body: { channel: 'email_pdf', contact: { orderEmail: 'orders@dealer-desk.test' }, verified: true },
    });
  }

  it('copies every measured value from the job, not from the request', async () => {
    const { job, supplierId } = await measuredJob();
    const created = await call('POST', `/api/jobs/${job.id}/orders`, {
      user: OWNER, body: { supplier_id: supplierId, lines: [{ product: 'liner', liner: { patternName: 'Blue Mosaic' } }] },
    });
    expect(created.status).toBe(201);
    const line = created.data.lines[0];
    const m = linerCapture();
    expect(line.perimeterPoints).toHaveLength(m.perimeter_points.length);
    expect(line.wallHeights.length).toBe(m.liner!.wall_heights!.length);
    expect(line.fittings.length).toBe(m.liner!.fittings!.length);
    expect(line.closureChecks.every((c: { status: string }) => c.status !== 'block')).toBe(true);
    expect(line.liner.patternName).toBe('Blue Mosaic');
    expect(created.data.reference).toMatch(/^DB-\d{8}-[A-Z0-9]{6}$/);
    expect(created.data.installer.companyName).toBe('Blue Water Liners');

    const forged = await call('POST', `/api/jobs/${job.id}/orders`, {
      user: OWNER, body: { supplier_id: supplierId, lines: [{ product: 'liner', dimensions: [{ label: 'Length', value: 99 }] }] },
    });
    expect(forged.status).toBe(400);
  });

  it('will not mark an order ready until the supplier channel is set up', async () => {
    const { job, supplierId } = await measuredJob();
    const order = (await call('POST', `/api/jobs/${job.id}/orders`, { user: OWNER, body: { supplier_id: supplierId, lines: [{ product: 'liner' }] } })).data;
    const ready = await call('POST', `/api/orders/${order.id}/events`, { user: OWNER, version: 1, body: { type: 'mark_ready' } });
    expect(ready.status).toBe(422);
    expect(JSON.stringify(ready.data.error.details)).toMatch(/channel/);
  });

  it('runs the full lifecycle, keeps the sent PDF and the history', async () => {
    const { job, supplierId } = await measuredJob();
    await configure(supplierId);
    const order = (await call('POST', `/api/jobs/${job.id}/orders`, {
      user: OWNER, body: { supplier_id: supplierId, lines: [{ product: 'liner', liner: { patternName: 'Blue Mosaic', thicknessMil: 27, beadType: 'standard_bead' } }] },
    })).data;

    let v = 1;
    const step = async (body: Record<string, unknown>, expectStatus = 200) => {
      const r = await call('POST', `/api/orders/${order.id}/events`, { user: OWNER, version: v, body });
      expect(r.status, JSON.stringify(r.data)).toBe(expectStatus);
      if (r.status === 200) v = r.data.version;
      return r.data;
    };

    expect((await step({ type: 'mark_ready' })).status).toBe('ready');
    const submission = await call('GET', `/api/orders/${order.id}/submission`, { user: OWNER });
    expect(submission.data.email.to).toEqual(['orders@dealer-desk.test']);
    expect(submission.data.email.subject).toContain(order.reference);
    expect(submission.data.email.attachments[0].contentType).toBe('application/pdf');

    const submitted = await step({ type: 'submit' });
    expect(submitted.status).toBe('submitted');
    expect(submitted.has_pdf).toBe(true);
    const jobAfter = await call('GET', `/api/jobs/${job.id}`, { user: OWNER });
    expect(jobAfter.data.status).toBe('ordered');

    await step({ type: 'acknowledge', supplier_order_number: 'SO-4411' });
    await step({ type: 'start_production' });
    const shipped = await step({ type: 'ship', tracking_number: '1Z999' });
    expect(shipped.trackingNumber).toBe('1Z999');
    await step({ type: 'cancel', reason: 'too late' }, 409);
    const delivered = await step({ type: 'deliver' });
    expect(delivered.status).toBe('delivered');
    expect(delivered.events.map((e: { type: string }) => e.type)).toEqual([
      'created', 'mark_ready', 'submit', 'acknowledge', 'start_production', 'ship', 'deliver',
    ]);

    const pdf = await call('GET', `/api/orders/${order.id}/pdf`, { user: OWNER });
    expect(pdf.res.headers.get('Content-Type')).toBe('application/pdf');
    expect(new TextDecoder().decode((pdf.data as Uint8Array).slice(0, 5))).toBe('%PDF-');

    const db = (env.DB as unknown as { raw: import('node:sqlite').DatabaseSync }).raw;
    const rows = db.prepare('SELECT event FROM order_events WHERE order_id = ? ORDER BY seq').all(order.id) as { event: string }[];
    expect(rows.map((r) => r.event)).toEqual(['created', 'mark_ready', 'submit', 'acknowledge', 'start_production', 'ship', 'deliver']);
    expect(() => db.prepare('DELETE FROM order_events WHERE order_id = ?').run(order.id)).toThrow(/append-only/);
  });

  it('rejects a lifecycle step sent against a stale version without writing history', async () => {
    const { job, supplierId } = await measuredJob();
    await configure(supplierId);
    const order = (await call('POST', `/api/jobs/${job.id}/orders`, { user: OWNER, body: { supplier_id: supplierId, lines: [{ product: 'liner' }] } })).data;
    await call('POST', `/api/orders/${order.id}/events`, { user: OWNER, version: 1, body: { type: 'mark_ready' } });
    const stale = await call('POST', `/api/orders/${order.id}/events`, { user: OWNER, version: 1, body: { type: 'cancel', reason: 'x' } });
    expect(stale.status).toBe(409);
    const db = (env.DB as unknown as { raw: import('node:sqlite').DatabaseSync }).raw;
    expect((db.prepare('SELECT COUNT(*) AS n FROM order_events WHERE order_id = ?').get(order.id) as { n: number }).n).toBe(2);
  });

  it('only lets office roles move an order along', async () => {
    const { job, supplierId } = await measuredJob();
    const order = (await call('POST', `/api/jobs/${job.id}/orders`, { user: TECH, body: { supplier_id: supplierId, lines: [{ product: 'liner' }] } })).data;
    expect((await call('POST', `/api/orders/${order.id}/events`, { user: TECH, version: 1, body: { type: 'cancel', reason: 'x' } })).status).toBe(403);
  });

  it('flags a submitted order the supplier has not acknowledged in time', async () => {
    const { job, supplierId } = await measuredJob();
    await configure(supplierId);
    const order = (await call('POST', `/api/jobs/${job.id}/orders`, { user: OWNER, body: { supplier_id: supplierId, lines: [{ product: 'liner' }] } })).data;
    await call('POST', `/api/orders/${order.id}/events`, { user: OWNER, version: 1, body: { type: 'mark_ready' } });
    await call('POST', `/api/orders/${order.id}/events`, { user: OWNER, version: 2, body: { type: 'submit' } });
    expect((await call('GET', '/api/orders/overdue', { user: OWNER })).data.overdue).toEqual([]);

    // Backdate the submission ten days.
    const db = (env.DB as unknown as { raw: import('node:sqlite').DatabaseSync }).raw;
    const row = db.prepare('SELECT payload FROM orders WHERE id = ?').get(order.id) as { payload: string };
    const payload = JSON.parse(row.payload);
    const old = new Date(Date.now() - 10 * 86400000).toISOString();
    payload.events = payload.events.map((e: { at: string }) => ({ ...e, at: old }));
    db.prepare('UPDATE orders SET payload = ? WHERE id = ?').run(JSON.stringify(payload), order.id);
    const overdue = (await call('GET', '/api/orders/overdue', { user: OWNER })).data.overdue;
    expect(overdue.map((o: { reference: string }) => o.reference)).toEqual([order.reference]);
  });
});
