// Pool water chemistry on PHREEQC.
//
// Every number this module returns about the water (saturation index, the
// split of alkalinity, hypochlorous acid, pH after a dose) is computed by
// PHREEQC from phreeqc.dat and pool.dat. This file only turns pool readings
// into PHREEQC input, reads the results back, and converts units. Product
// amounts use the exact unit definitions in units.ts and the product facts
// the caller supplies from the label; there are no built-in product defaults.
import { ENGINE_INFO, Phreeqc, PhreeqcError, type Cell, type EngineInfo } from './engine';
import {
  ELEMENT_GFW,
  GRAMS_PER_LB,
  GRAMS_PER_OZ,
  LITERS_PER_GALLON,
  MG_PER_EQ_AS_CACO3,
  ML_PER_FL_OZ,
  MOLAR_MASS,
  fahrenheitToCelsius,
} from './units';

/** One set of readings. Every concentration is ppm (mg/L). */
export interface Water {
  temperatureF: number;
  ph: number;
  /** Total alkalinity as measured by the test kit, ppm as CaCO3. */
  totalAlkalinity: number;
  /** Calcium hardness, ppm as CaCO3. */
  calciumHardness: number;
  /** Cyanuric acid; enter 0 when the pool has none. */
  cyanuricAcid: number;
  /** Free chlorine, ppm as Cl2. Leave out to skip the chlorine results. */
  freeChlorine?: number;
  /** Borates, ppm as boron (B). Leave out when none were added. */
  borates?: number;
  /** Salt, ppm as NaCl. One of salt or tds is needed. */
  salt?: number;
  /** Total dissolved solids, ppm. Used only when salt is not given. */
  tds?: number;
}

export interface Question {
  field: string;
  ask: string;
}

/** The engine either answers or asks; it never fills a gap with a guess. */
export type Answer<T> = { ok: true; value: T } | { ok: false; questions: Question[] };

const LIMITS: Record<keyof Water, { min: number; max: number; unit: string; label: string }> = {
  temperatureF: { min: 32, max: 122, unit: '°F', label: 'Water temperature' },
  ph: { min: 4, max: 10, unit: '', label: 'pH' },
  totalAlkalinity: { min: 0, max: 1000, unit: 'ppm', label: 'Total alkalinity' },
  calciumHardness: { min: 0, max: 2000, unit: 'ppm', label: 'Calcium hardness' },
  cyanuricAcid: { min: 0, max: 500, unit: 'ppm', label: 'Cyanuric acid' },
  freeChlorine: { min: 0, max: 100, unit: 'ppm', label: 'Free chlorine' },
  borates: { min: 0, max: 200, unit: 'ppm', label: 'Borates' },
  salt: { min: 0, max: 20000, unit: 'ppm', label: 'Salt' },
  tds: { min: 0, max: 20000, unit: 'ppm', label: 'TDS' },
};

const REQUIRED: (keyof Water)[] = ['temperatureF', 'ph', 'totalAlkalinity', 'calciumHardness', 'cyanuricAcid'];

/** Checks one number against its limits; returns a question or nothing. */
function checkNumber(field: string, value: unknown, min: number, max: number, label: string, unit: string): Question | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { field, ask: `What is the ${label.toLowerCase()} reading?` };
  }
  if (value < min || value > max) {
    const u = unit ? ` ${unit}` : '';
    return { field, ask: `${label} ${value}${u} is outside ${min} to ${max}${u}. Re-check the reading.` };
  }
  return null;
}

export function checkWater(water: Partial<Water>): Question[] {
  const questions: Question[] = [];
  for (const field of Object.keys(LIMITS) as (keyof Water)[]) {
    const value = water[field];
    if (value === undefined && !REQUIRED.includes(field)) continue;
    const l = LIMITS[field];
    const q = checkNumber(field, value, l.min, l.max, l.label, l.unit);
    if (q) questions.push(q);
  }
  if (water.salt === undefined && water.tds === undefined) {
    questions.push({
      field: 'salt',
      ask: 'What is the salt reading (salt pools) or the TDS (other pools)? The saturation index depends on it.',
    });
  }
  return questions;
}

