/**
 * Port of frontend/tests/distance.test.js, case for case.
 *
 * The source's numeric `eq` helper was `Math.abs(a - b) < 1e-9`, which also
 * passes when a null is compared to null (null - null = 0). Null expectations
 * are asserted strictly here (`toBeNull`), which is at least as strong.
 */
import { describe, expect, it } from 'vitest';
import { formatDistance, parseDistance, parseInches, validateDistance } from '../src';

function eq(a: number | null, b: number | null) {
  if (b === null) {
    expect(a).toBeNull();
  } else {
    expect(a).not.toBeNull();
    expect(Math.abs(a! - b)).toBeLessThan(1e-9);
  }
}

describe('parseDistance', () => {
  it('1: pure decimal', () => {
    eq(parseDistance('12.25'), 12.25);
    eq(parseDistance('0'), 0);
    eq(parseDistance('100'), 100);
    eq(parseDistance(12.25), 12.25);
    eq(parseDistance(null), null);
    eq(parseDistance(''), null);
    eq(parseDistance('   '), null);
  });

  it('2: feet + fraction (industry notation: "12 1/4" is 12 ft ¼ in)', () => {
    eq(parseDistance('12 1/4'), 12 + 1 / 48);
    eq(parseDistance('12 1/2'), 12 + 1 / 24);
    eq(parseDistance('12 3/4'), 12 + 3 / 48);
    eq(parseDistance('12 1/8'), 12 + 1 / 96);
    eq(parseDistance('12 7/8'), 12 + 7 / 96);
  });

  it('3: feet + whole inches + fraction', () => {
    eq(parseDistance('12 3 1/4'), 12 + 3 / 12 + 1 / 48);
    eq(parseDistance('0 6'), 0.5);
    eq(parseDistance('0 6 1/2'), 0.5 + 1 / 24);
  });

  it('4: industry notation', () => {
    eq(parseDistance(`12' 3 1/4"`), 12 + 3 / 12 + 1 / 48);
    eq(parseDistance('12ft 3in'), 12 + 3 / 12);
    eq(parseDistance('12 feet 3 inches'), 12 + 3 / 12);
  });

  it('5: unicode fractions', () => {
    eq(parseDistance('12¼'), 12 + 1 / 48);
    eq(parseDistance('12½'), 12 + 1 / 24);
    eq(parseDistance('12¾'), 12 + 3 / 48);
    eq(parseDistance('12⅛'), 12 + 1 / 96);
    eq(parseDistance("12'3¼"), 12 + 3 / 12 + 1 / 48);
  });

  it('6: invalid', () => {
    eq(parseDistance('abc'), null);
    eq(parseDistance('12 13'), null);
    eq(parseDistance('12 1/0'), null);
    eq(parseDistance('-5'), -5); // negative allowed at parse level
  });
});

describe('parseInches', () => {
  it('2b: pure inches string', () => {
    eq(parseInches('3'), 3);
    eq(parseInches('1/4'), 0.25);
    eq(parseInches('3 1/4'), 3.25);
    eq(parseInches('3¼'), 3.25);
    eq(parseInches('11 1/2'), 11.5);
    eq(parseInches(null), null);
    eq(parseInches(''), null);
    eq(parseInches('abc'), null);
    eq(parseInches('12'), 12); // 12 inches (max) via the decimal quick path
    expect(parseInches('13') == null || parseInches('12 1/2') == null).toBe(true);
  });
});

describe('formatDistance', () => {
  it('7: whole + fraction', () => {
    expect(formatDistance(12.25)).toBe("12' 3\"");
    expect(formatDistance(12.27)).toBe("12' 3¼\"");
    expect(formatDistance(12.5)).toBe("12' 6\"");
    expect(formatDistance(12.75)).toBe("12' 9\"");
    expect(formatDistance(12.999)).toBe("13' 0\"");
    expect(formatDistance(0)).toBe("0' 0\"");
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(20)).toBe("20' 0\"");
  });

  it('7b: 1/8" precision', () => {
    const opts = { precision: 8, useUnicode: false };
    const r1 = formatDistance(12.125, opts);
    expect(r1.includes("12' 1") && r1.includes('/8'), `12.125 with 1/8" -> ${r1}`).toBe(true);
    const r2 = formatDistance(12.27, opts);
    expect(r2.includes("12' 3") && r2.includes('/8'), `12.27 with 1/8" -> ${r2}`).toBe(true);
  });
});

describe('validateDistance', () => {
  it('8', () => {
    const v1 = validateDistance('12 1/4');
    expect(v1.ok && v1.ft != null).toBe(true);
    const v2 = validateDistance('abc');
    expect(!v2.ok && Boolean(v2.error)).toBe(true);
    expect(validateDistance('600').ok).toBe(false);
    expect(validateDistance('-5').ok).toBe(false);
  });
});

describe('round-trip', () => {
  it('¼" precision round-trips cleanly from 0 to 100 ft', () => {
    let checked = 0;
    for (let ft = 0; ft <= 100; ft += 0.25) {
      const s = formatDistance(ft);
      const back = parseDistance(s);
      expect(back, `round-trip ${ft}: parse failed on "${s}"`).not.toBeNull();
      expect(Math.abs(back! - ft), `round-trip ${ft}: got ${back}`).toBeLessThanOrEqual(0.01);
      checked++;
    }
    expect(checked).toBe(401);
  });
});
