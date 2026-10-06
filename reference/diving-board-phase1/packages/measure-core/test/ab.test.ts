/**
 * A/B reconstruction.
 *
 * Part 1 ports backend/tests/test_ab_math.py case for case (same ground truth,
 * same tolerances). Part 2 ports frontend/tests/reconstruct_parity.test.js;
 * its backend-dependent sections (0, 6, 7, 8) run against this package's
 * fixtures and against golden values captured from the Python backend.
 */
import { describe, expect, it } from 'vitest';
import {
  FIXTURES,
  perimeterForMath,
  reconstructPoint,
  reconstructPool,
  suspectPoints,
  validateAbLine,
} from '../src';
import { PY_GOLDEN } from './golden/python';
import { abDistancesForPoints, densifiedRectangle, PyRandom } from './helpers';

const FT_PER_INCH = 1.0 / 12.0;
const TOL_FT = 1.0 * FT_PER_INCH; // 1 inch in feet
const TIGHT_TOL_FT = 0.5 * FT_PER_INCH; // 0.5 inch in feet

describe('test_ab_math.py', () => {
  // ---------- 1. Rectangular pool, no noise ----------

  it('test_rectangular_perfect_measurement', () => {
    const corners: Array<[number, number]> = [[4, 4], [34, 4], [34, 20], [4, 20]];
    const result = reconstructPool(abDistancesForPoints(corners, [0, 0], [20, 0]), 20.0);

    expect(result.valid).toBe(true);
    expect(result.invalidReasons).toEqual([]);
    expect(Math.abs(result.perimeterFt - 92.0)).toBeLessThan(TOL_FT);
    expect(Math.abs(result.areaSqft - 480.0)).toBeLessThan(TIGHT_TOL_FT);
    expect(Math.abs(result.lengthFt - 30.0)).toBeLessThan(TOL_FT);
    expect(Math.abs(result.widthFt - 16.0)).toBeLessThan(TOL_FT);
  });

  it('test_rectangular_with_industry_standard_point_density', () => {
    const result = reconstructPool(
      abDistancesForPoints(densifiedRectangle(), [0, 0], [20, 0]), 20.0,
    );
    expect(result.valid).toBe(true);
    expect(Math.abs(result.perimeterFt - 92.0)).toBeLessThan(TIGHT_TOL_FT);
    expect(Math.abs(result.areaSqft - 480.0)).toBeLessThan(1.0);
    expect(Math.abs(result.lengthFt - 30.0)).toBeLessThan(TOL_FT);
    expect(Math.abs(result.widthFt - 16.0)).toBeLessThan(TOL_FT);
  });

  // ---------- 2. Kidney pool ----------

  it('test_kidney_pool_reconstruction', () => {
    const n = 60;
    const pts: Array<[number, number]> = [];
    for (let k = 0; k < n; k++) {
      const t = 2 * Math.PI * k / n;
      pts.push([
        20.0 * Math.cos(t) + 25.0,
        12.0 * Math.sin(t) * (1.0 + 0.4 * Math.cos(t)) + 20.0,
      ]);
    }
    const result = reconstructPool(abDistancesForPoints(pts, [5, 0], [45, 0]), 40.0);
    expect(result.valid, `Kidney reconstruction invalid: ${result.invalidReasons}`).toBe(true);
    expect(result.lengthFt).toBeGreaterThan(35);
    expect(result.lengthFt).toBeLessThan(45);
    expect(result.widthFt).toBeGreaterThan(14);
    expect(result.widthFt).toBeLessThan(26);
  });

  // ---------- 3. Freeform with obstacle ----------

  it('test_freeform_with_island', () => {
    const outer: Array<[number, number]> = [];
    for (let k = 0; k < 40; k++) {
      const t = 2 * Math.PI * k / 40;
      outer.push([20.0 * Math.cos(t) + 30.0, 12.0 * Math.sin(t) + 18.0]);
    }
    const island: Array<[number, number]> = [];
    for (let k = 0; k < 12; k++) {
      const t = 2 * Math.PI * k / 12;
      island.push([3.0 * Math.cos(t) + 30.0, 3.0 * Math.sin(t) + 18.0]);
    }
    const A: [number, number] = [5, 0];
    const B: [number, number] = [55, 0];

    const resultOuter = reconstructPool(abDistancesForPoints(outer, A, B), 50.0);
    expect(resultOuter.valid).toBe(true);
    // Outer area ~ pi * 20 * 12 = 753.98 sqft
    expect(resultOuter.areaSqft).toBeGreaterThan(700);
    expect(resultOuter.areaSqft).toBeLessThan(810);
    expect(resultOuter.lengthFt).toBeGreaterThan(38);
    expect(resultOuter.lengthFt).toBeLessThan(42);
    expect(resultOuter.widthFt).toBeGreaterThan(22);
    expect(resultOuter.widthFt).toBeLessThan(26);

    const resultIsland = reconstructPool(abDistancesForPoints(island, A, B), 50.0);
    expect(resultIsland.valid).toBe(true);
    // Island area ~ pi * 3^2 = 28.27 sqft
    expect(resultIsland.areaSqft).toBeGreaterThan(22);
    expect(resultIsland.areaSqft).toBeLessThan(36);
  });

  // ---------- 4. Point quality / degenerate cases ----------

  it('test_point_quality_near_collinear', () => {
    const rec = reconstructPoint(1, 10.0, 10.0, 20.0);
    expect(['marginal', 'good']).toContain(rec.quality);
    if (rec.quality === 'marginal') expect(rec.qualityReason).not.toBeNull();
  });

  it('test_point_invalid_sum_violation', () => {
    const rec = reconstructPoint(1, 5.0, 5.0, 20.0);
    expect(rec.quality).toBe('invalid');
    expect(rec.qualityReason ?? '').toContain('too short');
  });

  it('test_point_invalid_diff_violation', () => {
    const rec = reconstructPoint(1, 30.0, 5.0, 20.0);
    expect(rec.quality).toBe('invalid');
    expect(rec.qualityReason ?? '').toContain('inconsistent');
  });

  it('test_reconstruct_point_xy_known', () => {
    const rec = reconstructPoint(1, Math.sqrt(50), Math.sqrt(50), 10.0);
    expect(rec.quality).toBe('good');
    expect(Math.abs(rec.x - 5.0)).toBeLessThan(1e-9);
    expect(Math.abs(rec.y - -5.0)).toBeLessThan(1e-9); // pool below the A-B line
  });

  // ---------- 5. Realistic measurement noise ----------

  it('test_rectangular_with_realistic_tape_noise', () => {
    const clean = abDistancesForPoints(densifiedRectangle(), [0, 0], [20, 0]);
    // Python's random.Random(42), reproduced bit for bit.
    const rng = new PyRandom(42);
    const noisy = clean.map(([num, rA, rB]): [number, number, number] => {
      const rAn = rA + rng.uniform(-0.1, 0.1); // ±1.2 in
      const rBn = rB + rng.uniform(-0.1, 0.1);
      return [num, rAn, rBn];
    });
    const result = reconstructPool(noisy, 20.0);

    expect(Math.abs(result.lengthFt - 30.0)).toBeLessThan(1.0);
    expect(Math.abs(result.widthFt - 16.0)).toBeLessThan(1.0);
    expect(Math.abs(result.areaSqft - 480.0)).toBeLessThan(15.0);

    // Same noise as the Python run, so the same numbers come out.
    expect(result.lengthFt).toBeCloseTo(PY_GOLDEN.noise.lengthFt, 9);
    expect(result.widthFt).toBeCloseTo(PY_GOLDEN.noise.widthFt, 9);
    expect(result.areaSqft).toBeCloseTo(PY_GOLDEN.noise.areaSqft, 9);
    expect(result.perimeterFt).toBeCloseTo(PY_GOLDEN.noise.perimeterFt, 9);
  });

  // ---------- 6. AB line validation ----------

  it('test_validate_ab_line_too_close', () => {
    expect(validateAbLine(20.0, 2.0, []).some((w) => w.includes('3ft minimum'))).toBe(true);
  });

  it('test_validate_ab_line_too_short', () => {
    expect(validateAbLine(8.0, 4.0, []).some((w) => w.includes('10ft minimum'))).toBe(true);
  });

  it('test_validate_ab_line_ok', () => {
    expect(validateAbLine(20.0, 4.0, [])).toEqual([]);
  });

  // ---------- 7. Depth field ----------

  it('test_depth_average', () => {
    const pts: Array<[number, number]> = [[4, 4], [34, 4], [34, 20], [4, 20]];
    const result = reconstructPool(abDistancesForPoints(pts, [0, 0], [20, 0]), 20.0, 3.5, 8.0);
    expect(Math.abs(result.depthAvgFt - 5.75)).toBeLessThan(1e-9);
  });
});