// --- PHREEQC input --------------------------------------------------------

/** Alkalinity each aqueous species carries in PHREEQC's definition. */
const SPECIES = {
  // water and strong acid
  'H+': { alk: -1, group: 'water' },
  'OH-': { alk: 1, group: 'water' },
  H2: { alk: 0, group: 'water' },
  O2: { alk: 0, group: 'water' },
  HCl: { alk: -1, group: 'water' },
  'Cl-': { alk: 0, group: 'water' },
  'Na+': { alk: 0, group: 'water' },
  'Ca+2': { alk: 0, group: 'water' },
  'CaOH+': { alk: 1, group: 'water' },
  // carbonate (phreeqc.dat)
  CO2: { alk: 0, group: 'carbonate' },
  '(CO2)2': { alk: 0, group: 'carbonate' },
  'HCO3-': { alk: 1, group: 'carbonate' },
  'CO3-2': { alk: 2, group: 'carbonate' },
  NaHCO3: { alk: 1, group: 'carbonate' },
  'NaCO3-': { alk: 2, group: 'carbonate' },
  CaCO3: { alk: 2, group: 'carbonate' },
  'CaHCO3+': { alk: 1, group: 'carbonate' },
  CH4: { alk: 0, group: 'carbonate' },
  // borate (phreeqc.dat)
  H3BO3: { alk: 0, group: 'borate' },
  'H2BO3-': { alk: 1, group: 'borate' },
  // cyanurate and chlorine (pool.dat)
  H3Cya: { alk: 0, group: 'cyanurate' },
  'H2Cya-': { alk: 1, group: 'cyanurate' },
  'HCya-2': { alk: 2, group: 'cyanurate' },
  'Cya-3': { alk: 3, group: 'cyanurate' },
  H2FcCya: { alk: 0, group: 'cyanurate' },
  'HFcCya-': { alk: 1, group: 'cyanurate' },
  'FcCya-2': { alk: 2, group: 'cyanurate' },
  HFc2Cya: { alk: 0, group: 'cyanurate' },
  'Fc2Cya-': { alk: 1, group: 'cyanurate' },
  Fc3Cya: { alk: 0, group: 'cyanurate' },
  HOFc: { alk: 0, group: 'chlorine' },
  'OFc-': { alk: 1, group: 'chlorine' },
} as const satisfies Record<string, { alk: number; group: string }>;

type Species = keyof typeof SPECIES;
type Group = (typeof SPECIES)[Species]['group'];

/** Below this molality a species is noise and need not be in the table. */
const NEGLIGIBLE = 1e-20;

/** JS shortest round-trip form; PHREEQC reads it with strtod. */
const num = (x: number): string => String(x);

type Balance = 'Na' | 'Cl';

interface Composition {
  tempC: number;
  ph: number;
  /** mol/kgw, or eq/kgw for alkalinity */
  alkalinity: number;
  ca: number;
  cya: number;
  fc: number;
  b: number;
  na: number;
  cl: number;
}

function composition(w: Water): Composition {
  const nacl = (w.salt ?? w.tds ?? 0) / (MOLAR_MASS.NaCl * 1000);
  return {
    tempC: fahrenheitToCelsius(w.temperatureF),
    ph: w.ph,
    alkalinity: w.totalAlkalinity / MG_PER_EQ_AS_CACO3,
    ca: w.calciumHardness / (MOLAR_MASS.CaCO3 * 1000),
    cya: w.cyanuricAcid / (MOLAR_MASS.H3Cya * 1000),
    fc: (w.freeChlorine ?? 0) / (MOLAR_MASS.Cl2 * 1000),
    b: (w.borates ?? 0) / (ELEMENT_GFW.B * 1000),
    na: nacl,
    cl: nacl,
  };
}

