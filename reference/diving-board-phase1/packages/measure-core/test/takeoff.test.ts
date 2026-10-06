/**
 * Material takeoff and the job → geometry/takeoff/verdict glue.
 *
 * - test_liner_math.py: takeoff, step area, liner fixtures end to end.
 * - linerValidation.test.js: sections 8 (takeoff) and 9 (step area).
 * - liner_parity.test.js: the source compares the JS port with a running
 *   backend. Here "server" is the API payload captured from the real Python
 *   backend (test/golden/python.ts) and, for the mutated job, the TS port of
 *   the server path (buildLinerTakeoff). Same assertions, same tolerances.
 */
import { describe, expect, it } from 'vitest';
import {
  FIXTURES,
  assessHydrostaticRisk,
  buildLinerTakeoff,
  computeTakeoff,
  rawReconstruction,
  reconstructPool,
  requiresAbPlot,
  stepSurfaceAreaSqft,
  validateJob,
} from '../src';
import type { LinerStep, ProfileSegment, ProfileSegmentKind } from '../src';
import { PY_GOLDEN } from './golden/python';
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

describe('test_liner_math.py: takeoff', () => {
  it('test_takeoff_scales_the_floor_by_the_slope_stretch', () => {
    const t = computeTakeoff({
      perimeterFt: 100.0,
      planAreaSqft: 576.0,
      reconstructedLengthFt: 32.0,
      wallHeightsFt: [3.5, 3.5, 3.5, 3.5],
      segments: FLAT_THEN_SLOPE,
      wasteFactorPct: 0.0,
    });
    expect(approx(t.wallAreaSqft, 350.0)).toBe(true);
    expect(t.floorDevelopedAreaSqft).toBeGreaterThan(t.floorPlanAreaSqft);
    expect(approx(
      t.floorDevelopedAreaSqft, 576.0 * t.floorDevelopedLengthFt / t.floorPlanLengthFt,
    )).toBe(true);
    expect(approx(t.totalMaterialSqft, t.subtotalSqft)).toBe(true);
  });

  it('test_waste_factor_is_applied_to_the_sum', () => {
    const t = computeTakeoff({
      perimeterFt: 100.0, planAreaSqft: 576.0, reconstructedLengthFt: 32.0,
      wallHeightsFt: [3.5], segments: FLAT_THEN_SLOPE, wasteFactorPct: 10.0,
    });
    expect(approx(t.totalMaterialSqft, t.subtotalSqft * 1.1)).toBe(true);
  });

  it('test_flat_floor_needs_no_stretch', () => {
    const t = computeTakeoff({
      perimeterFt: 100.0, planAreaSqft: 576.0, reconstructedLengthFt: 32.0,
      wallHeightsFt: [4.0], segments: [seg(1, 'shallow_floor', 32, 4, 4)], wasteFactorPct: 0.0,
    });
    expect(approx(t.floorDevelopedAreaSqft, 576.0)).toBe(true);
  });

  it('test_fiberglass_step_consumes_no_vinyl', () => {
    const step: LinerStep = {
      construction: 'fiberglass_standard',
      width_ft: '8',
      risers: [{ index: 1, riser_height_ft: '1.2' }],
    };
    expect(stepSurfaceAreaSqft(step)).toBe(0.0);
  });

  it('test_vinyl_over_step_area_counts_risers_and_treads', () => {
    const step: LinerStep = {
      construction: 'vinyl_over_standard',
      width_ft: '8',
      corner_type: 'ninety_degree',
      risers: [
        { index: 1, riser_height_ft: '1', tread_depth_ft: '1' },
        { index: 2, riser_height_ft: '1', tread_depth_ft: '1' },
      ],
    };
    // 8ft wide x (1+1 riser + 1+1 tread) = 32 sq ft
    expect(approx(stepSurfaceAreaSqft(step), 32.0)).toBe(true);
  });

  it('test_complex_step_carries_a_turning_allowance', () => {
    const base: LinerStep = {
      width_ft: '8',
      corner_type: 'radius',
      risers: [{ index: 1, riser_height_ft: '1', tread_depth_ft: '1' }],
    };
    const standard = stepSurfaceAreaSqft({ ...base, construction: 'vinyl_over_standard' });
    const complex = stepSurfaceAreaSqft({ ...base, construction: 'vinyl_over_complex' });
    expect(complex).toBeGreaterThan(standard);
  });
});

