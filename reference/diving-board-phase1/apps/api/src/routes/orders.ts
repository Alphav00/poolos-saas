import { Hono } from 'hono';
import {
  allowedEvents,
  buildSubmissionEmail,
  createOrder,
  createSupplierRegistry,
  findOverdueAcknowledgements,
  OrderTransitionError,
  OrderValidationError,
  renderOrderPdf,
  SupplierDefinitionError,
  transition,
  validateOrder,
  type Actor,
  type Order,
  type OrderEvent,
  type OrderEventRecord,
  type OrderLine,
  type SupplierInput,
} from '@diving-board/orders';
import { requireRole } from '../auth';
import type { AppEnv, CurrentUser, Env } from '../env';
import { ApiError, badRequest, conflict, notFound } from '../errors';
import type { JobClosure } from '../measure';
import { buildOrderLine } from '../orderLines';
import { expectedVersion, newId, now, readJson } from '../util';

export const orders = new Hono<AppEnv>();

// ---------------------------------------------------------------- suppliers

async function registryFor(env: Env, orgId: string) {
  const rows = await env.DB.prepare('SELECT definition FROM tenant_suppliers WHERE org_id = ?').bind(orgId).all<{ definition: string }>();
  return createSupplierRegistry(rows.results.map((r) => JSON.parse(r.definition) as SupplierInput));
}

orders.get('/suppliers', async (c) => {
  const registry = await registryFor(c.env, c.get('user').orgId);
  return c.json({ suppliers: registry.list() });
});

/**
 * Save the installer's own details for a supplier: the channel and contact
 * from their dealer account for a built-in, or a whole new supplier.
 */
orders.put('/suppliers/:id', requireRole('owner', 'admin', 'office'), async (c) => {
  const { orgId } = c.get('user');
  const id = c.req.param('id');
  const body = await readJson<Partial<SupplierInput>>(c.req.raw);
  const input = { ...body, id } as SupplierInput;
  const others = await c.env.DB.prepare('SELECT definition FROM tenant_suppliers WHERE org_id = ? AND supplier_id != ?')
    .bind(orgId, id).all<{ definition: string }>();
  try {
    // Building the registry runs the same checks a later read will.
    const registry = createSupplierRegistry([...others.results.map((r) => JSON.parse(r.definition) as SupplierInput), input]);
    await c.env.DB.prepare(
      `INSERT INTO tenant_suppliers (org_id, supplier_id, definition, updated_at) VALUES (?,?,?,?)
       ON CONFLICT (org_id, supplier_id) DO UPDATE SET definition = excluded.definition, updated_at = excluded.updated_at`,
    ).bind(orgId, id, JSON.stringify(input), now()).run();
    return c.json(registry.require(id));
  } catch (e) {
    if (e instanceof SupplierDefinitionError) throw badRequest(e.message, e.problems);
    throw e;
  }
});

// ------------------------------------------------------------------- orders

interface OrderRow { id: string; payload: string; version: number; pdf_key: string | null }

const actorOf = (u: CurrentUser): Actor => ({ kind: 'user', id: u.id, name: u.email });

async function loadOrder(env: Env, id: string, orgId: string) {
  const row = await env.DB.prepare('SELECT id, payload, version, pdf_key FROM orders WHERE id = ? AND org_id = ?')
    .bind(id, orgId).first<OrderRow>();
  if (!row) throw notFound('Order');
  return { order: JSON.parse(row.payload) as Order, version: row.version, pdfKey: row.pdf_key };
}

function view(order: Order, version: number, pdfKey: string | null) {
  return { ...order, version, has_pdf: pdfKey !== null, allowed_events: allowedEvents(order.status) };
}

/**
 * Writes the new order and its new audit records in one batch. The event
 * inserts only take effect if the version-checked update did, so a lost race
 * leaves no orphan history.
 */
