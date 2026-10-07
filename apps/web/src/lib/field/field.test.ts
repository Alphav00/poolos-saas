import { describe, expect, it } from 'vitest'
import { compare } from './compare'
import { fmtDelta, SCALES, steps } from './scales'
import { nearest, wedges } from './wheel'

describe('wheel geometry', () => {
  it('starts at 12 o’clock and goes clockwise', () => {
    const w = wedges(4, 100, 50)
    expect(w[0]!.path).toBe('M0,0 L0,-100 A100,100 0 0,1 100,0 Z')
    expect(w[1]!.path).toBe('M0,0 L100,0 A100,100 0 0,1 0,100 Z')
    expect(w[0]!.lx).toBeCloseTo(35.36, 1)
    expect(w[0]!.ly).toBeCloseTo(-35.36, 1)
  })

  it('finds the nearest wheel number to a forecast', () => {
    expect(nearest([7.4, 7.5, 7.6], 7.56)).toBe(2)
    expect(nearest([0, 0.5, 1], 0.2)).toBe(0)
  })
})

describe('scales', () => {
  it('steps without floating-point drift', () => {
    expect(steps(6.8, 8.2, 0.1)).toEqual([6.8, 6.9, 7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.1, 8.2])
  })

  it('keeps every wheel tappable (at most 20 wedges)', () => {
    for (const s of SCALES) expect(s.values.length, s.key).toBeLessThanOrEqual(20)
  })

  it('formats differences with a real minus sign', () => {
    expect(fmtDelta('fc', -1.7)).toBe('−1.7')
    expect(fmtDelta('ph', 0.1)).toBe('+0.1')
    expect(fmtDelta('salt', -50)).toBe('−50')
  })
})

describe('forecast vs measured', () => {
  it('asks for a retest only outside the forecast band', () => {
    expect(compare(0.5, { value: 2.2, band: 0.5 })).toEqual({ delta: -1.7, status: 'off' })
    expect(compare(7.8, { value: 7.7, band: 0.2 })).toEqual({ delta: 0.1, status: 'ok' })
    expect(compare(undefined, { value: 7.7, band: 0.2 }).status).toBe('none')
    expect(compare(7.7, undefined).status).toBe('none')
  })
})
