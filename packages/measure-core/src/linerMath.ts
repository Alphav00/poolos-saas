/**
 * Vinyl liner math: vertical closure checks and material takeoff. Ported from
 * backend/app/services/liner_math.py — same tolerances, bands, order of
 * checks and messages.
 */
import { pyFixed, pyHypot } from './pynum'
import { requiresAbPlot, type LinerMeasurement, type LinerShape, type LinerSpec, type LinerStep, type ProfileSegment, type StepRiser, type WallHeight } from './models'
import type { Reconstruction } from './abMath'

export const PROFILE_TOLERANCE_IN = 2.0
export const RISER_TOLERANCE_IN = 0.5
export const PROFILE_CONTINUITY_TOLERANCE_IN = 1.0
export const CLOSURE_CLEAN_IN = 0.25
export const WALL_SPREAD_WARN_IN = 3.0
export const MIN_PERIMETER_POINTS = 8
const IN_PER_FT = 12.0
const BAND_EPSILON_IN = 1e-9

export type Status = 'pass' | 'warn' | 'fail'

export interface ClosureResult {
  name: string
  measured_ft: number
  expected_ft: number
  difference_in: number
  tolerance_in: number
  status: Status
  message: string
}

export interface Hydrostatic {
  severity: 'low' | 'medium' | 'high'
  notes: string[]
}

export interface Takeoff {
  perimeter_ft: number
  wall_height_avg_ft: number
  wall_height_max_ft: number
  wall_area_sqft: number
  floor_plan_length_ft: number
  floor_developed_length_ft: number
  floor_plan_area_sqft: number
  floor_developed_area_sqft: number
  step_area_sqft: number
  subtotal_sqft: number
  waste_factor_pct: number
  total_material_sqft: number
}

export interface Validation {
  ok: boolean
  blocking: string[]
  warnings: string[]
  checks: ClosureResult[]
  hydrostatic: Hydrostatic | null
}

/** Python's plain left-to-right sum() (CPython 3.11). */
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function closureStatus(differenceIn: number, toleranceIn: number): Status {
  const magnitude = Math.abs(differenceIn)
  if (magnitude > toleranceIn + BAND_EPSILON_IN) return 'fail'
  if (magnitude <= CLOSURE_CLEAN_IN + BAND_EPSILON_IN) return 'pass'
  return 'warn'
}

export const segmentDevelopedLengthFt = (run: number, drop: number) => pyHypot(Math.abs(run), Math.abs(drop))

type Seg = [order: number, kind: string, run: number, d0: number, d1: number]
const segFields = (s: ProfileSegment): Seg => [s.order, s.kind, Number(s.horizontal_run_ft), Number(s.depth_start_ft), Number(s.depth_end_ft)]

export function profileTotals(segments: ProfileSegment[]): [plan: number, developed: number] {
  let plan = 0
  let developed = 0
  for (const s of segments) {
    const [, , run, d0, d1] = segFields(s)
    plan += run
    developed += segmentDevelopedLengthFt(run, d1 - d0)
  }
  return [plan, developed]
}

export function checkProfileClosure(segments: ProfileSegment[], poolLengthFt: number, toleranceIn = PROFILE_TOLERANCE_IN): ClosureResult {
  const [measured] = profileTotals(segments)
  const diffIn = (measured - poolLengthFt) * IN_PER_FT
  if (segments.length === 0) {
    return {
      name: 'profile_closure', measured_ft: 0, expected_ft: poolLengthFt, difference_in: -poolLengthFt * IN_PER_FT,
      tolerance_in: toleranceIn, status: 'fail',
      message: 'No depth profile captured. The floor section is required to cut a liner.',
    }
  }
  const status = closureStatus(diffIn, toleranceIn)
  const message =
    status === 'fail'
      ? `Profile runs total ${pyFixed(measured, 2)} ft but the perimeter walk reconstructs a ${pyFixed(poolLengthFt, 2)} ft pool — off by ${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}"). Re-tape the floor section.`
      : status === 'pass'
        ? `Profile closes on ${pyFixed(poolLengthFt, 2)} ft.`
        : `Profile closes within tolerance: off by ${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}").`
  return { name: 'profile_closure', measured_ft: measured, expected_ft: poolLengthFt, difference_in: diffIn, tolerance_in: toleranceIn, status, message }
}