function solutionBlock(c: Composition, balance: Balance): string {
  const lines = [
    'SOLUTION 1',
    ' units mol/kgw',
    ` temp ${num(c.tempC)}`,
    ` pH ${num(c.ph)}`,
    ` Alkalinity ${num(c.alkalinity)}`,
    ` Ca ${num(c.ca)}`,
  ];
  if (c.cya > 0) lines.push(` Cya ${num(c.cya)}`);
  if (c.fc > 0) lines.push(` Fc ${num(c.fc)}`);
  if (c.b > 0) lines.push(` B ${num(c.b)}`);
  // For the balancing ion the number is only PHREEQC's starting estimate, and
  // PHREEQC skips the balance when that estimate is zero.
  const ion = (name: Balance, value: number) =>
    balance === name ? ` ${name} ${num(value > 0 ? value : 1e-3)} charge` : ` ${name} ${num(value)}`;
  lines.push(ion('Na', c.na), ion('Cl', c.cl));
  return lines.join('\n');
}

const FIXED = ['pH', 'si_calcite', 'mu', 'pct_err', 'alk', 'tot_ca', 'tot_na', 'tot_cl', 'tot_cya', 'tot_fc', 'tot_b', 'equi_delta'];

function punchBlock(phase?: string): string {
  const delta = phase ? `EQUI_DELTA("${phase}")` : '0';
  return [
    'SELECTED_OUTPUT 1',
    ' -reset false',
    'USER_PUNCH 1',
    ` -headings ${FIXED.join(' ')}`,
    ' 10 PUNCH -LA("H+"), SI("Calcite"), MU, PERCENT_ERROR, ALK',
    ' 20 PUNCH TOT("Ca"), TOT("Na"), TOT("Cl"), TOT("Cya"), TOT("Fc"), TOT("B")',
    ` 30 PUNCH ${delta}`,
    ' 40 n = SYS("aq", count, name$, type$, moles)',
    ' 50 FOR i = 1 TO count',
    ' 60 PUNCH name$(i), MOL(name$(i))',
    ' 70 NEXT',
  ].join('\n');
}

// --- reading results ---------------------------------------------------------

/** The state of the water at one point, all in PHREEQC's own units. */
interface State {
  ph: number;
  siCalcite: number;
  ionicStrength: number;
  percentError: number;
  /** eq/kgw */
  alk: number;
  ca: number;
  na: number;
  cl: number;
  cya: number;
  fc: number;
  b: number;
  equiDelta: number;
  species: Map<Species, number>;
}

function asNumber(cell: Cell | undefined, what: string, input: string): number {
  if (typeof cell !== 'number' || !Number.isFinite(cell)) {
    throw new PhreeqcError(`PHREEQC returned no value for ${what}`, input);
  }
  return cell;
}

function readState(row: Cell[], input: string): State {
  const v = (i: number) => asNumber(row[i], FIXED[i] ?? `column ${i}`, input);
  const species = new Map<Species, number>();
  for (let i = FIXED.length; i + 1 < row.length; i += 2) {
    const name = row[i];
    if (name === null || name === undefined || name === '') continue;
    const molality = asNumber(row[i + 1], `molality of ${String(name)}`, input);
    if (!(String(name) in SPECIES)) {
      if (molality < NEGLIGIBLE) continue;
      throw new PhreeqcError(`PHREEQC formed ${String(name)}, which this module does not account for`, input);
    }
    species.set(name as Species, molality);
  }
  const state: State = {
    ph: v(0),
    siCalcite: v(1),
    ionicStrength: v(2),
    percentError: v(3),
    alk: v(4),
    ca: v(5),
    na: v(6),
    cl: v(7),
    cya: v(8),
    fc: v(9),
    b: v(10),
    equiDelta: v(11),
    species,
  };
  // Every equivalent of alkalinity must land in exactly one group.
  const sum = [...species].reduce((s, [name, m]) => s + SPECIES[name].alk * m, 0);
  if (Math.abs(sum - state.alk) > 1e-12 + 1e-9 * Math.abs(state.alk)) {
    throw new PhreeqcError(`alkalinity by species (${sum}) does not add up to PHREEQC's total (${state.alk})`, input);
  }
  return state;
}

function alkalinityOf(state: State, group: Group): number {
  let eq = 0;
  for (const [name, m] of state.species) if (SPECIES[name].group === group) eq += SPECIES[name].alk * m;
  return eq;
}