async function saveOrder(env: Env, orgId: string, order: Order, version: number, newEvents: readonly OrderEventRecord[], extra: { pdfKey?: string } = {}) {
  const t = now();
  const submittedAt = order.status === 'submitted' ? order.updatedAt : null;
  const stmts = [
    env.DB.prepare(
      `UPDATE orders SET payload = ?, status = ?, updated_at = ?, version = version + 1,
         pdf_key = COALESCE(?, pdf_key), submitted_at = COALESCE(?, submitted_at)
       WHERE id = ? AND org_id = ? AND version = ?`,
    ).bind(JSON.stringify(order), order.status, t, extra.pdfKey ?? null, submittedAt, order.id, orgId, version),
    ...newEvents.map((e) =>
      env.DB.prepare(
        `INSERT INTO order_events (order_id, seq, org_id, event, detail, from_status, to_status, actor, at)
         SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT version FROM orders WHERE id = ?) = ?`,
      ).bind(order.id, e.seq, orgId, e.type, e.detail ? JSON.stringify(e.detail) : null, e.from, e.to, e.actor.id, e.at, order.id, version + 1),
    ),
  ];
  const [update] = await env.DB.batch(stmts);
  if (!update || update.meta.changes === 0) {
    const current = await loadOrder(env, order.id, orgId);
    throw conflict(view(current.order, current.version, current.pdfKey));
  }
}

function linesFrom(body: Record<string, unknown>, measurement: Record<string, unknown>, closure: JobClosure): OrderLine[] {
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw badRequest('"lines" must list at least one product');
  return body.lines.map((raw, i) => buildOrderLine(raw, i, measurement, closure));
}

orders.get('/orders', async (c) => {
  const { orgId } = c.get('user');
  const status = c.req.query('status');
  const jobId = c.req.query('job_id');
  let sql = 'SELECT id, job_id, supplier_id, reference, status, submitted_at, updated_at, version FROM orders WHERE org_id = ?';
  const args: unknown[] = [orgId];
  if (status) { sql += ' AND status = ?'; args.push(status); }
  if (jobId) { sql += ' AND job_id = ?'; args.push(jobId); }
  const rows = await c.env.DB.prepare(`${sql} ORDER BY updated_at DESC LIMIT 200`).bind(...args).all();
  return c.json({ orders: rows.results });
});

/** Submitted orders the supplier has not acknowledged within its deadline. */
orders.get('/orders/overdue', async (c) => {
  const { orgId } = c.get('user');
  const rows = await c.env.DB.prepare("SELECT payload FROM orders WHERE org_id = ? AND status = 'submitted'").bind(orgId).all<{ payload: string }>();
  const registry = await registryFor(c.env, orgId);
  const overdue = findOverdueAcknowledgements(
    rows.results.map((r) => JSON.parse(r.payload) as Order),
    (id) => registry.get(id),
    new Date(),
  );
  return c.json({ overdue });
});

