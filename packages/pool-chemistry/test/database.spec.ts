import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { combinedDatabase } from '../src';
import { PHREEQC_DAT, PHREEQC_DAT_SHA256, POOL_DAT, POOL_DAT_SHA256 } from '../src/database.generated';

const file = (name: string) => readFileSync(new URL(`../database/${name}`, import.meta.url));
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

describe('database', () => {
  test('phreeqc.dat is the USGS file from the pinned commit', () => {
    // phreeqc/build.sh copies it; this is its hash at that commit.
    expect(sha(file('phreeqc.dat'))).toBe('5b80d45c989cd1db7aab485e198321ba550d5902be8097c8be26d85ba03da278');
  });

  test('the embedded copy matches the files (run pnpm embed after editing them)', () => {
    expect(PHREEQC_DAT_SHA256).toBe(sha(file('phreeqc.dat')));
    expect(POOL_DAT_SHA256).toBe(sha(file('pool.dat')));
    expect(Buffer.from(PHREEQC_DAT, 'latin1').equals(file('phreeqc.dat'))).toBe(true);
    expect(POOL_DAT).toBe(file('pool.dat').toString('utf8'));
  });

  test('pool.dat goes in before the one END of phreeqc.dat, and nothing of phreeqc.dat changes', () => {
    const db = combinedDatabase();
    expect(db.length).toBe(PHREEQC_DAT.length + POOL_DAT.length + 1);
    expect(db.replace(`${POOL_DAT}\n`, '')).toBe(PHREEQC_DAT);
  });
});

// The pK table in pool.dat's header, transcribed from Wojtowicz (2001) Table 2.
const PK: Record<number, number> = {
  1: 1.8, 2: 3.75, 3: 2.93, 4: 5.33, 5: 4.07, 6: 6.88, 7: 4.51,
  8: 10.12, 9: 5.62, 10: 11.4, 11: 6.9, 12: 13.5, 13: 7.54,
};

function logK(species: string): number {
  const block = POOL_DAT.slice(POOL_DAT.indexOf('SOLUTION_SPECIES'), POOL_DAT.indexOf('PHASES'));
  const re = new RegExp(`= ${species.replace(/[+()]/g, '\\$&')}( |$)[^\\n]*\\n\\tlog_k (\\S+)`, 'm');
  const m = block.match(re);
  if (!m) throw new Error(`no species ${species} in pool.dat`);
  return Number(m[2]);
}

describe('pool.dat constants', () => {
  test('the header table is the one in the source', () => {
    for (const [n, pk] of Object.entries(PK)) {
      expect(POOL_DAT).toMatch(new RegExp(`#   pK${n} +.+ ${String(pk).replace('.', '\\.')}`));
    }
  });

  test('each log_k is the sum of the pK values named on its line', () => {
    const sum = (...terms: number[]) => Math.round(terms.reduce((a, b) => a + b, 0) * 100) / 100;
    expect(logK('OFc- + H+')).toBe(-PK[13]!);
    expect(logK('H2Cya- + H+')).toBe(-PK[6]!);
    expect(logK('HCya-2 + 2H+')).toBe(sum(-PK[6]!, -PK[10]!));
    expect(logK('Cya-3 + 3H+')).toBe(sum(-PK[6]!, -PK[10]!, -PK[12]!));
    expect(logK('H2FcCya + H2O')).toBe(PK[5]);
    expect(logK('HFcCya- + H+ + H2O')).toBe(sum(PK[5]!, -PK[4]!));
    expect(logK('FcCya-2 + 2H+ + H2O')).toBe(sum(PK[5]!, -PK[4]!, -PK[8]!));
    expect(logK('HFc2Cya + 2H2O')).toBe(sum(PK[5]!, PK[3]!));
    expect(logK('Fc2Cya- + H+ + 2H2O')).toBe(sum(PK[5]!, PK[3]!, -PK[2]!));
    expect(logK('Fc3Cya + 3H2O')).toBe(sum(PK[5]!, PK[3]!, PK[1]!));
  });

  test('the over-determined constants pK7, pK9, pK11 agree with the path taken', () => {
    // pK7: Cl2Cy- + H2O = HClCy- + HOCl
    expect(logK('Fc2Cya- + H+ + 2H2O') - logK('HFcCya- + H+ + H2O')).toBeCloseTo(PK[7]!, 2);
    // pK9: HClCy- + H2O = H2Cy- + HOCl
    expect(logK('HFcCya- + H+ + H2O') - logK('H2Cya- + H+')).toBeCloseTo(PK[9]!, 2);
    // pK11: ClCy2- + H2O = HCy2- + HOCl
    expect(logK('FcCya-2 + 2H+ + H2O') - logK('HCya-2 + 2H+')).toBeCloseTo(PK[11]!, 2);
  });
});