const molality = (state: State, s: Species): number => state.species.get(s) ?? 0;

// --- results -----------------------------------------------------------------

export interface Alkalinity {
  /** All ppm as CaCO3. total = carbonate + cyanurate + borate + chlorine + water. */
  total: number;
  carbonate: number;
  cyanurate: number;
  borate: number;
  chlorine: number;
  /** Hydroxide minus free acid, and CaOH+. */
  water: number;
}

export interface Chlorine {
  /** All ppm as Cl2. hocl + ocl + bound = free chlorine. */
  freeChlorine: number;
  /** Hypochlorous acid: the fast-killing form. */
  hocl: number;
  /** Hypochlorite ion. */
  ocl: number;
  /** Held by cyanuric acid as chloroisocyanurates; counts as free chlorine on a test kit. */
  boundToCya: number;
  hoclPercentOfFree: number;
}

export interface WaterState {
  ph: number;
  /** Calcite saturation index: log10 of (Ca2+ activity x CO3 2- activity / Ksp). */
  saturationIndex: number;
  ionicStrength: number;
  totalAlkalinity: number;
  calciumHardness: number;
  cyanuricAcid: number;
  salt: number;
  alkalinity: Alkalinity;
  chlorine: Chlorine | null;
}

export interface Analysis extends WaterState {
  temperatureC: number;
  /** Charge balance: which ion PHREEQC adjusted, and the error left. */
  chargeBalance: { ion: Balance; percentError: number };
  /** Everything taken as given that was not measured. */
  assumptions: string[];
  engine: EngineInfo;
  /** The exact PHREEQC input, so any result can be re-run by hand. */
  phreeqcInput: string;
}

function toWaterState(s: State): WaterState {
  const ppmAlk = (eq: number) => eq * MG_PER_EQ_AS_CACO3;
  const cl2 = MOLAR_MASS.Cl2 * 1000;
  const hocl = molality(s, 'HOFc');
  const ocl = molality(s, 'OFc-');
  return {
    ph: s.ph,
    saturationIndex: s.siCalcite,
    ionicStrength: s.ionicStrength,
    totalAlkalinity: ppmAlk(s.alk),
    calciumHardness: s.ca * MOLAR_MASS.CaCO3 * 1000,
    cyanuricAcid: s.cya * MOLAR_MASS.H3Cya * 1000,
    salt: s.cl * MOLAR_MASS.NaCl * 1000,
    alkalinity: {
      total: ppmAlk(s.alk),
      carbonate: ppmAlk(alkalinityOf(s, 'carbonate')),
      cyanurate: ppmAlk(alkalinityOf(s, 'cyanurate')),
      borate: ppmAlk(alkalinityOf(s, 'borate')),
      chlorine: ppmAlk(alkalinityOf(s, 'chlorine')),
      water: ppmAlk(alkalinityOf(s, 'water')),
    },
    chlorine:
      s.fc > 0
        ? {
            freeChlorine: s.fc * cl2,
            hocl: hocl * cl2,
            ocl: ocl * cl2,
            boundToCya: (s.fc - hocl - ocl) * cl2,
            hoclPercentOfFree: (100 * hocl) / s.fc,
          }
        : null,
  };
}

// --- the engine ---------------------------------------------------------------

export interface AcidProduct {
  /** Hydrochloric acid, weight percent HCl, from the label (e.g. 31.45). */
  hclPercent: number;
  /** Density in g/mL from the label or safety data sheet. */
  densityGPerMl: number;
}

export interface DryProduct {
  /** Purity from the label, weight percent. 100 when the label gives none. */
  assayPercent: number;
}

export interface LiquidChlorine {
  /** Trade percent: grams of available chlorine per 100 mL, from the label. */
  tradePercent: number;
}

export interface Dose {
  /** Amount of the active chemical added, mol. */
  moles: number;
  grams: number;
  pounds: number;
  ounces: number;
  /** Liquids only. */
  milliliters?: number;
  fluidOunces?: number;
  /** The water after the dose, mixed in, before any outgassing. Null when PHREEQC is not involved. */
  after: WaterState | null;
  method: string;
  phreeqcInput?: string;
}

