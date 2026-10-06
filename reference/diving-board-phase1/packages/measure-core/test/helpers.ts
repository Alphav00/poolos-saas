/**
 * Test helpers shared by the ported suites.
 */

/**
 * CPython's `random.Random(seed)` for a non-negative int seed below 2^32:
 * MT19937 seeded through init_by_array([seed]), `random()` built from two
 * draws as 53-bit precision, `uniform(a, b) = a + (b - a) * random()`.
 * Needed to port test_rectangular_with_realistic_tape_noise with the exact
 * same noise sequence as the Python test.
 */
export class PyRandom {
  private readonly mt = new Uint32Array(624);
  private mti = 625;

  constructor(seed: number) {
    this.initByArray([seed >>> 0]);
  }

  private initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = mt[i - 1]!;
      mt[i] = (Math.imul(1812433253, prev ^ (prev >>> 30)) + i) >>> 0;
    }
    this.mti = 624;
  }

  private initByArray(key: number[]): void {
    const mt = this.mt;
    const n = 624;
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(n, key.length); k > 0; k--) {
      const prev = mt[i - 1]!;
      mt[i] = ((mt[i]! ^ Math.imul(prev ^ (prev >>> 30), 1664525)) + key[j]! + j) >>> 0;
      i++; j++;
      if (i >= n) { mt[0] = mt[n - 1]!; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (let k = n - 1; k > 0; k--) {
      const prev = mt[i - 1]!;
      mt[i] = ((mt[i]! ^ Math.imul(prev ^ (prev >>> 30), 1566083941)) - i) >>> 0;
      i++;
      if (i >= n) { mt[0] = mt[n - 1]!; i = 1; }
    }
    mt[0] = 0x80000000;
  }

  private genrandUint32(): number {
    const mt = this.mt;
    const n = 624;
    const m = 397;
    if (this.mti >= n) {
      let kk = 0;
      const mag = (y: number): number => ((y & 1) ? 0x9908b0df : 0);
      for (; kk < n - m; kk++) {
        const y = (mt[kk]! & 0x80000000) | (mt[kk + 1]! & 0x7fffffff);
        mt[kk] = (mt[kk + m]! ^ (y >>> 1) ^ mag(y)) >>> 0;
      }
      for (; kk < n - 1; kk++) {
        const y = (mt[kk]! & 0x80000000) | (mt[kk + 1]! & 0x7fffffff);
        mt[kk] = (mt[kk + (m - n)]! ^ (y >>> 1) ^ mag(y)) >>> 0;
      }
      const y = (mt[n - 1]! & 0x80000000) | (mt[0]! & 0x7fffffff);
      mt[n - 1] = (mt[m - 1]! ^ (y >>> 1) ^ mag(y)) >>> 0;
      this.mti = 0;
    }
    let y = mt[this.mti++]!;
    y ^= y >>> 11;
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
    y ^= y >>> 18;
    return y >>> 0;
  }

  random(): number {
    const a = this.genrandUint32() >>> 5;
    const b = this.genrandUint32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}

/** Python's `round(x)` for the n = max(1, round(len / step)) densifiers. */
export function pyRoundInt(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/** `ab_distances_for_points` from test_ab_math.py. */
export function abDistancesForPoints(
  pointsXY: ReadonlyArray<readonly [number, number]>,
  aXY: readonly [number, number],
  bXY: readonly [number, number],
): Array<[number, number, number]> {
  return pointsXY.map(([x, y], i) => [
    i + 1,
    Math.hypot(x - aXY[0], y - aXY[1]),
    Math.hypot(x - bXY[0], y - bXY[1]),
  ]);
}

/** The 3 ft densified 30×16 rectangle used by several test_ab_math.py cases. */
export function densifiedRectangle(): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const sides: Array<[[number, number], [number, number], number]> = [
    [[4.0, 4.0], [34.0, 4.0], 3.0],
    [[34.0, 4.0], [34.0, 20.0], 3.0],
    [[34.0, 20.0], [4.0, 20.0], 3.0],
    [[4.0, 20.0], [4.0, 4.0], 3.0],
  ];
  for (const [[x0, y0], [x1, y1], step] of sides) {
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, pyRoundInt(segLen / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  }
  return pts;
}

/** pytest.approx default: rel 1e-6 or abs 1e-12, whichever is larger. */
export function approx(actual: number, expected: number, rel = 1e-6, abs = 1e-12): boolean {
  return Math.abs(actual - expected) <= Math.max(rel * Math.abs(expected), abs);
}
