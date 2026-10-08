// Exact unit definitions and the molar masses PHREEQC itself uses.

/** US gallon, exactly 231 cubic inches (NIST Handbook 44, Appendix C). */
export const LITERS_PER_GALLON = 3.785411784;
/** US fluid ounce, 1/128 US gallon. */
export const ML_PER_FL_OZ = (LITERS_PER_GALLON * 1000) / 128;
/** Avoirdupois pound, exactly 0.45359237 kg. */
export const GRAMS_PER_LB = 453.59237;
/** Avoirdupois ounce, 1/16 pound. */
export const GRAMS_PER_OZ = GRAMS_PER_LB / 16;

export const fahrenheitToCelsius = (f: number): number => ((f - 32) * 5) / 9;

/**
 * Element weights from the SOLUTION_MASTER_SPECIES block of phreeqc.dat
 * (last column), so every mass here matches PHREEQC's own unit conversions.
 * test/units.spec.ts reads them back out of the database.
 */
export const ELEMENT_GFW = {
  H: 1.008,
  O: 16,
  C: 12.0111,
  Ca: 40.08,
  Na: 22.9898,
  Cl: 35.453,
  B: 10.81,
} as const;

const g = ELEMENT_GFW;
export const MOLAR_MASS = {
  CaCO3: g.Ca + g.C + 3 * g.O,
  HCl: g.H + g.Cl,
  NaCl: g.Na + g.Cl,
  NaHCO3: g.Na + g.H + g.C + 3 * g.O,
  Na2CO3: 2 * g.Na + g.C + 3 * g.O,
  CaCl2: g.Ca + 2 * g.Cl,
  CaCl2_2H2O: g.Ca + 2 * g.Cl + 2 * (2 * g.H + g.O),
  Cl2: 2 * g.Cl,
  /** Input weight of cyanuric acid in pool.dat. */
  H3Cya: 129.07,
} as const;

/** mg of CaCO3 per equivalent: how "ppm as CaCO3" turns into eq/L. */
export const MG_PER_EQ_AS_CACO3 = (MOLAR_MASS.CaCO3 * 1000) / 2;