describe('test_liner_math.py: liner fixtures end to end', () => {
  for (const name of ['rectangular-liner', 'kidney-liner'] as const) {
    it(`test_liner_fixture_validates_and_prices[${name}]`, () => {
      const result = buildLinerTakeoff(FIXTURES[name]());

      expect(result.validation.ok, result.validation.blocking.join('; ')).toBe(true);
      expect(
        result.validation.checks.every((c) => c.status === 'pass'),
        JSON.stringify(result.validation.checks.map((c) => [c.name, c.status, c.message])),
      ).toBe(true);

      const t = result.takeoff;
      expect(t).not.toBeNull();
      expect(t!.wall_area_sqft).toBeGreaterThan(0);
      expect(t!.floor_developed_area_sqft).toBeGreaterThanOrEqual(t!.floor_plan_area_sqft);
      expect(t!.step_area_sqft).toBeGreaterThan(0);
      expect(approx(t!.total_material_sqft, t!.subtotal_sqft * 1.10, 1e-3)).toBe(true);
    });
  }

  it('test_kidney_liner_fixture_flags_the_undrained_site', () => {
    const result = buildLinerTakeoff(FIXTURES['kidney-liner']());
    expect(result.validation.hydrostatic!.severity).toBe('medium');
    expect(result.validation.hydrostatic!.notes.some((n) => n.includes('relief valve'))).toBe(true);
  });
});

// =====================================================================
// frontend/tests/linerValidation.test.js
// =====================================================================

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

describe('linerValidation.test.js: 8. takeoff', () => {
  it('8a-8d', () => {
    const t = computeTakeoff({
      perimeterFt: 100, planAreaSqft: 576, reconstructedLengthFt: 32,
      wallHeightsFt: [3.5, 3.5, 3.5, 3.5], segments: FLAT_THEN_SLOPE, wasteFactorPct: 0,
    });
    expect(close(t.wallAreaSqft, 350)).toBe(true);
    expect(t.floorDevelopedAreaSqft > t.floorPlanAreaSqft).toBe(true);
    expect(close(t.floorDevelopedAreaSqft, 576 * (t.floorDevelopedLengthFt / t.floorPlanLengthFt)))
      .toBe(true);
    expect(close(t.totalMaterialSqft, t.subtotalSqft)).toBe(true);
  });

  it('8e: waste factor applies to the sum', () => {
    const t = computeTakeoff({
      perimeterFt: 100, planAreaSqft: 576, reconstructedLengthFt: 32,
      wallHeightsFt: [3.5], segments: FLAT_THEN_SLOPE, wasteFactorPct: 10,
    });
    expect(close(t.totalMaterialSqft, t.subtotalSqft * 1.1, 1e-9)).toBe(true);
  });

  it('8f: a flat floor needs no stretch', () => {
    const t = computeTakeoff({
      perimeterFt: 100, planAreaSqft: 576, reconstructedLengthFt: 32,
      wallHeightsFt: [4], segments: [seg(1, 'shallow_floor', 32, 4, 4)], wasteFactorPct: 0,
    });
    expect(close(t.floorDevelopedAreaSqft, 576)).toBe(true);
  });
});

