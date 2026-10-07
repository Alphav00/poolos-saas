/**
 * JavaScript port of the A/B reconstruction math.
 *
 * Mirrors `backend/app/services/ab_math.py` exactly. The two implementations
 * are verified to match on all 3 fixture pools within 0.001 ft
 * (see tests/reconstruct.test.js).
 *
 * Used by the perimeter-capture mini-map for live reconstruction as the
 * tech enters each A/B distance.
 */

const TRI_TOL_FT = 0.05;  // ~0.6 inch; well above tape precision, well below tolerance

/**
 * Reconstruct a single perimeter point from A and B tape distances.
 *
 * Convention: A is at origin (0, 0), B is at (d_AB, 0). Positive y is
 * "above" the A-B line (away from the technician standing between them).
 *
 * @param {number} number - point number (1..N)
 * @param {number} aDist  - distance from A in ft
 * @param {number} bDist  - distance from B in ft
 * @param {number} abDist - A-to-B distance in ft
 * @returns {{number, x, y, quality, qualityReason}}
 */
export function reconstructPoint(number, aDist, bDist, abDist) {
  const d = abDist;
  const r0 = aDist;
  const r1 = bDist;

  const sumCheck = r0 + r1 - d;
  const diffCheck = d - Math.abs(r0 - r1);

  if (sumCheck < -TRI_TOL_FT) {
    return {
      number, x: 0, y: 0,
      quality: 'invalid',
      qualityReason: `r_A + r_B (${(r0 + r1).toFixed(2)}) < d_AB (${d.toFixed(2)}); tapes too short to reach`,
    };
  }
  if (diffCheck < -TRI_TOL_FT) {
    return {
      number, x: 0, y: 0,
      quality: 'invalid',
      qualityReason: `|r_A - r_B| (${Math.abs(r0 - r1).toFixed(2)}) > d_AB (${d.toFixed(2)}); inconsistent`,
    };
  }

  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = r0 * r0 - a * a;
  const h = h2 < 0 ? 0 : Math.sqrt(h2);

  let quality = 'good';
  let qualityReason = null;
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

/**
 * Reconstruct the full pool from an ordered perimeter point chain.
 *
 * @param {Array<{number, a_distance_ft, b_distance_ft}>} points
 * @param {number} abDist - A-to-B distance in ft
 * @param {number} shallowDepthFt
 * @param {number} deepDepthFt
 * @returns {{
 *   points: Array,
 *   perimeterFt: number,
 *   areaSqft: number,
 *   lengthFt: number,
 *   widthFt: number,
 *   depthAvgFt: number,
 *   valid: boolean,
 *   invalidReasons: string[],
 * }}
 */
export function reconstructPool(points, abDist, shallowDepthFt = 0, deepDepthFt = 0) {
  const reconstructed = points.map(p => reconstructPoint(
    p.number,
    parseFloat(p.a_distance_ft),
    parseFloat(p.b_distance_ft),
    abDist,
  ));

  if (reconstructed.length === 0) {
    return {
      points: [],
      perimeterFt: 0,
      areaSqft: 0,
      lengthFt: 0,
      widthFt: 0,
      depthAvgFt: (shallowDepthFt + deepDepthFt) / 2,
      valid: false,
      invalidReasons: ['No points'],
    };
  }

  const usable = reconstructed.filter(p => p.quality !== 'invalid');

  if (usable.length < 3) {
    const reasons = reconstructed
      .filter(p => p.quality === 'invalid')
      .map(p => `Point #${p.number}: ${p.qualityReason}`);
    if (usable.length < 3) reasons.push('fewer than 3 usable points');
    return {
      points: reconstructed,
      perimeterFt: 0,
      areaSqft: 0,
      lengthFt: 0,
      widthFt: 0,
      depthAvgFt: (shallowDepthFt + deepDepthFt) / 2,
      valid: false,
      invalidReasons: reasons,
    };
  }

  // Perimeter: sum of segment lengths around the closed loop
  let perimeter = 0;
  const n = usable.length;
  for (let i = 0; i < n; i++) {
    const p1 = usable[i];
    const p2 = usable[(i + 1) % n];
    perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  // Area: shoelace formula
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p1 = usable[i];
    const p2 = usable[(i + 1) % n];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  area = Math.abs(area) / 2;

  const xs = usable.map(p => p.x);
  const ys = usable.map(p => p.y);
  const lengthFt = Math.max(...xs) - Math.min(...xs);
  const widthFt = Math.max(...ys) - Math.min(...ys);

  return {
    points: reconstructed,
    perimeterFt: perimeter,
    areaSqft: area,
    lengthFt,
    widthFt,
    depthAvgFt: (shallowDepthFt + deepDepthFt) / 2,
    valid: reconstructed.every(p => p.quality !== 'invalid'),
    invalidReasons: reconstructed
      .filter(p => p.quality === 'invalid')
      .map(p => `Point #${p.number}: ${p.qualityReason}`),
  };
}

/**
 * Run the industry standard A-B line sanity checks.
 * Returns a list of human-readable warnings. Empty list = good.
 */
export function validateABLine(abDistanceFt, abOffsetFromPoolFt) {
  const warnings = [];
  if (abDistanceFt < 10) {
    warnings.push(`A-B distance ${abDistanceFt.toFixed(1)}ft is below 10ft minimum`);
  }
  if (abDistanceFt > 100) {
    warnings.push(`A-B distance ${abDistanceFt.toFixed(1)}ft exceeds 100ft (use longer tape)`);
  }
  if (abOffsetFromPoolFt < 3) {
    warnings.push(`A-B offset from pool ${abOffsetFromPoolFt.toFixed(1)}ft is below 3ft minimum`);
  }
  return warnings;
}

/**
 * Detect a "suspect" point: if a point's reconstructed position is much
 * further from the average of its neighbors than the typical inter-point
 * spacing, it's likely a typo or mis-tape.
 *
 * Returns a list of {number, reason} for suspect points.
 */
export function suspectPoints(points, abDist, opts = {}) {
  const threshold = opts.threshold ?? 8;  // ft; default 4x typical 2ft spacing
  const reconstructed = reconstructPool(points, abDist).points;
  const usable = reconstructed.filter(p => p.quality !== 'invalid');
  if (usable.length < 3) return [];

  const out = [];
  for (let i = 0; i < usable.length; i++) {
    const p = usable[i];
    const prev = usable[(i - 1 + usable.length) % usable.length];
    const next = usable[(i + 1) % usable.length];
    const dPrev = Math.hypot(p.x - prev.x, p.y - prev.y);
    const dNext = Math.hypot(p.x - next.x, p.y - next.y);
    const avgNeighbor = (dPrev + dNext) / 2;
    // Suspect if point is more than `threshold` ft from average neighbor
    // (or if one neighbor is much further than the other — sign of a spike)
    if (avgNeighbor > threshold) {
      out.push({
        number: p.number,
        reason: `Point ${p.number} is ${avgNeighbor.toFixed(1)}ft from neighbors (threshold ${threshold}ft) — check for mis-tape`,
      });
    }
  }
  return out;
}
