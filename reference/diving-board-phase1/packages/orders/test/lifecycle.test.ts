import { describe, expect, it } from 'vitest';
import {
  IllegalTransitionError,
  OrderTransitionError,
  OrderValidationError,
  TRANSITIONS,
  ackSlaStatus,
  addBusinessDays,
  allowedEvents,
  findOverdueAcknowledgements,
  transition,
  verifyAuditTrail,
  type OrderEvent,
  type OrderEventName,
} from '../src/lifecycle.js';
import { isOrderReference } from '../src/reference.js';
import type { Order, OrderStatus } from '../src/types.js';
import { configuredMerlin, draftOrder, installerActor, linerLine, supplierActor } from './fixtures.js';

const supplier = configuredMerlin();
let clock = Date.parse('2026-10-05T15:00:00Z');
const tick = () => new Date((clock += 60_000));

function eventFor(name: OrderEventName): OrderEvent {
  switch (name) {
    case 'mark_ready':
      return { type: 'mark_ready', supplier };
    case 'reopen':
      return { type: 'reopen', reason: 'edit' };
    case 'submit':
      return { type: 'submit', channel: 'email_pdf', messageId: 'm1' };
    case 'acknowledge':
      return { type: 'acknowledge', supplierOrderNumber: 'SO-1' };
    case 'start_production':
      return { type: 'start_production' };
    case 'ship':
      return { type: 'ship', trackingNumber: '1Z999' };
    case 'deliver':
      return { type: 'deliver' };
    case 'request_clarification':
      return { type: 'request_clarification', question: 'Confirm deep end wall height?' };
    case 'resubmit':
      return { type: 'resubmit', answer: '3.5 ft confirmed' };
    case 'reject':
      return { type: 'reject', reason: 'Pattern discontinued' };
    case 'cancel':
      return { type: 'cancel', reason: 'Customer cancelled' };
  }
}

const PATHS: Record<OrderStatus, OrderEventName[]> = {
  draft: [],
  ready: ['mark_ready'],
  submitted: ['mark_ready', 'submit'],
  acknowledged: ['mark_ready', 'submit', 'acknowledge'],
  in_production: ['mark_ready', 'submit', 'acknowledge', 'start_production'],
  shipped: ['mark_ready', 'submit', 'acknowledge', 'start_production', 'ship'],
  delivered: ['mark_ready', 'submit', 'acknowledge', 'start_production', 'ship', 'deliver'],
  needs_clarification: ['mark_ready', 'submit', 'request_clarification'],
  rejected: ['mark_ready', 'submit', 'reject'],
  cancelled: ['cancel'],
};
const ALL_STATUSES = Object.keys(PATHS) as OrderStatus[];
const ALL_EVENTS = Object.keys(TRANSITIONS) as OrderEventName[];

function orderIn(status: OrderStatus): Order {
  let o = draftOrder();
  for (const e of PATHS[status]) o = transition(o, eventFor(e), tick(), installerActor).order;
  expect(o.status).toBe(status);
  return o;
}

describe('createOrder', () => {
  it('starts as draft with a created audit record and a valid reference', () => {
    const o = draftOrder();
    expect(o.status).toBe('draft');
    expect(o.events).toHaveLength(1);
    expect(o.events[0]).toMatchObject({ seq: 1, type: 'created', from: null, to: 'draft' });
    expect(isOrderReference(o.reference)).toBe(true);
    expect(o.reference.startsWith('DB-20261005-')).toBe(true);
  });
});

describe('legal transitions', () => {
  const cases: Array<[OrderStatus, OrderEventName, OrderStatus]> = [];
  for (const ev of ALL_EVENTS) for (const from of TRANSITIONS[ev].from) cases.push([from, ev, TRANSITIONS[ev].to]);

  it('covers the whole table (sanity)', () => {
    expect(cases.length).toBe(19);
  });

  it.each(cases)('%s --%s--> %s', (from, ev, to) => {
    const before = orderIn(from);
    const at = tick();
    const { order, event } = transition(before, eventFor(ev), at, supplierActor);
    expect(order.status).toBe(to);
    expect(order).not.toBe(before);
    expect(before.status).toBe(from); // input untouched
    expect(order.events).toHaveLength(before.events.length + 1);
    expect(order.events[order.events.length - 1]).toBe(event);
    expect(event).toMatchObject({ type: ev, from, to, at: at.toISOString(), actor: supplierActor, seq: before.events.length + 1 });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(order.events)).toBe(true);
    expect(order.updatedAt).toBe(at.toISOString());
    expect(verifyAuditTrail(order)).toBe(true);
  });
});

