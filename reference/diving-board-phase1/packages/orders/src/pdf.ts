import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { LengthUnit, Order, OrderLine, SketchPoint, Supplier } from './types.js';

/**
 * Render an order as a generic, unbranded PDF order form. The installer's
 * company heads the page; no manufacturer branding or form layout is used.
 * Uses only pdf-lib standard fonts, so it runs in Cloudflare Workers.
 */

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.8, 0.8, 0.8);
const STATUS_COLOR: Record<string, RGB> = {
  pass: rgb(0.1, 0.5, 0.22),
  warn: rgb(0.6, 0.4, 0),
  block: rgb(0.7, 0.14, 0.09),
};

/**
 * Standard PDF fonts only encode WinAnsi. Map common typography to ASCII
 * and replace anything else with "?" so user text can never crash rendering.
 */
export function toWinAnsi(text: string): string {
  const map: Record<string, string> = {
    '‘': "'", '’': "'", '“': '"', '”': '"',
    '–': '-', '—': '-', '…': '...', '′': "'", '″': '"',
    ' ': ' ', '•': '*', '\t': '  ',
  };
  let out = '';
  for (const ch of text) {
    const m = map[ch];
    if (m !== undefined) out += m;
    else {
      const c = ch.codePointAt(0) ?? 63;
      out += (c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff) ? ch : '?';
    }
  }
  return out;
}

function fmt(n: number | undefined, digits = 3): string {
  if (n === undefined || !Number.isFinite(n)) return '-';
  return String(Number(n.toFixed(digits)));
}

const pretty = (s: string | undefined): string =>
  s === undefined || s === '' ? '-' : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

class Writer {
  page!: PDFPage;
  y = 0;
  pageNo = 0;

  constructor(
    readonly doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
    readonly footer: string,
  ) {
    this.newPage();
  }

  newPage(): void {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNo++;
    this.y = PAGE_H - MARGIN;
    this.page.drawText(toWinAnsi(this.footer), { x: MARGIN, y: MARGIN / 2, size: 7, font: this.font, color: GREY });
  }

  ensure(h: number): void {
    if (this.y - h < MARGIN) this.newPage();
  }

