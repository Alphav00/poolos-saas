/**
 * JavaScript port of the vinyl liner closure checks and material takeoff.
 *
 * Mirrors `backend/app/services/liner_math.py`. The two implementations are
 * verified to agree on the liner fixtures (see tests/liner_parity.test.js).
 *
 * The port exists because these checks have to run while the tech is standing
 * at the pool with the tape still in hand — that is the only moment re-taping
 * a run is cheap. Waiting for a round trip (or for signal at all) moves the
 * catch to the office, where the fix is a second site visit.
 *
 * Everything is decimal feet, except tolerances and reported differences,
 * which are inches because that is how the field forms state them.
 */

// ---------- tolerances (inches) ----------

export const PROFILE_TOLERANCE_IN = 2.0;
export const RISER_TOLERANCE_IN = 0.5;
export const PROFILE_CONTINUITY_TOLERANCE_IN = 1.0;
export const WALL_SPREAD_WARN_IN = 3.0;
export const CLOSURE_CLEAN_IN = 0.25;
export const MIN_PERIMETER_POINTS = 8;

const IN_PER_FT = 12;
const BAND_EPSILON_IN = 1e-9;

/** Shapes ordered from an A/B triangulation plot rather than a lettered form. */
export const AB_PLOT_SHAPES = new Set([
  'kidney', 'figure_8', 'mountain_lake_left', 'mountain_lake_right',
  'odessy_left', 'odessy_right', 'freeform',
]);

