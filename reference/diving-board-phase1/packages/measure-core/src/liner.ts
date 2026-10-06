/**
 * Vinyl liner vertical math: wall heights, floor profile, hopper, step risers,
 * closure checks, developed length, hydrostatic risk, whole-job validation.
 * Port of `backend/app/services/liner_math.py` (source of truth) and
 * `frontend/src/lib/utils/linerValidation.js`. The material takeoff lives in
 * takeoff.ts.
 *
 * Closures that make the capture self-checking:
 *  1. Profile closure: the plan-view runs equal the reconstructed pool length
 *     (E + N + M + L = B on supplier forms). ±2".
 *  2. Hopper closure: side slopes + flat bottom span the pool width
 *     (G + H + I). ±2".
 *  3. Riser closure: a vinyl-over step's risers sum to the shallow wall
 *     height. ±0.5".
 * Each grades in three bands: within ¼" it closes ("pass"), within tolerance
 * it warns ("warn"), beyond it blocks ("fail").
 *
 * Developed length: a sloping run consumes hypot(run, drop) of vinyl.
 *
 * Units: decimal feet, except tolerances and differences, which are inches.
 */
import { pyFixed, toNum } from './format';
import type {
  ClosureResult,
  ClosureStatus,
  CopingType,
  DrainageSystem,
  HopperProfile,
  HydrostaticResult,
  LinerMeasurement,
  LinerShape,
  LinerSpec,
  Numeric,
  ProfileSegmentInput,
  ReconstructionResult,
  StepRiser,
  ValidationResult,
  WallHeight,
} from './types';

// ---------- tolerances (inches, as the field forms state them) ----------

/** Horizontal profile closure (and hopper closure). */
export const PROFILE_TOLERANCE_IN = 2.0;
/** Step riser closure: tighter, a riser stack off by > ½" puckers the vinyl. */
export const RISER_TOLERANCE_IN = 0.5;
/** Adjacent profile segments must share a depth within this. */
export const PROFILE_CONTINUITY_TOLERANCE_IN = 1.0;
/** The trade records to the nearest ¼"; a residue inside this is closure. */
export const CLOSURE_CLEAN_IN = 0.25;
/** Wall heights varying by more than this across the pool warn. */
export const WALL_SPREAD_WARN_IN = 3.0;
/** Below this the perimeter is too coarse to cut a liner from. */
export const MIN_PERIMETER_POINTS = 8;

export const IN_PER_FT = 12.0;

/**
 * Slack on the band comparisons: a difference computed as 2.0000000000000004"
 * is a 2" difference.
 */
const BAND_EPSILON_IN = 1e-9;

const VINYL_OVER: ReadonlySet<string> = new Set(['vinyl_over_standard', 'vinyl_over_complex']);

/** Shapes ordered from an A/B triangulation plot rather than a lettered form. */
export const AB_PLOT_SHAPES: ReadonlySet<LinerShape> = new Set<LinerShape>([
  'kidney', 'figure_8', 'mountain_lake_left', 'mountain_lake_right',
  'odessy_left', 'odessy_right', 'freeform',
]);

export function requiresAbPlot(shape: LinerShape | string): boolean {
  return AB_PLOT_SHAPES.has(shape as LinerShape);
}

export function isVinylOver(construction: string | null | undefined): boolean {
  return construction != null && VINYL_OVER.has(construction);
}

/**
 * Grade a closure difference into pass / warn / fail. Both boundaries are
 * inclusive: a difference exactly on the tolerance is the last acceptable one.
 */
export function closureStatus(differenceIn: number, toleranceIn: number): ClosureStatus {
  const magnitude = Math.abs(differenceIn);
  if (magnitude > toleranceIn + BAND_EPSILON_IN) return 'fail';
  if (magnitude <= CLOSURE_CLEAN_IN + BAND_EPSILON_IN) return 'pass';
  return 'warn';
}

// ---------- profile geometry ----------

/** Slant length of one profile run; a flat run returns its own length. */
export function segmentDevelopedLengthFt(horizontalRunFt: number, depthDropFt: number): number {
  return Math.hypot(Math.abs(horizontalRunFt), Math.abs(depthDropFt));
}

interface SegFields {
  order: number;
  kind: string;
  run: number;
  d0: number;
  d1: number;
}