interface Run {
  initial: State;
  final: State;
  input: string;
  balance: Balance;
}

export class PoolChemistry {
  private constructor(private readonly phreeqc: Phreeqc) {}

  static async create(wasm: WebAssembly.Module): Promise<PoolChemistry> {
    return new PoolChemistry(await Phreeqc.create(wasm));
  }

  /** Saturation index, alkalinity split and chlorine forms for one set of readings. */
  analyze(water: Water): Answer<Analysis> {
    const questions = checkWater(water);
    if (questions.length) return { ok: false, questions };
    const run = this.solve(water, '');
    const state = toWaterState(run.initial);
    return {
      ok: true,
      value: {
        ...state,
        temperatureC: fahrenheitToCelsius(water.temperatureF),
        chargeBalance: { ion: run.balance, percentError: run.initial.percentError },
        assumptions: assumptions(water, run.balance),
        engine: ENGINE_INFO,
        phreeqcInput: run.input,
      },
    };
  }

  /** Muriatic acid to bring pH down to the target, by PHREEQC titration. */
  acidToPh(water: Water, targetPh: number, gallons: number, acid: AcidProduct): Answer<Dose> {
    const questions = [
      ...checkWater(water),
      ...checkDose(targetPh, gallons),
      ...productQuestions({ hclPercent: [acid.hclPercent, 1, 40], densityGPerMl: [acid.densityGPerMl, 1, 1.3] }),
    ];
    if (!questions.length && targetPh >= water.ph) {
      questions.push({ field: 'targetPh', ask: `Acid lowers pH. The target ${targetPh} is not below the reading ${water.ph}.` });
    }
    if (questions.length) return { ok: false, questions };
    const run = this.solve(water, fixPh(targetPh, 'HCl'), 'Fix_H+');
    const molesPerKg = -run.final.equiDelta;
    const moles = molesPerKg * kgOfWater(gallons);
    const pure = moles * MOLAR_MASS.HCl;
    const product = pure / (acid.hclPercent / 100);
    const ml = product / acid.densityGPerMl;
    return {
      ok: true,
      value: {
        ...amounts(moles, product),
        milliliters: ml,
        fluidOunces: ml / ML_PER_FL_OZ,
        after: toWaterState(run.final),
        method: 'PHREEQC: HCl added until pH reaches the target (fixed-pH equilibrium phase)',
        phreeqcInput: run.input,
      },
    };
  }

  /** Soda ash (sodium carbonate) to bring pH up to the target, by PHREEQC titration. */
  sodaAshToPh(water: Water, targetPh: number, gallons: number, product: DryProduct): Answer<Dose> {
    const questions = [...checkWater(water), ...checkDose(targetPh, gallons), ...assayQuestions(product)];
    if (!questions.length && targetPh <= water.ph) {
      questions.push({ field: 'targetPh', ask: `Soda ash raises pH. The target ${targetPh} is not above the reading ${water.ph}.` });
    }
    if (questions.length) return { ok: false, questions };
    const run = this.solve(water, fixPh(targetPh, 'Na2CO3'), 'Fix_H+');
    const moles = -run.final.equiDelta * kgOfWater(gallons);
    return {
      ok: true,
      value: {
        ...amounts(moles, (moles * MOLAR_MASS.Na2CO3) / (product.assayPercent / 100)),
        after: toWaterState(run.final),
        method: 'PHREEQC: Na2CO3 added until pH reaches the target (fixed-pH equilibrium phase)',
        phreeqcInput: run.input,
      },
    };
  }

  /** Baking soda (sodium bicarbonate) to raise total alkalinity. One mole adds one equivalent. */
  bicarbonateToAlkalinity(water: Water, targetTa: number, gallons: number, product: DryProduct): Answer<Dose> {
    return this.raise(water, 'totalAlkalinity', targetTa, gallons, product, {
      formula: 'NaHCO3',
      molarMass: MOLAR_MASS.NaHCO3,
      perKg: (rise) => rise / MG_PER_EQ_AS_CACO3,
    });
  }

