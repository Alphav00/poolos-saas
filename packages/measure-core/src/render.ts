/**
 * Draws an order-form flow (orderForms.ts) to a letter-size PDF with pdf-lib,
 * following ReportLab's SimpleDocTemplate defaults the Python forms used:
 * half-inch margins plus the frame's 6 pt padding, Heading1/Heading2/BodyText
 * metrics from its sample stylesheet, centred tables with 6/3 pt cell padding,
 * header rows repeated when a table runs onto the next page.
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Block, Flow, StyleCmd } from './orderForms'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 36
const FRAME_PAD = 6
const LEFT = MARGIN + FRAME_PAD
const WIDTH = PAGE_W - 2 * (MARGIN + FRAME_PAD)
const TOP = PAGE_H - MARGIN - FRAME_PAD
const BOTTOM = MARGIN + FRAME_PAD

const PARA = {
  Heading1: { bold: true, size: 18, leading: 22, before: 0, after: 6 },
  Heading2: { bold: true, size: 14, leading: 18, before: 12, after: 6 },
  BodyText: { bold: false, size: 10, leading: 12, before: 6, after: 0 },
  small: { bold: false, size: 8, leading: 10, before: 6, after: 0 },
} as const

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** ReportLab paragraph markup, the part the forms use: <b>…</b> and entities. Other tags are dropped. */
function runs(markup: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = []
  let bold = false
  for (const part of markup.split(/(<\/?[a-zA-Z][^>]*>)/)) {
    if (/^<\/?b>$/i.test(part)) bold = !part.startsWith('</')
    else if (/^<\/?[a-zA-Z][^>]*>$/.test(part)) continue
    else if (part) out.push({ text: part.replace(/&(#\d+|[a-z]+);/gi, (m, e: string) => (e.startsWith('#') ? String.fromCodePoint(Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m)), bold })
  }
  return out
}

export async function renderPdf(form: Flow): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(form.title)
  doc.setCreator('PoolOS Measure')
  doc.setProducer('PoolOS')
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const font = (name: string) => (name.includes('Bold') ? bold : regular)

  // Standard fonts use WinAnsi; anything outside it is drawn as "?".
  const safeCache = new Map<string, string>()
  const safe = (s: string) =>
    [...s].map((ch) => {
      let ok = safeCache.get(ch)
      if (ok === undefined) {
        try {
          regular.encodeText(ch)
          ok = ch
        } catch {
          ok = '?'
        }
        safeCache.set(ch, ok)
      }
      return ok
    }).join('')

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H])
  let y = TOP
  let atTop = true
  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H])
    y = TOP
    atTop = true
  }

  function paragraph(block: Extract<Block, { t: 'p' }>) {
    const st = PARA[block.style]
    if (!atTop) y -= st.before
    // Word-wrap the runs to the frame width.
    type Word = { text: string; f: PDFFont; w: number; space: number }
    const words: Word[] = []
    for (const r of runs(block.text)) {
      const f = st.bold || r.bold ? bold : regular
      for (const piece of safe(r.text).split(/(\s+)/)) {
        if (!piece) continue
        if (/^\s+$/.test(piece)) {
          if (words.length) words[words.length - 1]!.space = f.widthOfTextAtSize(' ', st.size)
          continue
        }
        words.push({ text: piece, f, w: f.widthOfTextAtSize(piece, st.size), space: 0 })
      }
    }
    const lines: Word[][] = [[]]
    let lineW = 0
    for (const wd of words) {
      const line = lines[lines.length - 1]!
      const prev = line[line.length - 1]
      const add = (prev ? prev.space : 0) + wd.w
      if (line.length && lineW + add > WIDTH) {
        lines.push([wd])
        lineW = wd.w
      } else {
        line.push(wd)
        lineW += add
      }
    }
    for (const line of lines) {
      if (y - st.leading < BOTTOM) newPage()
      y -= st.leading
      let x = LEFT
      for (const wd of line) {
        page.drawText(wd.text, { x, y: y + (st.leading - st.size) * 0.5, size: st.size, font: wd.f })
        x += wd.w + wd.space
      }
    }
    y -= st.after
    atTop = false
  }

  function table(block: Extract<Block, { t: 'tbl' }>) {
    const nRows = block.rows.length
    const nCols = block.colWidths.length
    const norm = (c: number, n: number) => (c < 0 ? n + c : c)
    const inRange = (cmd: StyleCmd, col: number, row: number) => {
      const [c0, r0] = cmd[1]
      const [c1, r1] = cmd[2]
      return col >= norm(c0, nCols) && col <= norm(c1, nCols) && row >= norm(r0, nRows) && row <= norm(r1, nRows)
    }
    const cellStyle = (col: number, row: number) => {
      const s = { font: 'Helvetica', size: 10, color: '#000000', bg: null as string | null, align: 'LEFT' }
      for (const cmd of block.style) {
        if (!inRange(cmd, col, row)) continue
        if (cmd[0] === 'FONT') {
          s.font = cmd[3] as string
          if (cmd[4] !== undefined) s.size = cmd[4] as number
        } else if (cmd[0] === 'TEXTCOLOR') s.color = cmd[3] as string
        else if (cmd[0] === 'BACKGROUND') s.bg = cmd[3] as string
        else if (cmd[0] === 'ALIGN') s.align = cmd[3] as string
      }
      return s
    }
    const rowHeight = (row: number) => {
      let h = 0
      for (let c = 0; c < nCols; c++) h = Math.max(h, cellStyle(c, row).size * 1.2)
      return h + 6
    }
    const totalW = block.colWidths.reduce((a, b) => a + b, 0)
    const x0 = LEFT + (WIDTH - totalW) / 2
    const colX = block.colWidths.map((_, i) => x0 + block.colWidths.slice(0, i).reduce((a, b) => a + b, 0))

    const drawRow = (row: number, top: number) => {
      const h = rowHeight(row)
      for (let c = 0; c < nCols; c++) {
        const s = cellStyle(c, row)
        if (s.bg) page.drawRectangle({ x: colX[c]!, y: top - h, width: block.colWidths[c]!, height: h, color: hex(s.bg) })
        const f = font(s.font)
        const text = safe(block.rows[row]![c] ?? '')
        const tw = f.widthOfTextAtSize(text, s.size)
        const cx = s.align === 'RIGHT' ? colX[c]! + block.colWidths[c]! - 6 - tw : s.align === 'CENTER' ? colX[c]! + (block.colWidths[c]! - tw) / 2 : colX[c]! + 6
        page.drawText(text, { x: cx, y: top - h + 3 + s.size * 0.2, size: s.size, font: f, color: hex(s.color) })
      }
      return h
    }

    const drawLines = (rows: number[], tops: number[], bottom: number) => {
      const left = x0
      const right = x0 + totalW
      const top = tops[0]!
      for (const cmd of block.style) {
        if (cmd[0] !== 'BOX' && cmd[0] !== 'INNERGRID' && cmd[0] !== 'LINEABOVE') continue
        const width = cmd[3] as number
        const color = hex(cmd[4] as string)
        if (cmd[0] === 'BOX') page.drawRectangle({ x: left, y: bottom, width: totalW, height: top - bottom, borderColor: color, borderWidth: width })
        if (cmd[0] === 'INNERGRID') {
          for (let i = 1; i < rows.length; i++) page.drawLine({ start: { x: left, y: tops[i]! }, end: { x: right, y: tops[i]! }, thickness: width, color })
          for (let c = 1; c < nCols; c++) page.drawLine({ start: { x: colX[c]!, y: top }, end: { x: colX[c]!, y: bottom }, thickness: width, color })
        }
        if (cmd[0] === 'LINEABOVE') {
          rows.forEach((r, i) => {
            if (r >= norm(cmd[1][1], nRows) && r <= norm(cmd[2][1], nRows)) {
              page.drawLine({ start: { x: colX[norm(cmd[1][0], nCols)]!, y: tops[i]! }, end: { x: right, y: tops[i]! }, thickness: width, color })
            }
          })
        }
      }
    }

    let row = 0
    while (row < nRows) {
      const rows: number[] = []
      const tops: number[] = []
      let top = y
      if (row > 0) {
        // Continuing on a new page: repeat the header rows first.
        for (let r = 0; r < block.repeatRows; r++) {
          rows.push(r)
          tops.push(top)
          top -= drawRow(r, top)
        }
      }
      let drew = 0
      while (row < nRows && (top - rowHeight(row) >= BOTTOM || drew === 0 && atTop)) {
        rows.push(row)
        tops.push(top)
        top -= drawRow(row, top)
        row++
        drew++
      }
      if (drew === 0) {
        newPage()
        continue
      }
      drawLines(rows, tops, top)
      y = top
      atTop = false
      if (row < nRows) newPage()
    }
  }

  for (const block of form.flow) {
    if (block.t === 'p') paragraph(block)
    else if (block.t === 'sp') {
      if (!atTop) y -= block.h
      if (y < BOTTOM) newPage()
    } else if (block.t === 'pb') newPage()
    else table(block)
  }
  return doc.save()
}