  fit(text: string, width: number, font: PDFFont, size: number): string {
    let t = toWinAnsi(text);
    if (font.widthOfTextAtSize(t, size) <= width) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > width) t = t.slice(0, -1);
    return `${t}...`;
  }

  wrap(text: string, width: number, font: PDFFont, size: number): string[] {
    const lines: string[] = [];
    for (const para of toWinAnsi(text).split(/\r?\n/)) {
      let cur = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const cand = cur ? `${cur} ${word}` : word;
        if (font.widthOfTextAtSize(cand, size) <= width) cur = cand;
        else {
          if (cur) lines.push(cur);
          cur = font.widthOfTextAtSize(word, size) <= width ? word : this.fit(word, width, font, size);
        }
      }
      lines.push(cur);
    }
    return lines;
  }

  text(s: string, opts: { size?: number; bold?: boolean; color?: RGB; x?: number } = {}): void {
    const size = opts.size ?? 9;
    const font = opts.bold ? this.bold : this.font;
    for (const line of this.wrap(s, CONTENT_W - ((opts.x ?? MARGIN) - MARGIN), font, size)) {
      this.ensure(size + 3);
      this.y -= size + 3;
      this.page.drawText(line, { x: opts.x ?? MARGIN, y: this.y, size, font, color: opts.color ?? BLACK });
    }
  }

  /** Sub-heading kept on the same page as the first `keepWith` points of what follows. */
  sub(s: string, keepWith = 30): void {
    this.ensure(keepWith + 18);
    this.y -= 6;
    this.text(s, { size: 9, bold: true });
  }

  heading(s: string): void {
    this.ensure(40);
    this.y -= 10;
    this.text(s, { size: 11, bold: true });
    this.y -= 2;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 0.5, color: LIGHT });
    this.y -= 2;
  }

  /** Two-column key/value grid: [label, value, label, value] per row. */
  kv(pairs: Array<[string, string]>): void {
    const size = 9;
    const colW = CONTENT_W / 2;
    const labelW = 105;
    for (let i = 0; i < pairs.length; i += 2) {
      this.ensure(size + 4);
      this.y -= size + 4;
      for (let c = 0; c < 2; c++) {
        const pair = pairs[i + c];
        if (!pair) continue;
        const x = MARGIN + c * colW;
        this.page.drawText(this.fit(pair[0], labelW - 4, this.bold, size), { x, y: this.y, size, font: this.bold });
        this.page.drawText(this.fit(pair[1], colW - labelW - 8, this.font, size), { x: x + labelW, y: this.y, size, font: this.font });
      }
    }
  }

  table(headers: string[], rows: string[][], widths: number[], colorCol?: { index: number; colors: (RGB | undefined)[] }): void {
    const size = 8;
    const rowH = size + 6;
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = total > CONTENT_W ? CONTENT_W / total : 1;
    const ws = widths.map((w) => w * scale);
    const drawRow = (cells: string[], header: boolean, color?: RGB, ci?: number) => {
      this.y -= rowH;
      let x = MARGIN;
      cells.forEach((cell, i) => {
        const w = ws[i] ?? 60;
        const font = header ? this.bold : this.font;
        this.page.drawText(this.fit(cell, w - 6, font, size), {
          x: x + 3,
          y: this.y + 4,
          size,
          font: header || (color && i === ci) ? this.bold : font,
          color: color && i === ci ? color : BLACK,
        });
        x += w;
      });
      this.page.drawLine({
        start: { x: MARGIN, y: this.y },
        end: { x: MARGIN + ws.reduce((a, b) => a + b, 0), y: this.y },
        thickness: header ? 0.7 : 0.25,
        color: header ? GREY : LIGHT,
      });
    };
    this.ensure(rowH * 2);
    drawRow(headers, true);
    rows.forEach((r, i) => {
      if (this.y - rowH < MARGIN) {
        this.newPage();
        drawRow(headers, true);
      }
      drawRow(r, false, colorCol?.colors[i], colorCol?.index);
    });
    this.y -= 4;
  }

  /** Plan-view sketch: closed polygon scaled into a box, with point labels. */
  sketch(points: SketchPoint[], units: LengthUnit, height = 220): void {
    const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 3) return;
    this.ensure(height + 20);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const pad = 16;
    const boxW = CONTENT_W;
    const scale = Math.min((boxW - pad * 2) / spanX, (height - pad * 2) / spanY);
    const drawnW = spanX * scale;
    const drawnH = spanY * scale;
    const ox = MARGIN + (boxW - drawnW) / 2;
    const top = this.y - 4;
    const oy = top - height + (height - drawnH) / 2;
    // y up in PDF; measurement y treated as "up" as well.
    const map = (p: SketchPoint) => ({ x: ox + (p.x - minX) * scale, y: oy + (p.y - minY) * scale });

    this.page.drawRectangle({ x: MARGIN, y: top - height, width: boxW, height, borderColor: LIGHT, borderWidth: 0.5 });
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (!a || !b) continue;
      this.page.drawLine({ start: map(a), end: map(b), thickness: 1, color: BLACK });
    }
    for (const p of pts) {
      if (!p.label) continue;
      const m = map(p);
      this.page.drawText(toWinAnsi(p.label), { x: m.x + 2, y: m.y + 2, size: 6, font: this.font, color: GREY });
    }
    this.y = top - height - 4;
    this.text(`Sketch not to scale for fabrication. Extent ${fmt(spanX, 2)} x ${fmt(spanY, 2)} ${units}.`, { size: 7, color: GREY });
  }
}

export interface RenderOptions {
  /** Shown as "Prepared for <supplier name>" (plain text, no branding). */
  supplier?: Pick<Supplier, 'name'>;
  /** Override "now" for the generated-at stamp (deterministic tests). */
  generatedAt?: Date;
}

