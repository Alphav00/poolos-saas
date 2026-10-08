// The chemistry engine, as the field screens use it.
//
// Numbers about the water and every dose amount come from /api/chem, which runs
// USGS PHREEQC in the Worker (packages/pool-chemistry). This file decides only
// WHICH doses to ask for: a reading outside the company's target range asks
// for the product that moves it, to the middle of the range. Each amount is
// computed from today's readings alone, so the screen says to add acid first,
// then chlorine, and retest.
import type { Param, Pool, Reading } from './types'

export type ProductKind = 'liquid-chlorine' | 'acid' | 'soda-ash' | 'bicarbonate' | 'calcium-chloride' | 'cyanuric-acid' | 'salt'

/** A chemical the company carries, with the facts the engine needs from its label. */
export interface Product {
  id: string
  kind: ProductKind
  name: string
  /** liquid chlorine: g of available chlorine per 100 mL (the label's "trade %") */
  tradePercent?: number
  /** muriatic acid: weight % HCl and density, from the label or SDS */
  hclPercent?: number
  densityGPerMl?: number
  /** dry products: purity, weight %; 100 when the label gives none */
  assayPercent?: number
  form?: 'anhydrous' | 'dihydrate'
}

export type TargetParam = Exclude<Param, 'temp'>

/** The company's target ranges, and who set them (shown with every dose). */
export interface Targets {
  source: string
  ranges: Partial<Record<TargetParam, [number, number]>>
}

/** Readings in the engine's words. */
export interface Water {
  temperatureF: number
  ph: number
  totalAlkalinity: number
  calciumHardness: number
  cyanuricAcid: number
  freeChlorine?: number
  salt?: number
  tds?: number
}

export interface Question {
  field: string
  ask: string
}
export type Answer<T> = { ok: true; value: T } | { ok: false; questions: Question[] }

export interface Analysis {
  ph: number
  saturationIndex: number
  totalAlkalinity: number
  alkalinity: { total: number; carbonate: number; cyanurate: number; borate: number; chlorine: number; water: number }
  chlorine: { freeChlorine: number; hocl: number; ocl: number; boundToCya: number; hoclPercentOfFree: number } | null
  chargeBalance: { ion: string; percentError: number }
  assumptions: string[]
  engine: { engine: string; iphreeqcCommit: string }
  phreeqcInput: string
}

export interface Dose {
  grams: number
  pounds: number
  ounces: number
  milliliters?: number
  fluidOunces?: number
  after: { ph: number; saturationIndex: number; totalAlkalinity: number } | null
  method: string
}

export const PRODUCT_WORDS: Record<ProductKind, string> = {
  'liquid-chlorine': 'Liquid chlorine',
  acid: 'Muriatic acid',
  'soda-ash': 'Soda ash',
  bicarbonate: 'Baking soda',
  'calcium-chloride': 'Calcium chloride',
  'cyanuric-acid': 'Stabilizer (cyanuric acid)',
  salt: 'Salt',
}

const WATER_KEYS: Partial<Record<Param, keyof Water>> = {
  temp: 'temperatureF',
  ph: 'ph',
  ta: 'totalAlkalinity',
  ch: 'calciumHardness',
  cya: 'cyanuricAcid',
  fc: 'freeChlorine',
  salt: 'salt',
}

/** Today's readings as the engine wants them. Missing ones stay missing: the engine asks. */
export function waterFrom(reading: Reading | null, pool: Pool): Partial<Water> {
  const w: Partial<Water> = {}
  for (const [param, key] of Object.entries(WATER_KEYS) as [Param, keyof Water][]) {
    const v = reading?.values[param]
    if (v !== undefined) w[key] = v
  }
  // No salt reading on a pool with no cell: the pool record's TDS stands in.
  if (w.salt === undefined && pool.tds !== undefined) w.tds = pool.tds
  return w
}

/** What a reading needs, by which product kind, and in which direction. */
const MOVES: { param: TargetParam; low: ProductKind | null; high: ProductKind | null; highNote?: string }[] = [
  { param: 'ph', low: 'soda-ash', high: 'acid' },
  { param: 'fc', low: 'liquid-chlorine', high: null, highNote: 'above target · let it fall' },
  { param: 'ta', low: 'bicarbonate', high: null, highNote: 'above target · acid then aeration; not computed here' },
  { param: 'ch', low: 'calcium-chloride', high: null, highNote: 'above target · only dilution lowers it' },
  { param: 'cya', low: 'cyanuric-acid', high: null, highNote: 'above target · only dilution lowers it' },
  { param: 'salt', low: 'salt', high: null, highNote: 'above target · only dilution lowers it' },
]

