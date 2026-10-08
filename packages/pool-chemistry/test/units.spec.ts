import { describe, expect, test } from 'vitest';
import { ELEMENT_GFW, GRAMS_PER_OZ, LITERS_PER_GALLON, ML_PER_FL_OZ, MOLAR_MASS, fahrenheitToCelsius } from '../src';
import { PHREEQC_DAT } from '../src/database.generated';

describe('units', () => {
  test('element weights are the ones in phreeqc.dat', () => {
    const block = PHREEQC_DAT.slice(PHREEQC_DAT.indexOf('SOLUTION_MASTER_SPECIES'), PHREEQC_DAT.indexOf('SOLUTION_SPECIES'));
    for (const [el, gfw] of Object.entries(ELEMENT_GFW)) {
      const line = block.split('\n').find((l) => l.split(/\s+/)[0] === el);
      expect(line, el).toBeDefined();
      expect(Number(line!.trim().split(/\s+/)[4]), el).toBe(gfw);
    }
  });

  test('exact definitions', () => {
    expect(LITERS_PER_GALLON).toBeCloseTo((231 * 2.54 ** 3) / 1000, 12);
    expect(ML_PER_FL_OZ).toBeCloseTo(29.5735295625, 10);
    expect(GRAMS_PER_OZ).toBe(28.349523125);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(MOLAR_MASS.CaCO3).toBeCloseTo(100.0911, 10);
  });
});
