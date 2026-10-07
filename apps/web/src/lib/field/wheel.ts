export interface Wedge {
  path: string
  /** Where the number sits. */
  lx: number
  ly: number
}

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [Number((r * Math.cos(a)).toFixed(2)), Number((r * Math.sin(a)).toFixed(2))]
}

/** `n` equal wedges around (0,0), the first starting at 12 o'clock and going clockwise. */
export function wedges(n: number, r: number, labelR: number): Wedge[] {
  const span = 360 / n
  return Array.from({ length: n }, (_, i) => {
    const a0 = -90 + i * span
    const [x0, y0] = pt(r, a0)
    const [x1, y1] = pt(r, a0 + span)
    const [lx, ly] = pt(labelR, a0 + span / 2)
    return { path: `M0,0 L${x0},${y0} A${r},${r} 0 ${span > 180 ? 1 : 0},1 ${x1},${y1} Z`, lx, ly }
  })
}

/** Index of the value closest to `v`; a tie goes to the higher value. */
export function nearest(values: number[], v: number): number {
  let best = 0
  values.forEach((x, i) => {
    if (Math.abs(x - v) <= Math.abs(values[best]! - v)) best = i
  })
  return best
}

/** Soft pastel per wedge so neighbouring numbers are easy to tell apart. */
export const wedgeColor = (i: number, n: number) => `hsl(${Math.round((i / n) * 320)} 75% 86%)`
