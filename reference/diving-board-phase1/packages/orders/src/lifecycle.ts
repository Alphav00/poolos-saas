import type {
  Actor,
  IsoTimestamp,
  Order,
  OrderEventRecord,
  OrderEventType,
  OrderStatus,
  Supplier,
} from './types.js';
import { generateOrderReference, type RandomBytes } from './reference.js';
import { hasBlockingIssues, validateOrder, type ValidationIssue } from './validate.js';

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type OrderEvent =
  /** draft -> ready. Runs validateOrder against the supplier; any `block` refuses. */
  | { type: 'mark_ready'; supplier: Supplier }
  /** ready -> draft, to edit again. */
  | { type: 'reopen'; reason?: string }
  /** ready -> submitted. */
  | { type: 'submit'; channel?: string; messageId?: string }
  /** submitted -> acknowledged. */
  | { type: 'acknowledge'; supplierOrderNumber?: string; note?: string }
  /** acknowledged -> in_production. */
  | { type: 'start_production'; note?: string }
  /** in_production -> shipped. */
  | { type: 'ship'; trackingNumber?: string; carrier?: string }
  /** shipped -> delivered. */
  | { type: 'deliver'; note?: string }
  /** submitted | acknowledged -> needs_clarification. */
  | { type: 'request_clarification'; question: string }
  /** needs_clarification -> submitted. Revalidates when a supplier is given. */
  | { type: 'resubmit'; answer?: string; supplier?: Supplier; messageId?: string }
  /** submitted | acknowledged | needs_clarification -> rejected. */
  | { type: 'reject'; reason: string }
  /** any state before shipped (and not terminal) -> cancelled. */
  | { type: 'cancel'; reason: string };

export type OrderEventName = OrderEvent['type'];

/** Transition table: event -> allowed source states -> target state. */
export const TRANSITIONS: Readonly<Record<OrderEventName, { from: readonly OrderStatus[]; to: OrderStatus }>> = {
  mark_ready: { from: ['draft'], to: 'ready' },
  reopen: { from: ['ready'], to: 'draft' },
  submit: { from: ['ready'], to: 'submitted' },
  acknowledge: { from: ['submitted'], to: 'acknowledged' },
  start_production: { from: ['acknowledged'], to: 'in_production' },
  ship: { from: ['in_production'], to: 'shipped' },
  deliver: { from: ['shipped'], to: 'delivered' },
  request_clarification: { from: ['submitted', 'acknowledged'], to: 'needs_clarification' },
  resubmit: { from: ['needs_clarification'], to: 'submitted' },
  reject: { from: ['submitted', 'acknowledged', 'needs_clarification'], to: 'rejected' },
  cancel: {
    from: ['draft', 'ready', 'submitted', 'acknowledged', 'in_production', 'needs_clarification'],
    to: 'cancelled',
  },
};

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['delivered', 'rejected', 'cancelled'];

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class OrderTransitionError extends Error {
  override name = 'OrderTransitionError';
  constructor(
    message: string,
    readonly code: 'illegal_transition' | 'validation_failed' | 'invalid_input',
    readonly from: OrderStatus,
    readonly event: OrderEventName,
  ) {
    super(message);
  }
}

export class IllegalTransitionError extends OrderTransitionError {
  override name = 'IllegalTransitionError';
  constructor(from: OrderStatus, event: OrderEventName) {
    super(`Cannot "${event}" an order that is ${from}.`, 'illegal_transition', from, event);
  }
}

