/**
 * Tests for the client-side liner closure checks and takeoff.
 * Run with: node tests/linerValidation.test.js
 *
 * Mirrors backend/tests/test_liner_math.py. Case IDs (TC-00n) map back to the
 * validation matrix in docs/LINER-MEASURE-SPEC.md.
 */
import {
  CLOSURE_CLEAN_IN,
  MIN_PERIMETER_POINTS,
  PROFILE_TOLERANCE_IN,
  RISER_TOLERANCE_IN,
  assessHydrostaticRisk,
  checkHopperClosure,
  checkProfileClosure,
  checkProfileContinuity,
  checkRiserSum,
  closureStatus,
  computeTakeoff,
  profileTotals,
  requiresAbPlot,
  segmentDevelopedLengthFt,
  shallowWallHeightFt,
  stepSurfaceAreaSqft,
  validateLinerJob,
} from '../src/lib/utils/linerValidation.js';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) {
  if (a === b) pass++;
  else { fail++; fails.push(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}
function close(a, b, msg, tol = 1e-6) {
  if (Math.abs(a - b) <= tol) pass++;
  else { fail++; fails.push(`${msg}: expected ~${b}, got ${a}`); }
}

const seg = (order, kind, run, d0, d1) => ({
  order, kind, horizontal_run_ft: run, depth_start_ft: d0, depth_end_ft: d1,
});

const FLAT_THEN_SLOPE = [
  seg(1, 'shallow_floor', 12, 3.5, 3.5),
  seg(2, 'slope', 12, 3.5, 8),
  seg(3, 'deep_floor', 8, 8, 8),
];

// ---------- 1. Closure grading bands ----------
{
  eq(closureStatus(0, 2), 'pass', '1a: exact -> pass');
  eq(closureStatus(CLOSURE_CLEAN_IN, 2), 'pass', '1b: at tape precision -> pass');
  eq(closureStatus(0.26, 2), 'warn', '1c: past tape precision -> warn');
  eq(closureStatus(2, 2), 'warn', '1d: exactly at tolerance -> warn, not fail');
  eq(closureStatus(2.01, 2), 'fail', '1e: past tolerance -> fail');
  eq(closureStatus(-10, 2), 'fail', '1f: sign does not matter');
}

// ---------- 2. Profile closure (TC-003 / TC-004) ----------
{
  // 238in of profile against a 240in pool: 2in out, within tolerance.
  const r = checkProfileClosure([seg(1, 'shallow_floor', 238 / 12, 3.5, 3.5)], 240 / 12);
  eq(r.status, 'warn', '2a: TC-003 238in vs 240in -> warn');
  close(r.differenceIn, -2, '2a: difference is -2in');
}
{
  const r = checkProfileClosure([seg(1, 'shallow_floor', 230 / 12, 3.5, 3.5)], 240 / 12);
  eq(r.status, 'fail', '2b: TC-004 230in vs 240in -> fail');
  ok(r.message.includes('Re-tape'), '2b: message tells the tech to re-tape');
}
{
  const r = checkProfileClosure(FLAT_THEN_SLOPE, 32);
  eq(r.status, 'pass', '2c: 12+12+8 closes on 32ft');
  close(r.measuredFt, 32, '2c: measured 32ft');
}
{
  const r = checkProfileClosure([], 32);
  eq(r.status, 'fail', '2d: no profile at all -> fail');
  ok(r.message.includes('required'), '2d: says the section is required');
}

// ---------- 3. Developed length ----------
{
  close(segmentDevelopedLengthFt(12, 0), 12, '3a: flat run is its own length');
  close(segmentDevelopedLengthFt(12, 5), 13, '3b: 5-12-13 triangle');

  const { planFt, developedFt } = profileTotals(FLAT_THEN_SLOPE);
  close(planFt, 32, '3c: plan total is 32ft');
  ok(developedFt > planFt, '3d: developed exceeds plan on a sloping floor');
  close(developedFt, 12 + Math.hypot(12, 4.5) + 8, '3e: developed is 12 + hypot(12,4.5) + 8');
}

// ---------- 4. Profile continuity ----------
{
  const broken = [seg(1, 'shallow_floor', 12, 3.5, 3.5), seg(2, 'slope', 12, 5, 8)];
  const problems = checkProfileContinuity(broken);
  eq(problems.length, 1, '4a: a 1.5ft gap is caught');
  ok(problems[0].includes('Profile gap'), '4a: message names the gap');
  eq(checkProfileContinuity(FLAT_THEN_SLOPE).length, 0, '4b: a closed section has no gaps');
}

// ---------- 5. Riser closure ----------
{
  const risers = [
    { riser_height_ft: 1.25 }, { riser_height_ft: 1.25 }, { riser_height_ft: 1.0 },
  ];
  eq(checkRiserSum(risers, 3.5).status, 'pass', '5a: risers closing on the wall height pass');
}
{
  // 1in over. On the floor that would warn; on a riser stack it blocks.
  const risers = [
    { riser_height_ft: 1.25 }, { riser_height_ft: 1.25 }, { riser_height_ft: 1.0833 },
  ];
  const r = checkRiserSum(risers, 3.5);
  eq(r.status, 'fail', '5b: 1in of riser error blocks');
  eq(r.toleranceIn, RISER_TOLERANCE_IN, '5b: uses the half-inch tolerance');
  eq(closureStatus(1, PROFILE_TOLERANCE_IN), 'warn', '5b: the same 1in on the floor only warns');
}
{
  const r = checkRiserSum([], 3.5);
  eq(r.status, 'fail', '5c: a vinyl-over step with no risers fails');
  ok(r.message.includes('no riser heights'), '5c: message says why');
}

// ---------- 6. Hopper closure ----------
{
  const hopper = { left_slope_width_ft: 5, bottom_width_ft: 8, right_slope_width_ft: 5 };
  eq(checkHopperClosure(hopper, 18).status, 'pass', '6a: 5+8+5 spans an 18ft width');
}
{
  const hopper = { left_slope_width_ft: 5, bottom_width_ft: 6, right_slope_width_ft: 5 };
  const r = checkHopperClosure(hopper, 18);
  eq(r.status, 'fail', '6b: 2ft short of the width fails');
  close(r.differenceIn, -24, '6b: 24in short');
}
{
  eq(checkHopperClosure(null, 18), null, '6c: no hopper is not a check');
}

// ---------- 7. Hydrostatic risk ----------
{
  eq(assessHydrostaticRisk('concrete', 'french_drain', 3).severity, 'high', '7a: recent rain -> high');
  eq(assessHydrostaticRisk('stone', 'none', 0).severity, 'medium', '7b: stone + no drainage -> medium');
  eq(assessHydrostaticRisk('concrete', 'french_drain', 0, true).severity, 'low', '7c: drained + valve -> low');
  eq(assessHydrostaticRisk('concrete', 'french_drain', 5, true).severity, 'high',
    '7d: rain outranks a well-drained site');
  eq(assessHydrostaticRisk('concrete', 'unknown', 0, true).severity, 'medium',
    '7e: unknown drainage -> medium');
}

// ---------- 8. Takeoff ----------
{
  const t = computeTakeoff({
    perimeterFt: 100, planAreaSqft: 576, reconstructedLengthFt: 32,
    wallHeightsFt: [3.5, 3.5, 3.5, 3.5], segments: FLAT_THEN_SLOPE, wasteFactorPct: 0,
  });
  close(t.wallAreaSqft, 350, '8a: 100ft perimeter x 3.5ft wall = 350 sq ft');
  ok(t.floorDevelopedAreaSqft > t.floorPlanAreaSqft, '8b: slope stretches the floor');
  close(t.floorDevelopedAreaSqft, 576 * (t.floorDevelopedLengthFt / t.floorPlanLengthFt),
    '8c: floor scales by the stretch factor');
  close(t.totalMaterialSqft, t.subtotalSqft, '8d: zero waste factor adds nothing');
}
{
  const t = computeTakeoff({
    perimeterFt: 100, planAreaSqft: 576, reconstructedLengthFt: 32,
    wallHeightsFt: [3.5], segments: FLAT_THEN_SLOPE, wasteFactorPct: 10,
  });
  close(t.totalMaterialSqft, t.subtotalSqft * 1.1, '8e: waste factor applies to the sum', 1e-9);
}
{
  const t = computeTakeoff({
    perimeterFt: 100, planAreaSqft: 576, reconstructedLengthFt: 32,
    wallHeightsFt: [4], segments: [seg(1, 'shallow_floor', 32, 4, 4)], wasteFactorPct: 0,
  });
  close(t.floorDevelopedAreaSqft, 576, '8f: a flat floor needs no stretch');
}

// ---------- 9. Step area ----------
{
  const fiberglass = {
    construction: 'fiberglass_standard', width_ft: 8, risers: [{ riser_height_ft: 1.2 }],
  };
  eq(stepSurfaceAreaSqft(fiberglass), 0, '9a: the liner terminates at a fiberglass step');
}
{
  const step = {
    construction: 'vinyl_over_standard', width_ft: 8,
    risers: [
      { riser_height_ft: 1, tread_depth_ft: 1 },
      { riser_height_ft: 1, tread_depth_ft: 1 },
    ],
  };
  close(stepSurfaceAreaSqft(step), 32, '9b: 8ft x (2 risers + 2 treads) = 32 sq ft');

  const complex = { ...step, construction: 'vinyl_over_complex' };
  ok(stepSurfaceAreaSqft(complex) > stepSurfaceAreaSqft(step),
    '9c: a complex step carries a turning allowance');
}

// ---------- 10. Shape catalog ----------
{
  for (const s of ['kidney', 'freeform', 'figure_8', 'mountain_lake_left', 'odessy_right']) {
    ok(requiresAbPlot(s), `10a: ${s} is ordered from the A/B plot`);
  }
  for (const s of ['rectangle', 'grecian', 'true_l_left', 'roman_end', 'oval', 'octagon']) {
    ok(!requiresAbPlot(s), `10b: ${s} is ordered from a lettered form`);
  }
}

// ---------- 11. Shallow wall height resolution ----------
{
  const walls = [{ label: 'north_wall', height_ft: 4 }, { label: 'shallow_end', height_ft: 3.5 }];
  close(shallowWallHeightFt(walls, FLAT_THEN_SLOPE, 9), 3.5, '11a: a labelled shallow wall wins');
  close(shallowWallHeightFt([], FLAT_THEN_SLOPE, 9), 3.5, '11b: falls back to the shallow floor run');
  close(shallowWallHeightFt([], [], 3.25), 3.25, '11c: falls back to the recorded shallow depth');
}

// ---------- 12. Whole-job validation ----------
const RECON = { lengthFt: 32, widthFt: 18, perimeterFt: 100, areaSqft: 576, invalidReasons: [] };

function validJob(overrides = {}) {
  const liner = {
    shape: 'rectangle',
    wall_heights: [{ label: 'shallow_end', height_ft: 3.5 }],
    profile_segments: FLAT_THEN_SLOPE,
    hopper: { left_slope_width_ft: 5, bottom_width_ft: 8, right_slope_width_ft: 5 },
    steps: [],
    fittings: [{ kind: 'skimmer', near_point: 3 }, { kind: 'main_drain', near_point: 10 }],
    drainage_system: 'french_drain',
    hydrostatic_relief_valve: true,
    recent_rainfall_days: 0,
    ...(overrides.liner || {}),
  };
  return {
    product_type: 'liner',
    measurement: {
      perimeter_points: Array.from({ length: 20 }, (_, i) => ({ number: i + 1 })),
      shallow_depth_ft: 3.5,
      deep_depth_ft: 8,
      liner,
      ...(overrides.measurement || {}),
    },
    liner_spec: {
      pattern_name: 'Sandstone',
      bead_type: 'standard_bead',
      coping_type: 'concrete',
      step_construction: 'none',
      measured_at_bead_receiver: true,
      ...(overrides.liner_spec || {}),
    },
  };
}

{
  const v = validateLinerJob(validJob(), RECON);
  ok(v.ok, `12a: a complete job passes (${v.blocking.join('; ')})`);
  eq(v.hydrostatic.severity, 'low', '12a: well-drained site is low risk');
  eq(v.checks.length, 2, '12a: profile + hopper checks reported');
}
{
  const v = validateLinerJob(validJob({ liner_spec: { pattern_name: '  ' } }), RECON);
  ok(!v.ok, '12b: TC-005 missing pattern blocks');
  ok(v.blocking.some((b) => b.includes('pattern is required')), '12b: names the missing field');
}
{
  const v = validateLinerJob(
    validJob({ liner_spec: { measured_at_bead_receiver: false } }), RECON,
  );
  ok(!v.ok, '12c: a coping-edge walk blocks');
  ok(v.blocking.some((b) => b.includes('bead receiver')), '12c: says why');
}
{
  const v = validateLinerJob(validJob({ liner: { wall_heights: [] } }), RECON);
  ok(!v.ok, '12d: no wall heights blocks');
}
{
  // TC-008: a thin plot blocks an organic shape but only warns on a standard one.
  const thin = { measurement: { perimeter_points: [{ number: 1 }, { number: 2 }] } };
  const organic = validateLinerJob(
    validJob({ ...thin, liner: { shape: 'kidney' } }), RECON,
  );
  ok(!organic.ok, '12e: TC-008 thin plot blocks a kidney');
  ok(organic.blocking.some((b) => b.includes('triangulation plot')), '12e: names the plot');

  const standard = validateLinerJob(validJob({ ...thin, liner: { shape: 'rectangle' } }), RECON);
  ok(standard.ok, `12f: TC-008 thin plot only warns on a rectangle (${standard.blocking.join('; ')})`);
  ok(standard.warnings.some((w) => w.includes('standard shape')), '12f: explains the difference');
  ok(MIN_PERIMETER_POINTS === 8, '12f: trade minimum is 8 points');
}
{
  const step = {
    construction: 'vinyl_over_standard',
    width_ft: 8,
    risers: [
      { riser_height_ft: 1.25 }, { riser_height_ft: 1.25 }, { riser_height_ft: 1.0 },
    ],
  };
  const v = validateLinerJob(validJob({ liner: { steps: [step] } }), RECON);
  ok(!v.ok, '12g: a vinyl-over step with no corner type blocks');
  ok(v.blocking.some((b) => b.includes('corner type')), '12g: names the corner type');

  const fixed = validateLinerJob(
    validJob({ liner: { steps: [{ ...step, corner_type: 'radius' }] } }), RECON,
  );
  ok(fixed.ok, `12h: adding the corner type clears it (${fixed.blocking.join('; ')})`);
  eq(fixed.checks.length, 3, '12h: the riser check joins the report');
}
{
  const v = validateLinerJob(
    validJob({ liner_spec: { step_construction: 'vinyl_over_standard' } }), RECON,
  );
  ok(!v.ok, '12i: spec orders vinyl-over steps but none were measured');
}
{
  const v = validateLinerJob(validJob({ liner: { hopper: null } }), RECON);
  ok(v.ok, '12j: a missing hopper cross-section does not block');
  ok(v.warnings.some((w) => w.includes('hopper cross-section')), '12j: but it warns');
}
{
  const v = validateLinerJob(validJob({ liner: { fittings: [] } }), RECON);
  ok(v.ok, '12k: missing fittings do not block');
  ok(v.warnings.some((w) => w.includes('No fittings recorded')), '12k: but they warn');
}
{
  const v = validateLinerJob({ measurement: {} }, RECON);
  ok(!v.ok, '12l: a liner job with no liner capture blocks');
}
{
  const broken = { ...RECON, invalidReasons: ['Point #4: tapes too short to reach'] };
  const v = validateLinerJob(validJob(), broken);
  ok(!v.ok, '12m: an unreconstructable perimeter blocks');
  ok(v.blocking.some((b) => b.startsWith('Perimeter:')), '12m: attributed to the perimeter');
}
{
  const v = validateLinerJob(
    validJob({ measurement: { deep_depth_ft: 3, shallow_depth_ft: 8 } }), RECON,
  );
  ok(v.warnings.some((w) => w.includes('not swapped')), '12n: inverted depths warn');
}

// ---------- report ----------
console.log(`\nLiner validation tests: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log(`  FAIL: ${f}`);
  process.exit(1);
}