  /** Calcium chloride to raise calcium hardness. */
  calciumChlorideToHardness(
    water: Water,
    targetCh: number,
    gallons: number,
    product: DryProduct & { form: 'anhydrous' | 'dihydrate' },
  ): Answer<Dose> {
    return this.raise(water, 'calciumHardness', targetCh, gallons, product, {
      formula: 'CaCl2',
      molarMass: product.form === 'dihydrate' ? MOLAR_MASS.CaCl2_2H2O : MOLAR_MASS.CaCl2,
      perKg: (rise) => rise / (MOLAR_MASS.CaCO3 * 1000),
    });
  }

  /** Cyanuric acid (stabilizer) to raise CYA. */
  cyanuricAcidToTarget(water: Water, targetCya: number, gallons: number, product: DryProduct): Answer<Dose> {
    return this.raise(water, 'cyanuricAcid', targetCya, gallons, product, {
      formula: 'H3Cya',
      molarMass: MOLAR_MASS.H3Cya,
      perKg: (rise) => rise / (MOLAR_MASS.H3Cya * 1000),
    });
  }

  /** Salt (sodium chloride) to raise the salt reading. */
  saltToTarget(water: Water, targetSalt: number, gallons: number, product: DryProduct): Answer<Dose> {
    if (water.salt === undefined) {
      return { ok: false, questions: [{ field: 'salt', ask: 'What is the salt reading now? It is needed to work out how much to add.' }] };
    }
    return this.raise(water, 'salt', targetSalt, gallons, product, {
      formula: 'NaCl',
      molarMass: MOLAR_MASS.NaCl,
      perKg: (rise) => rise / (MOLAR_MASS.NaCl * 1000),
    });
  }

  private raise(
    water: Water,
    field: 'totalAlkalinity' | 'calciumHardness' | 'cyanuricAcid' | 'salt',
    target: number,
    gallons: number,
    product: DryProduct,
    chem: { formula: string; molarMass: number; perKg: (rise: number) => number },
  ): Answer<Dose> {
    const l = LIMITS[field];
    const questions = [
      ...checkWater(water),
      ...nonNull([checkNumber('target', target, l.min, l.max, `Target ${l.label.toLowerCase()}`, l.unit)]),
      ...checkGallons(gallons),
      ...assayQuestions(product),
    ];
    const now = water[field] ?? 0;
    if (!questions.length && target <= now) {
      questions.push({ field: 'target', ask: `The target ${target} is not above the reading ${now}. Nothing to add.` });
    }
    if (questions.length) return { ok: false, questions };
    const molesPerKg = chem.perKg(target - now);
    const run = this.solve(water, `REACTION 1\n ${chem.formula} 1\n ${num(molesPerKg)} moles`);
    const moles = molesPerKg * kgOfWater(gallons);
    return {
      ok: true,
      value: {
        ...amounts(moles, (moles * chem.molarMass) / (product.assayPercent / 100)),
        after: toWaterState(run.final),
        method: `${chem.formula} by stoichiometry; the water after the dose is from PHREEQC`,
        phreeqcInput: run.input,
      },
    };
  }

  private solve(water: Water, extra: string, phase?: string): Run {
    const c = composition(water);
    // Sodium carries the charge balance, as bicarbonate, soda ash and bleach
    // all add sodium. When there is too little sodium for that (very low salt
    // with high calcium), chloride carries it instead.
    let last: unknown;
    for (const balance of ['Na', 'Cl'] as const) {
      const input = [solutionBlock(c, balance), extra, punchBlock(phase), 'END'].filter(Boolean).join('\n');
      try {
        const table = this.phreeqc.run(input);
        const first = table.rows[0];
        const final = table.rows[table.rows.length - 1];
        if (!first || !final) throw new PhreeqcError('PHREEQC returned no results', input);
        const initial = readState(first, input);
        const balancedIon = balance === 'Na' ? initial.na : initial.cl;
        if (balancedIon <= 0 || Math.abs(initial.percentError) > 1) {
          last = new PhreeqcError(`charge balance on ${balance} failed`, input);
          continue;
        }
        return { initial, final: readState(final, input), input, balance };
      } catch (error) {
        last = error;
      }
    }
    throw last;
  }
}

