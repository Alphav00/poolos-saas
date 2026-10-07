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
}

// Wheel numbers only: what a tech can read off a kit. Edit to match the kits a company uses.
export const SCALES: Scale[] = [
  { key: 'fc', label: 'FC', unit: 'ppm', values: steps(0, 8, 0.5) },
  { key: 'ph', label: 'pH', unit: '', values: steps(6.8, 8.2, 0.1) },
  { key: 'ta', label: 'TA', unit: 'ppm', values: steps(40, 200, 10) },
  { key: 'cya', label: 'CYA', unit: 'ppm', values: steps(0, 100, 10) },
  { key: 'ch', label: 'CH', unit: 'ppm', values: steps(100, 800, 50) },
  { key: 'salt', label: 'Salt', unit: 'ppm', values: steps(2400, 4000, 100) },
  { key: 'temp', label: 'Temp', unit: '°F', values: steps(60, 96, 2) },
]

export const scaleFor = (key: Param) => SCALES.find((s) => s.key === key)!

export function fmt(key: Param, v: number | undefined | null): string {
  if (v === undefined || v === null) return '—'
  if (key === 'temp') return `${v}°`
  if (key === 'salt') return v.toLocaleString('en-US')
  if (key === 'ph') return v.toFixed(1)
  return String(v)
}

export function fmtDelta(key: Param, d: number): string {
  const sign = d > 0 ? '+' : d < 0 ? '−' : ''
  const abs = Math.abs(d)
  const body = key === 'ph' || key === 'fc' ? abs.toFixed(1) : key === 'salt' ? abs.toLocaleString('en-US') : String(Math.round(abs))
  return d === 0 ? '0' : sign + body
}
