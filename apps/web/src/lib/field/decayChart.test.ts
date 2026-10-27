import { describe, expect, it } from 'vitest'
import { chartLabel, labelSpan, placeLabel, stepFor, W, xAt } from './decayChart'
import type { Visit } from './types'

const visit = { before: 1, after: 3 } as unknown as Visit
const visitsOf = (n: number) => Array.from({ length: n }, () => visit)
const LABELS = ['today 3.2', 'today 10.25', 'fcst 3.2']

describe('decay chart geometry', () => {
  it('keeps today inside the chart at every visit count, with room for its dot', () => {
    for (let n = 0; n <= 40; n++) expect(xAt(n, n) + 5).toBeLessThanOrEqual(W)
  })
  it('spaces visits as before for 1 to 12 visits', () => {
    for (let n = 1; n <= 12; n++) expect(stepFor(n)).toBeCloseTo(W / (n + 1.2), 6)
  })
  it('keeps the today and forecast labels inside the chart at 0 to 12 visits', () => {
    for (let n = 0; n <= 12; n++) {
      for (const text of LABELS) {
        const { x, anchor } = placeLabel(xAt(n, n), text)
        const [a, b] = labelSpan(x, anchor, text)
        expect(a, `${text} at ${n} visits`).toBeGreaterThanOrEqual(0)
        expect(b, `${text} at ${n} visits`).toBeLessThanOrEqual(W)
      }
    }
  })
  it('puts the label right of the dot when there is no room on the left', () => {
    expect(placeLabel(xAt(0, 0), 'today 3.2').anchor).toBe('start')
  })
})

describe('decay chart label', () => {
  it('keeps the phrase "before and after dosing" and counts visits', () => {
    expect(chartLabel(visitsOf(1))).toContain('before and after dosing')
    expect(chartLabel(visitsOf(1))).toContain('1 visit')
    expect(chartLabel(visitsOf(5))).toContain('5 visits')
  })
  it('names the forecast and today\'s reading when there are any', () => {
    const s = chartLabel(visitsOf(3), 2.5, 1.8)
    expect(s).toContain('forecast today 2.5 ppm')
    expect(s).toContain('measured today 1.8 ppm')
    expect(chartLabel(visitsOf(3))).not.toContain('today')
  })
})
