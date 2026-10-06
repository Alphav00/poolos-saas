import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { renderOrderPdf, toWinAnsi } from '../src/pdf.js';
import { EmailBuildError, buildSubmissionEmail, toBase64 } from '../src/email.js';
import { transition } from '../src/lifecycle.js';
import { findOrderReference, generateOrderReference, isOrderReference } from '../src/reference.js';
import type { Order } from '../src/types.js';
import { configuredMerlin, coverLine, draftOrder, fixedRandom, installerActor, linerLine } from './fixtures.js';

const supplier = configuredMerlin();
const generatedAt = new Date('2026-10-06T12:00:00Z');

/** Decode every content stream and collect the text drawn (hex strings from standard fonts). */
async function extractDrawnText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  let out = '';
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const data = decodePDFRawStream(obj).decode();
    const s = latin1(data);
    for (const m of s.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      const hex = m[1] ?? '';
      for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      out += '\n';
    }
  }
  return out;
}

function readyOrder(lines = [linerLine(), coverLine()]): Order {
  return transition(draftOrder(lines), { type: 'mark_ready', supplier }, '2026-10-05T15:00:00Z', installerActor).order;
}

describe('order references', () => {
  it('have the DB-yyyymmdd-XXXXXX shape and are deterministic with a fixed source', () => {
    const r = generateOrderReference('2026-10-06T23:59:00Z', fixedRandom);
    expect(r).toMatch(/^DB-20261006-[2-9A-HJKMNP-Z]{6}$/);
    expect(generateOrderReference('2026-10-06T23:59:00Z', fixedRandom)).toBe(r);
    expect(isOrderReference(r)).toBe(true);
  });
  it('use crypto randomness by default', () => {
    const a = generateOrderReference(new Date('2026-10-06'));
    const b = generateOrderReference(new Date('2026-10-06'));
    expect(isOrderReference(a)).toBe(true);
    expect(a).not.toBe(b);
  });
  it('are found in reply subjects', () => {
    expect(findOrderReference('RE: Fwd: [DB-20261006-ABC234] Liner order - Jane')).toBe('DB-20261006-ABC234');
    expect(findOrderReference('re: db-20261006-abc234 thanks')).toBe('DB-20261006-ABC234');
    expect(findOrderReference('no reference here DB-2026-ABC')).toBeNull();
  });
});

describe('renderOrderPdf', () => {
  it('produces a PDF that parses back with the reference and installer name', async () => {
    const order = readyOrder();
    const bytes = await renderOrderPdf(order, { supplier, generatedAt });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(latin1(bytes.slice(0, 5))).toBe('%PDF-');

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(0);
    expect(doc.getTitle()).toContain(order.reference);
    expect(doc.getAuthor()).toBe('Blue Lagoon Pools LLC');

    const text = await extractDrawnText(bytes);
    expect(text).toContain(`Reference: ${order.reference}`);
    expect(text).toContain('Blue Lagoon Pools LLC');
    expect(text).toContain('Jane Apple');
    expect(text).toContain('20 Apple Way');
    expect(text).toContain('Fittings / cut-out schedule');
    expect(text).toContain('Main Drain');
    expect(text).toContain('Obstacles');
    expect(text).toContain('Closure checks');
    expect(text).toContain('PASS');
    expect(text).toContain('Measurement sketch (plan view)');
    expect(text).toContain('A/B measurement table');
    expect(text).toContain('Replacement liner.');
    expect(text).toContain('Prepared for');
    expect(text).toContain('Merlin Industries');
  });

  it('paginates long A/B tables', async () => {
    const pts = Array.from({ length: 120 }, (_, i) => ({ number: i + 1, aDistance: 10 + i / 10, bDistance: 20 + i / 10 }));
    const order = draftOrder([coverLine({ perimeterPoints: pts, crossDimensions: [] })]);
    const doc = await PDFDocument.load(await renderOrderPdf(order, { generatedAt }));
    expect(doc.getPageCount()).toBeGreaterThan(2);
  });

  it('renders minimal and odd input without throwing', async () => {
    const order: Order = {
      ...draftOrder([{ id: 'x', product: 'liner', quantity: 1, notes: 'Emoji \u{1F3CA} and — dash “quotes”' }]),
      customer: { name: 'Zürich 中文' },
    };
    const bytes = await renderOrderPdf(order, { generatedAt });
    const text = await extractDrawnText(bytes);
    expect(text).toContain('No fittings recorded.');
    expect(text).toContain('No closure checks supplied.');
    expect(toWinAnsi('a—b \u{1F3CA} ü')).toBe('a-b ? ü');
  });

  it('colors a blocking closure check and handles a degenerate sketch', async () => {
    const order = draftOrder([linerLine({ closureChecks: [{ name: 'perimeter', status: 'block' }], sketch: [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }] })]);
    const text = await extractDrawnText(await renderOrderPdf(order, { generatedAt }));
    expect(text).toContain('BLOCK');
  });
});

