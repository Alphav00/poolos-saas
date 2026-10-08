import { describe, expect, test } from 'vitest';
import { SALT_CELLS, cellKey, knownMakes, saltCellRange } from '../src';

describe('salt cell ranges', () => {
  test('unknown make or model is a question, not a number', () => {
    const r = saltCellRange('Sample', 'Model X');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.questions.map((q) => q.field)).toEqual(['make']);
    const blank = saltCellRange('', '');
    if (!blank.ok) expect(blank.questions.map((q) => q.field)).toEqual(['make', 'model']);
    if (SALT_CELLS.length) {
      const m = saltCellRange(SALT_CELLS[0]!.make, 'no-such-model');
      expect(m.ok).toBe(false);
      if (!m.ok) expect(m.questions[0]!.field).toBe('model');
    }
  });

  test('every row carries its manufacturer document, a quote with the numbers, and a sane range', () => {
    for (const row of SALT_CELLS) {
      const name = `${row.make} ${row.models.join('/')}`;
      expect(row.url, name).toMatch(/^https:\/\//);
      expect(row.document.length, name).toBeGreaterThan(5);
      expect(row.quote.length, name).toBeGreaterThan(10);
      expect(row.checked, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.minPpm, name).toBeGreaterThan(500);
      expect(row.maxPpm, name).toBeGreaterThan(row.minPpm);
      expect(row.maxPpm, name).toBeLessThan(10000);
      if (row.idealPpm !== undefined) {
        expect(row.idealPpm, name).toBeGreaterThanOrEqual(row.minPpm);
        expect(row.idealPpm, name).toBeLessThanOrEqual(row.maxPpm);
      }
      // The quote must contain the numbers it is cited for, in ppm or g/L.
      const digits = row.quote.replace(/,/g, '');
      for (const n of [row.minPpm, row.maxPpm]) {
        const ok = digits.includes(String(n)) || digits.includes(String(n / 1000)) || digits.includes(`${n / 1000}`.replace(/\.?0+$/, ''));
        expect(ok, `${name}: quote does not contain ${n}`).toBe(true);
      }
      expect(row.models.length, name).toBeGreaterThan(0);
    }
  });

  test('matching ignores case, spaces and dashes', () => {
    expect(cellKey('T-CELL-15')).toBe('tcell15');
    expect(cellKey('t cell 15')).toBe('tcell15');
    for (const row of SALT_CELLS) {
      for (const model of row.models) {
        const r = saltCellRange(row.make.toUpperCase(), model.replace(/-/g, ' ').toLowerCase());
        expect(r.ok, `${row.make} ${model}`).toBe(true);
        if (r.ok) {
          expect(r.value.targetPpm).toBeGreaterThanOrEqual(row.minPpm);
          expect(r.value.targetPpm).toBeLessThanOrEqual(row.maxPpm);
          expect(r.value.source).toContain(row.make);
        }
      }
    }
    expect(knownMakes()).toEqual([...new Set(SALT_CELLS.map((r) => r.make))]);
  });
});
