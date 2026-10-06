/**
 * Port of backend/tests/test_fixtures.py: the three cover fixture pools
 * reconstruct within ±1 inch of ground truth. Plus a parity check that the
 * TS fixture generator emits exactly the backend's perimeter points.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NAMES, FIXTURES, rawReconstruction, reconstructPool, toReconstructedPool } from '../src';
import { PY_GOLDEN } from './golden/python';

const TOL_FT = 1.0 / 12.0; // 1 inch in feet

function reconstruct(name: keyof typeof FIXTURES) {
  const m = FIXTURES[name]().measurement;
  return reconstructPool(
    m.perimeter_points.map((p) => [p.number, Number(p.a_distance_ft), Number(p.b_distance_ft)] as const),
    Number(m.ab_distance_ft),
    Number(m.shallow_depth_ft),
    Number(m.deep_depth_ft),
  );
}

describe('test_fixtures.py', () => {
  it('test_rectangular_fixture', () => {
    const result = reconstruct('rectangular');
    // Ground truth: 32 ft long x 18 ft wide
    expect(result.valid, `Invalid: ${result.invalidReasons}`).toBe(true);
    expect(Math.abs(result.lengthFt - 32.0)).toBeLessThan(TOL_FT);
    expect(Math.abs(result.widthFt - 18.0)).toBeLessThan(TOL_FT);
  });

  it('test_kidney_fixture', () => {
    const result = reconstruct('kidney');
    expect(result.valid, `Invalid: ${result.invalidReasons}`).toBe(true);
    // Ground truth: kidney x in [6, 44] -> 38 ft; y in [6.25, 29.75] -> 23.5 ft
    expect(Math.abs(result.lengthFt - 38.0)).toBeLessThan(TOL_FT);
    expect(Math.abs(result.widthFt - 23.5)).toBeLessThan(TOL_FT);
  });

  it('test_freeform_fixture', () => {
    const result = reconstruct('freeform');
    expect(result.valid, `Invalid: ${result.invalidReasons}`).toBe(true);
    // Ground truth: x in [7, 53] -> 46 ft; y in [7.47, 28.53] -> 21.06 ft
    expect(Math.abs(result.lengthFt - 46.0)).toBeLessThan(TOL_FT);
    expect(Math.abs(result.widthFt - 21.06)).toBeLessThan(TOL_FT);
  });

  // Partial port: the Python test builds the cover order form
  // (services/order_form.py, not part of this package) and checks
  // form.job.id == job.id plus area > 0 and perimeter > 0 on the embedded
  // ReconstructedPool. The reconstruction half is what is ported here.
  it('test_all_fixtures_can_render_order_form_json (reconstruction half)', () => {
    for (const name of FIXTURE_NAMES) {
      const job = FIXTURES[name]();
      const reconstructed = toReconstructedPool(job, rawReconstruction(job));
      expect(reconstructed.area_sqft, name).toBeGreaterThan(0);
      expect(reconstructed.perimeter_ft, name).toBeGreaterThan(0);
    }
  });
});

describe('fixture generator parity with fixtures.py', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: same perimeter points, A/B line and depths as the backend`, () => {
      const g = PY_GOLDEN.fixtures[name];
      const m = FIXTURES[name]().measurement;
      expect(Number(m.ab_distance_ft)).toBe(g.ab_distance_ft);
      expect(Number(m.shallow_depth_ft)).toBe(g.shallow_depth_ft);
      expect(Number(m.deep_depth_ft)).toBe(g.deep_depth_ft);
      expect(m.perimeter_points.map((p) => [p.number, p.a_distance_ft, p.b_distance_ft]))
        .toEqual(g.points);
    });
  }

  it('each factory call returns a fresh job', () => {
    const a = FIXTURES['rectangular-liner']();
    a.measurement.liner!.profile_segments![0]!.horizontal_run_ft = 9;
    expect(FIXTURES['rectangular-liner']().measurement.liner!.profile_segments![0]!.horizontal_run_ft)
      .toBe(12);
  });
});