/** Read a segment object or `[order, kind, run, d0, d1]` tuple uniformly. */
export function segFields(seg: ProfileSegmentInput): SegFields {
  if (Array.isArray(seg)) {
    const [order, kind, run, d0, d1] = seg as readonly [number, string, Numeric, Numeric, Numeric];
    return { order: Math.trunc(order), kind: String(kind), run: toNum(run), d0: toNum(d0), d1: toNum(d1) };
  }
  const s = seg as Exclude<ProfileSegmentInput, readonly unknown[]>;
  return {
    order: Math.trunc(toNum(s.order)),
    kind: String(s.kind ?? 'slope'),
    run: toNum(s.horizontal_run_ft),
    d0: toNum(s.depth_start_ft),
    d1: toNum(s.depth_end_ft),
  };
}

/** Plan-view run total and developed (slant) total over the whole profile. */
export function profileTotals(segments: Iterable<ProfileSegmentInput>): {
  planFt: number;
  developedFt: number;
} {
  let planFt = 0;
  let developedFt = 0;
  for (const seg of segments) {
    const { run, d0, d1 } = segFields(seg);
    planFt += run;
    developedFt += segmentDevelopedLengthFt(run, d1 - d0);
  }
  return { planFt, developedFt };
}

/** The profile's plan-view runs must add up to the reconstructed pool length. */
export function checkProfileClosure(
  segmentsIn: Iterable<ProfileSegmentInput>,
  poolLengthFt: number,
  toleranceIn: number = PROFILE_TOLERANCE_IN,
): ClosureResult {
  const segments = [...segmentsIn];
  const { planFt: measured } = profileTotals(segments);
  const diffIn = (measured - poolLengthFt) * IN_PER_FT;

  if (segments.length === 0) {
    return {
      name: 'profile_closure',
      measuredFt: 0,
      expectedFt: poolLengthFt,
      differenceIn: -poolLengthFt * IN_PER_FT,
      toleranceIn,
      status: 'fail',
      message: 'No depth profile captured. The floor section is required to cut a liner.',
    };
  }

  const status = closureStatus(diffIn, toleranceIn);
  let message: string;
  if (status === 'fail') {
    message = `Profile runs total ${pyFixed(measured, 2)} ft but the perimeter walk `
      + `reconstructs a ${pyFixed(poolLengthFt, 2)} ft pool — off by ${pyFixed(Math.abs(diffIn), 1)}" `
      + `(tolerance ±${pyFixed(toleranceIn, 1)}"). Re-tape the floor section.`;
  } else if (status === 'pass') {
    message = `Profile closes on ${pyFixed(poolLengthFt, 2)} ft.`;
  } else {
    message = `Profile closes within tolerance: off by ${pyFixed(Math.abs(diffIn), 1)}" `
      + `(tolerance ±${pyFixed(toleranceIn, 1)}").`;
  }

  return {
    name: 'profile_closure',
    measuredFt: measured,
    expectedFt: poolLengthFt,
    differenceIn: diffIn,
    toleranceIn,
    status,
    message,
  };
}

/** Each run has to start where the previous one ended. One message per gap. */
export function checkProfileContinuity(
  segments: Iterable<ProfileSegmentInput>,
  toleranceIn: number = PROFILE_CONTINUITY_TOLERANCE_IN,
): string[] {
  // Array.prototype.sort is stable, like Python's sorted().
  const ordered = [...segments].map(segFields).sort((a, b) => a.order - b.order);
  const problems: string[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const cur = ordered[i]!;
    const gapIn = (cur.d0 - prev.d1) * IN_PER_FT;
    if (Math.abs(gapIn) > toleranceIn) {
      problems.push(
        `Profile gap between run #${prev.order} (${prev.kind}) and run #${cur.order} `
        + `(${cur.kind}): ends at ${pyFixed(prev.d1, 2)} ft deep, next starts at `
        + `${pyFixed(cur.d0, 2)} ft — ${pyFixed(Math.abs(gapIn), 1)}" apart.`,
      );
    }
  }
  return problems;
}

/**
 * The hopper cross-section (G + H + I) must span the pool width. Returns null
 * when no hopper was captured: flat-bottomed pools have nothing to check.
 */
