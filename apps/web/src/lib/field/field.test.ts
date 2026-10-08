import { describe, expect, it } from 'vitest'
import { amountWords, plan, strengthWords, waterFrom, type Product, type Targets } from './chem'
import { compare } from './compare'
import { POOLS } from './sample'
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

describe('chemistry: which doses to ask the engine for', () => {
  const acid: Product = { id: 'a', kind: 'acid', name: 'Muriatic acid 31.45%', hclPercent: 31.45, densityGPerMl: 1.16 }
  const chlorine: Product = { id: 'c', kind: 'liquid-chlorine', name: 'Liquid chlorine 12.5%', tradePercent: 12.5 }
  const targets: Targets = { source: 'test policy', ranges: { ph: [7.4, 7.6], fc: [2, 4], ta: [80, 120] } }
  const reading = (values: Record<string, number>) => ({ method: 'drop' as const, values })

  it('asks for nothing inside the ranges, and nothing without targets', () => {
    expect(plan(reading({ ph: 7.5, fc: 3, ta: 100 }), targets, [acid, chlorine])).toEqual({ asks: [], notes: [] })
    expect(plan(reading({ ph: 8.2 }), null, [acid])).toEqual({ asks: [], notes: [] })
    expect(plan(null, targets, [acid])).toEqual({ asks: [], notes: [] })
  })

  it('asks for the product that moves a reading, to the middle of its range', () => {
    const p = plan(reading({ ph: 7.9, fc: 1 }), targets, [acid, chlorine])
    expect(p.asks.map((a) => [a.kind, a.param, a.target])).toEqual([
      ['acid', 'ph', 7.5],
      ['liquid-chlorine', 'fc', 3],
    ])
    expect(p.asks[0]!.product).toBe(acid)
  })

  it('notes what it cannot dose: no product set up, or only dilution lowers it', () => {
    const p = plan(reading({ ph: 7.0, fc: 6, ta: 60 }), targets, [acid])
    expect(p.asks).toEqual([])
    expect(p.notes.map((n) => n.param)).toEqual(['ph', 'fc', 'ta'])
    expect(p.notes[0]!.text).toContain('no soda ash set up')
    expect(p.notes[1]!.text).toContain('let it fall')
  })

  it('turns readings into the engine’s words, with the pool’s TDS when there is no salt reading', () => {
    const salty = POOLS.find((p) => p.id === 'maple-court')!
    const plain = POOLS.find((p) => p.id === 'birch-lane')!
    expect(waterFrom(reading({ temp: 84, ph: 7.6, ta: 90, ch: 300, cya: 40, fc: 3, salt: 3200 }), salty)).toEqual({
      temperatureF: 84, ph: 7.6, totalAlkalinity: 90, calciumHardness: 300, cyanuricAcid: 40, freeChlorine: 3, salt: 3200,
    })
    expect(waterFrom(reading({ ph: 7.6 }), plain)).toEqual({ ph: 7.6, tds: plain.tds })
    expect(waterFrom(null, salty)).toEqual({})
  })

  it('says amounts the way a tech would', () => {
    const base = { grams: 0, pounds: 0, ounces: 0, after: null, method: '' }
    expect(amountWords({ ...base, fluidOunces: 61.44, milliliters: 1 })).toBe('61.4 fl oz')
    expect(amountWords({ ...base, fluidOunces: 200, milliliters: 1 })).toBe('1.56 gal (200 fl oz)')
    expect(amountWords({ ...base, pounds: 2.5, ounces: 40 })).toBe('2.50 lb')
    expect(amountWords({ ...base, pounds: 0.5, ounces: 8 })).toBe('8.0 oz')
    expect(strengthWords(chlorine)).toBe('Liquid chlorine 12.5% · 12.5% trade (g Cl₂ per 100 mL)')
    expect(strengthWords(acid)).toContain('31.45% HCl by weight')
  })
})

describe('chemistry: salt by the cell manufacturer', () => {
  const salt: Product = { id: 's', kind: 'salt', name: 'Pool salt', assayPercent: 99 }
  const targets: Targets = { source: 'test policy', ranges: { salt: [3000, 3400] } }
  const reading = { method: 'drop' as const, values: { salt: 2700 } }
  const cell = { make: 'Maker', model: 'C1', minPpm: 2800, maxPpm: 4500, targetPpm: 3400, source: 'Maker manual', url: 'https://example.test' }

  it('aims at the manufacturer’s figure and names the document', () => {
    const p = plan(reading, targets, [salt], cell)
    expect(p.asks).toHaveLength(1)
    expect(p.asks[0]).toMatchObject({ kind: 'salt', target: 3400, source: 'Maker manual', cell: { make: 'Maker', model: 'C1' } })
    // inside the manufacturer's range but under the company's: nothing to add
    expect(plan({ ...reading, values: { salt: 2900 } }, targets, [salt], cell).asks).toEqual([])
  })

  it('falls back to the company range without a cell', () => {
    expect(plan(reading, targets, [salt], null).asks[0]).toMatchObject({ target: 3200 })
    expect(plan(reading, targets, [salt], null).asks[0]!.cell).toBeUndefined()
  })
})
