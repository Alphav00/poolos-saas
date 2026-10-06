/**
 * A/B measurement reconstruction math.
 * Port of `backend/app/services/ab_math.py` (source of truth) and
 * `frontend/src/lib/utils/reconstruct.js`.
 *
 * Given two reference stakes A and B a known distance d_AB apart, and for each
 * perimeter point P_i the tape distances r_Ai and r_Bi, place A at (0, 0) and
 * B at (d_AB, 0). Each P_i lies on the intersection of the circles
 * (A, r_Ai) and (B, r_Bi):
 *
 *   a = (r0² − r1² + d²) / (2d)    signed distance from A along AB
 *   h = sqrt(r0² − a²)             perpendicular distance
 *   P = (a, −h)                    the pool is BELOW the A-B line (negative y)
 *
 * Convention (top-down, math y-up): A on the left, B on the right, the pool on
 * the south side, points recorded clockwise starting nearest A.
 *
 * Quality grading:
 *  - "good":     triangle inequality satisfied with margin
 *  - "marginal": within TRI_TOL_FT of degenerate, or r ≈ 0 (point on a stake)
 *  - "invalid":  triangle inequality violated by more than TRI_TOL_FT
 *
 * Units: decimal feet. Pure functions.
 */
import { pyFixed, toNum } from './format';
import type {
  JobMeasurement,
  PerimeterPoint,
  PerimeterPointTuple,
  ReconstructedPoint2D,
  ReconstructionResult,
  SuspectPoint,
} from './types';

/**
 * Tolerance for "triangle inequality strictly satisfied", in feet (~0.6 in):
 * well above tape precision, well below the reconstruction tolerance.
 */
export const TRI_TOL_FT = 0.05;

/** Reconstruct a single perimeter point from A and B tape distances. */
export function reconstructPoint(
  number: number,
  aDistance: number,
  bDistance: number,
  abDistance: number,
): ReconstructedPoint2D {
  const d = abDistance;
  const r0 = aDistance;
  const r1 = bDistance;

  const sumCheck = r0 + r1 - d;
  const diffCheck = d - Math.abs(r0 - r1);

  if (sumCheck < -TRI_TOL_FT) {
    return {
      number, x: 0, y: 0,
      quality: 'invalid',
      qualityReason:
        `r_A + r_B (${pyFixed(r0 + r1, 2)}) < d_AB (${pyFixed(d, 2)}); tapes too short to reach`,
    };
  }
  if (diffCheck < -TRI_TOL_FT) {
    return {
      number, x: 0, y: 0,
      quality: 'invalid',
      qualityReason:
        `|r_A - r_B| (${pyFixed(Math.abs(r0 - r1), 2)}) > d_AB (${pyFixed(d, 2)}); `
        + 'inconsistent measurements',
    };
  }

  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  let hSq = r0 * r0 - a * a;
  if (hSq < 0) hSq = 0; // numerical near-zero
  const h = Math.sqrt(hSq);

  let quality: ReconstructedPoint2D['quality'] = 'good';
  let qualityReason: string | null = null;
  if (sumCheck < TRI_TOL_FT || diffCheck < TRI_TOL_FT) {
    quality = 'marginal';
    qualityReason = 'point near collinear with A-B line; geometry degenerate';
  }
  if (r0 < 0.01 || r1 < 0.01) {
    quality = 'marginal';
    qualityReason = 'point coincides with A or B; check numbering';
  }

  return { number, x: a, y: -h, quality, qualityReason };
}

function readPoint(p: PerimeterPoint | PerimeterPointTuple): [number, number, number] {
  if (Array.isArray(p)) {
    const t = p as PerimeterPointTuple;
    return [t[0], t[1], t[2]];
  }
  const o = p as PerimeterPoint;
  return [o.number, toNum(o.a_distance_ft), toNum(o.b_distance_ft)];
}

/**
 * Reconstruct the full pool from an ordered perimeter point chain.
 *
 * `points` may be `PerimeterPoint` objects (numbers or decimal strings) or
 * `[number, a, b]` tuples.
 */
