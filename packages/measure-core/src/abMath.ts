/**
 * A/B measurement reconstruction, ported from backend/app/services/ab_math.py.
 *
 * A at (0, 0), B at (d_AB, 0); each perimeter point is the intersection of a
 * circle of radius r_A around A and r_B around B, taking the negative-y
 * solution (the pool lies below the A-B line, points recorded clockwise).
 * Same tolerance, same quality grading, same messages.
 */
import { pyFixed, pyHypot } from './pynum'
import type { JobMeasurement, PerimeterPoint } from './models'

/** ~0.6 inch: above tape precision, below reconstruction tolerance. */
const TRI_TOL_FT = 0.05

export interface Point2D {
  number: number
  x: number
  y: number
  quality: 'good' | 'marginal' | 'invalid'
  quality_reason: string | null
}

export interface Reconstruction {
  points: Point2D[]
  perimeter_ft: number
  area_sqft: number
  length_ft: number
  width_ft: number
  depth_avg_ft: number
  valid: boolean
  invalid_reasons: string[]
}

export function reconstructPoint(number: number, r0: number, r1: number, d: number): Point2D {
  const sumCheck = r0 + r1 - d
  const diffCheck = d - Math.abs(r0 - r1)

  if (sumCheck < -TRI_TOL_FT) {
    return { number, x: 0, y: 0, quality: 'invalid', quality_reason: `r_A + r_B (${pyFixed(r0 + r1, 2)}) < d_AB (${pyFixed(d, 2)}); tapes too short to reach` }
  }
  if (diffCheck < -TRI_TOL_FT) {
    return { number, x: 0, y: 0, quality: 'invalid', quality_reason: `|r_A - r_B| (${pyFixed(Math.abs(r0 - r1), 2)}) > d_AB (${pyFixed(d, 2)}); inconsistent measurements` }
  }

  const a = (r0 * r0 - r1 * r1 + d * d) / (2.0 * d)
  let hSq = r0 * r0 - a * a
  if (hSq < 0) hSq = 0
  const h = Math.sqrt(hSq)

  let quality: Point2D['quality'] = 'good'
  let reason: string | null = null
  if (sumCheck < TRI_TOL_FT || diffCheck < TRI_TOL_FT) {
    quality = 'marginal'
    reason = 'point near collinear with A-B line; geometry degenerate'
  }
  if (r0 < 0.01 || r1 < 0.01) {
    quality = 'marginal'
    reason = 'point coincides with A or B; check numbering'
  }
  return { number, x: a, y: -h, quality, quality_reason: reason }
}

export function reconstructPool(points: [number, number, number][], abDistance: number, shallowDepthFt = 0, deepDepthFt = 0): Reconstruction {
  const reconstructed: Point2D[] = []
  const invalid: string[] = []
  for (const [num, ra, rb] of points) {
    const rec = reconstructPoint(num, ra, rb, abDistance)
    if (rec.quality === 'invalid') {
      invalid.push(`Point #${num}: ${rec.quality_reason} (A=${pyFixed(ra, 2)}ft, B=${pyFixed(rb, 2)}ft, AB=${pyFixed(abDistance, 2)}ft)`)
    }
    reconstructed.push(rec)
  }
  const depthAvg = (shallowDepthFt + deepDepthFt) / 2.0

  if (reconstructed.length === 0) {
    return { points: [], perimeter_ft: 0, area_sqft: 0, length_ft: 0, width_ft: 0, depth_avg_ft: 0, valid: false, invalid_reasons: ['No points'] }
  }
  const usable = reconstructed.filter((p) => p.quality !== 'invalid')
  if (usable.length < 3) {
    return {
      points: reconstructed, perimeter_ft: 0, area_sqft: 0, length_ft: 0, width_ft: 0, depth_avg_ft: depthAvg,
      valid: false, invalid_reasons: [...invalid, 'fewer than 3 usable points'],
    }
  }

  const n = usable.length
  let perimeter = 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const p1 = usable[i]!
    const p2 = usable[(i + 1) % n]!
    perimeter += pyHypot(p2.x - p1.x, p2.y - p1.y)
  }
  for (let i = 0; i < n; i++) {
    const p1 = usable[i]!
    const p2 = usable[(i + 1) % n]!
    area += p1.x * p2.y - p2.x * p1.y
  }
  area = Math.abs(area) / 2.0
  const xs = usable.map((p) => p.x)
  const ys = usable.map((p) => p.y)
  return {
    points: reconstructed,
    perimeter_ft: perimeter,
    area_sqft: area,
    length_ft: Math.max(...xs) - Math.min(...xs),
    width_ft: Math.max(...ys) - Math.min(...ys),
    depth_avg_ft: depthAvg,
    valid: invalid.length === 0,
    invalid_reasons: invalid,
  }
}

/** The perimeter points to feed the reconstruction, honouring `swap_ab`. Never mutates the job. */
export function perimeterForMath(m: JobMeasurement): PerimeterPoint[] {
  if (!m.swap_ab) return m.perimeter_points
  return m.perimeter_points.map((p) => ({ ...p, a_distance_ft: p.b_distance_ft, b_distance_ft: p.a_distance_ft }))
}

/** Reconstruct a job's pool exactly as every backend endpoint did. */
export function reconstructJob(m: JobMeasurement): Reconstruction {
  return reconstructPool(
    perimeterForMath(m).map((p) => [p.number, Number(p.a_distance_ft), Number(p.b_distance_ft)]),
    Number(m.ab_distance_ft),
    Number(m.shallow_depth_ft),
    Number(m.deep_depth_ft),
  )
}

/** Industry A-B line sanity checks. Empty list = good. */
export function validateAbLine(abDistanceFt: number, abOffsetFt: number): string[] {
  const warnings: string[] = []
  if (abDistanceFt < 10) warnings.push(`A-B distance ${pyFixed(abDistanceFt, 1)}ft is below 10ft minimum`)
  if (abDistanceFt > 100) warnings.push(`A-B distance ${pyFixed(abDistanceFt, 1)}ft exceeds 100ft (use longer tape)`)
  if (abOffsetFt < 3) warnings.push(`A-B offset from pool ${pyFixed(abOffsetFt, 1)}ft is below 3ft minimum`)
  return warnings
}