export function checkProfileContinuity(segments: ProfileSegment[], toleranceIn = PROFILE_CONTINUITY_TOLERANCE_IN): string[] {
  // Python's sorted() is stable; orders are unique anyway.
  const ordered = segments.map(segFields).sort((a, b) => a[0] - b[0])
  const problems: string[] = []
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!
    const cur = ordered[i]!
    const gapIn = (cur[3] - prev[4]) * IN_PER_FT
    if (Math.abs(gapIn) > toleranceIn) {
      problems.push(
        `Profile gap between run #${prev[0]} (${prev[1]}) and run #${cur[0]} (${cur[1]}): ends at ${pyFixed(prev[4], 2)} ft deep, next starts at ${pyFixed(cur[3], 2)} ft — ${pyFixed(Math.abs(gapIn), 1)}" apart.`,
      )
    }
  }
  return problems
}

export function checkHopperClosure(hopper: LinerMeasurement['hopper'], poolWidthFt: number, toleranceIn = PROFILE_TOLERANCE_IN): ClosureResult | null {
  if (hopper === null) return null
  const left = Number(hopper.left_slope_width_ft)
  const bottom = Number(hopper.bottom_width_ft)
  const right = Number(hopper.right_slope_width_ft)
  const measured = left + bottom + right
  const diffIn = (measured - poolWidthFt) * IN_PER_FT
  const status = closureStatus(diffIn, toleranceIn)
  const message =
    status === 'fail'
      ? `Hopper cross-section totals ${pyFixed(measured, 2)} ft (${pyFixed(left, 2)} + ${pyFixed(bottom, 2)} + ${pyFixed(right, 2)}) but the pool is ${pyFixed(poolWidthFt, 2)} ft wide — off by ${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}"). Re-tape the hopper.`
      : status === 'pass'
        ? `Hopper spans the ${pyFixed(poolWidthFt, 2)} ft width.`
        : `Hopper closes within tolerance: off by ${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}").`
  return { name: 'hopper_closure', measured_ft: measured, expected_ft: poolWidthFt, difference_in: diffIn, tolerance_in: toleranceIn, status, message }
}

export function checkRiserSum(risers: StepRiser[], shallowWallFt: number, toleranceIn = RISER_TOLERANCE_IN, stepLabel = 'step'): ClosureResult {
  const heights = risers.map((r) => Number(r.riser_height_ft))
  const measured = sum(heights)
  const diffIn = (measured - shallowWallFt) * IN_PER_FT
  const name = `riser_sum:${stepLabel}`
  if (heights.length === 0) {
    return {
      name, measured_ft: 0, expected_ft: shallowWallFt, difference_in: -shallowWallFt * IN_PER_FT, tolerance_in: toleranceIn, status: 'fail',
      message: `${stepLabel}: vinyl-over step has no riser heights recorded. Each riser must be measured individually.`,
    }
  }
  const status = closureStatus(diffIn, toleranceIn)
  const message =
    status === 'fail'
      ? `${stepLabel}: risers total ${pyFixed(measured, 2)} ft but the shallow wall is ${pyFixed(shallowWallFt, 2)} ft — off by ${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}"). Re-measure the risers.`
      : status === 'pass'
        ? `${stepLabel}: ${heights.length} risers close on the shallow wall height.`
        : `${stepLabel}: risers close within tolerance, off by ${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}").`
  return { name, measured_ft: measured, expected_ft: shallowWallFt, difference_in: diffIn, tolerance_in: toleranceIn, status, message }
}

export function assessHydrostaticRisk(copingType: string, drainageSystem: string, recentRainfallDays: number, reliefValve = false): Hydrostatic {
  const notes: string[] = []
  let severity: Hydrostatic['severity'] = 'low'
  if (recentRainfallDays >= 3) {
    severity = 'high'
    notes.push(`${recentRainfallDays} consecutive days of recent rain. Postpone draining until the water table drops.`)
  }
  if (drainageSystem === 'none') {
    if (copingType === 'stone') {
      notes.push('Stone coping with no drainage system — monitor groundwater throughout the install.')
      if (severity === 'low') severity = 'medium'
    }
    if (!reliefValve) {
      notes.push('No drainage system and no hydrostatic relief valve. There is no path for groundwater pressure to escape while the pool is empty.')
      if (severity === 'low') severity = 'medium'
    }
  }
  if (drainageSystem === 'unknown') {
    notes.push('Drainage system not identified. Confirm on site before draining.')
    if (severity === 'low') severity = 'medium'
  }
  if (notes.length === 0) notes.push('Standard monitoring recommended.')
  return { severity, notes }
}