/** A chlorine generator cell's salt range, from its manufacturer's manual (/api/chem/salt-cell). */
export interface CellRange {
  make: string
  model: string
  minPpm: number
  maxPpm: number
  targetPpm: number
  source: string
  url: string
}

export interface Ask {
  kind: ProductKind
  param: TargetParam
  /** the middle of the target range, or the cell manufacturer's figure for salt */
  target: number
  product: Product
  /** who set the target: the company (default) or the cell's manufacturer document */
  source?: string
  /** for salt with a known cell: the engine looks the target up itself */
  cell?: { make: string; model: string }
}

export interface Note {
  param: TargetParam
  text: string
}

export interface Plan {
  asks: Ask[]
  /** readings outside target that no dose can fix here, or with no product set up */
  notes: Note[]
}

/**
 * Which doses to ask the engine for. Pure: readings, targets and products in,
 * requests out. With a cell range, salt is judged against the manufacturer's
 * range instead of the company's, and aimed at the manufacturer's figure.
 */
export function plan(reading: Reading | null, targets: Targets | null, products: Product[], cell?: CellRange | null): Plan {
  const asks: Ask[] = []
  const notes: Note[] = []
  if (!reading || !targets) return { asks, notes }
  for (const m of MOVES) {
    const v = reading.values[m.param]
    const range = m.param === 'salt' && cell ? [cell.minPpm, cell.maxPpm] : targets.ranges[m.param]
    if (v === undefined || !range) continue
    const [low, high] = range
    if (v >= low && v <= high) continue
    const kind = v < low ? m.low : m.high
    if (!kind) {
      if (m.highNote) notes.push({ param: m.param, text: m.highNote })
      continue
    }
    const product = products.find((p) => p.kind === kind)
    if (!product) {
      notes.push({ param: m.param, text: `${v < low ? 'below' : 'above'} target · no ${PRODUCT_WORDS[kind].toLowerCase()} set up` })
      continue
    }
    const ask: Ask = { kind, param: m.param, target: (low + high) / 2, product }
    if (m.param === 'salt' && cell) Object.assign(ask, { target: cell.targetPpm, source: cell.source, cell: { make: cell.make, model: cell.model } })
    asks.push(ask)
  }
  return { asks, notes }
}

async function post<T>(path: string, body: unknown): Promise<Answer<T>> {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (res.status === 200 || res.status === 422) return (await res.json()) as Answer<T>
  if (res.status === 401) throw new Error('Sign in again.')
  const out = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  throw new Error(out?.error?.message ?? 'The chemistry engine did not answer.')
}

export const analyze = (water: Partial<Water>) => post<Analysis>('/api/chem/analyze', water)

export function dose(ask: Ask, water: Partial<Water>, gallons: number): Promise<Answer<Dose>> {
  const { id: _id, kind: _kind, name: _name, ...product } = ask.product
  return post<Dose>('/api/chem/dose', { kind: ask.kind, water, target: ask.target, gallons, product, ...(ask.cell ? { cell: ask.cell } : {}) })
}

/** The manufacturer's salt range for a cell, or the engine's question when it has none on file. */
export async function cellRange(cell: { make: string; model: string }): Promise<Answer<CellRange>> {
  const q = new URLSearchParams(cell)
  const res = await fetch(`/api/chem/salt-cell?${q}`, { credentials: 'same-origin' })
  if (res.status === 200 || res.status === 422) return (await res.json()) as Answer<CellRange>
  if (res.status === 401) throw new Error('Sign in again.')
  throw new Error('The chemistry engine did not answer.')
}

/** Amount in the words a tech uses: fluid ounces for liquids, pounds and ounces for dry goods. */
export function amountWords(d: Dose): string {
  if (d.fluidOunces !== undefined) {
    if (d.fluidOunces >= 128) return `${(d.fluidOunces / 128).toFixed(2)} gal (${Math.round(d.fluidOunces)} fl oz)`
    return `${d.fluidOunces.toFixed(1)} fl oz`
  }
  if (d.pounds >= 1) return `${d.pounds.toFixed(2)} lb`
  return `${d.ounces.toFixed(1)} oz`
}

/** The product line under an amount: name and strength, with its basis. */
export function strengthWords(p: Product): string {
  switch (p.kind) {
    case 'liquid-chlorine':
      return `${p.name} · ${p.tradePercent}% trade (g Cl₂ per 100 mL)`
    case 'acid':
      return `${p.name} · ${p.hclPercent}% HCl by weight · ${p.densityGPerMl} g/mL`
    case 'calcium-chloride':
      return `${p.name} · ${p.assayPercent}% ${p.form}`
    default:
      return `${p.name} · ${p.assayPercent}% by weight`
  }
}