export function checkHopperClosure(
  hopper: HopperProfile | null | undefined,
  poolWidthFt: number,
  toleranceIn: number = PROFILE_TOLERANCE_IN,
): ClosureResult | null {
  if (hopper === null || hopper === undefined) return null;

  const left = toNum(hopper.left_slope_width_ft ?? 0);
  const bottom = toNum(hopper.bottom_width_ft ?? 0);
  const right = toNum(hopper.right_slope_width_ft ?? 0);
  const measured = left + bottom + right;
  const diffIn = (measured - poolWidthFt) * IN_PER_FT;

  const status = closureStatus(diffIn, toleranceIn);
  let message: string;
  if (status === 'fail') {
    message = `Hopper cross-section totals ${pyFixed(measured, 2)} ft `
      + `(${pyFixed(left, 2)} + ${pyFixed(bottom, 2)} + ${pyFixed(right, 2)}) but the pool is `
      + `${pyFixed(poolWidthFt, 2)} ft wide — off by ${pyFixed(Math.abs(diffIn), 1)}" `
      + `(tolerance ±${pyFixed(toleranceIn, 1)}"). Re-tape the hopper.`;
  } else if (status === 'pass') {
    message = `Hopper spans the ${pyFixed(poolWidthFt, 2)} ft width.`;
  } else {
    message = `Hopper closes within tolerance: off by ${pyFixed(Math.abs(diffIn), 1)}" `
      + `(tolerance ±${pyFixed(toleranceIn, 1)}").`;
  }

  return {
    name: 'hopper_closure',
    measuredFt: measured,
    expectedFt: poolWidthFt,
    differenceIn: diffIn,
    toleranceIn,
    status,
    message,
  };
}

// ---------- riser geometry ----------

function riserHeights(risers: Iterable<StepRiser | Numeric>): number[] {
  const out: number[] = [];
  for (const r of risers) {
    out.push(typeof r === 'object' && r !== null ? toNum(r.riser_height_ft) : toNum(r));
  }
  return out;
}

/**
 * A vinyl-over step's risers must add up to the shallow-end wall height: the
 * riser stack and the shallow wall describe the same vertical drop.
 */
export function checkRiserSum(
  risers: Iterable<StepRiser | Numeric>,
  shallowWallHeightFt: number,
  toleranceIn: number = RISER_TOLERANCE_IN,
  stepLabel = 'step',
): ClosureResult {
  const heights = riserHeights(risers);
  let measured = 0;
  for (const h of heights) measured += h;
  const diffIn = (measured - shallowWallHeightFt) * IN_PER_FT;
  const name = `riser_sum:${stepLabel}`;

  if (heights.length === 0) {
    return {
      name,
      measuredFt: 0,
      expectedFt: shallowWallHeightFt,
      differenceIn: -shallowWallHeightFt * IN_PER_FT,
      toleranceIn,
      status: 'fail',
      message: `${stepLabel}: vinyl-over step has no riser heights recorded. `
        + 'Each riser must be measured individually.',
    };
  }

  const status = closureStatus(diffIn, toleranceIn);
  let message: string;
  if (status === 'fail') {
    message = `${stepLabel}: risers total ${pyFixed(measured, 2)} ft but the shallow wall is `
      + `${pyFixed(shallowWallHeightFt, 2)} ft — off by ${pyFixed(Math.abs(diffIn), 1)}" `
      + `(tolerance ±${pyFixed(toleranceIn, 1)}"). Re-measure the risers.`;
  } else if (status === 'pass') {
    message = `${stepLabel}: ${heights.length} risers close on the shallow wall height.`;
  } else {
    message = `${stepLabel}: risers close within tolerance, off by `
      + `${pyFixed(Math.abs(diffIn), 1)}" (tolerance ±${pyFixed(toleranceIn, 1)}").`;
  }

  return {
    name,
    measuredFt: measured,
    expectedFt: shallowWallHeightFt,
    differenceIn: diffIn,
    toleranceIn,
    status,
    message,
  };
}

// ---------- hydrostatic risk ----------

/**
 * Groundwater risk for draining the pool to swap the liner. Advisory: it never
 * blocks the order. Severity takes the worst finding.
 */