export function requiresAbPlot(shape) {
  return AB_PLOT_SHAPES.has(shape);
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Grade a closure difference into pass / warn / fail.
 *
 * Three bands, not two: inside tape precision it closed, inside tolerance it
 * is worth showing while the tech can still re-tape, beyond tolerance it is
 * refused. Both boundaries are inclusive.
 */
export function closureStatus(differenceIn, toleranceIn) {
  const magnitude = Math.abs(differenceIn);
  if (magnitude > toleranceIn + BAND_EPSILON_IN) return 'fail';
  if (magnitude <= CLOSURE_CLEAN_IN + BAND_EPSILON_IN) return 'pass';
  return 'warn';
}

// ---------- profile geometry ----------

/** Slant length of one run. Flat runs return their own length. */
export function segmentDevelopedLengthFt(horizontalRunFt, depthDropFt) {
  return Math.hypot(Math.abs(horizontalRunFt), Math.abs(depthDropFt));
}

/** @returns {{planFt: number, developedFt: number}} totals over the profile. */
export function profileTotals(segments) {
  let planFt = 0;
  let developedFt = 0;
  for (const s of segments || []) {
    const run = num(s.horizontal_run_ft);
    const drop = num(s.depth_end_ft) - num(s.depth_start_ft);
    planFt += run;
    developedFt += segmentDevelopedLengthFt(run, drop);
  }
  return { planFt, developedFt };
}

/**
 * The profile's plan-view runs must add up to the reconstructed pool length.
 * This is E + N + M + L = B on the supplier forms.
 */
export function checkProfileClosure(segments, poolLengthFt, toleranceIn = PROFILE_TOLERANCE_IN) {
  const list = segments || [];
  const { planFt } = profileTotals(list);
  const differenceIn = (planFt - poolLengthFt) * IN_PER_FT;

  if (list.length === 0) {
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

  const status = closureStatus(differenceIn, toleranceIn);
  let message;
  if (status === 'fail') {
    message = `Profile runs total ${planFt.toFixed(2)} ft but the perimeter walk reconstructs a `
      + `${poolLengthFt.toFixed(2)} ft pool — off by ${Math.abs(differenceIn).toFixed(1)}" `
      + `(tolerance ±${toleranceIn.toFixed(1)}"). Re-tape the floor section.`;
  } else if (status === 'pass') {
    message = `Profile closes on ${poolLengthFt.toFixed(2)} ft.`;
  } else {
    message = `Profile closes within tolerance: off by ${Math.abs(differenceIn).toFixed(1)}" `
      + `(tolerance ±${toleranceIn.toFixed(1)}").`;
  }

  return {
    name: 'profile_closure',
    measuredFt: planFt,
    expectedFt: poolLengthFt,
    differenceIn,
    toleranceIn,
    status,
    message,
  };
}

/** Each run has to start where the previous one ended. @returns {string[]} */
export function checkProfileContinuity(segments, toleranceIn = PROFILE_CONTINUITY_TOLERANCE_IN) {
  const ordered = [...(segments || [])].sort((a, b) => num(a.order) - num(b.order));
  const problems = [];
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const cur = ordered[i];
    const gapIn = (num(cur.depth_start_ft) - num(prev.depth_end_ft)) * IN_PER_FT;
    if (Math.abs(gapIn) > toleranceIn) {
      problems.push(
        `Profile gap between run #${num(prev.order)} (${prev.kind}) and run #${num(cur.order)} `
        + `(${cur.kind}): ends at ${num(prev.depth_end_ft).toFixed(2)} ft deep, next starts at `
        + `${num(cur.depth_start_ft).toFixed(2)} ft — ${Math.abs(gapIn).toFixed(1)}" apart.`,
      );
    }
  }
  return problems;
}

/** The hopper cross-section must span the pool width (G + H + I = width). */
export function checkHopperClosure(hopper, poolWidthFt, toleranceIn = PROFILE_TOLERANCE_IN) {
  if (!hopper) return null;

  const left = num(hopper.left_slope_width_ft);
  const bottom = num(hopper.bottom_width_ft);
  const right = num(hopper.right_slope_width_ft);
  const measuredFt = left + bottom + right;
  const differenceIn = (measuredFt - poolWidthFt) * IN_PER_FT;
  const status = closureStatus(differenceIn, toleranceIn);

  let message;
  if (status === 'fail') {
    message = `Hopper cross-section totals ${measuredFt.toFixed(2)} ft `
      + `(${left.toFixed(2)} + ${bottom.toFixed(2)} + ${right.toFixed(2)}) but the pool is `
      + `${poolWidthFt.toFixed(2)} ft wide — off by ${Math.abs(differenceIn).toFixed(1)}" `
      + `(tolerance ±${toleranceIn.toFixed(1)}"). Re-tape the hopper.`;
  } else if (status === 'pass') {
    message = `Hopper spans the ${poolWidthFt.toFixed(2)} ft width.`;
  } else {
    message = `Hopper closes within tolerance: off by ${Math.abs(differenceIn).toFixed(1)}" `
      + `(tolerance ±${toleranceIn.toFixed(1)}").`;
  }

  return {
    name: 'hopper_closure',
    measuredFt, expectedFt: poolWidthFt, differenceIn, toleranceIn, status, message,
  };
}

/**
 * A vinyl-over step's risers must add up to the shallow-end wall height: the
 * riser stack and the shallow wall describe the same vertical drop.
 */
export function checkRiserSum(
  risers, shallowWallHeightFt, toleranceIn = RISER_TOLERANCE_IN, stepLabel = 'step',
) {
  const heights = (risers || []).map((r) => num(r.riser_height_ft));
  const measuredFt = heights.reduce((a, b) => a + b, 0);
  const differenceIn = (measuredFt - shallowWallHeightFt) * IN_PER_FT;
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

  const status = closureStatus(differenceIn, toleranceIn);
  let message;
  if (status === 'fail') {
    message = `${stepLabel}: risers total ${measuredFt.toFixed(2)} ft but the shallow wall is `
      + `${shallowWallHeightFt.toFixed(2)} ft — off by ${Math.abs(differenceIn).toFixed(1)}" `
      + `(tolerance ±${toleranceIn.toFixed(1)}"). Re-measure the risers.`;
  } else if (status === 'pass') {
    message = `${stepLabel}: ${heights.length} risers close on the shallow wall height.`;
  } else {
    message = `${stepLabel}: risers close within tolerance, off by `
      + `${Math.abs(differenceIn).toFixed(1)}" (tolerance ±${toleranceIn.toFixed(1)}").`;
  }

  return { name, measuredFt, expectedFt: shallowWallHeightFt, differenceIn, toleranceIn, status, message };
}

// ---------- hydrostatic risk ----------

/**
 * Groundwater risk for draining the pool. Advisory — it never blocks the
 * order, it says when not to pull the water yet.
 */
export function assessHydrostaticRisk(
  copingType, drainageSystem, recentRainfallDays, hydrostaticReliefValve = false,
) {
  const notes = [];
  let severity = 'low';

  if (num(recentRainfallDays) >= 3) {
    severity = 'high';
    notes.push(
      `${num(recentRainfallDays)} consecutive days of recent rain. Postpone draining `
      + 'until the water table drops.',
    );
  }

  if (drainageSystem === 'none') {
    if (copingType === 'stone') {
      notes.push('Stone coping with no drainage system — monitor groundwater throughout the install.');
      if (severity === 'low') severity = 'medium';
    }
    if (!hydrostaticReliefValve) {
      notes.push(
        'No drainage system and no hydrostatic relief valve. There is no path for '
        + 'groundwater pressure to escape while the pool is empty.',
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

// ---------- material takeoff ----------

const VINYL_OVER = new Set(['vinyl_over_standard', 'vinyl_over_complex']);

/** Vinyl surface a step consumes: every riser face plus every tread. */
export function stepSurfaceAreaSqft(step) {
  if (!step || !VINYL_OVER.has(step.construction)) return 0;
  if (step.width_ft === null || step.width_ft === undefined || step.width_ft === '') return 0;

  const width = num(step.width_ft);
  let run = 0;
  for (const r of step.risers || []) {
    run += num(r.riser_height_ft);
    if (r.tread_depth_ft !== null && r.tread_depth_ft !== undefined && r.tread_depth_ft !== '') {
      run += num(r.tread_depth_ft);
    }
  }

  let area = width * run;
  if (step.construction === 'vinyl_over_complex') area *= 1.15;
  return area;
}

/**
 * Material takeoff for one liner.
 *
 * The floor is the plan-view area scaled by how much the slope stretches it.
 * That is exact for a floor sloping along a single axis, which covers the
 * shallow-slope-hopper section of a conventional pool.
 */
export function computeTakeoff({
  perimeterFt, planAreaSqft, reconstructedLengthFt,
  wallHeightsFt = [], segments = [], steps = [], wasteFactorPct = 10,
}) {
  const { planFt, developedFt } = profileTotals(segments);

  const heights = wallHeightsFt.map(num).filter((h) => h > 0);
  const avgH = heights.length ? heights.reduce((a, b) => a + b, 0) / heights.length : 0;
  const maxH = heights.length ? Math.max(...heights) : 0;

  const wallAreaSqft = perimeterFt * avgH;

  const stretch = planFt > 1e-9 ? developedFt / planFt : 1;
  const floorPlanLengthFt = planFt > 1e-9 ? planFt : reconstructedLengthFt;
  const floorDevelopedAreaSqft = planAreaSqft * stretch;

  const stepAreaSqft = (steps || []).reduce((sum, s) => sum + stepSurfaceAreaSqft(s), 0);

  const subtotalSqft = wallAreaSqft + floorDevelopedAreaSqft + stepAreaSqft;
  const totalMaterialSqft = subtotalSqft * (1 + num(wasteFactorPct) / 100);

  return {
    perimeterFt,
    wallHeightAvgFt: avgH,
    wallHeightMaxFt: maxH,
    wallAreaSqft,
    floorPlanLengthFt,
    floorDevelopedLengthFt: segments.length ? developedFt : reconstructedLengthFt,
    floorPlanAreaSqft: planAreaSqft,
    floorDevelopedAreaSqft,
    stepAreaSqft,
    subtotalSqft,
    wasteFactorPct: num(wasteFactorPct),
    totalMaterialSqft,
  };
}

// ---------- whole-job validation ----------

/**
 * The shallow-end wall height that riser stacks are checked against.
 *
 * Preference order: a wall height labelled for the shallow end, then the
 * shallow floor run's depth, then the job's recorded shallow depth. The label
 * match is deliberate — techs write "shallow" on that reading precisely
 * because it is the one the steps land on.
 */
export function shallowWallHeightFt(wallHeights, segments, shallowDepthFt) {
  for (const w of wallHeights || []) {
    if (String(w.label || '').toLowerCase().includes('shallow')) return num(w.height_ft);
  }
  for (const s of segments || []) {
    if (s.kind === 'shallow_floor' && num(s.depth_start_ft) > 0) return num(s.depth_start_ft);
  }
  return num(shallowDepthFt);
}

/**
 * Decide whether a liner job may go to the fabricator.
 *
 * @param {object} job - the in-progress job (same shape the store holds)
 * @param {object} reconstruction - {lengthFt, widthFt, perimeterFt, areaSqft, invalidReasons}
 * @returns {{ok, blocking: string[], warnings: string[], checks: object[], hydrostatic}}
 */
export function validateLinerJob(job, reconstruction) {
  const blocking = [];
  const warnings = [];
  const checks = [];

  const m = job?.measurement || {};
  const liner = m.liner;
  const spec = job?.liner_spec || {};

  if (!liner) {
    return {
      ok: false,
      blocking: ['No liner measurements captured for a liner job.'],
      warnings: [],
      checks: [],
      hydrostatic: null,
    };
  }

  const lengthFt = num(reconstruction?.lengthFt);
  const widthFt = num(reconstruction?.widthFt);

  for (const reason of reconstruction?.invalidReasons || []) {
    blocking.push(`Perimeter: ${reason}`);
  }

  const pointCount = (m.perimeter_points || []).length;
  const shape = liner.shape || 'freeform';
  const needsPlot = requiresAbPlot(shape);
  if (pointCount < MIN_PERIMETER_POINTS) {
    if (needsPlot) {
      blocking.push(
        `${shape} is ordered from an A/B triangulation plot, but only ${pointCount} perimeter `
        + `points were taken. The supplier form needs at least ${MIN_PERIMETER_POINTS}, and more `
        + 'on every curve.',
      );
    } else {
      warnings.push(
        `Only ${pointCount} perimeter points. ${shape} is a standard shape ordered from lettered `
        + 'dimensions, so the plot is supporting evidence rather than the order itself — but the '
        + `trade minimum is still ${MIN_PERIMETER_POINTS}.`,
      );
    }
  }

  const wallHeights = liner.wall_heights || [];
  const heights = wallHeights.map((w) => num(w.height_ft));
  if (heights.length === 0) {
    blocking.push('No wall heights recorded. The liner wall panel cannot be cut without them.');
  } else {
    const spreadIn = (Math.max(...heights) - Math.min(...heights)) * IN_PER_FT;
    if (spreadIn > WALL_SPREAD_WARN_IN) {
      warnings.push(
        `Wall heights vary by ${spreadIn.toFixed(1)}" across the pool `
        + `(${Math.min(...heights).toFixed(2)}–${Math.max(...heights).toFixed(2)} ft). `
        + 'Confirm the wall is stepped and not a mis-read.',
      );
    }
  }

  const segments = liner.profile_segments || [];
  const closure = checkProfileClosure(segments, lengthFt);
  checks.push(closure);
  if (closure.status === 'fail') blocking.push(closure.message);
  else if (closure.status === 'warn') warnings.push(closure.message);

  for (const problem of checkProfileContinuity(segments)) blocking.push(problem);

  const hopperCheck = checkHopperClosure(liner.hopper, widthFt);
  if (hopperCheck) {
    checks.push(hopperCheck);
    if (hopperCheck.status === 'fail') blocking.push(hopperCheck.message);
    else if (hopperCheck.status === 'warn') warnings.push(hopperCheck.message);
  } else if (segments.some((s) => s.kind === 'deep_floor')) {
    warnings.push(
      'Profile has a hopper bottom but no hopper cross-section was measured. '
      + 'The fabricator needs the side slopes and bottom width.',
    );
  }

  const deepDepth = num(m.deep_depth_ft);
  const shallowDepth = num(m.shallow_depth_ft);
  if (segments.length) {
    const deepest = Math.max(
      ...segments.map((s) => Math.max(num(s.depth_start_ft), num(s.depth_end_ft))),
    );
    if (deepDepth > 0 && Math.abs(deepest - deepDepth) * IN_PER_FT > PROFILE_TOLERANCE_IN) {
      warnings.push(
        `Profile bottoms out at ${deepest.toFixed(2)} ft but the job records a `
        + `${deepDepth.toFixed(2)} ft deep end. Confirm which is right.`,
      );
    }
  }
  if (deepDepth > 0 && shallowDepth > 0 && deepDepth < shallowDepth) {
    warnings.push(
      `Deep depth (${deepDepth.toFixed(2)} ft) is shallower than the shallow depth `
      + `(${shallowDepth.toFixed(2)} ft). Check the two are not swapped.`,
    );
  }

  const steps = liner.steps || [];
  const shallowWall = shallowWallHeightFt(wallHeights, segments, shallowDepth);
  steps.forEach((st, i) => {
    const label = `Step ${i + 1} (${st.construction})`;
    if (!VINYL_OVER.has(st.construction)) return;

    const result = checkRiserSum(st.risers, shallowWall, RISER_TOLERANCE_IN, label);
    checks.push(result);
    if (result.status === 'fail') blocking.push(result.message);
    else if (result.status === 'warn') warnings.push(result.message);

    if (st.width_ft === null || st.width_ft === undefined || st.width_ft === '') {
      blocking.push(`${label}: width is required to cut vinyl over the step.`);
    }
    if (!st.corner_type) {
      blocking.push(
        `${label}: back-corner type (90°, radius or diagonal) is required. `
        + 'Each cuts to a different pattern.',
      );
    }
  });

  if (VINYL_OVER.has(spec.step_construction) && steps.length === 0) {
    blocking.push(`Liner spec orders ${spec.step_construction} steps but no step was measured.`);
  }

  const fittings = liner.fittings || [];
  const kinds = fittings.map((f) => f.kind);
  if (kinds.length === 0) {
    warnings.push(
      'No fittings recorded. Every skimmer, return, light and main drain needs a cut-out location.',
    );
  } else {
    if (!kinds.includes('skimmer')) warnings.push('No skimmer recorded. Confirm the pool has none.');
    if (!kinds.includes('main_drain')) warnings.push('No main drain recorded. Confirm the pool has none.');
  }

  if (spec.measured_at_bead_receiver === false) {
    blocking.push(
      'Perimeter was not measured at the bead receiver. A liner cut from a coping-edge '
      + 'walk will not fit.',
    );
  }
  if (!String(spec.pattern_name || '').trim()) {
    blocking.push('Liner pattern is required on the order.');
  }

  const hydrostatic = assessHydrostaticRisk(
    spec.coping_type,
    liner.drainage_system,
    liner.recent_rainfall_days,
    Boolean(liner.hydrostatic_relief_valve),
  );

  return { ok: blocking.length === 0, blocking, warnings, checks, hydrostatic };
}
