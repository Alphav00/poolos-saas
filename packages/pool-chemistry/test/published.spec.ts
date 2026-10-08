// Checks against published numbers that were computed independently of PHREEQC.
import { beforeAll, describe, expect, test } from 'vitest';
import type { PoolChemistry } from '../src';
import { chemistry } from './helpers';

let c: PoolChemistry;
beforeAll(async () => {
  c = await chemistry();
});

describe('hypochlorous acid with cyanuric acid: Wojtowicz (2001) Table 4', () => {
  // Wojtowicz, "Relative Bactericidal Effectiveness of Hypochlorous Acid and
  // Chloroisocyanurates", JSPSI 2(1): 34-41, Table 4: HOCl (ppm as av. Cl) at
  // 25 °C, computed by his own program from the O'Brien constants.
  // [pH, cyanuric acid ppm, av. Cl ppm, HOCl ppm]
  const rows: [number, number, number, number][] = [
    [7, 0, 0.23, 0.178], [7, 25, 0.25, 0.00525], [7, 50, 0.24, 0.00254], [7, 100, 0.24, 0.00127],
    [7, 25, 0.48, 0.0102], [7, 50, 0.48, 0.00511], [7, 100, 0.48, 0.00255],
    [7, 25, 0.98, 0.0214], [7, 50, 0.97, 0.0104], [7, 100, 0.97, 0.0052],
    [9, 0, 0.23, 0.0078], [9, 25, 0.24, 0.00209], [9, 50, 0.24, 0.0012], [9, 100, 0.24, 0.000644],
    [9, 0, 0.47, 0.016], [9, 25, 0.48, 0.00422],
    // Printed as 0.0241, ten times its neighbours: a dropped zero. 0.00241 is
    // what the rest of the table implies.
    [9, 50, 0.48, 0.00241],
    [9, 100, 0.47, 0.00127], [9, 0, 0.96, 0.0326], [9, 25, 0.98, 0.00876], [9, 50, 0.97, 0.00492],
    [9, 100, 0.95, 0.00258],
  ];

  test.each(rows)('pH %d, CYA %d, FC %d: HOCl %d', (ph, cya, fc, hocl) => {
    // Distilled water: no alkalinity, hardness or salt, as in the source.
    const r = c.analyze({ temperatureF: 77, ph, totalAlkalinity: 0, calciumHardness: 0, cyanuricAcid: cya, freeChlorine: fc, salt: 0 });
    if (!r.ok) throw new Error(JSON.stringify(r.questions));
    // He used concentrations; PHREEQC uses activities. At these ionic
    // strengths that differs by under 2.5%.
    expect(r.value.chlorine!.hocl / hocl).toBeGreaterThan(0.975);
    expect(r.value.chlorine!.hocl / hocl).toBeLessThan(1.025);
  });
});

describe('saturation index: Wojtowicz revised equation', () => {
  // Wojtowicz, "A Revised and Updated Saturation Index Equation":
  // SI = pH + log Hard + log CarbAlk + TC + C, TC = 0.0155 °C,
  // C = -11.30 - 0.333 log TDS. It is a regression with no ion pairs, so it
  // should track PHREEQC closely but not exactly.
  test('PHREEQC agrees within 0.07 across normal pool water', () => {
    let worst = 0;
    for (const t of [60, 80, 95])
      for (const ph of [7.2, 7.5, 7.8])
        for (const ta of [60, 100, 140])
          for (const ch of [150, 300, 450])
            for (const cya of [0, 50])
              for (const tds of [1000, 3000]) {
                const r = c.analyze({ temperatureF: t, ph, totalAlkalinity: ta, calciumHardness: ch, cyanuricAcid: cya, tds });
                if (!r.ok) throw new Error(JSON.stringify(r.questions));
                const v = r.value;
                const si = ph + Math.log10(ch) + Math.log10(v.alkalinity.carbonate) + 0.0155 * v.temperatureC - 11.3 - 0.333 * Math.log10(tds);
                worst = Math.max(worst, Math.abs(v.saturationIndex - si));
              }
    // 0.063 with the pinned engine; the bound leaves room for a PHREEQC update, not for a regression.
    expect(worst, `worst |PHREEQC SI − Wojtowicz SI| = ${worst.toFixed(4)}`).toBeLessThan(0.07);
  });
});