export function assessHydrostaticRisk(
  copingType: CopingType | string,
  drainageSystem: DrainageSystem | string,
  recentRainfallDays: number,
  hydrostaticReliefValve = false,
): HydrostaticResult {
  const notes: string[] = [];
  let severity: HydrostaticResult['severity'] = 'low';

  if (recentRainfallDays >= 3) {
    severity = 'high';
    notes.push(
      `${recentRainfallDays} consecutive days of recent rain. Postpone draining `
      + 'until the water table drops.',
    );
  }

  if (drainageSystem === 'none') {
    if (copingType === 'stone') {
      notes.push(
        'Stone coping with no drainage system — monitor groundwater throughout the install.',
      );
      if (severity === 'low') severity = 'medium';
    }
    if (!hydrostaticReliefValve) {
      notes.push(
        'No drainage system and no hydrostatic relief valve. There is no path '
        + 'for groundwater pressure to escape while the pool is empty.',
      );
      if (severity === 'low') severity = 'medium';
    }
  }

  if (drainageSystem === 'unknown') {
    notes.push('Drainage system not identified. Confirm on site before draining.');
    if (severity === 'low') severity = 'medium';
  }

  if (notes.length === 0) notes.push('Standard monitoring recommended.');
  return { severity, notes };
}

// ---------- whole-job validation ----------

/**
 * The shallow-end wall height that riser stacks are checked against:
 * a wall height labelled "shallow", else the shallow floor run's start depth,
 * else the job's recorded shallow depth.
 */
export function shallowWallHeightFt(
  wallHeights: Iterable<WallHeight>,
  segments: Iterable<ProfileSegmentInput>,
  shallowDepthFt: number,
): number {
  for (const w of wallHeights) {
    if ((w.label || '').toLowerCase().includes('shallow')) return toNum(w.height_ft);
  }
  for (const seg of segments) {
    const { kind, d0 } = segFields(seg);
    if (kind === 'shallow_floor' && d0 > 0) return d0;
  }
  return shallowDepthFt;
}

export interface ValidateLinerJobArgs {
  liner: LinerMeasurement | null | undefined;
  linerSpec: LinerSpec | null | undefined;
  reconstruction: Pick<ReconstructionResult, 'lengthFt' | 'widthFt' | 'invalidReasons'>;
  perimeterPointCount: number;
  shallowDepthFt: number;
  deepDepthFt: number;
}

/**
 * Decide whether this liner job may go to the fabricator.
 *
 * `blocking` refuses the export; `warnings` are advisory; `checks` carries the
 * arithmetic closures so the UI can show the numbers. Missing liner/spec
 * fields take the backend's pydantic defaults.
 */