export function stepSurfaceAreaSqft(step: LinerStep): number {
  if (step.construction !== 'vinyl_over_standard' && step.construction !== 'vinyl_over_complex') return 0
  if (step.width_ft === null) return 0
  const width = Number(step.width_ft)
  let run = 0
  for (const r of step.risers) {
    run += Number(r.riser_height_ft) || 0
    if (r.tread_depth_ft !== null) run += Number(r.tread_depth_ft)
  }
  let area = width * run
  if (step.construction === 'vinyl_over_complex') area *= 1.15
  return area
}

export function computeTakeoff(args: {
  perimeterFt: number
  planAreaSqft: number
  reconstructedLengthFt: number
  wallHeightsFt: number[]
  segments: ProfileSegment[]
  steps: LinerStep[]
  wasteFactorPct: number
}): Takeoff {
  const [planLen, developedLen] = profileTotals(args.segments)
  const heights = args.wallHeightsFt.filter((h) => h > 0)
  const avgH = heights.length ? sum(heights) / heights.length : 0
  const maxH = heights.length ? Math.max(...heights) : 0
  const wallArea = args.perimeterFt * avgH
  let stretch: number
  let planLengthUsed: number
  if (planLen > 1e-9) {
    stretch = developedLen / planLen
    planLengthUsed = planLen
  } else {
    stretch = 1.0
    planLengthUsed = args.reconstructedLengthFt
  }
  const floorDevelopedArea = args.planAreaSqft * stretch
  let stepArea = 0
  for (const st of args.steps) stepArea += stepSurfaceAreaSqft(st)
  const subtotal = wallArea + floorDevelopedArea + stepArea
  const total = subtotal * (1.0 + args.wasteFactorPct / 100.0)
  return {
    perimeter_ft: args.perimeterFt,
    wall_height_avg_ft: avgH,
    wall_height_max_ft: maxH,
    wall_area_sqft: wallArea,
    floor_plan_length_ft: planLengthUsed,
    floor_developed_length_ft: args.segments.length ? developedLen : args.reconstructedLengthFt,
    floor_plan_area_sqft: args.planAreaSqft,
    floor_developed_area_sqft: floorDevelopedArea,
    step_area_sqft: stepArea,
    subtotal_sqft: subtotal,
    waste_factor_pct: args.wasteFactorPct,
    total_material_sqft: total,
  }
}

function shallowWallHeightFt(wallHeights: WallHeight[], segments: ProfileSegment[], shallowDepthFt: number): number {
  for (const w of wallHeights) if ((w.label || '').toLowerCase().includes('shallow')) return Number(w.height_ft)
  for (const s of segments) {
    const [, kind, , d0] = segFields(s)
    if (kind === 'shallow_floor' && d0 > 0) return d0
  }
  return shallowDepthFt
}

