/**
 * Liner closure checks, hydrostatic risk, shape catalog and whole-job
 * validation.
 *
 * Part 1 ports backend/tests/test_liner_math.py (minus the takeoff / step-area
 * / fixture end-to-end cases, which live in takeoff.test.ts). Part 2 ports
 * frontend/tests/linerValidation.test.js (same split). Case IDs (TC-00n) map
 * to the validation matrix in docs/LINER-MEASURE-SPEC.md.
 */
import { describe, expect, it } from 'vitest';
import {
  CLOSURE_CLEAN_IN,
  FIXTURES,
  LINER_SHAPES,
  MIN_PERIMETER_POINTS,
  PROFILE_TOLERANCE_IN,
  RISER_TOLERANCE_IN,
  assessHydrostaticRisk,
  checkHopperClosure,
  checkProfileClosure,
  checkProfileContinuity,
  checkRiserSum,
  closureStatus,
  profileTotals,
  rawReconstruction,
  requiresAbPlot,
  segmentDevelopedLengthFt,
  shallowWallHeightFt,
  validateJob,
  validateLinerJob,
} from '../src';
import type {
  LinerMeasurement,
  LinerShape,
  LinerSpec,
  LinerStep,
  ProfileSegment,
  ProfileSegmentKind,
  ReconstructionResult,
} from '../src';
import { approx } from './helpers';

const seg = (
  order: number, kind: ProfileSegmentKind, run: number, d0: number, d1: number,
): ProfileSegment => ({
  order, kind, horizontal_run_ft: run, depth_start_ft: d0, depth_end_ft: d1,
});

const FLAT_THEN_SLOPE: ProfileSegment[] = [
  seg(1, 'shallow_floor', 12, 3.5, 3.5),
  seg(2, 'slope', 12, 3.5, 8),
  seg(3, 'deep_floor', 8, 8, 8),
];

// =====================================================================
// backend/tests/test_liner_math.py
// =====================================================================

describe('test_liner_math.py: closure grading bands', () => {
  it('test_closure_status_three_bands', () => {
    expect(closureStatus(0.0, 2.0)).toBe('pass');
    expect(closureStatus(0.25, 2.0)).toBe('pass');
    expect(closureStatus(0.26, 2.0)).toBe('warn');
    expect(closureStatus(2.0, 2.0)).toBe('warn');
    expect(closureStatus(2.01, 2.0)).toBe('fail');
    // Sign does not matter — short and long are equally wrong.
    expect(closureStatus(-10.0, 2.0)).toBe('fail');
  });
});

describe('test_liner_math.py: profile closure (TC-003 / TC-004)', () => {
  it('test_tc003_profile_within_tolerance_warns', () => {
    const result = checkProfileClosure([seg(1, 'shallow_floor', 238 / 12.0, 3.5, 3.5)], 240 / 12.0);
    expect(result.status).toBe('warn');
    expect(Math.abs(result.differenceIn - -2.0)).toBeLessThan(1e-6);
  });

  it('test_tc004_profile_outside_tolerance_fails', () => {
    const result = checkProfileClosure([seg(1, 'shallow_floor', 230 / 12.0, 3.5, 3.5)], 240 / 12.0);
    expect(result.status).toBe('fail');
    expect(result.message).toContain('Re-tape');
  });

  it('test_profile_closure_exact_passes', () => {
    const result = checkProfileClosure(FLAT_THEN_SLOPE, 32.0);
    expect(result.status).toBe('pass');
    expect(approx(result.measuredFt, 32.0)).toBe(true);
  });

  it('test_missing_profile_fails', () => {
    const result = checkProfileClosure([], 32.0);
    expect(result.status).toBe('fail');
    expect(result.message).toContain('required');
  });
});

