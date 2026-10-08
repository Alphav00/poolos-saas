import { beforeAll, describe, expect, test } from 'vitest';
import { MG_PER_EQ_AS_CACO3, PhreeqcError, liquidChlorineDose, type Analysis, type Answer, type PoolChemistry, type Water } from '../src';
import { chemistry, phreeqc } from './helpers';

// Made-up readings.
const WATER: Water = {
  temperatureF: 84,
  ph: 7.8,
  totalAlkalinity: 90,
  calciumHardness: 280,
  cyanuricAcid: 45,
  freeChlorine: 4,
  salt: 3200,
};
const ACID = { hclPercent: 31.45, densityGPerMl: 1.16 };
const DRY = { assayPercent: 100 };
const GALLONS = 18000;
const KG = GALLONS * 3.785411784;

let c: PoolChemistry;
beforeAll(async () => {
  c = await chemistry();
});

function value<T>(r: Answer<T>): T {
  if (!r.ok) throw new Error(`expected an answer, got questions: ${JSON.stringify(r.questions)}`);
  return r.value;
}

/** Within 0.01%. PHREEQC tracks the small change in water mass a dose causes,
 * so amounts per kg of water drift by about 1e-5 from plain stoichiometry. */
function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-4 * Math.abs(expected));
}

function questions<T>(r: Answer<T>): string[] {
  if (r.ok) throw new Error('expected questions, got an answer');
  return r.questions.map((q) => q.field);
}

describe('questions instead of guesses', () => {
  test('no salt and no TDS', () => {
    const { salt: _salt, ...w } = WATER;
    expect(questions(c.analyze(w))).toEqual(['salt']);
  });
  test('missing and impossible readings', () => {
    expect(questions(c.analyze({ ...WATER, cyanuricAcid: undefined as unknown as number }))).toEqual(['cyanuricAcid']);
    expect(questions(c.analyze({ ...WATER, ph: 15 }))).toEqual(['ph']);
    expect(questions(c.analyze({ ...WATER, totalAlkalinity: Number.NaN }))).toEqual(['totalAlkalinity']);
  });
  test('acid needs the label facts and a target below the reading', () => {
    expect(questions(c.acidToPh(WATER, 7.4, GALLONS, { hclPercent: 31.45 } as never))).toEqual(['densityGPerMl']);
    expect(questions(c.acidToPh(WATER, 7.9, GALLONS, ACID))).toEqual(['targetPh']);
    expect(questions(c.acidToPh(WATER, 7.4, 0, ACID))).toEqual(['gallons']);
  });
  test('salt dose needs a salt reading', () => {
    const { salt: _salt, ...w } = WATER;
    expect(questions(c.saltToTarget({ ...w, tds: 1500 }, 3400, GALLONS, DRY))).toEqual(['salt']);
  });
});