export class OrderValidationError extends OrderTransitionError {
  override name = 'OrderValidationError';
  constructor(
    from: OrderStatus,
    event: OrderEventName,
    readonly issues: ValidationIssue[],
  ) {
    const blocking = issues.filter((i) => i.severity === 'block');
    super(
      `Order cannot move to ready: ${blocking.map((i) => `${i.field}: ${i.message}`).join('; ')}`,
      'validation_failed',
      from,
      event,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(at: Date | string): IsoTimestamp {
  const d = typeof at === 'string' ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid timestamp: ${String(at)}`);
  return d.toISOString();
}

function freezeRecord(r: OrderEventRecord): OrderEventRecord {
  Object.freeze(r.actor);
  if (r.detail) Object.freeze(r.detail);
  return Object.freeze(r);
}

function compactDetail(d: Record<string, string | undefined>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d)) if (v !== undefined && v !== '') out[k] = v;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function canTransition(status: OrderStatus, event: OrderEventName): boolean {
  return TRANSITIONS[event].from.includes(status);
}

/** Events that are legal from a given status. */
export function allowedEvents(status: OrderStatus): OrderEventName[] {
  return (Object.keys(TRANSITIONS) as OrderEventName[]).filter((e) => canTransition(status, e));
}

// ---------------------------------------------------------------------------
// Create + transition
// ---------------------------------------------------------------------------

export type NewOrderInput = Omit<
  Order,
  'reference' | 'status' | 'createdAt' | 'updatedAt' | 'events' | 'supplierOrderNumber' | 'trackingNumber'
> & { reference?: string };

/** Create a draft order with its first audit record. */
export function createOrder(
  input: NewOrderInput,
  at: Date | string,
  actor: Actor,
  random?: RandomBytes,
): Order {
  const iso = toIso(at);
  const record = freezeRecord({
    seq: 1,
    type: 'created',
    from: null,
    to: 'draft',
    at: iso,
    actor: { ...actor },
  });
  return {
    ...input,
    reference: input.reference ?? generateOrderReference(iso, random),
    status: 'draft',
    createdAt: iso,
    updatedAt: iso,
    events: Object.freeze([record]),
  };
}

export interface TransitionResult {
  order: Order;
  event: OrderEventRecord;
}

/**
 * Apply an event. Returns a new order (the input is not mutated) and the
 * appended, frozen audit record. Throws IllegalTransitionError for an event
 * not allowed from the current status, OrderValidationError when mark_ready
 * (or a validated resubmit) finds blocking issues.
 */
export function transition(order: Order, event: OrderEvent, at: Date | string, actor: Actor): TransitionResult {
  const from = order.status;
  const rule = TRANSITIONS[event.type];
  if (!rule) throw new OrderTransitionError(`Unknown event "${String((event as { type: unknown }).type)}"`, 'invalid_input', from, event.type);
  if (!rule.from.includes(from)) throw new IllegalTransitionError(from, event.type);

  const iso = toIso(at);
  const last = order.events[order.events.length - 1];
  if (last && iso < last.at) {
    throw new OrderTransitionError(
      `Event time ${iso} is before the previous event (${last.at}).`,
      'invalid_input',
      from,
      event.type,
    );
  }

  const patch: { supplierOrderNumber?: string; trackingNumber?: string } = {};
  let detail: Record<string, string> | undefined;

  switch (event.type) {
    case 'mark_ready': {
      const issues = validateOrder(order, event.supplier);
      if (hasBlockingIssues(issues)) throw new OrderValidationError(from, event.type, issues);
      const warnings = issues.filter((i) => i.severity === 'warn').length;
      detail = compactDetail({ supplierId: event.supplier.id, warnings: String(warnings) });
      break;
    }
    case 'reopen':
      detail = compactDetail({ reason: event.reason });
      break;
    case 'submit':
      detail = compactDetail({ channel: event.channel, messageId: event.messageId });
      break;
    case 'acknowledge':
      if (event.supplierOrderNumber) patch.supplierOrderNumber = event.supplierOrderNumber;
      detail = compactDetail({ supplierOrderNumber: event.supplierOrderNumber, note: event.note });
      break;
    case 'start_production':
    case 'deliver':
      detail = compactDetail({ note: event.note });
      break;
    case 'ship':
      if (event.trackingNumber) patch.trackingNumber = event.trackingNumber;
      detail = compactDetail({ trackingNumber: event.trackingNumber, carrier: event.carrier });
      break;
    case 'request_clarification':
      if (!event.question?.trim()) {
        throw new OrderTransitionError('A clarification request needs the question.', 'invalid_input', from, event.type);
      }
      detail = { question: event.question };
      break;
    case 'resubmit':
      if (event.supplier) {
        const issues = validateOrder(order, event.supplier);
        if (hasBlockingIssues(issues)) throw new OrderValidationError(from, event.type, issues);
      }
      detail = compactDetail({ answer: event.answer, messageId: event.messageId });
      break;
    case 'reject':
    case 'cancel':
      if (!event.reason?.trim()) {
        throw new OrderTransitionError(`"${event.type}" needs a reason.`, 'invalid_input', from, event.type);
      }
      detail = { reason: event.reason };
      break;
  }

  const record = freezeRecord({
    seq: (last?.seq ?? 0) + 1,
    type: event.type as OrderEventType,
    from,
    to: rule.to,
    at: iso,
    actor: { ...actor },
    ...(detail ? { detail } : {}),
  });

  const next: Order = {
    ...order,
    ...patch,
    status: rule.to,
    updatedAt: iso,
    events: Object.freeze([...order.events, record]),
  };
  return { order: next, event: record };
}

/** Replay the audit trail and confirm it is consistent with the order's status. */
export function verifyAuditTrail(order: Order): boolean {
  let status: OrderStatus | null = null;
  let seq = 0;
  for (const e of order.events) {
    if (e.seq !== seq + 1 || e.from !== status) return false;
    if (e.type === 'created') {
      if (status !== null || e.to !== 'draft') return false;
    } else {
      const rule = TRANSITIONS[e.type];
      if (status === null || !rule.from.includes(status) || rule.to !== e.to) return false;
    }
    status = e.to;
    seq = e.seq;
  }
  return status === order.status;
}

// ---------------------------------------------------------------------------
// SLA: acknowledgement overdue
// ---------------------------------------------------------------------------

export interface BusinessCalendar {
  /** Holidays as 'YYYY-MM-DD' (UTC dates). */
  holidays?: readonly string[];
  /** Weekend days, 0=Sunday..6=Saturday. Default [0, 6]. */
  weekendDays?: readonly number[];
}

function isBusinessDay(d: Date, cal: BusinessCalendar): boolean {
  const weekend = cal.weekendDays ?? [0, 6];
  if (weekend.includes(d.getUTCDay())) return false;
  return !(cal.holidays ?? []).includes(d.toISOString().slice(0, 10));
}

/**
 * Add N business days, keeping the time of day (UTC). Submitting Friday
 * 15:00 with N=2 gives Tuesday 15:00.
 */
export function addBusinessDays(start: Date | string, days: number, cal: BusinessCalendar = {}): Date {
  const d = new Date(typeof start === 'string' ? start : start.getTime());
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDay(d, cal)) left--;
  }
  return d;
}

/** The time the order most recently entered `submitted` (resubmits restart the clock). */
export function lastSubmittedAt(order: Order): IsoTimestamp | null {
  for (let i = order.events.length - 1; i >= 0; i--) {
    const e = order.events[i];
    if (e && e.to === 'submitted') return e.at;
  }
  return null;
}

export interface AckSlaStatus {
  orderId: string;
  reference: string;
  supplierId: string;
  submittedAt: IsoTimestamp;
  dueAt: IsoTimestamp;
  slaBusinessDays: number;
  overdue: boolean;
}

/**
 * For an order waiting on the supplier (status `submitted`), report when the
 * acknowledgement is due and whether it is overdue. Returns null for orders
 * not waiting on an acknowledgement.
 */
export function ackSlaStatus(
  order: Order,
  supplier: Pick<Supplier, 'id' | 'ackSlaBusinessDays'>,
  now: Date | string,
  cal: BusinessCalendar = {},
): AckSlaStatus | null {
  if (order.status !== 'submitted') return null;
  const submittedAt = lastSubmittedAt(order);
  if (!submittedAt) return null;
  const due = addBusinessDays(submittedAt, supplier.ackSlaBusinessDays, cal);
  const nowMs = typeof now === 'string' ? Date.parse(now) : now.getTime();
  return {
    orderId: order.id,
    reference: order.reference,
    supplierId: supplier.id,
    submittedAt,
    dueAt: due.toISOString(),
    slaBusinessDays: supplier.ackSlaBusinessDays,
    overdue: nowMs > due.getTime(),
  };
}

/** Flag every submitted-but-unacknowledged order past its supplier's SLA. */
export function findOverdueAcknowledgements(
  orders: readonly Order[],
  supplierLookup: (id: string) => Pick<Supplier, 'id' | 'ackSlaBusinessDays'> | undefined,
  now: Date | string,
  opts: BusinessCalendar & { defaultSlaBusinessDays?: number } = {},
): AckSlaStatus[] {
  const out: AckSlaStatus[] = [];
  for (const o of orders) {
    const s = supplierLookup(o.supplierId) ?? { id: o.supplierId, ackSlaBusinessDays: opts.defaultSlaBusinessDays ?? 2 };
    const st = ackSlaStatus(o, s, now, opts);
    if (st?.overdue) out.push(st);
  }
  return out;
}
