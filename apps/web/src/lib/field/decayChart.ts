import { fmt } from './scales'
import type { Visit } from './types'

export const W = 342
export const LEFT = 20
/** Room kept right of today's dot for its radius and a margin. */
const RIGHT = 10
const MARGIN = 2
/** Generous width of one 11px glyph, so a label is never judged narrower than it draws. */
const GLYPH = 6.5

/** Gap between visits; today sits one step past the last visit and always inside the chart. */
export function stepFor(visits: number): number {
  return Math.min(W / (visits + 1.2), (W - LEFT - RIGHT) / Math.max(visits, 1))
}

export const xAt = (i: number, visits: number) => LEFT + i * stepFor(visits)

export function labelWidth(text: string): number {
  return text.length * GLYPH
}

/** Put a label beside the dot at cx: to its left if that fits, else to its right, else clamped inside. */
export function placeLabel(cx: number, text: string): { x: number; anchor: 'start' | 'end' } {
  const w = labelWidth(text)
  if (cx - 4 - w >= MARGIN) return { x: cx - 4, anchor: 'end' }
  if (cx + 8 + w <= W - MARGIN) return { x: cx + 8, anchor: 'start' }
  return { x: Math.max(MARGIN, Math.min(cx - w / 2, W - MARGIN - w)), anchor: 'start' }
}

/** Where a label's text spans, from its anchor. */
export function labelSpan(x: number, anchor: 'start' | 'end', text: string): [number, number] {
  const w = labelWidth(text)
  return anchor === 'end' ? [x - w, x] : [x, x + w]
}

export function chartLabel(visits: Visit[], forecast?: number, measured?: number): string {
  const n = visits.length
  const parts = [`Free chlorine at each visit, before and after dosing: ${n} visit${n === 1 ? '' : 's'}`]
  if (forecast !== undefined) parts.push(`forecast today ${fmt('fc', forecast)} ppm`)
  if (measured !== undefined) parts.push(`measured today ${fmt('fc', measured)} ppm`)
  return parts.join(', ')
}