export async function renderOrderPdf(order: Order, options: RenderOptions = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const generated = options.generatedAt ?? new Date();
  const title = `Order ${order.reference} - ${order.customer.name}`;
  doc.setTitle(toWinAnsi(title));
  doc.setSubject(toWinAnsi(`Pool order ${order.reference}`));
  doc.setAuthor(toWinAnsi(order.installer.companyName));
  doc.setKeywords([order.reference]);
  doc.setProducer('@diving-board/orders');
  doc.setCreationDate(generated);
  doc.setModificationDate(generated);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold, `${order.reference}  |  ${order.installer.companyName}`);

  // ---- header: installer, not manufacturer ----------------------------------
  w.text(order.installer.companyName, { size: 16, bold: true });
  const contact = [order.installer.contactName, order.installer.phone, order.installer.email].filter(Boolean).join('  |  ');
  if (contact) w.text(contact, { size: 9, color: GREY });
  w.y -= 6;
  const products = [...new Set(order.lines.map((l) => (l.product === 'liner' ? 'VINYL LINER' : 'SAFETY COVER')))];
  w.text(`${products.join(' + ') || 'POOL'} ORDER`, { size: 13, bold: true });
  w.text(`Reference: ${order.reference}`, { size: 11, bold: true });
  w.text('Please quote this reference in all replies.', { size: 8, color: GREY });

  // ---- job meta -----------------------------------------------------------
  w.heading('Order');
  w.kv([
    ['Prepared for', options.supplier?.name ?? order.supplierId],
    ['Status', pretty(order.status)],
    ['Dealer account', order.installer.dealerAccountNumber ?? '-'],
    ['Job ID', order.jobId ?? '-'],
    ['Created', order.createdAt.slice(0, 10)],
    ['Units', order.units],
    ['Generated', generated.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'],
    ['Lines', String(order.lines.length)],
  ]);

  // ---- customer / site ----------------------------------------------------
  w.heading('Customer & Site');
  const s = order.site;
  const cityLine = [s.city, s.region, s.postalCode].filter(Boolean).join(', ');
  w.kv([
    ['Customer', order.customer.name],
    ['Address', [s.addressLine1, s.addressLine2].filter(Boolean).join(', ')],
    ['Phone', order.customer.phone ?? '-'],
    ['City / postcode', [cityLine, s.country].filter(Boolean).join(' ') || '-'],
    ['Email', order.customer.email ?? '-'],
    ['Site access', s.accessNotes ?? '-'],
  ]);

  order.lines.forEach((line, i) => renderLine(w, order, line, i));

  if (order.notes) {
    w.heading('Order Notes');
    w.text(order.notes);
  }

  return doc.save();
}