describe('analysis', () => {
  let a: Analysis;
  beforeAll(() => {
    a = value(c.analyze(WATER));
  });

  test('reads back what was entered', () => {
    expect(a.ph).toBeCloseTo(7.8, 9);
    expect(a.totalAlkalinity).toBeCloseTo(90, 6);
    expect(a.calciumHardness).toBeCloseTo(280, 6);
    expect(a.cyanuricAcid).toBeCloseTo(45, 6);
    expect(a.salt).toBeCloseTo(3200, 6);
    expect(a.chargeBalance.ion).toBe('Na');
    expect(Math.abs(a.chargeBalance.percentError)).toBeLessThan(1e-6);
  });

  test('alkalinity parts add up to the total, and cyanurate takes its share', () => {
    const p = a.alkalinity;
    expect(p.carbonate + p.cyanurate + p.borate + p.chlorine + p.water).toBeCloseTo(p.total, 9);
    expect(p.cyanurate).toBeGreaterThan(10);
    expect(p.carbonate).toBeLessThan(p.total - p.cyanurate + 1e-9);
  });

  test('chlorine parts add up to free chlorine, most of it held by CYA', () => {
    const cl = a.chlorine!;
    expect(cl.hocl + cl.ocl + cl.boundToCya).toBeCloseTo(4, 9);
    expect(cl.boundToCya).toBeGreaterThan(cl.hocl + cl.ocl);
    const noCya = value(c.analyze({ ...WATER, cyanuricAcid: 0 })).chlorine!;
    expect(noCya.boundToCya).toBeCloseTo(0, 12);
    expect(noCya.hocl).toBeGreaterThan(20 * cl.hocl);
  });

  test('warmer water is more scale-forming', () => {
    const cold = value(c.analyze({ ...WATER, temperatureF: 60 })).saturationIndex;
    const hot = value(c.analyze({ ...WATER, temperatureF: 100 })).saturationIndex;
    expect(hot).toBeGreaterThan(a.saturationIndex);
    expect(a.saturationIndex).toBeGreaterThan(cold);
  });

  test('shows its source and its input', () => {
    expect(a.engine.iphreeqcCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(a.phreeqcInput).toContain('SOLUTION 1');
    expect(a.assumptions.join(' ')).toContain('25 °C');
  });

  test('low salt with high calcium balances on chloride', () => {
    const r = value(c.analyze({ ...WATER, salt: 0, calciumHardness: 500, totalAlkalinity: 60 }));
    expect(r.chargeBalance.ion).toBe('Cl');
    expect(r.calciumHardness).toBeCloseTo(500, 6);
  });
});

describe('doses', () => {
  test('acid reaches the target pH and takes out one equivalent of alkalinity per mole', () => {
    const d = value(c.acidToPh(WATER, 7.4, GALLONS, ACID));
    expect(d.after!.ph).toBeCloseTo(7.4, 9);
    const taDrop = (WATER.totalAlkalinity - d.after!.totalAlkalinity) / MG_PER_EQ_AS_CACO3;
    near(taDrop, d.moles / KG);
    expect(d.milliliters).toBeCloseTo((d.moles * 36.461) / 0.3145 / 1.16, 6);
    expect(d.fluidOunces).toBeGreaterThan(0);
  });

  test('soda ash reaches the target pH and adds two equivalents per mole', () => {
    const w = { ...WATER, ph: 7.2 };
    const d = value(c.sodaAshToPh(w, 7.5, GALLONS, DRY));
    expect(d.after!.ph).toBeCloseTo(7.5, 9);
    near((d.after!.totalAlkalinity - w.totalAlkalinity) / MG_PER_EQ_AS_CACO3, (2 * d.moles) / KG);
  });

  test('baking soda lands on the target alkalinity and nudges pH up', () => {
    const d = value(c.bicarbonateToAlkalinity(WATER, 120, GALLONS, DRY));
    near(d.after!.totalAlkalinity, 120);
    expect(d.after!.ph).toBeGreaterThan(WATER.ph);
    const half = value(c.bicarbonateToAlkalinity(WATER, 120, GALLONS, { assayPercent: 50 }));
    expect(half.grams).toBeCloseTo(2 * d.grams, 9);
  });

  test('calcium chloride lands on the target hardness', () => {
    const d = value(c.calciumChlorideToHardness(WATER, 350, GALLONS, { ...DRY, form: 'anhydrous' }));
    near(d.after!.calciumHardness, 350);
    const di = value(c.calciumChlorideToHardness(WATER, 350, GALLONS, { ...DRY, form: 'dihydrate' }));
    expect(di.grams / d.grams).toBeCloseTo(147.018 / 110.986, 9);
  });

  test('stabilizer lands on the target CYA and lowers pH', () => {
    const d = value(c.cyanuricAcidToTarget(WATER, 60, GALLONS, DRY));
    near(d.after!.cyanuricAcid, 60);
    expect(d.after!.ph).toBeLessThan(WATER.ph);
  });

  test('salt lands on the target', () => {
    const d = value(c.saltToTarget(WATER, 3400, GALLONS, DRY));
    near(d.after!.salt, 3400);
    expect(d.pounds).toBeCloseTo((200 * KG) / 1000 / 453.59237, 9);
  });

  test('liquid chlorine by trade percent: 3 ppm in 20,000 gal of 12.5% is 61.44 fl oz', () => {
    const d = value(liquidChlorineDose(1, 4, 20000, { tradePercent: 12.5 }));
    // 3 mg/L x 75,708.2 L = 227.12 g Cl2; at 125 g/L that is 1,817.0 mL.
    expect(d.milliliters).toBeCloseTo((3 * 20000 * 3.785411784) / 125, 9);
    expect(d.fluidOunces).toBeCloseTo(61.44, 2);
    expect(questions(liquidChlorineDose(4, 3, 20000, { tradePercent: 12.5 }))).toEqual(['target']);
  });
});

test('PHREEQC errors come back as PhreeqcError with the input', async () => {
  const p = await phreeqc();
  expect(() => p.run('SOLUTION 1\n pH seven\nEND')).toThrow(PhreeqcError);
  // The engine still works after an error.
  expect(p.run('SOLUTION 1\nSELECTED_OUTPUT 1\n -reset false\n -pH true\nEND').rows[0]![0]).toBeCloseTo(7, 9);
});
