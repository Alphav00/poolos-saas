import type { Param } from './types'

/** Evenly spaced values from `from` to `to`, rounded to the step's decimals. */
export function steps(from: number, to: number, step: number): number[] {
  const decimals = (String(step).split('.')[1] ?? '').length
  const out: number[] = []
  for (let i = 0; from + i * step <= to + step / 1000; i++) out.push(Number((from + i * step).toFixed(decimals)))
  return out
}

export interface Scale {
  key: Param
  label: string
  unit: string
  /** The numbers on the wheel, at the resolution field test kits read to. */
  values: number[]
  /** What a typed reading may be; anything outside is a typo. */
  min: number
  max: number
}

// Wheel numbers only: what a tech can read off a kit. Edit to match the kits a company uses.
export const SCALES: Scale[] = [
  { key: 'fc', label: 'FC', unit: 'ppm', values: steps(0, 8, 0.5), min: 0, max: 50 },
  { key: 'ph', label: 'pH', unit: '', values: steps(6.8, 8.2, 0.1), min: 6, max: 9 },
  { key: 'ta', label: 'TA', unit: 'ppm', values: steps(40, 200, 10), min: 0, max: 400 },
  { key: 'cya', label: 'CYA', unit: 'ppm', values: steps(0, 100, 10), min: 0, max: 300 },
  { key: 'ch', label: 'CH', unit: 'ppm', values: steps(100, 800, 50), min: 0, max: 2000 },
  { key: 'salt', label: 'Salt', unit: 'ppm', values: steps(2400, 4000, 100), min: 0, max: 10000 },
  { key: 'temp', label: 'Temp', unit: '°F', values: steps(60, 96, 2), min: 32, max: 110 },
]

/**
 * Commas in a typed number: groups of exactly three digits after the first
 * ('3,200', '12,000', '1,000.5') are thousands and are dropped; a single comma
 * with one or two digits after it and no point ('7,5', '0,25') is a decimal
 * point, as phones in many countries type one. Anything else is left for the
 * number check to refuse.
 */
function uncomma(t: string): string {
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return t.replaceAll(',', '')
  if (/^\d+,\d{1,2}$/.test(t)) return t.replace(',', '.')
  return t
}

/**
 * A typed reading: '' clears it, commas are read as uncomma says, and anything
 * outside the scale's limits is refused.
 */
export function parseTyped(scale: Scale, text: string): { value: number | undefined } | { error: string } {
  const t = uncomma(text.trim())
  if (t === '') return { value: undefined }
  if (!/^\d+(\.\d+)?$/.test(t)) return { error: `Type a number for ${scale.label}.` }
  const v = Number(t)
  if (v < scale.min || v > scale.max) return { error: `${scale.label} must be between ${scale.min} and ${scale.max}.` }
  return { value: v }
}

export const scaleFor = (key: Param) => SCALES.find((s) => s.key === key)!

export function fmt(key: Param, v: number | undefined | null): string {
  if (v === undefined || v === null) return '—'
  if (key === 'temp') return `${v}°`
  if (key === 'salt') return v.toLocaleString('en-US')
  if (key === 'ph') return v.toFixed(1)
  return String(Math.round(v * 100) / 100)
}

export function fmtDelta(key: Param, d: number): string {
  const sign = d > 0 ? '+' : d < 0 ? '−' : ''
  const abs = Math.abs(d)
  const body = key === 'ph' || key === 'fc' ? abs.toFixed(1) : key === 'salt' ? abs.toLocaleString('en-US') : String(Math.round(abs))
  return d === 0 ? '0' : sign + body
}