describe('linerValidation.test.js: 9. step area', () => {
  it('9a: the liner terminates at a fiberglass step', () => {
    expect(stepSurfaceAreaSqft({
      construction: 'fiberglass_standard', width_ft: 8, risers: [{ riser_height_ft: 1.2 }],
    })).toBe(0);
  });

  it('9b/9c: risers + treads; complex carries a turning allowance', () => {
    const step: LinerStep = {
      construction: 'vinyl_over_standard', width_ft: 8,
      risers: [
        { riser_height_ft: 1, tread_depth_ft: 1 },
        { riser_height_ft: 1, tread_depth_ft: 1 },
      ],
    };
    expect(close(stepSurfaceAreaSqft(step), 32)).toBe(true);
    const complex: LinerStep = { ...step, construction: 'vinyl_over_complex' };
    expect(stepSurfaceAreaSqft(complex) > stepSurfaceAreaSqft(step)).toBe(true);
  });
});

// =====================================================================
// frontend/tests/liner_parity.test.js
// =====================================================================

describe('liner_parity.test.js', () => {
  it('0a: offline hydrostatic still grades', () => {
    expect(assessHydrostaticRisk('stone', 'none', 0, false).severity).toBe('medium');
  });

  it('1: shape catalog agrees with the backend', () => {
    const shapes = PY_GOLDEN.shapes as Array<[string, boolean]>;
    expect(shapes.length).toBeGreaterThan(0);
    for (const [value, requires] of shapes) {
      expect(requiresAbPlot(value), `1: ${value} ordering route matches the backend`).toBe(requires);
    }
  });

  for (const name of ['rectangular-liner', 'kidney-liner'] as const) {
    it(`2.${name}: checks, verdict and takeoff match the backend`, () => {
      const job = FIXTURES[name]();
      const server = PY_GOLDEN.fixtures[name].linerTakeoff;
      const m = job.measurement;
      const rec = reconstructPool(
        m.perimeter_points, Number(m.ab_distance_ft),
        Number(m.shallow_depth_ft), Number(m.deep_depth_ft),
      );

      // The API rounds these to 2dp, so 0.01 is the tightest meaningful bound.
      expect(Math.abs(rec.lengthFt - server.reconstructed.length_ft)).toBeLessThan(0.01);
      expect(Math.abs(rec.widthFt - server.reconstructed.width_ft)).toBeLessThan(0.01);

      const local = validateJob(job, rec);

      // ---- verdict ----
      expect(local.ok).toBe(server.validation.ok);
      expect(local.blocking.length).toBe(server.validation.blocking.length);
      expect(local.warnings.length).toBe(server.validation.warnings.length);

      // ---- closure checks, by name ----
      const serverChecks = new Map<string, any>(server.validation.checks.map((c: any) => [c.name, c]));
      const localChecks = new Map(local.checks.map((c) => [c.name, c]));
      expect(localChecks.size).toBe(serverChecks.size);
      for (const [checkName, sc] of serverChecks) {
        const lc = localChecks.get(checkName);
        expect(lc, `${checkName} present locally`).toBeDefined();
        if (!lc) continue;
        expect(lc.status).toBe(sc.status);
        expect(Math.abs(lc.measured_ft - sc.measured_ft)).toBeLessThan(0.01);
        expect(Math.abs(lc.expected_ft - sc.expected_ft)).toBeLessThan(0.01);
        expect(Math.abs(lc.difference_in - sc.difference_in)).toBeLessThan(0.05);
      }

      // ---- hydrostatic ----
      expect(local.hydrostatic!.severity).toBe(server.validation.hydrostatic.severity);
      expect(local.hydrostatic!.notes.length).toBe(server.validation.hydrostatic.notes.length);

      // ---- takeoff ----
      const liner = m.liner!;
      const localTakeoff = computeTakeoff({
        perimeterFt: rec.perimeterFt,
        planAreaSqft: rec.areaSqft,
        reconstructedLengthFt: rec.lengthFt,
        wallHeightsFt: liner.wall_heights!.map((w) => Number(w.height_ft)),
        segments: liner.profile_segments!,
        steps: liner.steps!,
        wasteFactorPct: Number(job.liner_spec!.waste_factor_pct),
      });
      const st = server.takeoff;
      expect(Math.abs(localTakeoff.wallAreaSqft - st.wall_area_sqft)).toBeLessThan(0.02);
      expect(Math.abs(localTakeoff.floorDevelopedLengthFt - st.floor_developed_length_ft)).toBeLessThan(0.02);
      expect(Math.abs(localTakeoff.floorDevelopedAreaSqft - st.floor_developed_area_sqft)).toBeLessThan(0.05);
      expect(Math.abs(localTakeoff.stepAreaSqft - st.step_area_sqft)).toBeLessThan(0.02);
      expect(Math.abs(localTakeoff.totalMaterialSqft - st.total_material_sqft)).toBeLessThan(0.1);
    });
  }

  it('3: a job that fails must fail on both sides', () => {
    const job = FIXTURES['rectangular-liner']();
    // Shorten the shallow run by 3ft, well past the 2in tolerance.
    job.measurement.liner!.profile_segments![0]!.horizontal_run_ft = '9';

    const server = buildLinerTakeoff(job);
    const rec = reconstructPool(
      job.measurement.perimeter_points, Number(job.measurement.ab_distance_ft),
      Number(job.measurement.shallow_depth_ft), Number(job.measurement.deep_depth_ft),
    );
    const local = validateJob(job, rec);

    expect(server.validation.ok).toBe(false);
    expect(local.ok).toBe(false);
    expect(local.blocking.some((b) => b.includes('Re-tape the floor section'))).toBe(true);
    // And the Python backend agrees, message for message.
    expect(PY_GOLDEN.brokenRectangularLiner.ok).toBe(false);
    expect(server.validation.blocking).toEqual(PY_GOLDEN.brokenRectangularLiner.blocking);
    expect(server.validation.warnings).toEqual(PY_GOLDEN.brokenRectangularLiner.warnings);
  });
});