describe('reconstruct_parity.test.js', () => {
  // ---------- 0. Sanity: each fixture reconstructs ----------
  for (const name of ['rectangular', 'kidney', 'freeform'] as const) {
    it(`0.${name}: point count matches and has positive dimensions`, () => {
      const m = FIXTURES[name]().measurement;
      const r = reconstructPool(
        m.perimeter_points, Number(m.ab_distance_ft),
        Number(m.shallow_depth_ft), Number(m.deep_depth_ft),
      );
      expect(r.points.length).toBe(m.perimeter_points.length);
      expect(r.lengthFt > 0 && r.widthFt > 0).toBe(true);
    });
  }

  const RECT_PTS = [
    { number: 1, a_distance_ft: 5.657, b_distance_ft: 16.492 },
    { number: 2, a_distance_ft: 34.234, b_distance_ft: 14.560 },
    { number: 3, a_distance_ft: 39.446, b_distance_ft: 24.413 },
    { number: 4, a_distance_ft: 20.396, b_distance_ft: 25.612 },
  ];

  it('1: reference 4-point rectangle (30x16)', () => {
    const r = reconstructPool(RECT_PTS, 20);
    expect(r.valid).toBe(true);
    expect(Math.abs(r.lengthFt - 30)).toBeLessThan(0.01);
    expect(Math.abs(r.widthFt - 16)).toBeLessThan(0.01);
    expect(Math.abs(r.perimeterFt - 92)).toBeLessThan(0.01);
    expect(Math.abs(r.areaSqft - 480)).toBeLessThan(0.1);
  });

  it('2: single point reconstruction, known solution', () => {
    const r = reconstructPoint(1, Math.sqrt(50), Math.sqrt(50), 10);
    expect(Math.abs(r.x - 5)).toBeLessThan(1e-9);
    expect(Math.abs(r.y - -5)).toBeLessThan(1e-9);
    expect(r.quality).toBe('good');
  });

  it('3a: sum-violation invalid', () => {
    const r = reconstructPoint(1, 5, 5, 20);
    expect(r.quality).toBe('invalid');
    expect(r.qualityReason).toContain('too short');
  });

  it('3b: diff-violation invalid', () => {
    expect(reconstructPoint(1, 30, 5, 20).quality).toBe('invalid');
  });

  it('4: suspectPoints flags the bad point', () => {
    const pts = [...RECT_PTS, { number: 5, a_distance_ft: 100, b_distance_ft: 100 }];
    const sus = suspectPoints(pts, 20);
    expect(sus.length).toBeGreaterThanOrEqual(1);
    expect(sus.some((s) => s.number === 5)).toBe(true);
  });

  it('5: validateABLine', () => {
    expect(validateAbLine(20, 4).length).toBe(0);
    expect(validateAbLine(8, 4).length).toBeGreaterThan(0);
    expect(validateAbLine(20, 2).length).toBeGreaterThan(0);
    expect(validateAbLine(150, 4).length).toBeGreaterThan(0);
  });

  function recon(name: 'rectangular' | 'kidney' | 'freeform') {
    const m = FIXTURES[name]().measurement;
    return reconstructPool(
      m.perimeter_points, Number(m.ab_distance_ft),
      Number(m.shallow_depth_ft), Number(m.deep_depth_ft),
    );
  }

  it('6: rectangular fixture', () => {
    const r = recon('rectangular');
    expect(Math.abs(r.lengthFt - 32)).toBeLessThan(0.01);
    expect(Math.abs(r.widthFt - 18)).toBeLessThan(0.01);
    expect(Math.abs(r.perimeterFt - 100)).toBeLessThan(0.5);
    expect(Math.abs(r.areaSqft - 576)).toBeLessThan(1.0);
  });

  it('7: kidney fixture', () => {
    const r = recon('kidney');
    expect(Math.abs(r.lengthFt - 38)).toBeLessThan(0.01);
    expect(Math.abs(r.widthFt - 23.51)).toBeLessThan(0.01);
  });

  it('8: freeform fixture', () => {
    const r = recon('freeform');
    expect(Math.abs(r.lengthFt - 46)).toBeLessThan(0.01);
    expect(Math.abs(r.widthFt - 21.06)).toBeLessThan(0.01);
  });

  // The source's stated requirement: JS matches Python within 0.001 ft on all
  // fixture pools. Checked here against values captured from the Python run.
  for (const name of ['rectangular', 'kidney', 'freeform'] as const) {
    it(`parity: ${name} matches the Python reconstruction within 0.001 ft`, () => {
      const g = PY_GOLDEN.fixtures[name].reconstruction;
      const r = recon(name);
      expect(Math.abs(r.lengthFt - g.lengthFt)).toBeLessThan(0.001);
      expect(Math.abs(r.widthFt - g.widthFt)).toBeLessThan(0.001);
      expect(Math.abs(r.perimeterFt - g.perimeterFt)).toBeLessThan(0.001);
      expect(Math.abs(r.areaSqft - g.areaSqft)).toBeLessThan(0.001);
      expect(r.depthAvgFt).toBe(g.depthAvgFt);
      expect(r.valid).toBe(g.valid);
      expect(r.points.map((p) => p.quality)).toEqual(g.quality);
      r.points.forEach((p, i) => {
        expect(Math.abs(p.x - g.xy[i][0])).toBeLessThan(1e-9);
        expect(Math.abs(p.y - g.xy[i][1])).toBeLessThan(1e-9);
      });
    });
  }
});