describe('buildSubmissionEmail', () => {
  it('builds a message with the reference in the subject and a PDF attachment', async () => {
    const order = readyOrder();
    const msg = await buildSubmissionEmail(order, supplier, { generatedAt });
    expect(msg.to).toEqual(['orders@example.test']);
    expect(msg.replyTo).toBe('office@bluelagoon.test');
    expect(msg.subject).toBe(`[${order.reference}] Liner + Safety cover order - Jane Apple - Blue Lagoon Pools LLC`);
    expect(findOrderReference(`Re: ${msg.subject}`)).toBe(order.reference);
    expect(msg.headers['X-Diving-Board-Order']).toBe(order.reference);
    expect(msg.text).toContain(order.reference);
    expect(msg.text).toContain('Vinyl liner x1, rectangle (Blue Tile, 20 mil)');
    expect(msg.text).toContain('Safety cover x1, freeform (mesh_standard, blue)');
    expect(msg.attachments).toHaveLength(1);
    const att = msg.attachments[0]!;
    expect(att).toMatchObject({ filename: `${order.reference}.pdf`, contentType: 'application/pdf' });
    const pdf = Uint8Array.from(atobBytes(att.base64));
    const doc = await PDFDocument.load(pdf);
    expect(doc.getTitle()).toContain(order.reference);
  });

  it('subject is stable for the same order', async () => {
    const order = readyOrder();
    const pdf = new Uint8Array([1, 2, 3]);
    const a = await buildSubmissionEmail(order, supplier, { pdf });
    const b = await buildSubmissionEmail(order, supplier, { pdf });
    expect(a.subject).toBe(b.subject);
    expect(a.attachments[0]?.base64).toBe('AQID');
  });

  it('tags a resubmission after a clarification request', async () => {
    let o = readyOrder();
    o = transition(o, { type: 'submit' }, '2026-10-05T16:00:00Z', installerActor).order;
    o = transition(o, { type: 'request_clarification', question: 'Bead?' }, '2026-10-06T10:00:00Z', installerActor).order;
    const msg = await buildSubmissionEmail(o, supplier, { pdf: new Uint8Array([0]), message: 'Bead is standard.' });
    expect(msg.subject).toContain('RESUBMIT:');
    expect(msg.text.startsWith('Hello Merlin Industries,\n\nBead is standard.')).toBe(true);
  });

  it('refuses drafts, wrong suppliers, and suppliers without an order email', async () => {
    await expect(buildSubmissionEmail(draftOrder(), supplier)).rejects.toThrow(EmailBuildError);
    const order = readyOrder();
    await expect(buildSubmissionEmail(order, { ...supplier, id: 'latham' })).rejects.toThrow(/not "latham"/);
    const noEmail = { ...supplier, contact: { ...supplier.contact, orderEmail: null } };
    await expect(buildSubmissionEmail(order, noEmail)).rejects.toThrow(/no order email/);
    const ok = await buildSubmissionEmail(order, noEmail, { to: ['test@example.test'], cc: ['me@example.test'], pdf: new Uint8Array() });
    expect(ok.to).toEqual(['test@example.test']);
    expect(ok.cc).toEqual(['me@example.test']);
    await expect(buildSubmissionEmail({ ...order, reference: 'nope' }, supplier)).rejects.toThrow(/valid reference/);
  });
});

describe('toBase64', () => {
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foobar', 'Zm9vYmFy'],
  ])('%j -> %s', (input, expected) => {
    expect(toBase64(Uint8Array.from(input, (c) => c.charCodeAt(0)))).toBe(expected);
  });
  it('round-trips binary', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(Array.from(atobBytes(toBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

function latin1(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

/** Independent base64 decoder (avoids relying on DOM/Node typings). */
function atobBytes(b64: string): number[] {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of b64.replace(/=+$/, '')) {
    buf = (buf << 6) | alpha.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return out;
}
