/**
 * Distance parsing / formatting. Port of `frontend/src/lib/utils/distance.js`
 * (JS-only; the backend stores decimal feet and has no parser).
 *
 * Field forms use feet-and-inches to ¼"; the data model stores decimal feet.
 *
 * Input formats accepted by `parseDistance` (feet first, then inches):
 *   "12.25"        -> 12.25 ft            decimal feet
 *   "12"           -> 12 ft
 *   "12 1/4"       -> 12 ft + ¼ in        = 12.0208… ft  (feet + inch fraction)
 *   "12 3 1/4"     -> 12 ft + 3¼ in       = 12.2708… ft
 *   "12' 3 1/4\""  -> 12.2708… ft         full industry notation
 *   "12ft 3in"     -> 12.25 ft
 *   "12'3¼"        -> 12.2708… ft         unicode vulgar fractions
 *   "" / null / garbage -> null
 *
 * Note: the source file's header comment claimed "12 1/4" -> 12.25 ft; its
 * code and tests (which this port follows) read it as 12 ft ¼ in.
 *
 * `formatDistance` renders decimal feet as X' Y" with ¼" precision by default:
 *   12.25 -> 12' 3"   12.27 -> 12' 3¼"   12.999 -> 13' 0"
 */

const UNICODE_FRACTIONS: ReadonlyArray<readonly [string, string]> = [
  ['¼', ' 1/4'], // ¼
  ['½', ' 1/2'], // ½
  ['¾', ' 3/4'], // ¾
  ['⅛', ' 1/8'], // ⅛
  ['⅜', ' 3/8'], // ⅜
  ['⅝', ' 5/8'], // ⅝
  ['⅞', ' 7/8'], // ⅞
];

function replaceUnicodeFractions(s: string): string {
  let out = s;
  for (const [ch, repl] of UNICODE_FRACTIONS) out = out.split(ch).join(repl);
  return out;
}

/** Parse a distance string to decimal feet, or null if invalid. */
export function parseDistance(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = String(input).trim();
  if (!s) return null;

  // Quick path: pure decimal
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  const cleaned = replaceUnicodeFractions(s)
    .replace(/["'`´]/g, ' ')
    // Strip unit tokens anywhere, even attached to a number.
    .replace(/(\d)\s*(ft|feet|in|inch|inches)\b/gi, '$1')
    .replace(/\b(ft|feet|in|inch|inches)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 3) return null;

  const first = tokens[0]!;
  const sign = first.startsWith('-') ? -1 : 1;
  const feetMatch = first.match(/^-?(\d+)$/);
  if (!feetMatch) return null;
  const feet = parseInt(feetMatch[1]!, 10);

  let wholeInches = 0;
  let fracNumer = 0;
  let fracDenom = 1;

  if (tokens.length === 2) {
    const t = tokens[1]!;
    const fracM = t.match(/^(\d+)\/(\d+)$/);
    if (fracM) {
      fracNumer = parseInt(fracM[1]!, 10);
      fracDenom = parseInt(fracM[2]!, 10);
      if (fracDenom === 0) return null;
    } else if (/^\d+$/.test(t)) {
      wholeInches = parseInt(t, 10);
    } else {
      return null;
    }
  } else if (tokens.length === 3) {
    if (!/^\d+$/.test(tokens[1]!)) return null;
    wholeInches = parseInt(tokens[1]!, 10);
    const fracM = tokens[2]!.match(/^(\d+)\/(\d+)$/);
    if (!fracM) return null;
    fracNumer = parseInt(fracM[1]!, 10);
    fracDenom = parseInt(fracM[2]!, 10);
    if (fracDenom === 0) return null;
  }

  const inches = wholeInches + fracNumer / fracDenom;
  if (inches >= 12) return null;
  if (inches < 0) return null;

  return sign * (feet + inches / 12);
}

export interface FormatDistanceOptions {
  /** Inch denominator to round to (4 = ¼"). */
  precision?: number;
  /** Use ¼ ½ ¾ glyphs when precision is 4. */
  useUnicode?: boolean;
}

/** Format decimal feet as `X' Y"` (with a fraction when non-zero). */
export function formatDistance(
  ft: number | null | undefined,
  options: FormatDistanceOptions = {},
): string {
  if (ft === null || ft === undefined || !Number.isFinite(ft) || ft < 0) return '';
  const { precision = 4, useUnicode = true } = options;

  const wholeFeet = Math.floor(ft);
  const totalInches = (ft - wholeFeet) * 12;
  const wholeInches = Math.floor(totalInches);
  const fracInches = totalInches - wholeInches;

  const fracNum = Math.round(fracInches * precision);
  let outFeet = wholeFeet;
  let outInches = wholeInches;
  let outFracNum = fracNum;

  if (fracNum === precision) {
    outInches += 1;
    outFracNum = 0;
    if (outInches === 12) {
      outFeet += 1;
      outInches = 0;
    }
  }

  let result = `${outFeet}' ${outInches}`;
  if (outFracNum > 0) {
    const glyphs: Record<number, string> = { 1: '¼', 2: '½', 3: '¾' };
    const glyph = glyphs[outFracNum];
    if (useUnicode && precision === 4 && glyph !== undefined) {
      result += glyph;
    } else {
      result += ` ${outFracNum}/${precision}`;
    }
  }
  return `${result}"`;
}

export type DistanceValidation = { ok: true; ft: number } | { ok: false; error: string };

/** Parse and range-check a distance entry. */
export function validateDistance(input: string | number | null | undefined): DistanceValidation {
  const ft = parseDistance(input);
  if (ft === null) return { ok: false, error: 'Could not parse distance. Try "12 1/4" or "12.25".' };
  if (ft < 0) return { ok: false, error: 'Distance cannot be negative.' };
  if (ft > 500) return { ok: false, error: 'Distance over 500ft is unreasonable.' };
  return { ok: true, ft };
}

/**
 * Parse an inches-only value ("1/4", "3 1/4", "11½", "7") to decimal inches,
 * or null. Values of 12" or more are rejected, except a bare decimal on the
 * quick path ("12" -> 12), which the source also lets through.
 */
export function parseInches(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = String(input).trim();
  if (!s) return null;

  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  const cleaned = replaceUnicodeFractions(s)
    .replace(/["'`´]/g, ' ')
    .replace(/\b(?:in|inch|inches)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 2) return null;

  let whole = 0;
  let fracNumer = 0;
  let fracDenom = 1;

  if (tokens.length === 1) {
    const t = tokens[0]!;
    const fracM = t.match(/^(\d+)\/(\d+)$/);
    if (fracM) {
      fracNumer = parseInt(fracM[1]!, 10);
      fracDenom = parseInt(fracM[2]!, 10);
      if (fracDenom === 0) return null;
    } else if (/^\d+$/.test(t)) {
      whole = parseInt(t, 10);
    } else {
      return null;
    }
  } else {
    if (!/^\d+$/.test(tokens[0]!)) return null;
    whole = parseInt(tokens[0]!, 10);
    const fracM = tokens[1]!.match(/^(\d+)\/(\d+)$/);
    if (!fracM) return null;
    fracNumer = parseInt(fracM[1]!, 10);
    fracDenom = parseInt(fracM[2]!, 10);
    if (fracDenom === 0) return null;
  }

  const inches = whole + fracNumer / fracDenom;
  if (inches >= 12 || inches < 0) return null;
  return inches;
}