describe('illegal transitions', () => {
  const cases: Array<[OrderStatus, OrderEventName]> = [];
  for (const s of ALL_STATUSES) for (const ev of ALL_EVENTS) if (!TRANSITIONS[ev].from.includes(s)) cases.push([s, ev]);

  it.each(cases)('%s cannot %s', (from, ev) => {
    const o = orderIn(from);
    let err: unknown;
    try {
      transition(o, eventFor(ev), tick(), installerActor);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(IllegalTransitionError);
    expect(err).toBeInstanceOf(OrderTransitionError);
    expect((err as IllegalTransitionError).code).toBe('illegal_transition');
    expect((err as IllegalTransitionError).from).toBe(from);
    expect(o.events).toHaveLength(PATHS[from].length + 1);
  });

  it('cannot cancel once shipped or delivered', () => {
    expect(allowedEvents('shipped')).toEqual(['deliver']);
    expect(allowedEvents('delivered')).toEqual([]);
    expect(allowedEvents('rejected')).toEqual([]);
    expect(allowedEvents('cancelled')).toEqual([]);
  });
});

describe('transition payloads and guards', () => {
  it('mark_ready refuses an order with blocking validation issues', () => {
    const o = draftOrder([linerLine({ fittings: [] })]);
    let err: unknown;
    try {
      transition(o, { type: 'mark_ready', supplier }, tick(), installerActor);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(OrderValidationError);
    expect((err as OrderValidationError).code).toBe('validation_failed');
    expect((err as OrderValidationError).issues.some((i) => i.field === 'lines[0].fittings')).toBe(true);
  });

  it('mark_ready refuses an unconfigured built-in supplier', () => {
    const o = draftOrder();
    const raw = { ...supplier, channel: null, verified: false };
    expect(() => transition(o, { type: 'mark_ready', supplier: raw }, tick(), installerActor)).toThrow(OrderValidationError);
  });

  it('resubmit with a supplier revalidates', () => {
    const o = orderIn('needs_clarification');
    const broken: Order = { ...o, customer: { name: '' } };
    expect(() => transition(broken, { type: 'resubmit', supplier }, tick(), installerActor)).toThrow(OrderValidationError);
    const ok = transition(o, { type: 'resubmit', supplier, answer: 'yes' }, tick(), installerActor);
    expect(ok.order.status).toBe('submitted');
    expect(ok.event.detail).toEqual({ answer: 'yes' });
  });

  it('records supplier order number and tracking number', () => {
    const shipped = orderIn('shipped');
    expect(shipped.supplierOrderNumber).toBe('SO-1');
    expect(shipped.trackingNumber).toBe('1Z999');
  });

  it('requires a reason to reject or cancel and a question for clarification', () => {
    expect(() => transition(orderIn('submitted'), { type: 'reject', reason: ' ' }, tick(), supplierActor)).toThrow(OrderTransitionError);
    expect(() => transition(orderIn('draft'), { type: 'cancel', reason: '' }, tick(), installerActor)).toThrow(OrderTransitionError);
    expect(() => transition(orderIn('submitted'), { type: 'request_clarification', question: '' }, tick(), supplierActor)).toThrow(
      OrderTransitionError,
    );
  });

  it('rejects an event timestamped before the previous one', () => {
    const o = orderIn('ready');
    expect(() => transition(o, { type: 'submit' }, '2020-01-01T00:00:00Z', installerActor)).toThrow(/before the previous event/);
  });

  it('keeps a full audit trail across a clarification round trip', () => {
    let o = orderIn('acknowledged');
    o = transition(o, { type: 'request_clarification', question: 'Which bead?' }, tick(), supplierActor).order;
    o = transition(o, { type: 'resubmit', answer: 'Standard' }, tick(), installerActor).order;
    o = transition(o, { type: 'acknowledge' }, tick(), supplierActor).order;
    expect(o.events.map((e) => e.type)).toEqual([
      'created', 'mark_ready', 'submit', 'acknowledge', 'request_clarification', 'resubmit', 'acknowledge',
    ]);
    expect(o.events.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(verifyAuditTrail(o)).toBe(true);
  });

  it('verifyAuditTrail detects tampering', () => {
    const o = orderIn('submitted');
    expect(verifyAuditTrail({ ...o, status: 'delivered' })).toBe(false);
    expect(verifyAuditTrail({ ...o, events: o.events.slice(1) })).toBe(false);
  });

  it('audit records cannot be mutated', () => {
    const o = orderIn('ready');
    const rec = o.events[1]!;
    expect(() => {
      (rec as { to: string }).to = 'delivered';
    }).toThrow(TypeError);
    expect(() => {
      (o.events as unknown as unknown[]).push(rec);
    }).toThrow(TypeError);
  });
});

describe('acknowledgement SLA', () => {
  function submittedAt(iso: string): Order {
    let o = draftOrder();
    o = transition(o, { type: 'mark_ready', supplier }, '2026-10-05T14:30:00Z', installerActor).order;
    return transition(o, { type: 'submit' }, iso, installerActor).order;
  }

  it('adds business days skipping weekends and holidays', () => {
    expect(addBusinessDays('2026-10-09T15:00:00Z', 2).toISOString()).toBe('2026-10-13T15:00:00.000Z'); // Fri -> Tue
    expect(addBusinessDays('2026-10-05T09:00:00Z', 1, { holidays: ['2026-10-06'] }).toISOString()).toBe('2026-10-07T09:00:00.000Z');
    expect(addBusinessDays('2026-10-10T10:00:00Z', 1).toISOString()).toBe('2026-10-12T10:00:00.000Z'); // Sat -> Mon
    expect(addBusinessDays('2026-10-05T10:00:00Z', 0).toISOString()).toBe('2026-10-05T10:00:00.000Z');
  });

  it('flags an order submitted Friday with no ack after 2 business days', () => {
    const o = submittedAt('2026-10-09T15:00:00Z');
    const monday = ackSlaStatus(o, supplier, '2026-10-12T16:00:00Z');
    expect(monday).toMatchObject({ overdue: false, dueAt: '2026-10-13T15:00:00.000Z', slaBusinessDays: 2 });
    const wed = ackSlaStatus(o, supplier, '2026-10-14T09:00:00Z');
    expect(wed?.overdue).toBe(true);
  });

  it('uses the per-supplier SLA', () => {
    const o = submittedAt('2026-10-05T15:00:00Z');
    const now = '2026-10-07T16:00:00Z';
    expect(ackSlaStatus(o, { id: 'merlin', ackSlaBusinessDays: 1 }, now)?.overdue).toBe(true);
    expect(ackSlaStatus(o, { id: 'merlin', ackSlaBusinessDays: 5 }, now)?.overdue).toBe(false);
  });

  it('does not flag acknowledged or non-submitted orders', () => {
    const o = submittedAt('2026-10-05T15:00:00Z');
    const acked = transition(o, { type: 'acknowledge' }, '2026-10-06T10:00:00Z', supplierActor).order;
    expect(ackSlaStatus(acked, supplier, '2026-12-01T00:00:00Z')).toBeNull();
    expect(ackSlaStatus(draftOrder(), supplier, '2026-12-01T00:00:00Z')).toBeNull();
  });

  it('restarts the clock on resubmit', () => {
    let o = submittedAt('2026-10-05T15:00:00Z');
    o = transition(o, { type: 'request_clarification', question: 'q?' }, '2026-10-06T10:00:00Z', supplierActor).order;
    o = transition(o, { type: 'resubmit' }, '2026-10-12T10:00:00Z', installerActor).order;
    const st = ackSlaStatus(o, supplier, '2026-10-13T10:00:00Z');
    expect(st).toMatchObject({ submittedAt: '2026-10-12T10:00:00.000Z', overdue: false });
  });

  it('findOverdueAcknowledgements filters a batch with per-supplier SLAs', () => {
    const a = { ...submittedAt('2026-10-05T15:00:00Z'), id: 'a' };
    const b = { ...submittedAt('2026-10-05T15:00:00Z'), id: 'b', supplierId: 'slowco' };
    const c = { ...submittedAt('2026-10-08T15:00:00Z'), id: 'c' };
    const lookup = (id: string) =>
      id === 'merlin' ? supplier : id === 'slowco' ? { id: 'slowco', ackSlaBusinessDays: 10 } : undefined;
    const flagged = findOverdueAcknowledgements([a, b, c, draftOrder()], lookup, '2026-10-09T09:00:00Z');
    expect(flagged.map((f) => f.orderId)).toEqual(['a']);
  });

  it('falls back to a default SLA for unknown suppliers', () => {
    const a = { ...submittedAt('2026-10-05T15:00:00Z'), supplierId: 'unknown' };
    expect(findOverdueAcknowledgements([a], () => undefined, '2026-10-07T10:00:00Z', { defaultSlaBusinessDays: 1 })).toHaveLength(1);
    expect(findOverdueAcknowledgements([a], () => undefined, '2026-10-07T10:00:00Z')).toHaveLength(0);
  });
});
