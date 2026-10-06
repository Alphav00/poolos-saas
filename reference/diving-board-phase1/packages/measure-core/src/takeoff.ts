/**
 * Liner material takeoff, plus the job → numbers glue.
 *
 * - `computeTakeoff` / `stepSurfaceAreaSqft`: port of the takeoff half of
 *   `backend/app/services/liner_math.py` (and `computeTakeoff` in
 *   `frontend/src/lib/utils/linerValidation.js`). Raw floats, camelCase.
 * - `rawReconstruction`, `toReconstructedPool`, `computeJobTakeoff`,
 *   `validateJob`, `buildLinerTakeoff`: port of
 *   `backend/app/services/liner_takeoff.py`. These return the API shapes,
 *   snake_case and rounded exactly as the backend rounds them (`round(x, 2)`,
 *   point coordinates to 3 places).
 *
 * Units: decimal feet / square feet.
 */
import { perimeterForMath, reconstructPool } from './ab';
import { pyRound, toNum } from './format';
import { isVinylOver, profileTotals, validateLinerJob } from './liner';
import type {
  ApiClosureCheck,
  ApiLinerTakeoff,
  ApiLinerTakeoffResult,
  ApiLinerValidationReport,
  ApiReconstructedPool,
  ClosureResult,
  JobMeasurement,
  LinerMeasurement,
  LinerSpec,
  LinerStep,
  Numeric,
  PoolJob,
  ProfileSegmentInput,
  ReconstructionResult,
  TakeoffResult,
  ValidationResult,
} from './types';

/** Allowance for complex (radius / wrap-around) steps to turn the corners. */
export const COMPLEX_STEP_ALLOWANCE = 1.15;

/**
 * Vinyl surface a step consumes: every riser face plus every tread, times the
 * step width. 0 for a step the liner does not cover (fiberglass) or one with
 * no width.
 */
export function stepSurfaceAreaSqft(step: LinerStep | null | undefined): number {
  if (!step) return 0;
  const construction = step.construction;
  if (!isVinylOver(construction)) return 0;
  if (step.width_ft === null || step.width_ft === undefined) return 0;
  const width = toNum(step.width_ft);

  let run = 0;
  for (const r of step.risers ?? []) {
    run += toNum(r.riser_height_ft || 0);
    if (r.tread_depth_ft !== null && r.tread_depth_ft !== undefined) run += toNum(r.tread_depth_ft);
  }

  let area = width * run;
  if (construction === 'vinyl_over_complex') area *= COMPLEX_STEP_ALLOWANCE;
  return area;
}

export interface ComputeTakeoffArgs {
  perimeterFt: number;
  planAreaSqft: number;
  reconstructedLengthFt: number;
  wallHeightsFt?: readonly Numeric[];
  segments?: Iterable<ProfileSegmentInput>;
  steps?: Iterable<LinerStep>;
  wasteFactorPct?: number;
}

/**
 * Material takeoff for one liner.
 *
 * - Wall panel: perimeter × average wall height.
 * - Floor panel: plan area × (developed length / plan length). Exact for a
 *   floor sloping along one axis (the conventional shallow-slope-hopper).
 * - Steps: vinyl-over only, width × (risers + treads).
 * The waste factor is applied last, to the sum.
 */
export function computeTakeoff(args: ComputeTakeoffArgs): TakeoffResult {
  const {
    perimeterFt, planAreaSqft, reconstructedLengthFt,
    wallHeightsFt = [], steps = [], wasteFactorPct = 10,
  } = args;
  const segments = [...(args.segments ?? [])];
  const { planFt, developedFt } = profileTotals(segments);

  const heights = wallHeightsFt.map((h) => toNum(h)).filter((h) => h > 0);
  let sumH = 0;
  for (const h of heights) sumH += h;
  const avgH = heights.length ? sumH / heights.length : 0;
  const maxH = heights.length ? Math.max(...heights) : 0;

  const wallAreaSqft = perimeterFt * avgH;

  let stretch: number;
  let planLengthUsed: number;
  if (planFt > 1e-9) {
    stretch = developedFt / planFt;
    planLengthUsed = planFt;
  } else {
    stretch = 1;
    planLengthUsed = reconstructedLengthFt;
  }
  const floorDevelopedAreaSqft = planAreaSqft * stretch;

  let stepAreaSqft = 0;
  for (const st of steps) stepAreaSqft += stepSurfaceAreaSqft(st);

  const subtotalSqft = wallAreaSqft + floorDevelopedAreaSqft + stepAreaSqft;
  const totalMaterialSqft = subtotalSqft * (1 + wasteFactorPct / 100);

  return {
    perimeterFt,
    wallHeightAvgFt: avgH,
    wallHeightMaxFt: maxH,
    wallAreaSqft,
    floorPlanLengthFt: planLengthUsed,
    floorDevelopedLengthFt: segments.length ? developedFt : reconstructedLengthFt,
    floorPlanAreaSqft: planAreaSqft,
    floorDevelopedAreaSqft,
    stepAreaSqft,
    subtotalSqft,
    wasteFactorPct,
    totalMaterialSqft,
  };
}

// ---------- liner_takeoff.py: job → geometry, takeoff, verdict ----------

