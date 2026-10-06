import type { Order, OrderStatus, Supplier } from './types.js';
import { renderOrderPdf } from './pdf.js';
import { isOrderReference } from './reference.js';

export interface EmailAttachment {
  filename: string;
  contentType: string;
  /** Base64 (standard alphabet, padded, no line breaks). */
  base64: string;
}

export interface SubmissionEmail {
  to: string[];
  cc: string[];
  replyTo: string | null;
  subject: string;
  text: string;
  /** Extra headers that help thread replies back to the order. */
  headers: Record<string, string>;
  attachments: EmailAttachment[];
}

export class EmailBuildError extends Error {
  override readonly name = 'EmailBuildError';
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Dependency-free base64 (no Buffer, no btoa needed). */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + B64[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + '==';
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + '=';
  }
  return out;
}

/** Statuses from which an order may be (re)sent to the supplier. */
export const SENDABLE_STATUSES: readonly OrderStatus[] = ['ready', 'submitted', 'needs_clarification'];

export interface BuildEmailOptions {
  /** Override recipients (e.g. a test inbox); otherwise the supplier's order email. */
  to?: string[];
  cc?: string[];
  /** Pre-rendered PDF; rendered with renderOrderPdf when omitted. */
  pdf?: Uint8Array;
  /** Prefix such as "RESUBMIT" for a clarification answer. */
  subjectTag?: string;
  /** Extra message from the installer, placed above the summary. */
  message?: string;
  generatedAt?: Date;
}

export function orderSubject(order: Order, supplier: Pick<Supplier, 'name'>, tag?: string): string {
  const kinds = [...new Set(order.lines.map((l) => (l.product === 'liner' ? 'Liner' : 'Safety cover')))].join(' + ');
  const parts = [`[${order.reference}]`, tag ? `${tag}:` : '', `${kinds || 'Pool'} order`, `- ${order.customer.name}`, `- ${order.installer.companyName}`];
  return parts.filter(Boolean).join(' ').replace(/[\r\n]+/g, ' ');
}

/**
 * Build (not send) the supplier submission email for an order. The order
 * reference sits in the subject in brackets and in an X- header, so a reply
 * ("Re: [DB-...]") can be matched back with findOrderReference().
 */
export async function buildSubmissionEmail(
  order: Order,
  supplier: Supplier,
  options: BuildEmailOptions = {},
): Promise<SubmissionEmail> {
  if (!isOrderReference(order.reference)) throw new EmailBuildError(`Order has no valid reference ("${order.reference}").`);
  if (!SENDABLE_STATUSES.includes(order.status)) {
    throw new EmailBuildError(`Order ${order.reference} is ${order.status}; only ${SENDABLE_STATUSES.join(', ')} orders can be sent.`);
  }
  if (order.supplierId !== supplier.id) {
    throw new EmailBuildError(`Order ${order.reference} is for supplier "${order.supplierId}", not "${supplier.id}".`);
  }
  const to = options.to ?? (supplier.contact.orderEmail ? [supplier.contact.orderEmail] : []);
  if (to.length === 0) {
    throw new EmailBuildError(`${supplier.name} has no order email configured; add it from your dealer account or pass options.to.`);
  }

  const pdf = options.pdf ?? (await renderOrderPdf(order, { supplier, ...(options.generatedAt ? { generatedAt: options.generatedAt } : {}) }));
  const subject = orderSubject(order, supplier, options.subjectTag ?? (order.status === 'needs_clarification' ? 'RESUBMIT' : undefined));

  const lines: string[] = [];
  lines.push(`Hello ${supplier.name},`, '');
  if (options.message) lines.push(options.message.trim(), '');
  lines.push(`Please find attached order ${order.reference} from ${order.installer.companyName}.`, '');
  lines.push(`Order reference: ${order.reference}`);
  if (order.installer.dealerAccountNumber) lines.push(`Dealer account: ${order.installer.dealerAccountNumber}`);
  lines.push(`Customer: ${order.customer.name}`);
  const s = order.site;
  lines.push(`Site: ${[s.addressLine1, s.addressLine2, s.city, s.region, s.postalCode].filter(Boolean).join(', ')}`);
  lines.push(`Units: ${order.units}`, '');
  order.lines.forEach((l, i) => {
    const what = l.product === 'liner' ? 'Vinyl liner' : 'Safety cover';
    const detail =
      l.product === 'liner'
        ? [l.liner?.patternName, l.liner?.thicknessMil ? `${l.liner.thicknessMil} mil` : undefined]
        : [l.cover?.coverType, l.cover?.color];
    lines.push(`  ${i + 1}. ${what} x${l.quantity}${l.shape ? `, ${l.shape}` : ''}${detail.filter(Boolean).length ? ` (${detail.filter(Boolean).join(', ')})` : ''}`);
  });
  if (order.notes) lines.push('', `Notes: ${order.notes}`);
  lines.push('', `Please keep [${order.reference}] in the subject line when replying so we can match your reply to this order.`, '');
  const sig = [order.installer.contactName, order.installer.companyName, order.installer.phone, order.installer.email].filter((x): x is string => Boolean(x));
  lines.push('Thank you,', ...sig);

  return {
    to,
    cc: options.cc ?? [],
    replyTo: order.installer.email ?? null,
    subject,
    text: lines.join('\n'),
    headers: { 'X-Diving-Board-Order': order.reference },
    attachments: [{ filename: `${order.reference}.pdf`, contentType: 'application/pdf', base64: toBase64(pdf) }],
  };
}