orders.post('/jobs/:id/orders', requireRole('owner', 'admin', 'office', 'tech'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const job = await c.env.DB.prepare(
    `SELECT j.id, j.kind, j.closure, j.measurement, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
            s.address, o.name AS org_name, o.phone AS org_phone, o.email AS org_email
     FROM jobs j JOIN pools p ON p.id = j.pool_id JOIN sites s ON s.id = p.site_id
     JOIN customers c ON c.id = s.customer_id JOIN orgs o ON o.id = j.org_id
     WHERE j.id = ? AND j.org_id = ?`,
  ).bind(jobId, user.orgId).first<Record<string, string | null>>();
  if (!job) throw notFound('Job');
  if (!job.closure || !job.measurement) throw badRequest('Save the measurement before creating an order');
  const closure = JSON.parse(job.closure) as JobClosure;
  const measurement = JSON.parse(job.measurement) as Record<string, unknown>;

  const body = await readJson(c.req.raw);
  const supplierId = body.supplier_id;
  if (typeof supplierId !== 'string') throw badRequest('"supplier_id" is required');
  const registry = await registryFor(c.env, user.orgId);
  const supplier = registry.get(supplierId);
  if (!supplier) throw notFound('Supplier');

  const lines = linesFrom(body, measurement, closure);
  for (const l of lines) {
    if (!supplier.products.includes(l.product)) throw badRequest(`${supplier.name} is not set up to supply ${l.product.replace('_', ' ')}s`);
    if (l.product === 'liner' && job.kind === 'cover') throw badRequest('This job was measured for a cover only');
    if (l.product === 'safety_cover' && job.kind === 'liner') throw badRequest('This job was measured for a liner only');
  }

  const installer = typeof body.installer === 'object' && body.installer !== null ? (body.installer as Record<string, string>) : {};
  const order = createOrder(
    {
      id: newId(),
      tenantId: user.orgId,
      supplierId,
      jobId,
      units: 'ft',
      installer: {
        companyName: job.org_name ?? '',
        ...(job.org_phone ? { phone: job.org_phone } : {}),
        ...(job.org_email ? { email: job.org_email } : {}),
        ...installer,
      },
      customer: {
        name: job.customer_name ?? '',
        ...(job.customer_phone ? { phone: job.customer_phone } : {}),
        ...(job.customer_email ? { email: job.customer_email } : {}),
      },
      site: { addressLine1: job.address ?? '' },
      lines,
      ...(typeof body.notes === 'string' ? { notes: body.notes } : {}),
    },
    new Date(),
    actorOf(user),
  );
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO orders (id, org_id, job_id, supplier_id, reference, status, payload, created_at, updated_at, version)
       VALUES (?,?,?,?,?,?,?,?,?,1)`,
    ).bind(order.id, user.orgId, jobId, supplierId, order.reference, order.status, JSON.stringify(order), t, t),
    ...order.events.map((e) =>
      c.env.DB.prepare(
        'INSERT INTO order_events (order_id, seq, org_id, event, detail, from_status, to_status, actor, at) VALUES (?,?,?,?,?,?,?,?,?)',
      ).bind(order.id, e.seq, user.orgId, e.type, null, e.from, e.to, e.actor.id, e.at),
    ),
  ]);
  return c.json({ ...view(order, 1, null), issues: validateOrder(order, supplier) }, 201);
});

orders.get('/orders/:id', async (c) => {
  const { orgId } = c.get('user');
  const { order, version, pdfKey } = await loadOrder(c.env, c.req.param('id'), orgId);
  const registry = await registryFor(c.env, orgId);
  const supplier = registry.get(order.supplierId);
  return c.json({ ...view(order, version, pdfKey), issues: supplier ? validateOrder(order, supplier) : [] });
});

/** Edit a draft. Once an order is marked ready it must be reopened first. */
orders.put('/orders/:id', requireRole('owner', 'admin', 'office', 'tech'), async (c) => {
  const { orgId } = c.get('user');
  const body = await readJson(c.req.raw);
  const version = expectedVersion(c.req.raw, body);
  const { order, version: current, pdfKey } = await loadOrder(c.env, c.req.param('id'), orgId);
  if (current !== version) throw conflict(view(order, current, pdfKey));
  if (order.status !== 'draft') throw badRequest('Only a draft can be edited. Reopen it first.');
  const job = await c.env.DB.prepare('SELECT closure, measurement FROM jobs WHERE id = ? AND org_id = ?')
    .bind(order.jobId, orgId).first<{ closure: string | null; measurement: string }>();
  if (!job?.closure) throw badRequest('The job behind this order has no saved measurement');
  const next: Order = {
    ...order,
    // Rebuilt from the job as it is now, so a corrected measurement reaches the order.
    lines: linesFrom(
      { lines: body.lines ?? order.lines.map(({ id, product, quantity, liner, cover, addOns, notes }) => ({ id, product, quantity, liner, cover, addOns, notes })) },
      JSON.parse(job.measurement) as Record<string, unknown>,
      JSON.parse(job.closure) as JobClosure,
    ),
    ...(typeof body.notes === 'string' ? { notes: body.notes } : {}),
    ...(typeof body.installer === 'object' && body.installer !== null
      ? { installer: { ...order.installer, ...(body.installer as Record<string, string>) } }
      : {}),
    updatedAt: now(),
  };
  await saveOrder(c.env, orgId, next, version, []);
  return c.json(view(next, version + 1, pdfKey));
});

/** The PDF exactly as it was sent, or a preview of what would be sent. */
orders.get('/orders/:id/pdf', async (c) => {
  const { orgId } = c.get('user');
  const { order, pdfKey } = await loadOrder(c.env, c.req.param('id'), orgId);
  let bytes: Uint8Array;
  if (pdfKey) {
    const obj = await c.env.FILES.get(pdfKey);
    if (!obj) throw new ApiError(500, 'missing_file', 'The stored order PDF is missing');
    bytes = new Uint8Array(await obj.arrayBuffer());
  } else {
    const registry = await registryFor(c.env, orgId);
    const supplier = registry.get(order.supplierId);
    bytes = await renderOrderPdf(order, supplier ? { supplier } : {});
  }
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${order.reference}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});

/**
 * What to send the supplier: the email (with the PDF attached) for an
 * email supplier, or the PDF and instructions for a portal or fax supplier.
 * Sending is done by the installer in this version; recording it is the
 * `submit` event.
 */
orders.get('/orders/:id/submission', async (c) => {
  const { orgId } = c.get('user');
  const { order } = await loadOrder(c.env, c.req.param('id'), orgId);
  const registry = await registryFor(c.env, orgId);
  const supplier = registry.require(order.supplierId);
  if (supplier.channel === 'email_pdf') {
    return c.json({ channel: supplier.channel, email: await buildSubmissionEmail(order, supplier) });
  }
  return c.json({
    channel: supplier.channel,
    portal_url: supplier.contact.portalUrl,
    fax: supplier.contact.fax,
    pdf_url: `/api/orders/${order.id}/pdf`,
    reference: order.reference,
  });
});

type EventBody = Record<string, unknown> & { type?: string };

function eventFrom(body: EventBody, supplier: ReturnType<Awaited<ReturnType<typeof registryFor>>['require']>): OrderEvent {
  const s = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : undefined);
  switch (body.type) {
    case 'mark_ready': return { type: 'mark_ready', supplier };
    case 'reopen': return { type: 'reopen', reason: s('reason') };
    case 'submit': return { type: 'submit', channel: supplier.channel ?? undefined, messageId: s('message_id') };
    case 'acknowledge': return { type: 'acknowledge', supplierOrderNumber: s('supplier_order_number'), note: s('note') };
    case 'start_production': return { type: 'start_production', note: s('note') };
    case 'ship': return { type: 'ship', trackingNumber: s('tracking_number'), carrier: s('carrier') };
    case 'deliver': return { type: 'deliver', note: s('note') };
    case 'request_clarification': return { type: 'request_clarification', question: s('question') ?? '' };
    case 'resubmit': return { type: 'resubmit', answer: s('answer'), supplier, messageId: s('message_id') };
    case 'reject': return { type: 'reject', reason: s('reason') ?? '' };
    case 'cancel': return { type: 'cancel', reason: s('reason') ?? '' };
    default: throw badRequest('Unknown event type');
  }
}

/** Move an order along its lifecycle. Every change is kept in its history. */
orders.post('/orders/:id/events', requireRole('owner', 'admin', 'office'), async (c) => {
  const user = c.get('user');
  const body = await readJson<EventBody>(c.req.raw);
  const version = expectedVersion(c.req.raw, body);
  const { order, version: current, pdfKey } = await loadOrder(c.env, c.req.param('id'), user.orgId);
  if (current !== version) throw conflict(view(order, current, pdfKey));
  const registry = await registryFor(c.env, user.orgId);
  const supplier = registry.require(order.supplierId);

  let result;
  try {
    result = transition(order, eventFrom(body, supplier), new Date(), actorOf(user));
  } catch (e) {
    if (e instanceof OrderValidationError) throw new ApiError(422, 'order_not_ready', e.message, e.issues);
    if (e instanceof OrderTransitionError) throw new ApiError(409, e.code, e.message);
    throw e;
  }

  // Keep a copy of exactly what was sent with each submission.
  let newPdfKey: string | undefined;
  if (body.type === 'submit' || body.type === 'resubmit') {
    newPdfKey = `orgs/${user.orgId}/orders/${order.id}/${result.event.seq}-${order.reference}.pdf`;
    await c.env.FILES.put(newPdfKey, await renderOrderPdf(result.order, { supplier }), {
      httpMetadata: { contentType: 'application/pdf' },
    });
  }
  await saveOrder(c.env, user.orgId, result.order, version, [result.event], newPdfKey ? { pdfKey: newPdfKey } : {});
  if (body.type === 'submit' && order.jobId) {
    await c.env.DB.prepare("UPDATE jobs SET status = 'ordered', updated_at = ?, version = version + 1 WHERE id = ? AND org_id = ?")
      .bind(now(), order.jobId, user.orgId).run();
  }
  return c.json(view(result.order, version + 1, newPdfKey ?? pdfKey));
});
