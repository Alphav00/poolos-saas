import { describe, expect, it } from 'vitest'
import { compare } from './compare'
import { cleanReading } from './readings'
import { fmtDelta, parseTyped, scaleFor, SCALES, steps } from './scales'
import { describe as weatherWords, hourLabel, rainFrom, type Weather } from './weather'
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
    expect(nearest([3100, 3200], 3150)).toBe(1)
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

describe('typed readings', () => {
  const ph = scaleFor('ph')
  const fc = scaleFor('fc')
  it('reads a comma as a decimal point', () => {
    expect(parseTyped(fc, '2,5')).toEqual({ value: 2.5 })
    expect(parseTyped(ph, ' 7.4 ')).toEqual({ value: 7.4 })
  })
  it('clears on empty and refuses junk or impossible numbers', () => {
    expect(parseTyped(fc, '')).toEqual({ value: undefined })
    expect(parseTyped(fc, '-3')).toHaveProperty('error')
    expect(parseTyped(fc, '1e9')).toHaveProperty('error')
    expect(parseTyped(fc, 'abc')).toHaveProperty('error')
    expect(parseTyped(ph, '70')).toHaveProperty('error')
  })
})

describe('stored readings', () => {
  it('keeps only known readings with real numbers', () => {
    expect(cleanReading({ method: 'strip', values: { ph: 7.5, fc: 'x', junk: 3, ta: Infinity } })).toEqual({ method: 'strip', values: { ph: 7.5 } })
    expect(cleanReading({ values: null, method: 'guess' })).toEqual({ method: 'drop', values: {} })
    expect(cleanReading('nope')).toBeNull()
  })
})

describe('weather words', () => {
  const w = { hourlyRain: [{ hour: 9, chance: 20 }, { hour: 15, chance: 60 }, { hour: 18, chance: 80 }] } as Weather
  it('finds the first rainy hour from now', () => {
    expect(rainFrom(w, 8)).toBe(15)
    expect(rainFrom(w, 16)).toBe(18)
    expect(rainFrom(w, 19)).toBeNull()
  })
  it('names hours and weather codes', () => {
    expect([hourLabel(0), hourLabel(12), hourLabel(15)]).toEqual(['12 am', '12 pm', '3 pm'])
    expect(weatherWords(0).text).toBe('Clear')
    expect(weatherWords(63).text).toBe('Rain')
    expect(weatherWords(95).text).toBe('Thunderstorms')
  })
})