/** Liquid chlorine to raise free chlorine. Trade percent is g of available chlorine per 100 mL. */
export function liquidChlorineDose(
  currentFc: number,
  targetFc: number,
  gallons: number,
  product: LiquidChlorine,
): Answer<Dose> {
  const questions = [
    ...nonNull([
      checkNumber('freeChlorine', currentFc, 0, 100, 'Free chlorine', 'ppm'),
      checkNumber('target', targetFc, 0, 100, 'Target free chlorine', 'ppm'),
    ]),
    ...checkGallons(gallons),
    ...productQuestions({ tradePercent: [product.tradePercent, 1, 20] }),
  ];
  if (!questions.length && targetFc <= currentFc) {
    questions.push({ field: 'target', ask: `The target ${targetFc} is not above the reading ${currentFc}. Nothing to add.` });
  }
  if (questions.length) return { ok: false, questions };
  const liters = gallons * LITERS_PER_GALLON;
  const grams = ((targetFc - currentFc) * liters) / 1000; // g of Cl2
  const ml = grams / (product.tradePercent / 100);
  return {
    ok: true,
    value: {
      ...amounts(grams / MOLAR_MASS.Cl2, grams),
      milliliters: ml,
      fluidOunces: ml / ML_PER_FL_OZ,
      after: null,
      method:
        'Available chlorine by definition of trade percent (Powell Fabrication & Manufacturing, Sodium Hypochlorite General Information Handbook). grams and pounds are of available chlorine, not of product.',
    },
  };
}

// --- helpers --------------------------------------------------------------------

function fixPh(targetPh: number, reagent: string): string {
  return `EQUILIBRIUM_PHASES 1\n Fix_H+ ${num(-targetPh)} ${reagent} 10\n -force_equality true`;
}

/** Pool water is taken as 1 kg per liter, the same basis as ppm = mg/L. */
const kgOfWater = (gallons: number): number => gallons * LITERS_PER_GALLON;

function amounts(moles: number, grams: number) {
  return { moles, grams, pounds: grams / GRAMS_PER_LB, ounces: grams / GRAMS_PER_OZ };
}

function nonNull<T>(xs: (T | null)[]): T[] {
  return xs.filter((x): x is T => x !== null);
}

function checkGallons(gallons: number): Question[] {
  return nonNull([checkNumber('gallons', gallons, 1, 2_000_000, 'Pool volume', 'gal')]);
}

function checkDose(targetPh: number, gallons: number): Question[] {
  return [...nonNull([checkNumber('targetPh', targetPh, 6.5, 8.5, 'Target pH', '')]), ...checkGallons(gallons)];
}

function assayQuestions(product: DryProduct): Question[] {
  return productQuestions({ assayPercent: [product.assayPercent, 1, 100] });
}

function productQuestions(facts: Record<string, [unknown, number, number]>): Question[] {
  const out: Question[] = [];
  for (const [field, [value, min, max]] of Object.entries(facts)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      out.push({ field, ask: `What does the product label give for ${field}?` });
    } else if (value < min || value > max) {
      out.push({ field, ask: `${field} ${value} is outside ${min} to ${max}. Re-check the label.` });
    }
  }
  return out;
}

function assumptions(water: Water, balance: Balance): string[] {
  const out = ['ppm is taken as mg per kg of water, and 1 L of pool water as 1 kg.'];
  if (water.salt === undefined) out.push('TDS is modeled as sodium chloride.');
  if (water.borates === undefined) out.push('No borates: none were entered.');
  if (water.freeChlorine === undefined) out.push('Free chlorine not entered: chlorine forms not computed.');
  if (water.cyanuricAcid > 0 || (water.freeChlorine ?? 0) > 0) {
    out.push('Chlorine and cyanuric acid constants are for 25 °C (O’Brien et al. 1974); the source gives no temperature dependence.');
  }
  out.push(
    balance === 'Na'
      ? 'Charge balanced with sodium, the usual partner of bicarbonate, soda ash and bleach.'
      : 'Charge balanced with chloride, because the readings left too little sodium.',
  );
  return out;
}