describe('LINER-MEASURE-SPEC.md validation matrix (stated in inches, run in feet)', () => {
  it('TC-001: baseline 240", A=50", B=50" -> block (50+50 < 240)', () => {
    expect(reconstructPoint(1, 50 / 12, 50 / 12, 240 / 12).quality).toBe('invalid');
  });

  it('TC-002: baseline 240", A=130", B=120" -> allow (130+120 > 240)', () => {
    expect(reconstructPoint(1, 130 / 12, 120 / 12, 240 / 12).quality).not.toBe('invalid');
  });
});

describe('Python-over-JS behaviour (discrepancies resolved in favour of ab_math.py)', () => {
  it('invalid reasons carry the A/B/AB tape readings', () => {
    const r = reconstructPool([[1, 5, 5], [2, 10, 12], [3, 11, 13], [4, 12, 11]], 20);
    expect(r.valid).toBe(false);
    expect(r.invalidReasons[0]).toBe(
      'Point #1: r_A + r_B (10.00) < d_AB (20.00); tapes too short to reach '
      + '(A=5.00ft, B=5.00ft, AB=20.00ft)',
    );
  });

  it('diff-violation reason reads "inconsistent measurements"', () => {
    expect(reconstructPoint(1, 30, 5, 20).qualityReason).toBe(
      '|r_A - r_B| (25.00) > d_AB (20.00); inconsistent measurements',
    );
  });

  it('empty input has depthAvgFt 0 regardless of depths', () => {
    const r = reconstructPool([], 20, 3.5, 8);
    expect(r).toMatchObject({ valid: false, invalidReasons: ['No points'], depthAvgFt: 0 });
  });

  it('fewer than 3 usable points keeps the per-point reasons and appends the count', () => {
    const r = reconstructPool([[1, 5, 5], [2, 12, 12]], 20, 3, 7);
    expect(r.valid).toBe(false);
    expect(r.depthAvgFt).toBe(5);
    expect(r.invalidReasons.at(-1)).toBe('fewer than 3 usable points');
    expect(r.invalidReasons).toHaveLength(2);
  });

  it('perimeterForMath swaps A and B when swap_ab is set, without mutating', () => {
    const pts = [{ number: 1, a_distance_ft: 3, b_distance_ft: 7 }];
    expect(perimeterForMath({ perimeter_points: pts, swap_ab: false })).toEqual(pts);
    const swapped = perimeterForMath({ perimeter_points: pts, swap_ab: true });
    expect(swapped[0]).toMatchObject({ a_distance_ft: 7, b_distance_ft: 3 });
    expect(pts[0]).toMatchObject({ a_distance_ft: 3, b_distance_ft: 7 });
  });

  it('accepts decimal strings as the API serializes them', () => {
    const r = reconstructPool(
      [{ number: 1, a_distance_ft: '7.0710678118654755', b_distance_ft: '7.0710678118654755' }],
      10,
    );
    expect(r.points[0]!.x).toBeCloseTo(5, 12);
  });
});