// =====================================================================
// Exact parity with the Python backend's own output
// =====================================================================

describe('buildLinerTakeoff equals the Python API payload', () => {
  for (const name of ['rectangular-liner', 'kidney-liner'] as const) {
    it(`${name}: identical payload (rounded values, messages, verdict)`, () => {
      expect(buildLinerTakeoff(FIXTURES[name]())).toEqual(PY_GOLDEN.fixtures[name].linerTakeoff);
    });

    it(`${name}: raw takeoff and validation match liner_math to 1e-9`, () => {
      const job = FIXTURES[name]();
      const g = PY_GOLDEN.fixtures[name];
      const rec = rawReconstruction(job);
      const liner = job.measurement.liner!;
      const t = computeTakeoff({
        perimeterFt: rec.perimeterFt,
        planAreaSqft: rec.areaSqft,
        reconstructedLengthFt: rec.lengthFt,
        wallHeightsFt: liner.wall_heights!.map((w) => Number(w.height_ft)),
        segments: liner.profile_segments!,
        steps: liner.steps!,
        wasteFactorPct: Number(job.liner_spec!.waste_factor_pct),
      });
      const snake: Record<string, number> = {
        perimeter_ft: t.perimeterFt,
        wall_height_avg_ft: t.wallHeightAvgFt,
        wall_height_max_ft: t.wallHeightMaxFt,
        wall_area_sqft: t.wallAreaSqft,
        floor_plan_length_ft: t.floorPlanLengthFt,
        floor_developed_length_ft: t.floorDevelopedLengthFt,
        floor_plan_area_sqft: t.floorPlanAreaSqft,
        floor_developed_area_sqft: t.floorDevelopedAreaSqft,
        step_area_sqft: t.stepAreaSqft,
        subtotal_sqft: t.subtotalSqft,
        waste_factor_pct: t.wasteFactorPct,
        total_material_sqft: t.totalMaterialSqft,
      };
      for (const [k, v] of Object.entries(snake)) {
        expect(Math.abs(v - g.rawTakeoff[k]), k).toBeLessThan(1e-9);
      }
    });
  }
});
