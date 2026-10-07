import { writeFileSync, mkdirSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import { coverOrderFormFlow, fixture, linerOrderFormFlow, renderPdf } from '../src'

it('draws both order forms as valid PDFs with the right page count and title', async () => {
  const cover = await renderPdf(coverOrderFormFlow(fixture('kidney')!))
  const liner = await renderPdf(linerOrderFormFlow(fixture('kidney-liner')!))
  for (const [bytes, title] of [[cover, 'Pool Cover Order Form - Kidney Test'], [liner, 'Vinyl Liner Order Form - Kidney Liner Test']] as const) {
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getTitle()).toBe(title)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2)
  }
  if (process.env.MEASURE_PDF_OUT) {
    mkdirSync(process.env.MEASURE_PDF_OUT, { recursive: true })
    writeFileSync(`${process.env.MEASURE_PDF_OUT}/cover.pdf`, cover)
    writeFileSync(`${process.env.MEASURE_PDF_OUT}/liner.pdf`, liner)
  }
})

it('never fails on characters the PDF fonts cannot draw', async () => {
  const job = fixture('rectangular')!
  job.meta.customer_name = 'Zoë 李 🏊'
  job.notes = 'Gate 🔑 & <b>dog</b>'
  const bytes = await renderPdf(coverOrderFormFlow(job))
  expect(bytes.length).toBeGreaterThan(1000)
})