const d2 = (x: number): number => pyRound(x, 2);

/** Run the A/B reconstruction for a job (honouring `swap_ab`), unrounded. */
export function rawReconstruction(
  job: { measurement: Pick<JobMeasurement, 'perimeter_points' | 'swap_ab' | 'ab_distance_ft' | 'shallow_depth_ft' | 'deep_depth_ft'> },
): ReconstructionResult {
  const m = job.measurement;
  return reconstructPool(
    perimeterForMath(m),
    toNum(m.ab_distance_ft),
    toNum(m.shallow_depth_ft),
    toNum(m.deep_depth_ft),
  );
}

/** The reconstruction in the API's `ReconstructedPool` shape (rounded). */
export function toReconstructedPool(
  job: { measurement: Pick<JobMeasurement, 'ab_distance_ft'> },
  result: ReconstructionResult,
): ApiReconstructedPool {
  return {
    ab_distance_ft: toNum(job.measurement.ab_distance_ft),
    points: result.points.map((p) => ({
      number: p.number,
      x_ft: pyRound(p.x, 3),
      y_ft: pyRound(p.y, 3),
      quality: p.quality,
      quality_reason: p.qualityReason,
    })),
    perimeter_ft: d2(result.perimeterFt),
    area_sqft: d2(result.areaSqft),
    length_ft: d2(result.lengthFt),
    width_ft: d2(result.widthFt),
    depth_avg_ft: d2(result.depthAvgFt),
  };
}

function toClosureCheck(c: ClosureResult): ApiClosureCheck {
  return {
    name: c.name,
    measured_ft: d2(c.measuredFt),
    expected_ft: d2(c.expectedFt),
    difference_in: d2(c.differenceIn),
    tolerance_in: d2(c.toleranceIn),
    status: c.status,
    message: c.message,
  };
}

function toReport(v: ValidationResult): ApiLinerValidationReport {
  return {
    ok: v.ok,
    blocking: [...v.blocking],
    warnings: [...v.warnings],
    checks: v.checks.map(toClosureCheck),
    hydrostatic: v.hydrostatic
      ? { severity: v.hydrostatic.severity, notes: [...v.hydrostatic.notes] }
      : null,
  };
}

/** A job shape loose enough for in-progress wizard state. */
export interface LinerJobLike {
  measurement: {
    perimeter_points?: readonly unknown[];
    shallow_depth_ft?: Numeric;
    deep_depth_ft?: Numeric;
    liner?: LinerMeasurement | null;
  };
  liner_spec?: LinerSpec | null;
}

/** Material takeoff for a job, rounded; null when there is no liner capture. */
export function computeJobTakeoff(
  job: Pick<PoolJob, 'measurement' | 'liner_spec'>,
  result: ReconstructionResult,
): ApiLinerTakeoff | null {
  const liner = job.measurement.liner;
  if (liner === null || liner === undefined) return null;

  const t = computeTakeoff({
    perimeterFt: result.perimeterFt,
    planAreaSqft: result.areaSqft,
    reconstructedLengthFt: result.lengthFt,
    wallHeightsFt: (liner.wall_heights ?? []).map((w) => toNum(w.height_ft)),
    segments: liner.profile_segments ?? [],
    steps: liner.steps ?? [],
    wasteFactorPct: toNum(job.liner_spec?.waste_factor_pct ?? 10),
  });
  return {
    perimeter_ft: d2(t.perimeterFt),
    wall_height_avg_ft: d2(t.wallHeightAvgFt),
    wall_height_max_ft: d2(t.wallHeightMaxFt),
    wall_area_sqft: d2(t.wallAreaSqft),
    floor_plan_length_ft: d2(t.floorPlanLengthFt),
    floor_developed_length_ft: d2(t.floorDevelopedLengthFt),
    floor_plan_area_sqft: d2(t.floorPlanAreaSqft),
    floor_developed_area_sqft: d2(t.floorDevelopedAreaSqft),
    step_area_sqft: d2(t.stepAreaSqft),
    subtotal_sqft: d2(t.subtotalSqft),
    waste_factor_pct: d2(t.wasteFactorPct),
    total_material_sqft: d2(t.totalMaterialSqft),
  };
}

/** Run the liner validation suite against a job (API report shape, rounded). */
export function validateJob(
  job: LinerJobLike,
  result: Pick<ReconstructionResult, 'lengthFt' | 'widthFt' | 'invalidReasons'>,
): ApiLinerValidationReport {
  const m = job.measurement;
  return toReport(validateLinerJob({
    liner: m.liner,
    linerSpec: job.liner_spec,
    reconstruction: result,
    perimeterPointCount: (m.perimeter_points ?? []).length,
    shallowDepthFt: toNum(m.shallow_depth_ft ?? 0),
    deepDepthFt: toNum(m.deep_depth_ft ?? 0),
  }));
}

/** Everything the liner screens need in one call: geometry, material, verdict. */
export function buildLinerTakeoff(job: PoolJob): ApiLinerTakeoffResult {
  const result = rawReconstruction(job);
  return {
    reconstructed: toReconstructedPool(job, result),
    takeoff: computeJobTakeoff(job, result),
    validation: validateJob(job, result),
  };
}

