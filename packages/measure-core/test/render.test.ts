import { writeFileSync, mkdirSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import { coverOrderFormFlow, feetInches, fixture, linerOrderFormFlow, renderPdf, type Flow } from '../src'

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

it('turns decimal feet into feet and inches to the nearest quarter inch', () => {
  expect(feetInches('26')).toBe(`26' 0"`)
  expect(feetInches('4.166666666666667')).toBe(`4' 2"`)
  expect(feetInches('19.916666666666668')).toBe(`19' 11"`)
  expect(feetInches('9.27')).toBe(`9' 3 1/4"`)
  expect(feetInches('5.75')).toBe(`5' 9"`)
  expect(feetInches('11.99')).toBe(`12' 0"`)
  expect(feetInches(0.04)).toBe(`0' 0 1/2"`)
  expect(feetInches('')).toBe('')
  expect(feetInches('n/a')).toBe('n/a')
})

it('prints every cover-form length in feet and inches when asked, and leaves area and counts alone', async () => {
  const job = fixture('kidney')!
  const decimal = coverOrderFormFlow(job)
  const ftIn = coverOrderFormFlow(job, { lengths: 'ft-in' })
  const cells = (f: Flow) => f.flow.flatMap((b) => (b.t === 'tbl' ? b.rows.flat() : b.t === 'p' ? [b.text] : []))
  const text = cells(ftIn)
  expect(text.some((c) => c.includes('(ft)'))).toBe(false)
  expect(text).toContain('Area (sq ft)')
  const table = ftIn.flow.filter((b): b is Extract<typeof b, { t: 'tbl' }> => b.t === 'tbl').at(-1)!
  expect(table.rows[0]).toEqual(['Pt #', 'A dist', 'B dist', 'Notes'])
  for (const [i, pt] of job.measurement.perimeter_points.entries()) {
    expect(table.rows[i + 1]?.[1]).toBe(feetInches(pt.a_distance_ft))
    expect(table.rows[i + 1]?.[1]).toMatch(/^\d+' \d+( [13]\/[24])?"$/)
  }
  expect(cells(decimal).length).toBe(text.length)
  expect(await renderPdf(ftIn)).toBeInstanceOf(Uint8Array)
})

it('never fails on characters the PDF fonts cannot draw', async () => {
  const job = fixture('rectangular')!
  job.meta.customer_name = 'Zoë 李 🏊'
  job.notes = 'Gate 🔑 & <b>dog</b>'
  const bytes = await renderPdf(coverOrderFormFlow(job))
  expect(bytes.length).toBeGreaterThan(1000)
})