export function reconstructPool(
  points: Iterable<PerimeterPoint | PerimeterPointTuple>,
  abDistance: number,
  shallowDepthFt = 0,
  deepDepthFt = 0,
): ReconstructionResult {
  const reconstructed: ReconstructedPoint2D[] = [];
  const invalidReasons: string[] = [];

  for (const p of points) {
    const [num, rA, rB] = readPoint(p);
    const rec = reconstructPoint(num, rA, rB, abDistance);
    if (rec.quality === 'invalid') {
      invalidReasons.push(
        `Point #${num}: ${rec.qualityReason} `
        + `(A=${pyFixed(rA, 2)}ft, B=${pyFixed(rB, 2)}ft, AB=${pyFixed(abDistance, 2)}ft)`,
      );
    }
    reconstructed.push(rec);
  }

  if (reconstructed.length === 0) {
    return {
      points: [], perimeterFt: 0, areaSqft: 0,
      lengthFt: 0, widthFt: 0, depthAvgFt: 0,
      valid: false, invalidReasons: ['No points'],
    };
  }

  // Only valid + marginal points count for perimeter / area.
  const usable = reconstructed.filter((p) => p.quality !== 'invalid');
  const depthAvgFt = (shallowDepthFt + deepDepthFt) / 2;

  if (usable.length < 3) {
    return {
      points: reconstructed,
      perimeterFt: 0, areaSqft: 0, lengthFt: 0, widthFt: 0,
      depthAvgFt,
      valid: false,
      invalidReasons: [...invalidReasons, 'fewer than 3 usable points'],
    };
  }

  const n = usable.length;
  let perimeter = 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p1 = usable[i]!;
    const p2 = usable[(i + 1) % n]!;
    perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  // Shoelace formula on the closed loop.
  for (let i = 0; i < n; i++) {
    const p1 = usable[i]!;
    const p2 = usable[(i + 1) % n]!;
    area += p1.x * p2.y - p2.x * p1.y;
  }
  area = Math.abs(area) / 2;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of usable) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    points: reconstructed,
    perimeterFt: perimeter,
    areaSqft: area,
    lengthFt: maxX - minX,
    widthFt: maxY - minY,
    depthAvgFt,
    valid: invalidReasons.length === 0,
    invalidReasons,
  };
}

/**
 * The perimeter points to feed the reconstruction, honouring `swap_ab`.
 *
 * When the tech set the stakes on the wrong ends the recorded A and B distances
 * are exchanged before the math runs. The input is never mutated.
 */
export function perimeterForMath(
  measurement: Pick<JobMeasurement, 'perimeter_points' | 'swap_ab'>,
): PerimeterPoint[] {
  const points = [...measurement.perimeter_points];
  if (!measurement.swap_ab) return points;
  return points.map((p) => ({
    ...p,
    a_distance_ft: p.b_distance_ft,
    b_distance_ft: p.a_distance_ft,
  }));
}

/**
 * Industry-standard A-B line sanity checks. Returns human-readable warnings;
 * empty means good. `_points` is accepted for signature parity with the
 * backend and is unused there too.
 */
export function validateAbLine(
  abDistanceFt: number,
  abOffsetFromPoolFt: number,
  _points?: Iterable<unknown>,
): string[] {
  const warnings: string[] = [];
  if (abDistanceFt < 10) {
    warnings.push(`A-B distance ${pyFixed(abDistanceFt, 1)}ft is below 10ft minimum`);
  }
  if (abDistanceFt > 100) {
    warnings.push(`A-B distance ${pyFixed(abDistanceFt, 1)}ft exceeds 100ft (use longer tape)`);
  }
  if (abOffsetFromPoolFt < 3) {
    warnings.push(
      `A-B offset from pool ${pyFixed(abOffsetFromPoolFt, 1)}ft is below 3ft minimum`,
    );
  }
  return warnings;
}

/**
 * Flag likely mis-tapes: a point whose average distance to its two neighbours
 * exceeds `threshold` ft (default 8 ft, 4× typical 2 ft spacing).
 *
 * JS-only in the source project (reconstruct.js); there is no Python version.
 */
export function suspectPoints(
  points: Iterable<PerimeterPoint | PerimeterPointTuple>,
  abDistance: number,
  opts: { threshold?: number } = {},
): SuspectPoint[] {
  const threshold = opts.threshold ?? 8;
  const usable = reconstructPool(points, abDistance).points.filter((p) => p.quality !== 'invalid');
  if (usable.length < 3) return [];

  const n = usable.length;
  const out: SuspectPoint[] = [];
  for (let i = 0; i < n; i++) {
    const p = usable[i]!;
    const prev = usable[(i - 1 + n) % n]!;
    const next = usable[(i + 1) % n]!;
    const avgNeighbor =
      (Math.hypot(p.x - prev.x, p.y - prev.y) + Math.hypot(p.x - next.x, p.y - next.y)) / 2;
    if (avgNeighbor > threshold) {
      out.push({
        number: p.number,
        reason: `Point ${p.number} is ${avgNeighbor.toFixed(1)}ft from neighbors `
          + `(threshold ${threshold}ft) — check for mis-tape`,
      });
    }
  }
  return out;
}
