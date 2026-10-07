// Every endpoint result must equal what the original Python backend produced
// for the same job (goldens from oracle/generate.py).
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  coverOrderForm, HttpError, linerOrderForm, linerTakeoffEndpoint, parse, PoolJobV, reconstructEndpoint, validateEndpoint,
  type PoolJob,
} from '../src'

interface Case {
  name: string
  job: Record<string, unknown>
  reconstruct: unknown
  validate: unknown
  order_form: Record<string, unknown>
  liner_takeoff: unknown
  liner_order_form: unknown
  order_form_pdf: unknown
  liner_order_form_pdf: unknown
}

const cases = JSON.parse(gunzipSync(readFileSync(new URL('./goldens/cases.json.gz', import.meta.url))).toString()) as Case[]

const asError = (fn: () => unknown) => {
  try {
    return fn()
  } catch (e) {
    if (e instanceof HttpError) return { error: { status: e.status, detail: e.detail } }
    throw e
  }
}

describe.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
  const job = parse(PoolJobV, c.job) as PoolJob

  it('loads and dumps the job unchanged', () => {
    expect(job).toEqual(c.job)
  })
  it('reconstructs', () => {
    expect(reconstructEndpoint(job)).toEqual(c.reconstruct)
  })
  it('validates the A-B line', () => {
    expect(validateEndpoint(job)).toEqual(c.validate)
  })
  it('builds the cover order form', () => {
    const { job: _job, ...form } = coverOrderForm(job)
    expect(form).toEqual(c.order_form)
  })
  it('builds the liner takeoff', () => {
    const got = asError(() => linerTakeoffEndpoint(job)) as { error?: { status: number } }
    const want = c.liner_takeoff as { error?: { status: number; detail: unknown } }
    if (want.error) expect(got).toEqual(want)
    else expect(got).toEqual(want)
  })
  it('builds the liner order form', () => {
    const got = asError(() => {
      const { job: _job, ...form } = linerOrderForm(job)
      return form
    }) as { error?: { status: number } }
    const want = c.liner_order_form as { error?: { status: number; detail: unknown } }
    if (want.error?.status === 400) expect(got.error?.status).toBe(400)
    else expect(got).toEqual(want)
  })
})

import { coverOrderFormFlow, linerOrderFormFlow } from '../src/orderForms'

describe.each(cases.map((c) => [c.name, c] as const))('%s PDFs', (_name, c) => {
  const job = parse(PoolJobV, c.job) as PoolJob
  it('lays out the cover order form the same way', () => {
    expect(coverOrderFormFlow(job)).toEqual(c.order_form_pdf)
  })
  it('lays out the liner order form the same way', () => {
    const got = asError(() => linerOrderFormFlow(job)) as { error?: { status: number } }
    const want = c.liner_order_form_pdf as { error?: { status: number } }
    if (want.error?.status === 400) expect(got.error?.status).toBe(400)
    else expect(got).toEqual(want)
  })
})