export function validateLinerJob(args: ValidateLinerJobArgs): ValidationResult {
  const { liner, reconstruction, perimeterPointCount, shallowDepthFt, deepDepthFt } = args;
  const spec: LinerSpec = args.linerSpec ?? {};
  const blocking: string[] = [];
  const warnings: string[] = [];
  const checks: ClosureResult[] = [];

  if (liner === null || liner === undefined) {
    return {
      ok: false,
      blocking: ['No liner measurements captured for a liner job.'],
      warnings: [],
      checks: [],
      hydrostatic: null,
    };
  }

  // --- plan-view geometry must have reconstructed cleanly ---
  for (const reason of reconstruction.invalidReasons ?? []) {
    blocking.push(`Perimeter: ${reason}`);
  }

  const shapeName: LinerShape = liner.shape ?? 'freeform';
  const needsPlot = requiresAbPlot(shapeName);

  if (perimeterPointCount < MIN_PERIMETER_POINTS) {
    if (needsPlot) {
      blocking.push(
        `${shapeName} is ordered from an A/B triangulation plot, but only `
        + `${perimeterPointCount} perimeter points were taken. The supplier `
        + `form needs at least ${MIN_PERIMETER_POINTS}, and more on every curve.`,
      );
    } else {
      warnings.push(
        `Only ${perimeterPointCount} perimeter points. ${shapeName} is a `
        + 'standard shape ordered from lettered dimensions, so the plot is '
        + 'supporting evidence rather than the order itself — but the trade '
        + `minimum is still ${MIN_PERIMETER_POINTS}.`,
      );
    }
  }

  // --- wall heights ---
  const wallHeights = liner.wall_heights ?? [];
  const heights = wallHeights.map((w) => toNum(w.height_ft));
  if (heights.length === 0) {
    blocking.push('No wall heights recorded. The liner wall panel cannot be cut without them.');
  } else {
    const hi = Math.max(...heights);
    const lo = Math.min(...heights);
    const spreadIn = (hi - lo) * IN_PER_FT;
    if (spreadIn > WALL_SPREAD_WARN_IN) {
      warnings.push(
        `Wall heights vary by ${pyFixed(spreadIn, 1)}" across the pool `
        + `(${pyFixed(lo, 2)}–${pyFixed(hi, 2)} ft). Confirm the wall is stepped `
        + 'and not a mis-read.',
      );
    }
  }

  // --- profile closure + continuity ---
  const segments = liner.profile_segments ?? [];
  const closure = checkProfileClosure(segments, toNum(reconstruction.lengthFt));
  checks.push(closure);
  if (closure.status === 'fail') blocking.push(closure.message);
  else if (closure.status === 'warn') warnings.push(closure.message);

  for (const problem of checkProfileContinuity(segments)) blocking.push(problem);

  const hopperCheck = checkHopperClosure(liner.hopper, toNum(reconstruction.widthFt));
  if (hopperCheck !== null) {
    checks.push(hopperCheck);
    if (hopperCheck.status === 'fail') blocking.push(hopperCheck.message);
    else if (hopperCheck.status === 'warn') warnings.push(hopperCheck.message);
  } else if (segments.some((s) => segFields(s).kind === 'deep_floor')) {
    warnings.push(
      'Profile has a hopper bottom but no hopper cross-section was measured. '
      + 'The fabricator needs the side slopes and bottom width.',
    );
  }

  // The profile has to actually reach the deep end the tech recorded.
  if (segments.length > 0) {
    const deepest = Math.max(...segments.map((s) => {
      const f = segFields(s);
      return Math.max(f.d0, f.d1);
    }));
    if (deepDepthFt > 0 && Math.abs(deepest - deepDepthFt) * IN_PER_FT > PROFILE_TOLERANCE_IN) {
      warnings.push(
        `Profile bottoms out at ${pyFixed(deepest, 2)} ft but the job records a `
        + `${pyFixed(deepDepthFt, 2)} ft deep end. Confirm which is right.`,
      );
    }
  }

  if (deepDepthFt > 0 && shallowDepthFt > 0 && deepDepthFt < shallowDepthFt) {
    warnings.push(
      `Deep depth (${pyFixed(deepDepthFt, 2)} ft) is shallower than the shallow depth `
      + `(${pyFixed(shallowDepthFt, 2)} ft). Check the two are not swapped.`,
    );
  }

  // --- steps ---
  const steps = liner.steps ?? [];
  const shallowWall = shallowWallHeightFt(wallHeights, segments, shallowDepthFt);
  steps.forEach((st, i) => {
    const construction = st.construction ?? 'none';
    const label = `Step ${i + 1} (${construction})`;
    if (!isVinylOver(construction)) return;

    const result = checkRiserSum(st.risers ?? [], shallowWall, RISER_TOLERANCE_IN, label);
    checks.push(result);
    if (result.status === 'fail') blocking.push(result.message);
    else if (result.status === 'warn') warnings.push(result.message);
    if (st.width_ft === null || st.width_ft === undefined) {
      blocking.push(`${label}: width is required to cut vinyl over the step.`);
    }
    if (st.corner_type === null || st.corner_type === undefined) {
      blocking.push(
        `${label}: back-corner type (90°, radius or diagonal) is required. `
        + 'Each cuts to a different pattern.',
      );
    }
  });

  const specConstruction = spec.step_construction ?? 'none';
  if (isVinylOver(specConstruction) && steps.length === 0) {
    blocking.push(`Liner spec orders ${specConstruction} steps but no step was measured.`);
  }

  // --- fittings ---
  const kinds = (liner.fittings ?? []).map((f) => f.kind);
  if (kinds.length === 0) {
    warnings.push(
      'No fittings recorded. Every skimmer, return, light and main drain needs a '
      + 'cut-out location.',
    );
  } else {
    if (!kinds.includes('skimmer')) warnings.push('No skimmer recorded. Confirm the pool has none.');
    if (!kinds.includes('main_drain')) {
      warnings.push('No main drain recorded. Confirm the pool has none.');
    }
  }

  // --- order completeness ---
  if (!(spec.measured_at_bead_receiver ?? true)) {
    blocking.push(
      'Perimeter was not measured at the bead receiver. A liner cut from a '
      + 'coping-edge walk will not fit.',
    );
  }
  if (!(spec.pattern_name ?? '').trim()) {
    blocking.push('Liner pattern is required on the order.');
  }

  const hydrostatic = assessHydrostaticRisk(
    spec.coping_type ?? 'concrete',
    liner.drainage_system ?? 'unknown',
    Math.trunc(liner.recent_rainfall_days ?? 0),
    Boolean(liner.hydrostatic_relief_valve),
  );

  return { ok: blocking.length === 0, blocking, warnings, checks, hydrostatic };
}
