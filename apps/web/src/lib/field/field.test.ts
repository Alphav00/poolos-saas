import { afterEach, describe, expect, it, vi } from 'vitest'
import { amountWords, plan, strengthWords, waterFrom, type Product, type Targets } from './chem'
import { compare } from './compare'
import { DEMO_CUSTOMER_NAMES, generateCustomer, slugify } from './generator'
import DENYLIST from '../../../../../tests/denylist.txt?raw'
import { cleanProfile, loadPools, toPool } from './pools'
import { DEMO_FORECASTS, DEMO_PROFILES } from './sample'
import { chartLabel } from './DecayChart.svelte'
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

describe('decay chart accessible labels', () => {
  it('formats accessibility summaries with visit count, forecast, and measured values', () => {
    expect(chartLabel(4, 2.2, 2.5)).toBe('Free chlorine history (4 visits) · forecast 2.2 · today 2.5')
    expect(chartLabel(5, 1.8)).toBe('Free chlorine history (5 visits) · forecast 1.8')
    expect(chartLabel(4)).toBe('Free chlorine history (4 visits)')
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

  it('names no weather when the source gave no code', () => {
    expect(weatherWords(null).text).toBe('')
    expect(weatherWords(undefined).text).toBe('')
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
    const salty = toPool(DEMO_PROFILES.find((p) => p.id === 'maple-court')!)
    const plain = toPool(DEMO_PROFILES.find((p) => p.id === 'birch-lane')!)
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

describe('pool profiles', () => {
  it('gives demo pools their demo forecasts and other pools none', () => {
    const demo = toPool(DEMO_PROFILES[0]!)
    expect(demo.forecast).toEqual(DEMO_FORECASTS[demo.id]!.forecast)
    const own = toPool({ ...DEMO_PROFILES[0]!, demo: undefined })
    expect(own.forecast).toEqual({})
    expect(own.visits).toEqual([])
    expect(own.decay).toEqual([])
  })

  it('has a demo forecast for every demo pool, and nothing else', () => {
    expect(Object.keys(DEMO_FORECASTS).sort()).toEqual(DEMO_PROFILES.map((p) => p.id).sort())
    expect(DEMO_PROFILES.every((p) => p.demo === true)).toBe(true)
  })

  it('keeps only what the screens can show from a stored profile', () => {
    expect(cleanProfile('x', { name: ' ' })).toBeNull()
    expect(cleanProfile('x', null)).toBeNull()
    expect(cleanProfile('x', { name: 'Quarry Lane', gallons: -1, tags: ['Vinyl', 3], cell: { make: 'Hayward' }, demo: 'yes' })).toEqual({
      id: 'x', name: 'Quarry Lane', tags: ['Vinyl'], equipment: [],
    })
  })
})

describe('demo customer generator', () => {
  // Tiny seeded source so the same seed gives the same customer.
  const mulberry32 = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const POOL_ID = /^[a-z0-9-]{1,60}$/
  // A local copy of the limits in apps/api/src/field.ts checkPool.
  const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
  const list = (v: unknown, max: number) => Array.isArray(v) && v.length <= 20 && v.every((x) => text(x, max))
  const num = (v: unknown) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1_000_000)
  function checkPool(p: Record<string, unknown>): string | null {
    const { id, ...d } = p
    if (typeof id !== 'string' || !POOL_ID.test(id)) return 'id'
    if (!text(d.name, 80)) return 'name'
    if (!num(d.gallons) || !num(d.tds)) return 'numbers'
    if (d.cell !== undefined) {
      const c = d.cell as Record<string, unknown> | null
      if (!c || !text(c.make, 60) || !text(c.model, 60) || Object.keys(c).length !== 2) return 'cell'
    }
    if (d.tags !== undefined && !list(d.tags, 120)) return 'tags'
    if (d.equipment !== undefined && !list(d.equipment, 120)) return 'equipment'
    if (d.note !== undefined && !text(d.note, 500)) return 'note'
    if (d.demo !== true) return 'demo'
    const allowed = new Set(['name', 'tags', 'gallons', 'tds', 'cell', 'equipment', 'note', 'demo'])
    const extra = Object.keys(d).find((k) => !allowed.has(k))
    return extra ? `extra ${extra}` : null
  }

  it('has at least 16 unique names with unique ids', () => {
    expect(DEMO_CUSTOMER_NAMES.length).toBeGreaterThanOrEqual(16)
    expect(new Set(DEMO_CUSTOMER_NAMES).size).toBe(DEMO_CUSTOMER_NAMES.length)
    expect(new Set(DEMO_CUSTOMER_NAMES.map(slugify)).size).toBe(DEMO_CUSTOMER_NAMES.length)
  })

  it('makes profiles the Worker accepts, with sensible numbers', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 300; i++) {
      const p = generateCustomer(rand)
      expect(checkPool(p as unknown as Record<string, unknown>), JSON.stringify(p)).toBeNull()
      expect(p.gallons! % 500).toBe(0)
      expect(p.gallons).toBeGreaterThanOrEqual(12000)
      expect(p.gallons).toBeLessThanOrEqual(35000)
      expect(p.tags[0]).toBe(`${p.gallons!.toLocaleString('en-US')} gal`)
      expect(p.equipment.length).toBeGreaterThanOrEqual(2)
      expect(p.equipment.length).toBeLessThanOrEqual(4)
      expect(new Set(p.equipment).size).toBe(p.equipment.length)
      if (p.tags.includes('Salt')) {
        expect(p.tds).toBeUndefined()
        expect(['Hayward T-CELL-15', 'Pentair IC40']).toContain(`${p.cell!.make} ${p.cell!.model}`)
      } else {
        expect(p.cell).toBeUndefined()
        expect(p.tds).toBeGreaterThanOrEqual(800)
        expect(p.tds).toBeLessThanOrEqual(1600)
      }
      // Generated customers show "no forecast": toPool only attaches the demo set's forecasts.
      expect(toPool(p).forecast).toEqual({})
    }
  })

  it('never reuses an id already on file', () => {
    const rand = mulberry32(42)
    const taken = new Set<string>(['birch-lane'])
    for (let i = 0; i < DEMO_CUSTOMER_NAMES.length * 3; i++) {
      const p = generateCustomer(rand, taken)
      expect(p.id).toMatch(POOL_ID)
      expect(taken.has(p.id)).toBe(false)
      taken.add(p.id)
    }
    // Every name is used before any id needs a -2.
    for (const n of DEMO_CUSTOMER_NAMES) expect(taken.has(slugify(n))).toBe(true)
    expect([...taken].some((id) => id.endsWith('-3'))).toBe(true)
  })

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const r = mulberry32(seed)
      return Array.from({ length: 5 }, () => generateCustomer(r))
    }
    expect(run(99)).toEqual(run(99))
    expect(run(1)).not.toEqual(run(2))
  })

  it('names nothing on the denylist', () => {
    const terms = DENYLIST.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    expect(terms.length).toBeGreaterThan(0)
    const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    for (const t of terms) {
      const re = new RegExp(`(?<![A-Za-z0-9])${esc(t)}(?![A-Za-z0-9])`, 'i')
      for (const n of DEMO_CUSTOMER_NAMES) expect(re.test(n), `${n} matches ${t}`).toBe(false)
    }
  })
})

describe('pool list cache', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps a fresh load when an older one fails', async () => {
    let failFirst: (e: Error) => void = () => {}
    const fetches = vi.fn()
    fetches.mockImplementationOnce(() => new Promise((_, reject) => (failFirst = reject)))
    fetches.mockImplementation(async () => Response.json({ docs: [{ id: 'maple-court', data: { name: 'Maple Court' } }] }))
    vi.stubGlobal('fetch', fetches)

    const old = loadPools(true)
    const fresh = loadPools(true)
    failFirst(new Error('offline'))
    await expect(old).rejects.toThrow('offline')
    expect((await fresh).map((p) => p.name)).toEqual(['Maple Court'])
    // The failed first load must not have cleared the fresh one: no third request.
    expect(await loadPools()).toBe(await fresh)
    expect(fetches).toHaveBeenCalledTimes(2)
  })

  it('retries after a load fails', async () => {
    const fetches = vi.fn(async () => new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetches)
    await expect(loadPools(true)).rejects.toThrow('Could not load the pools.')
    await expect(loadPools()).rejects.toThrow()
    expect(fetches).toHaveBeenCalledTimes(2)
  })
})