function renderLine(w: Writer, order: Order, line: OrderLine, index: number): void {
  const u = order.units;
  w.heading(`Line ${index + 1}: ${line.product === 'liner' ? 'Vinyl Liner' : 'Safety Cover'}  (qty ${line.quantity})`);

  // ---- product spec -------------------------------------------------------
  const spec: Array<[string, string]> = [
    ['Shape', pretty(line.shape)],
    ['Shallow depth', line.shallowDepth !== undefined ? `${fmt(line.shallowDepth)} ${u}` : '-'],
    ['Deep depth', line.deepDepth !== undefined ? `${fmt(line.deepDepth)} ${u}` : '-'],
  ];
  if (line.product === 'liner') {
    const l = line.liner ?? {};
    spec.push(
      ['Pattern', [l.patternName, l.patternCode].filter(Boolean).join(' / ') || '-'],
      ['Thickness (mil)', l.thicknessMil !== undefined ? String(l.thicknessMil) : '-'],
      ['Bead type', pretty(l.beadType)],
      ['Coping', pretty(l.copingType)],
      ['Floor', pretty(l.floorType)],
      ['Cove', pretty(l.coveType)],
      ['Steps', pretty(l.stepConstruction)],
      ['Tile border', l.tileBorder ?? '-'],
    );
  } else {
    const c = line.cover ?? {};
    spec.push(
      ['Cover type', pretty(c.coverType)],
      ['Color', pretty(c.color)],
      ['Spacing', c.spacing ?? '-'],
      ['Anchor type', pretty(c.anchorType)],
      ['Overlap (in)', c.overlapIn !== undefined ? String(c.overlapIn) : '-'],
      ['Planter overlap (in)', c.planterOverlapIn !== undefined ? String(c.planterOverlapIn) : '-'],
    );
  }
  w.kv(spec);

  if (line.abReference) {
    const ab = line.abReference;
    w.kv([
      ['A-B distance', `${fmt(ab.distance)} ${u}`],
      ['A-B offset', ab.offsetFromPool !== undefined ? `${fmt(ab.offsetFromPool)} ${u}` : '-'],
      ['Orientation', pretty(ab.orientation)],
      ['A-B note', ab.note ?? '-'],
    ]);
  }

  // ---- dimensions ---------------------------------------------------------
  if (line.dimensions?.length) {
    w.sub('Dimensions');
    w.table(['Dimension', `Value (${u})`, 'Note'], line.dimensions.map((d) => [d.label, fmt(d.value), d.note ?? '']), [180, 90, 262]);
  }
  if (line.wallHeights?.length) {
    w.sub('Wall heights (bead receiver to top of cove)');
    w.table(
      ['Wall', 'At point #', `Height (${u})`, 'Notes'],
      line.wallHeights.map((h) => [h.label, h.atPoint !== undefined ? String(h.atPoint) : '-', fmt(h.height), h.notes ?? '']),
      [150, 70, 80, 232],
    );
  }
  if (line.crossDimensions?.length) {
    w.sub('Cross dimensions');
    w.table(['From pt #', 'To pt #', `Distance (${u})`], line.crossDimensions.map((c) => [String(c.fromPoint), String(c.toPoint), fmt(c.distance)]), [80, 80, 100]);
  }

  // ---- fittings / obstacles / add-ons -------------------------------------
  if (line.product === 'liner') {
    w.sub('Fittings / cut-out schedule');
    if (line.fittings?.length) {
      w.table(
        ['Kind', 'Label', 'Qty', `A (${u})`, `B (${u})`, 'Near pt', 'Below bead', 'Floor', 'Notes'],
        line.fittings.map((f) => [
          pretty(f.kind),
          f.label ?? '',
          String(f.quantity ?? 1),
          fmt(f.aDistance),
          fmt(f.bDistance),
          f.nearPoint !== undefined ? String(f.nearPoint) : '-',
          fmt(f.depthBelowBead),
          f.onFloor ? 'Yes' : 'No',
          f.notes ?? '',
        ]),
        [70, 70, 30, 50, 50, 45, 60, 35, 122],
      );
    } else {
      w.text('No fittings recorded.', { size: 8, color: GREY });
    }
  } else {
    w.sub('Obstacles');
    if (line.obstacles?.length) {
      w.table(
        ['Kind', 'Front pt #', 'Back pt #', 'Description'],
        line.obstacles.map((o) => [pretty(o.kind), o.frontPoint !== undefined ? String(o.frontPoint) : '', o.backPoint !== undefined ? String(o.backPoint) : '', o.description ?? '']),
        [110, 65, 65, 292],
      );
    } else {
      w.text(line.obstacles ? 'None on deck (surveyed).' : 'Not surveyed.', { size: 8, color: GREY });
    }
  }
  if (line.addOns?.length) {
    w.sub('Hardware / add-ons');
    w.table(['Item', 'Qty', 'Unit'], line.addOns.map((a) => [a.label, String(a.quantity), a.unit ?? '']), [250, 60, 80]);
  }

  // ---- closure checks -----------------------------------------------------
  w.sub('Closure checks');
  if (line.closureChecks?.length) {
    w.table(
      ['Check', `Measured (${u})`, `Expected (${u})`, 'Off by (in)', 'Status', 'Message'],
      line.closureChecks.map((c) => [pretty(c.name), fmt(c.measured), fmt(c.expected), fmt(c.differenceIn, 2), c.status.toUpperCase(), c.message ?? '']),
      [130, 70, 70, 60, 50, 152],
      { index: 4, colors: line.closureChecks.map((c) => STATUS_COLOR[c.status]) },
    );
  } else {
    w.text('No closure checks supplied.', { size: 8, color: GREY });
  }

  // ---- sketch + A/B table -------------------------------------------------
  if (line.sketch && line.sketch.length >= 3) {
    w.sub('Measurement sketch (plan view)', 240);
    w.sketch(line.sketch, u);
  }
  if (line.perimeterPoints?.length) {
    w.sub('A/B measurement table');
    w.table(
      ['Pt #', `A dist (${u})`, `B dist (${u})`, 'Notes'],
      line.perimeterPoints.map((p) => [String(p.number), fmt(p.aDistance), fmt(p.bDistance), (p.notes ?? '') + (p.isObstacle ? ' [obstacle]' : '')]),
      [45, 80, 80, 327],
    );
  }

  if (line.notes) {
    w.sub('Line notes');
    w.text(line.notes, { size: 9 });
  }
}
