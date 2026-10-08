// The WebAssembly build of PHREEQC against a native build of the same commit
// (oracle/native.py). Same source and database, different compiler.
//
// The two builds take slightly different floating-point paths through
// PHREEQC's iterations, so they agree to its convergence tolerance (about
// 1e-8 relative), not bit for bit. The test allows 1e-6.
import { gunzipSync, gzipSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';
import type { Cell, Phreeqc, PoolChemistry } from '../src';
import { waters } from './cases';
import { chemistry, phreeqc } from './helpers';

const INPUTS = new URL('../oracle/inputs.json.gz', import.meta.url);
const GOLDENS = new URL('./goldens/native.json.gz', import.meta.url);
const ACID = { hclPercent: 31.45, densityGPerMl: 1.16 };
const DRY = { assayPercent: 100 };

function collectInputs(c: PoolChemistry): { name: string; input: string }[] {
  const out: { name: string; input: string }[] = [];
  const add = (name: string, r: { ok: boolean; value?: { phreeqcInput?: string } }) => {
    if (r.ok && r.value?.phreeqcInput) out.push({ name, input: r.value.phreeqcInput });
  };
  for (const { name, water } of waters) {
    add(`analyze ${name}`, c.analyze(water));
    if (water.ph > 7.4) add(`acid ${name}`, c.acidToPh(water, 7.4, 20000, ACID));
    if (water.ph < 7.6) add(`soda ash ${name}`, c.sodaAshToPh(water, 7.6, 20000, DRY));
    if (water.totalAlkalinity < 100) add(`bicarb ${name}`, c.bicarbonateToAlkalinity(water, 100, 20000, DRY));
    if (water.calciumHardness < 300)
      add(`calcium ${name}`, c.calciumChlorideToHardness(water, 300, 20000, { ...DRY, form: 'anhydrous' }));
    if (water.cyanuricAcid < 50) add(`cya ${name}`, c.cyanuricAcidToTarget(water, 50, 20000, DRY));
  }
  return out;
}

const FIXED_COLUMNS = 12;
function split(row: Cell[]): { fixed: Cell[]; species: Map<string, Cell> } {
  const species = new Map<string, Cell>();
  for (let i = FIXED_COLUMNS; i + 1 < row.length; i += 2) {
    if (row[i] !== null && row[i] !== '') species.set(String(row[i]), row[i + 1]!);
  }
  return { fixed: row.slice(0, FIXED_COLUMNS), species };
}

const PERCENT_ERROR_COLUMN = 3;
// Trace H2, O2 and CH4 follow the redox potential, which pool readings do not
// fix. No result uses them (none carries alkalinity), so they are skipped.
const REDOX_TRACE = new Set(['H2', 'O2', 'CH4']);

const close = (a: Cell, b: Cell, floor = 1e-18): boolean => {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b)) + floor;
  }
  return a === b;
};

describe('PHREEQC: WebAssembly build matches the native build', () => {
  let c: PoolChemistry;
  let p: Phreeqc;
  let inputs: { name: string; input: string }[];
  beforeAll(async () => {
    c = await chemistry();
    p = await phreeqc();
    inputs = collectInputs(c);
    if (process.env.GOLDEN_DUMP) writeFileSync(INPUTS, gzipSync(JSON.stringify(inputs), { level: 9 }));
  });

  test('the committed inputs are the ones this module builds today', () => {
    expect(existsSync(INPUTS), 'run GOLDEN_DUMP=1 vitest run test/parity.spec.ts').toBe(true);
    const committed = JSON.parse(gunzipSync(readFileSync(INPUTS)).toString()) as { name: string; input: string }[];
    expect(committed).toEqual(inputs);
  });

  test('every number agrees', () => {
    const goldens = JSON.parse(gunzipSync(readFileSync(GOLDENS)).toString()) as {
      name: string;
      rows?: Cell[][];
      error?: string;
    }[];
    expect(goldens.length).toBe(inputs.length);
    expect(goldens.length).toBeGreaterThan(400);
    let numbers = 0;
    for (const [i, { name, input }] of inputs.entries()) {
      const golden = goldens[i]!;
      expect(golden.name).toBe(name);
      expect(golden.error, name).toBeUndefined();
      const table = p.run(input);
      const rows = [table.headings, ...table.rows];
      expect(rows.length, name).toBe(golden.rows!.length);
      for (const [r, row] of rows.entries()) {
        const want = golden.rows![r]!;
        // The fixed columns line up. After them come (species, molality)
        // pairs sorted by molality, and species at ~zero can sort either way
        // between builds, so those are compared by name.
        const a = split(row);
        const b = split(want);
        expect(a.fixed.length, `${name} row ${r}`).toBe(b.fixed.length);
        for (const [k, cell] of a.fixed.entries()) {
          if (!close(cell, b.fixed[k]!, k === PERCENT_ERROR_COLUMN ? 1e-7 : 1e-18)) expect.fail(`${name} row ${r} col ${k}: wasm ${String(cell)} native ${String(b.fixed[k])}`);
          if (typeof cell === 'number') numbers++;
        }
        expect([...a.species.keys()].sort(), `${name} row ${r} species`).toEqual([...b.species.keys()].sort());
        for (const [species, m] of a.species) {
          if (REDOX_TRACE.has(species)) continue;
          if (!close(m, b.species.get(species)!)) expect.fail(`${name} row ${r} ${species}: wasm ${m} native ${b.species.get(species)}`);
          numbers++;
        }
      }
    }
    expect(numbers).toBeGreaterThan(10000);
  });
});
