/**
 * The Python-compatibility helpers the ports rely on, checked against values
 * produced by CPython itself.
 */
import { describe, expect, it } from 'vitest';
import { pyFixed, pyRound, toNum } from '../src';
import { PY_GOLDEN } from './golden/python';
import { PyRandom } from './helpers';

describe('pyFixed / pyRound match CPython', () => {
  for (const row of PY_GOLDEN.format as Array<[number, string, string, string, number, number, number]>) {
    const [x, f2, f1, f0, r3, r2, r0] = row;
    it(`x = ${Object.is(x, -0) ? '-0' : x}`, () => {
      expect(pyFixed(x, 2)).toBe(f2);
      expect(pyFixed(x, 1)).toBe(f1);
      expect(pyFixed(x, 0)).toBe(f0);
      expect(pyRound(x, 3) === r3).toBe(true);
      expect(pyRound(x, 2) === r2).toBe(true);
      expect(pyRound(x) === r0).toBe(true);
    });
  }

  it('differs from toFixed on exact ties (the reason it exists)', () => {
    expect((0.125).toFixed(2)).toBe('0.13');
    expect(pyFixed(0.125, 2)).toBe('0.12');
  });

  it('toNum coerces decimal strings and nullish values', () => {
    expect(toNum('12.5')).toBe(12.5);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });
});

describe('PyRandom reproduces random.Random(42)', () => {
  it('random() and uniform() sequences', () => {
    const rng = new PyRandom(42);
    const got = [
      ...Array.from({ length: 5 }, () => rng.random()),
      ...Array.from({ length: 5 }, () => rng.uniform(-0.1, 0.1)),
    ];
    expect(got).toEqual(PY_GOLDEN.random42);
  });
});
