/**
 * What each measuring endpoint returns, ported from backend/app/main.py,
 * services/liner_takeoff.py and the JSON halves of the two order-form modules.
 * Results are in the same JSON shape the Python API produced.
 */
import { reconstructJob, validateAbLine, type Reconstruction } from './abMath'
import { computeTakeoff, validateLinerJob, type ClosureResult, type Validation } from './linerMath'
import { needsLiner, type PoolJob } from './models'
import { decimalFromFloat, roundedDecimal } from './pynum'

export interface ReconstructedPool {
  ab_distance_ft: string
  points: { number: number; x_ft: string; y_ft: string; quality: string; quality_reason: string | null }[]
  perimeter_ft: string
  area_sqft: string
  length_ft: string
  width_ft: string
  depth_avg_ft: string
}

/** POST /jobs/{id}/reconstruct: the raw floats, as pydantic turned them into Decimals. */
export function reconstructEndpoint(job: PoolJob): ReconstructedPool {
  const r = reconstructJob(job.measurement)
  return {
    ab_distance_ft: job.measurement.ab_distance_ft,
    points: r.points.map((p) => ({ number: p.number, x_ft: decimalFromFloat(p.x), y_ft: decimalFromFloat(p.y), quality: p.quality, quality_reason: p.quality_reason })),
    perimeter_ft: decimalFromFloat(r.perimeter_ft),
    area_sqft: decimalFromFloat(r.area_sqft),
    length_ft: decimalFromFloat(r.length_ft),
    width_ft: decimalFromFloat(r.width_ft),
    depth_avg_ft: decimalFromFloat(r.depth_avg_ft),
  }
}

/** The rounded reconstruction the order forms and liner screens carry (3 places for points, 2 for totals). */
export function roundedPool(job: PoolJob, r: Reconstruction): ReconstructedPool {
  return {
    ab_distance_ft: job.measurement.ab_distance_ft,
    points: r.points.map((p) => ({ number: p.number, x_ft: roundedDecimal(p.x, 3), y_ft: roundedDecimal(p.y, 3), quality: p.quality, quality_reason: p.quality_reason })),
    perimeter_ft: roundedDecimal(r.perimeter_ft),
    area_sqft: roundedDecimal(r.area_sqft),
    length_ft: roundedDecimal(r.length_ft),
    width_ft: roundedDecimal(r.width_ft),
    depth_avg_ft: roundedDecimal(r.depth_avg_ft),
  }
}

/** POST /jobs/{id}/validate */
export function validateEndpoint(job: PoolJob): { warnings: string[] } {
  const m = job.measurement
  return { warnings: validateAbLine(Number(m.ab_distance_ft), Number(m.ab_offset_from_pool_ft)) }
}

/** POST /jobs/{id}/order-form (the job itself is added by the caller). */
export function coverOrderForm(job: PoolJob) {
  return { job, reconstructed: roundedPool(job, reconstructJob(job.measurement)), schema_version: '1.0' }
}

// ---------- liner ----------

export class HttpError extends Error {
  constructor(readonly status: number, readonly detail: unknown) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
}

export function requireLinerJob(job: PoolJob): PoolJob {
  if (!needsLiner(job)) {
    throw new HttpError(400, `Job product type is '${job.product_type}'. Set it to 'liner' or 'both' before running liner operations.`)
  }
  return job
}

const closureCheck = (c: ClosureResult) => ({
  name: c.name,
  measured_ft: roundedDecimal(c.measured_ft),
  expected_ft: roundedDecimal(c.expected_ft),
  difference_in: roundedDecimal(c.difference_in),
  tolerance_in: roundedDecimal(c.tolerance_in),
  status: c.status,
  message: c.message,
})

export type LinerValidationReport = ReturnType<typeof report>
const report = (v: Validation) => ({
  ok: v.ok,
  blocking: [...v.blocking],
  warnings: [...v.warnings],
  checks: v.checks.map(closureCheck),
  hydrostatic: v.hydrostatic ? { severity: v.hydrostatic.severity, notes: [...v.hydrostatic.notes] } : null,
})

export type LinerTakeoff = NonNullable<ReturnType<typeof takeoffOf>>
function takeoffOf(job: PoolJob, r: Reconstruction) {
  const liner = job.measurement.liner
  if (liner === null) return null
  const t = computeTakeoff({
    perimeterFt: r.perimeter_ft,
    planAreaSqft: r.area_sqft,
    reconstructedLengthFt: r.length_ft,
    wallHeightsFt: liner.wall_heights.map((w) => Number(w.height_ft)),
    segments: liner.profile_segments,
    steps: liner.steps,
    wasteFactorPct: Number(job.liner_spec.waste_factor_pct),
  })
  const out = {} as Record<keyof typeof t, string>
  for (const k of Object.keys(t) as (keyof typeof t)[]) out[k] = roundedDecimal(t[k])
  return out
}

function validationOf(job: PoolJob, r: Reconstruction) {
  const m = job.measurement
  return report(validateLinerJob(m.liner, job.liner_spec, r, m.perimeter_points.length, Number(m.shallow_depth_ft), Number(m.deep_depth_ft)))
}

/** POST /jobs/{id}/liner-takeoff: never fails on a bad job; the verdict is in the body. */
export function linerTakeoffEndpoint(job: PoolJob) {
  requireLinerJob(job)
  const r = reconstructJob(job.measurement)
  return { reconstructed: roundedPool(job, r), takeoff: takeoffOf(job, r), validation: validationOf(job, r) }
}

const blocked = (reasons: string[]) =>
  new HttpError(422, { message: 'Liner order blocked: the measurements do not close.', blocking: reasons })

/** POST /jobs/{id}/liner-order-form: refused (422) unless the measurements close. */
export function linerOrderForm(job: PoolJob) {
  requireLinerJob(job)
  const r = reconstructJob(job.measurement)
  const validation = validationOf(job, r)
  if (!validation.ok) throw blocked(validation.blocking)
  const takeoff = takeoffOf(job, r)
  if (takeoff === null) throw blocked(['No liner measurements captured for a liner job.'])
  return { job, reconstructed: roundedPool(job, r), takeoff, validation, schema_version: '1.0' }
}