describe('test_liner_math.py: developed length', () => {
  it('test_developed_length_of_flat_run_is_its_own_length', () => {
    expect(approx(segmentDevelopedLengthFt(12.0, 0.0), 12.0)).toBe(true);
  });

  it('test_developed_length_of_slope_is_the_hypotenuse', () => {
    expect(approx(segmentDevelopedLengthFt(12.0, 5.0), 13.0)).toBe(true);
  });

  it('test_developed_length_exceeds_plan_length_on_a_sloping_floor', () => {
    const { planFt, developedFt } = profileTotals(FLAT_THEN_SLOPE);
    expect(approx(planFt, 32.0)).toBe(true);
    expect(developedFt).toBeGreaterThan(planFt);
    expect(approx(developedFt, 12.0 + (12.0 ** 2 + 4.5 ** 2) ** 0.5 + 8.0)).toBe(true);
  });

  it('test_profile_continuity_catches_a_gap', () => {
    const broken = [seg(1, 'shallow_floor', 12, 3.5, 3.5), seg(2, 'slope', 12, 5.0, 8)];
    const problems = checkProfileContinuity(broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Profile gap');
  });

  it('test_profile_continuity_accepts_a_closed_section', () => {
    expect(checkProfileContinuity(FLAT_THEN_SLOPE)).toEqual([]);
  });
});

describe('test_liner_math.py: riser closure', () => {
  it('test_riser_sum_matching_wall_height_passes', () => {
    const risers = [
      { index: 1, riser_height_ft: 1.25 },
      { index: 2, riser_height_ft: 1.25 },
      { index: 3, riser_height_ft: 1.0 },
    ];
    expect(checkRiserSum(risers, 3.5).status).toBe('pass');
  });

  it('test_riser_sum_uses_the_tighter_half_inch_tolerance', () => {
    const risers = [
      { index: 1, riser_height_ft: '1.25' },
      { index: 2, riser_height_ft: '1.25' },
      { index: 3, riser_height_ft: '1.0833' }, // 1in tall
    ];
    const result = checkRiserSum(risers, 3.5);
    expect(result.status).toBe('fail');
    expect(approx(result.toleranceIn, RISER_TOLERANCE_IN)).toBe(true);
    // The same 1in on the floor section is only a warning.
    expect(closureStatus(1.0, PROFILE_TOLERANCE_IN)).toBe('warn');
  });

  it('test_vinyl_over_step_with_no_risers_fails', () => {
    const result = checkRiserSum([], 3.5);
    expect(result.status).toBe('fail');
    expect(result.message).toContain('no riser heights');
  });
});

describe('test_liner_math.py: hopper closure', () => {
  it('test_hopper_closure_spans_the_width', () => {
    const result = checkHopperClosure(
      { left_slope_width_ft: '5', bottom_width_ft: '8', right_slope_width_ft: '5' }, 18.0,
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe('pass');
  });

  it('test_hopper_closure_fails_when_it_does_not_span', () => {
    const result = checkHopperClosure(
      { left_slope_width_ft: '5', bottom_width_ft: '6', right_slope_width_ft: '5' }, 18.0,
    );
    expect(result!.status).toBe('fail');
    expect(approx(result!.differenceIn, -24.0)).toBe(true);
  });

  it('test_no_hopper_is_not_a_check', () => {
    expect(checkHopperClosure(null, 18.0)).toBeNull();
  });
});

describe('test_liner_math.py: hydrostatic risk', () => {
  it('test_recent_rain_is_high_risk', () => {
    const r = assessHydrostaticRisk('concrete', 'french_drain', 3);
    expect(r.severity).toBe('high');
    expect(r.notes.some((n) => n.includes('Postpone'))).toBe(true);
  });

  it('test_stone_coping_without_drainage_is_medium_risk', () => {
    expect(assessHydrostaticRisk('stone', 'none', 0).severity).toBe('medium');
  });

  it('test_drained_site_with_relief_valve_is_low_risk', () => {
    expect(assessHydrostaticRisk('concrete', 'french_drain', 0, true).severity).toBe('low');
  });

  it('test_rain_outranks_a_well_drained_site', () => {
    expect(assessHydrostaticRisk('concrete', 'french_drain', 5, true).severity).toBe('high');
  });
});

// ---------- whole-job validation (Python helper shapes) ----------

function reconstructFixture(name: keyof typeof FIXTURES): ReconstructionResult {
  return rawReconstruction(FIXTURES[name]());
}

function validLiner(overrides: Partial<LinerMeasurement> = {}): LinerMeasurement {
  return {
    shape: 'rectangle',
    wall_heights: [{ label: 'shallow_end', height_ft: 3.5 }],
    profile_segments: FLAT_THEN_SLOPE,
    hopper: { left_slope_width_ft: 5, bottom_width_ft: 8, right_slope_width_ft: 5 },
    fittings: [
      { kind: 'skimmer', near_point: 3 },
      { kind: 'main_drain', near_point: 10, on_floor: true },
    ],
    drainage_system: 'french_drain',
    hydrostatic_relief_valve: true,
    ...overrides,
  };
}

function spec(overrides: Partial<LinerSpec> = {}): LinerSpec {
  return {
    pattern_name: 'Sandstone',
    bead_type: 'standard_bead',
    coping_type: 'concrete',
    ...overrides,
  };
}

function runValidation(
  liner: LinerMeasurement | null,
  linerSpec: LinerSpec,
  fixture: keyof typeof FIXTURES = 'rectangular',
  perimeterPointCount = 50,
) {
  return validateLinerJob({
    liner,
    linerSpec,
    reconstruction: reconstructFixture(fixture),
    perimeterPointCount,
    shallowDepthFt: 3.5,
    deepDepthFt: 8.0,
  });
}

describe('test_liner_math.py: whole-job validation', () => {
  it('test_validation_passes_on_a_complete_job', () => {
    const v = runValidation(validLiner(), spec());
    expect(v.ok, v.blocking.join('; ')).toBe(true);
    expect(v.hydrostatic!.severity).toBe('low');
  });

  it('test_tc005_missing_pattern_blocks_the_order', () => {
    const v = runValidation(validLiner(), spec({ pattern_name: '  ' }));
    expect(v.ok).toBe(false);
    expect(v.blocking.some((b) => b.includes('pattern is required'))).toBe(true);
  });

  it('test_measuring_at_the_coping_edge_blocks_the_order', () => {
    const v = runValidation(validLiner(), spec({ measured_at_bead_receiver: false }));
    expect(v.ok).toBe(false);
    expect(v.blocking.some((b) => b.includes('bead receiver'))).toBe(true);
  });

  it('test_missing_wall_heights_block_the_order', () => {
    const v = runValidation(validLiner({ wall_heights: [] }), spec());
    expect(v.ok).toBe(false);
    expect(v.blocking.some((b) => b.includes('wall heights'))).toBe(true);
  });

  it('test_tc008_sparse_perimeter_blocks_an_ab_plot_shape', () => {
    const v = runValidation(validLiner({ shape: 'kidney' }), spec(), 'kidney', 5);
    expect(v.ok).toBe(false);
    expect(v.blocking.some((b) => b.includes('triangulation plot'))).toBe(true);
  });

  it('test_tc008_sparse_perimeter_only_warns_on_a_standard_shape', () => {
    const v = runValidation(validLiner({ shape: 'rectangle' }), spec(), 'rectangular', 5);
    expect(v.ok, v.blocking.join('; ')).toBe(true);
    expect(v.warnings.some((w) => w.includes('standard shape'))).toBe(true);
  });

  it('test_vinyl_over_step_without_a_corner_type_blocks', () => {
    const step: LinerStep = {
      construction: 'vinyl_over_standard',
      width_ft: 8,
      risers: [
        { index: 1, riser_height_ft: 1.25 },
        { index: 2, riser_height_ft: 1.25 },
        { index: 3, riser_height_ft: 1.0 },
      ],
    };
    const v = runValidation(validLiner({ steps: [step] }), spec());
    expect(v.ok).toBe(false);
    expect(v.blocking.some((b) => b.includes('corner type'))).toBe(true);
  });

  it('test_spec_orders_vinyl_over_steps_but_none_were_measured', () => {
    const v = runValidation(
      validLiner({ steps: [] }), spec({ step_construction: 'vinyl_over_standard' }),
    );
    expect(v.ok).toBe(false);
    expect(v.blocking.some((b) => b.includes('no step was measured'))).toBe(true);
  });

  it('test_no_liner_capture_at_all_blocks', () => {
    expect(runValidation(null, spec()).ok).toBe(false);
  });

  it('test_hopper_bottom_without_a_cross_section_warns', () => {
    const v = runValidation(validLiner({ hopper: null }), spec());
    expect(v.ok, v.blocking.join('; ')).toBe(true);
    expect(v.warnings.some((w) => w.includes('hopper cross-section'))).toBe(true);
  });

  it('test_missing_fittings_warn_but_do_not_block', () => {
    const v = runValidation(validLiner({ fittings: [] }), spec());
    expect(v.ok, v.blocking.join('; ')).toBe(true);
    expect(v.warnings.some((w) => w.includes('No fittings recorded'))).toBe(true);
  });
});

describe('test_liner_math.py: shape catalog', () => {
  it('test_organic_shapes_require_the_ab_plot', () => {
    for (const shape of ['kidney', 'freeform', 'figure_8', 'mountain_lake_left', 'odessy_right'] as const) {
      expect(requiresAbPlot(shape), shape).toBe(true);
    }
  });

  it('test_standard_shapes_are_ordered_from_lettered_forms', () => {
    for (const shape of ['rectangle', 'grecian', 'true_l_left', 'roman_end', 'oval', 'octagon'] as const) {
      expect(requiresAbPlot(shape), shape).toBe(false);
    }
  });

  it('catalog matches the backend: 28 shapes, 7 ordered from the A/B plot', () => {
    expect(LINER_SHAPES).toHaveLength(28);
    expect(LINER_SHAPES.filter((s: LinerShape) => requiresAbPlot(s))).toHaveLength(7);
  });
});

// =====================================================================
// frontend/tests/linerValidation.test.js
// =====================================================================

describe('linerValidation.test.js: 1. closure grading bands', () => {
  it('1a-1f', () => {
    expect(closureStatus(0, 2)).toBe('pass');
    expect(closureStatus(CLOSURE_CLEAN_IN, 2)).toBe('pass');
    expect(closureStatus(0.26, 2)).toBe('warn');
    expect(closureStatus(2, 2)).toBe('warn');
    expect(closureStatus(2.01, 2)).toBe('fail');
    expect(closureStatus(-10, 2)).toBe('fail');
  });
});

describe('linerValidation.test.js: 2. profile closure (TC-003 / TC-004)', () => {
  it('2a: TC-003 238in vs 240in -> warn, -2in', () => {
    const r = checkProfileClosure([seg(1, 'shallow_floor', 238 / 12, 3.5, 3.5)], 240 / 12);
    expect(r.status).toBe('warn');
    expect(Math.abs(r.differenceIn - -2)).toBeLessThanOrEqual(1e-6);
  });

  it('2b: TC-004 230in vs 240in -> fail, re-tape', () => {
    const r = checkProfileClosure([seg(1, 'shallow_floor', 230 / 12, 3.5, 3.5)], 240 / 12);
    expect(r.status).toBe('fail');
    expect(r.message.includes('Re-tape')).toBe(true);
  });

  it('2c: 12+12+8 closes on 32ft', () => {
    const r = checkProfileClosure(FLAT_THEN_SLOPE, 32);
    expect(r.status).toBe('pass');
    expect(Math.abs(r.measuredFt - 32)).toBeLessThanOrEqual(1e-6);
  });

  it('2d: no profile at all -> fail', () => {
    const r = checkProfileClosure([], 32);
    expect(r.status).toBe('fail');
    expect(r.message.includes('required')).toBe(true);
  });
});

describe('linerValidation.test.js: 3. developed length', () => {
  it('3a-3e', () => {
    expect(Math.abs(segmentDevelopedLengthFt(12, 0) - 12)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(segmentDevelopedLengthFt(12, 5) - 13)).toBeLessThanOrEqual(1e-6);
    const { planFt, developedFt } = profileTotals(FLAT_THEN_SLOPE);
    expect(Math.abs(planFt - 32)).toBeLessThanOrEqual(1e-6);
    expect(developedFt > planFt).toBe(true);
    expect(Math.abs(developedFt - (12 + Math.hypot(12, 4.5) + 8))).toBeLessThanOrEqual(1e-6);
  });
});

describe('linerValidation.test.js: 4. profile continuity', () => {
  it('4a: a 1.5ft gap is caught', () => {
    const problems = checkProfileContinuity([seg(1, 'shallow_floor', 12, 3.5, 3.5), seg(2, 'slope', 12, 5, 8)]);
    expect(problems.length).toBe(1);
    expect(problems[0]!.includes('Profile gap')).toBe(true);
  });

  it('4b: a closed section has no gaps', () => {
    expect(checkProfileContinuity(FLAT_THEN_SLOPE).length).toBe(0);
  });
});

describe('linerValidation.test.js: 5. riser closure', () => {
  it('5a: risers closing on the wall height pass', () => {
    const risers = [{ riser_height_ft: 1.25 }, { riser_height_ft: 1.25 }, { riser_height_ft: 1.0 }];
    expect(checkRiserSum(risers, 3.5).status).toBe('pass');
  });

  it('5b: 1in of riser error blocks; the same 1in on the floor only warns', () => {
    const risers = [{ riser_height_ft: 1.25 }, { riser_height_ft: 1.25 }, { riser_height_ft: 1.0833 }];
    const r = checkRiserSum(risers, 3.5);
    expect(r.status).toBe('fail');
    expect(r.toleranceIn).toBe(RISER_TOLERANCE_IN);
    expect(closureStatus(1, PROFILE_TOLERANCE_IN)).toBe('warn');
  });

  it('5c: a vinyl-over step with no risers fails', () => {
    const r = checkRiserSum([], 3.5);
    expect(r.status).toBe('fail');
    expect(r.message.includes('no riser heights')).toBe(true);
  });
});

describe('linerValidation.test.js: 6. hopper closure', () => {
  it('6a: 5+8+5 spans an 18ft width', () => {
    const hopper = { left_slope_width_ft: 5, bottom_width_ft: 8, right_slope_width_ft: 5 };
    expect(checkHopperClosure(hopper, 18)!.status).toBe('pass');
  });

  it('6b: 2ft short of the width fails, 24in short', () => {
    const hopper = { left_slope_width_ft: 5, bottom_width_ft: 6, right_slope_width_ft: 5 };
    const r = checkHopperClosure(hopper, 18)!;
    expect(r.status).toBe('fail');
    expect(Math.abs(r.differenceIn - -24)).toBeLessThanOrEqual(1e-6);
  });

  it('6c: no hopper is not a check', () => {
    expect(checkHopperClosure(null, 18)).toBe(null);
  });
});

describe('linerValidation.test.js: 7. hydrostatic risk', () => {
  it('7a-7e', () => {
    expect(assessHydrostaticRisk('concrete', 'french_drain', 3).severity).toBe('high');
    expect(assessHydrostaticRisk('stone', 'none', 0).severity).toBe('medium');
    expect(assessHydrostaticRisk('concrete', 'french_drain', 0, true).severity).toBe('low');
    expect(assessHydrostaticRisk('concrete', 'french_drain', 5, true).severity).toBe('high');
    expect(assessHydrostaticRisk('concrete', 'unknown', 0, true).severity).toBe('medium');
  });
});

describe('linerValidation.test.js: 10. shape catalog', () => {
  it('10a: organic shapes are ordered from the A/B plot', () => {
    for (const s of ['kidney', 'freeform', 'figure_8', 'mountain_lake_left', 'odessy_right']) {
      expect(requiresAbPlot(s), s).toBe(true);
    }
  });

  it('10b: standard shapes are ordered from a lettered form', () => {
    for (const s of ['rectangle', 'grecian', 'true_l_left', 'roman_end', 'oval', 'octagon']) {
      expect(requiresAbPlot(s), s).toBe(false);
    }
  });
});

describe('linerValidation.test.js: 11. shallow wall height resolution', () => {
  it('11a-11c', () => {
    const walls = [{ label: 'north_wall', height_ft: 4 }, { label: 'shallow_end', height_ft: 3.5 }];
    expect(Math.abs(shallowWallHeightFt(walls, FLAT_THEN_SLOPE, 9) - 3.5)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(shallowWallHeightFt([], FLAT_THEN_SLOPE, 9) - 3.5)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(shallowWallHeightFt([], [], 3.25) - 3.25)).toBeLessThanOrEqual(1e-6);
  });
});

describe('linerValidation.test.js: 12. whole-job validation', () => {
  const RECON = { lengthFt: 32, widthFt: 18, perimeterFt: 100, areaSqft: 576, invalidReasons: [] as string[] };

  interface Overrides {
    liner?: Partial<LinerMeasurement>;
    measurement?: Record<string, unknown>;
    liner_spec?: Partial<LinerSpec>;
  }

  function validJob(overrides: Overrides = {}) {
    const liner: LinerMeasurement = {
      shape: 'rectangle',
      wall_heights: [{ label: 'shallow_end', height_ft: 3.5 }],
      profile_segments: FLAT_THEN_SLOPE,
      hopper: { left_slope_width_ft: 5, bottom_width_ft: 8, right_slope_width_ft: 5 },
      steps: [],
      fittings: [{ kind: 'skimmer', near_point: 3 }, { kind: 'main_drain', near_point: 10 }],
      drainage_system: 'french_drain',
      hydrostatic_relief_valve: true,
      recent_rainfall_days: 0,
      ...(overrides.liner ?? {}),
    };
    return {
      product_type: 'liner',
      measurement: {
        perimeter_points: Array.from({ length: 20 }, (_, i) => ({ number: i + 1 })),
        shallow_depth_ft: 3.5,
        deep_depth_ft: 8,
        liner,
        ...(overrides.measurement ?? {}),
      },
      liner_spec: {
        pattern_name: 'Sandstone',
        bead_type: 'standard_bead',
        coping_type: 'concrete',
        step_construction: 'none',
        measured_at_bead_receiver: true,
        ...(overrides.liner_spec ?? {}),
      } as LinerSpec,
    };
  }

  it('12a: a complete job passes', () => {
    const v = validateJob(validJob(), RECON);
    expect(v.ok, v.blocking.join('; ')).toBe(true);
    expect(v.hydrostatic!.severity).toBe('low');
    expect(v.checks.length).toBe(2);
  });

  it('12b: TC-005 missing pattern blocks', () => {
    const v = validateJob(validJob({ liner_spec: { pattern_name: '  ' } }), RECON);
    expect(!v.ok).toBe(true);
    expect(v.blocking.some((b) => b.includes('pattern is required'))).toBe(true);
  });

  it('12c: a coping-edge walk blocks', () => {
    const v = validateJob(validJob({ liner_spec: { measured_at_bead_receiver: false } }), RECON);
    expect(!v.ok).toBe(true);
    expect(v.blocking.some((b) => b.includes('bead receiver'))).toBe(true);
  });

  it('12d: no wall heights blocks', () => {
    expect(validateJob(validJob({ liner: { wall_heights: [] } }), RECON).ok).toBe(false);
  });

  it('12e/12f: TC-008 thin plot blocks a kidney but only warns on a rectangle', () => {
    const thin = { measurement: { perimeter_points: [{ number: 1 }, { number: 2 }] } };
    const organic = validateJob(validJob({ ...thin, liner: { shape: 'kidney' } }), RECON);
    expect(!organic.ok).toBe(true);
    expect(organic.blocking.some((b) => b.includes('triangulation plot'))).toBe(true);

    const standard = validateJob(validJob({ ...thin, liner: { shape: 'rectangle' } }), RECON);
    expect(standard.ok, standard.blocking.join('; ')).toBe(true);
    expect(standard.warnings.some((w) => w.includes('standard shape'))).toBe(true);
    expect(MIN_PERIMETER_POINTS === 8).toBe(true);
  });

  it('12g/12h: a vinyl-over step needs a corner type; adding it clears the block', () => {
    const step: LinerStep = {
      construction: 'vinyl_over_standard',
      width_ft: 8,
      risers: [{ riser_height_ft: 1.25 }, { riser_height_ft: 1.25 }, { riser_height_ft: 1.0 }],
    };
    const v = validateJob(validJob({ liner: { steps: [step] } }), RECON);
    expect(!v.ok).toBe(true);
    expect(v.blocking.some((b) => b.includes('corner type'))).toBe(true);

    const fixed = validateJob(validJob({ liner: { steps: [{ ...step, corner_type: 'radius' }] } }), RECON);
    expect(fixed.ok, fixed.blocking.join('; ')).toBe(true);
    expect(fixed.checks.length).toBe(3);
  });

  it('12i: spec orders vinyl-over steps but none were measured', () => {
    const v = validateJob(validJob({ liner_spec: { step_construction: 'vinyl_over_standard' } }), RECON);
    expect(!v.ok).toBe(true);
  });

  it('12j: a missing hopper cross-section warns but does not block', () => {
    const v = validateJob(validJob({ liner: { hopper: null } }), RECON);
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => w.includes('hopper cross-section'))).toBe(true);
  });

  it('12k: missing fittings warn but do not block', () => {
    const v = validateJob(validJob({ liner: { fittings: [] } }), RECON);
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => w.includes('No fittings recorded'))).toBe(true);
  });

  it('12l: a liner job with no liner capture blocks', () => {
    expect(validateJob({ measurement: {} }, RECON).ok).toBe(false);
  });

  it('12m: an unreconstructable perimeter blocks, attributed to the perimeter', () => {
    const broken = { ...RECON, invalidReasons: ['Point #4: tapes too short to reach'] };
    const v = validateJob(validJob(), broken);
    expect(!v.ok).toBe(true);
    expect(v.blocking.some((b) => b.startsWith('Perimeter:'))).toBe(true);
  });

  it('12n: inverted depths warn', () => {
    const v = validateJob(validJob({ measurement: { deep_depth_ft: 3, shallow_depth_ft: 8 } }), RECON);
    expect(v.warnings.some((w) => w.includes('not swapped'))).toBe(true);
  });
});

