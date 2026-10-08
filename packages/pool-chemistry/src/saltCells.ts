// Salt (NaCl) ranges for chlorine generator cells, by make and model.
//
// Every row is taken from the manufacturer's own manual, and carries the
// document, its URL and a verbatim quote so the number can be checked. A make
// or model that is not here returns a question, never a guess (DESIGN.md §3
// #10). Add a row only with the document open.
import type { Answer, Question } from './pool';

export interface SaltCellRange {
  make: string;
  /** Model names as the manufacturer prints them; matching ignores case, spaces and dashes. */
  models: string[];
  minPpm: number;
  maxPpm: number;
  /** The "ideal" or "recommended" figure, when the document gives one. */
  idealPpm?: number;
  /** One sentence from the document containing the numbers. */
  quote: string;
  document: string;
  url: string;
  /** When the document was read. */
  checked: string;
}

export const SALT_CELLS: readonly SaltCellRange[] = [];

export interface SaltCellMatch extends SaltCellRange {
  /** The model as entered, so the answer can be shown with it. */
  model: string;
  /** The salt the dose aims for: the ideal figure, else the middle of the range. */
  targetPpm: number;
  /** Short source line for a screen: "<make> <document>". */
  source: string;
}

/** Letters and digits only, lower case: "T-CELL-15" and "tcell 15" are the same model. */
export const cellKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function saltCellRange(make: string, model: string): Answer<SaltCellMatch> {
  const questions: Question[] = [];
  if (typeof make !== 'string' || !make.trim()) questions.push({ field: 'make', ask: 'Who makes the salt cell? It is on the cell or the control box.' });
  if (typeof model !== 'string' || !model.trim()) questions.push({ field: 'model', ask: 'Which model is the salt cell? It is printed on the cell.' });
  if (questions.length) return { ok: false, questions };
  const makes = SALT_CELLS.filter((r) => cellKey(r.make) === cellKey(make));
  if (!makes.length) {
    return {
      ok: false,
      questions: [{ field: 'make', ask: `No manufacturer range on file for "${make}". Which make is it? Known: ${knownMakes().join(', ') || 'none yet'}.` }],
    };
  }
  const row = makes.find((r) => r.models.some((m) => cellKey(m) === cellKey(model)));
  if (!row) {
    const models = makes.flatMap((r) => r.models);
    return {
      ok: false,
      questions: [{ field: 'model', ask: `No ${make} range on file for model "${model}". Which is it? Known: ${models.join(', ')}.` }],
    };
  }
  return {
    ok: true,
    value: {
      ...row,
      model,
      targetPpm: row.idealPpm ?? (row.minPpm + row.maxPpm) / 2,
      source: `${row.make} ${row.document}`,
    },
  };
}

export const knownMakes = (): string[] => [...new Set(SALT_CELLS.map((r) => r.make))];