/** Decide whether this liner job may go to the fabricator. */
export function validateLinerJob(
  liner: LinerMeasurement | null,
  spec: LinerSpec,
  reconstruction: Reconstruction,
  perimeterPointCount: number,
  shallowDepthFt: number,
  deepDepthFt: number,
): Validation {
  const blocking: string[] = []
  const warnings: string[] = []
  const checks: ClosureResult[] = []
  if (liner === null) {
    return { ok: false, blocking: ['No liner measurements captured for a liner job.'], warnings: [], checks: [], hydrostatic: null }
  }

  for (const reason of reconstruction.invalid_reasons) blocking.push(`Perimeter: ${reason}`)

  const shape: LinerShape = liner.shape
  const needsPlot = requiresAbPlot(shape)
  const shapeName = shape || 'freeform'
  if (perimeterPointCount < MIN_PERIMETER_POINTS) {
    if (needsPlot) {
      blocking.push(
        `${shapeName} is ordered from an A/B triangulation plot, but only ${perimeterPointCount} perimeter points were taken. The supplier form needs at least ${MIN_PERIMETER_POINTS}, and more on every curve.`,
      )
    } else {
      warnings.push(
        `Only ${perimeterPointCount} perimeter points. ${shapeName} is a standard shape ordered from lettered dimensions, so the plot is supporting evidence rather than the order itself — but the trade minimum is still ${MIN_PERIMETER_POINTS}.`,
      )
    }
  }

  const heights = liner.wall_heights.map((w) => Number(w.height_ft))
  if (!heights.length) {
    blocking.push('No wall heights recorded. The liner wall panel cannot be cut without them.')
  } else {
    const spreadIn = (Math.max(...heights) - Math.min(...heights)) * IN_PER_FT
    if (spreadIn > WALL_SPREAD_WARN_IN) {
      warnings.push(
        `Wall heights vary by ${pyFixed(spreadIn, 1)}" across the pool (${pyFixed(Math.min(...heights), 2)}–${pyFixed(Math.max(...heights), 2)} ft). Confirm the wall is stepped and not a mis-read.`,
      )
    }
  }

  const segments = liner.profile_segments
  const closure = checkProfileClosure(segments, reconstruction.length_ft)
  checks.push(closure)
  if (closure.status === 'fail') blocking.push(closure.message)
  else if (closure.status === 'warn') warnings.push(closure.message)
  for (const p of checkProfileContinuity(segments)) blocking.push(p)

  const hopperCheck = checkHopperClosure(liner.hopper, reconstruction.width_ft)
  if (hopperCheck !== null) {
    checks.push(hopperCheck)
    if (hopperCheck.status === 'fail') blocking.push(hopperCheck.message)
    else if (hopperCheck.status === 'warn') warnings.push(hopperCheck.message)
  } else if (segments.some((s) => s.kind === 'deep_floor')) {
    warnings.push('Profile has a hopper bottom but no hopper cross-section was measured. The fabricator needs the side slopes and bottom width.')
  }

  if (segments.length) {
    const deepest = Math.max(...segments.map(segFields).map((s) => Math.max(s[3], s[4])))
    if (deepDepthFt > 0 && Math.abs(deepest - deepDepthFt) * IN_PER_FT > PROFILE_TOLERANCE_IN) {
      warnings.push(`Profile bottoms out at ${pyFixed(deepest, 2)} ft but the job records a ${pyFixed(deepDepthFt, 2)} ft deep end. Confirm which is right.`)
    }
  }
  if (deepDepthFt > 0 && shallowDepthFt > 0 && deepDepthFt < shallowDepthFt) {
    warnings.push(`Deep depth (${pyFixed(deepDepthFt, 2)} ft) is shallower than the shallow depth (${pyFixed(shallowDepthFt, 2)} ft). Check the two are not swapped.`)
  }

  const steps = liner.steps
  const shallowWall = shallowWallHeightFt(liner.wall_heights, segments, shallowDepthFt)
  steps.forEach((st, i) => {
    const label = `Step ${i + 1} (${st.construction})`
    if (st.construction === 'vinyl_over_standard' || st.construction === 'vinyl_over_complex') {
      const result = checkRiserSum(st.risers, shallowWall, RISER_TOLERANCE_IN, label)
      checks.push(result)
      if (result.status === 'fail') blocking.push(result.message)
      else if (result.status === 'warn') warnings.push(result.message)
      if (st.width_ft === null) blocking.push(`${label}: width is required to cut vinyl over the step.`)
      if (st.corner_type === null) {
        blocking.push(`${label}: back-corner type (90°, radius or diagonal) is required. Each cuts to a different pattern.`)
      }
    }
  })

  if ((spec.step_construction === 'vinyl_over_standard' || spec.step_construction === 'vinyl_over_complex') && !steps.length) {
    blocking.push(`Liner spec orders ${spec.step_construction} steps but no step was measured.`)
  }

  const kinds = liner.fittings.map((f) => f.kind as string)
  if (!kinds.length) {
    warnings.push('No fittings recorded. Every skimmer, return, light and main drain needs a cut-out location.')
  } else {
    if (!kinds.includes('skimmer')) warnings.push('No skimmer recorded. Confirm the pool has none.')
    if (!kinds.includes('main_drain')) warnings.push('No main drain recorded. Confirm the pool has none.')
  }

  if (!spec.measured_at_bead_receiver) {
    blocking.push('Perimeter was not measured at the bead receiver. A liner cut from a coping-edge walk will not fit.')
  }
  if (!pyStrip(spec.pattern_name || '')) blocking.push('Liner pattern is required on the order.')

  const hydrostatic = assessHydrostaticRisk(spec.coping_type, liner.drainage_system, liner.recent_rainfall_days || 0, liner.hydrostatic_relief_valve)
  return { ok: blocking.length === 0, blocking, warnings, checks, hydrostatic }
}

/** Python str.strip() with no arguments: strips what str.isspace() calls whitespace (which includes \x1c-\x1f). */
// eslint-disable-next-line no-control-regex
export const pyStrip = (s: string) => s.replace(/^[\s\u001c-\u001f\u0085]+|[\s\u001c-\u001f\u0085]+$/g, '')