// =====================================================================
// Python-over-JS behaviour (where the two sources differ)
// =====================================================================

describe('liner_math.py wins where linerValidation.js differs', () => {
  it('a missing drainage_system takes the pydantic default "unknown" (medium risk)', () => {
    const v = validateLinerJob({
      liner: { ...validLiner(), drainage_system: undefined },
      linerSpec: spec(),
      reconstruction: { lengthFt: 32, widthFt: 18, invalidReasons: [] },
      perimeterPointCount: 50,
      shallowDepthFt: 3.5,
      deepDepthFt: 8,
    });
    expect(v.hydrostatic!.severity).toBe('medium');
    expect(v.hydrostatic!.notes[0]).toContain('Drainage system not identified');
  });

  it('messages use Python half-even formatting', () => {
    // 0.125 ft = 1.5in over a 2in tolerance → warn; |diff| formats as 1.5
    const r = checkProfileClosure([seg(1, 'shallow_floor', 32.125, 4, 4)], 32);
    expect(r.status).toBe('warn');
    expect(r.message).toBe('Profile closes within tolerance: off by 1.5" (tolerance ±2.0").');
    const h = checkHopperClosure({ left_slope_width_ft: 0.125, bottom_width_ft: 8, right_slope_width_ft: 5 }, 18)!;
    expect(h.message).toContain('(0.12 + 8.00 + 5.00)');
  });

  it('accepts [order, kind, run, d0, d1] tuples like liner_math._seg_fields', () => {
    expect(profileTotals([[1, 'slope', 12, 0, 5]]).developedFt).toBe(13);
    expect(checkRiserSum([1.25, 1.25, 1], 3.5).status).toBe('pass');
  });
});
