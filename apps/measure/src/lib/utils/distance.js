/**
 * Distance parsing/formatting.
 *
 * Industry forms use feet-and-inches with ¼" precision. The data model
 * stores decimal feet. This module bridges the two.
 *
 * Accepted input formats (parseDistance):
 *   "12.25"         -> 12.25 ft            (decimal feet)
 *   "12"            -> 12 ft               (whole feet)
 *   "12 1/4"        -> 12.25 ft            (feet + fraction)
 *   "12 3 1/4"      -> 12.270833... ft     (feet + whole inches + fraction)
 *   "12' 3 1/4\""   -> 12.270833... ft     (full industry notation)
 *   "12ft 3in"      -> 12.25 ft            (verbose)
 *   "12'3¼"         -> 12.270833... ft     (unicode fractions)
 *   "" or null      -> null
 *   invalid         -> null
 *
 * Output format (formatDistance, ¼" precision by default):
 *   12.25  -> "12' 3\""
 *   12.27  -> "12' 3¼\""
 *   12.5   -> "12' 6\""
 *   12.999 -> "13' 0\""
 *
 * Tolerances:
 *   Parse errors are silent (returns null). Format rounding uses Math.round
 *   to nearest 1/precision inch.
 */

// Map unicode vulgar fractions to " n/d " strings
const UNICODE_FRACTIONS = {
  '\u00BC': ' 1/4',   // ¼
  '\u00BD': ' 1/2',   // ½
  '\u00BE': ' 3/4',   // ¾
  '\u215B': ' 1/8',   // ⅛
  '\u215C': ' 3/8',   // ⅜
  '\u215D': ' 5/8',   // ⅝
  '\u215E': ' 7/8',   // ⅞
};

/**
 * Parse a distance string and return decimal feet, or null if invalid.
 */
export function parseDistance(input) {
  if (input == null) return null;
  if (typeof input === 'number') {
    return isFinite(input) ? input : null;
  }
  const s = String(input).trim();
  if (!s) return null;

  // Quick path: pure decimal
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }

  // Replace unicode fractions and strip quotes / unit suffixes
  let cleaned = s;
  for (const [ch, repl] of Object.entries(UNICODE_FRACTIONS)) {
    cleaned = cleaned.split(ch).join(repl);
  }
  cleaned = cleaned
    .replace(/["'`´]/g, ' ')   // " ' ` ´
    // Strip unit tokens (ft, feet, in, inch, inches) anywhere they appear,
    // even when attached to a number with no separator.
    .replace(/(\d)\s*(ft|feet|in|inch|inches)\b/gi, '$1')
    .replace(/\b(ft|feet|in|inch|inches)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Tokenize on whitespace
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 3) return null;

  // First token must be a number (the feet, possibly negative)
  const sign = tokens[0].startsWith('-') ? -1 : 1;
  const feetMatch = tokens[0].match(/^-?(\d+)$/);
  if (!feetMatch) return null;
  const feet = parseInt(feetMatch[1], 10);

  let wholeInches = 0;
  let fracNumer = 0;
  let fracDenom = 1;

  if (tokens.length === 2) {
    // Either "ft whole_in" or "ft num/den"
    const t = tokens[1];
    const fracM = t.match(/^(\d+)\/(\d+)$/);
    if (fracM) {
      fracNumer = parseInt(fracM[1], 10);
      fracDenom = parseInt(fracM[2], 10);
      if (fracDenom === 0) return null;
    } else if (/^\d+$/.test(t)) {
      wholeInches = parseInt(t, 10);
    } else {
      return null;
    }
  } else if (tokens.length === 3) {
    // "ft whole_in num/den"
    if (!/^\d+$/.test(tokens[1])) return null;
    wholeInches = parseInt(tokens[1], 10);
    const fracM = tokens[2].match(/^(\d+)\/(\d+)$/);
    if (!fracM) return null;
    fracNumer = parseInt(fracM[1], 10);
    fracDenom = parseInt(fracM[2], 10);
    if (fracDenom === 0) return null;
  }

  const inches = wholeInches + fracNumer / fracDenom;
  if (inches >= 12) return null;
  if (inches < 0) return null;

  return sign * (feet + inches / 12);
}

/**
 * Format decimal feet as "X' Yn/m\"" with given inch precision (default 1/4").
 *
 *   formatDistance(12.25)   -> "12' 3\""
 *   formatDistance(12.27)   -> "12' 3¼\""
 *   formatDistance(12.5)    -> "12' 6\""
 *   formatDistance(12.999)  -> "13' 0\""
 *   formatDistance(0)       -> "0' 0\""
 *   formatDistance(null)    -> ""
 */
export function formatDistance(ft, options = {}) {
  if (ft == null || !isFinite(ft) || ft < 0) return '';
  const { precision = 4, useUnicode = true } = options;

  const wholeFeet = Math.floor(ft);
  const totalInches = (ft - wholeFeet) * 12;
  const wholeInches = Math.floor(totalInches);
  const fracInches = totalInches - wholeInches;

  // Round fraction to nearest precision-th of an inch
  const fracNum = Math.round(fracInches * precision);
  let outFeet = wholeFeet;
  let outInches = wholeInches;
  let outFracNum = fracNum;

  if (fracNum === precision) {
    // Rounded up to next whole inch
    outInches += 1;
    outFracNum = 0;
    if (outInches === 12) {
      outFeet += 1;
      outInches = 0;
    }
  }

  let result = `${outFeet}' ${outInches}`;
  if (outFracNum > 0) {
    if (useUnicode) {
      // Common fractions: 1/4 1/2 3/4 for precision=4
      const map = { 1: '\u00BC', 2: '\u00BD', 3: '\u00BE' };
      if (precision === 4 && map[outFracNum]) {
        result += map[outFracNum];
      } else {
        result += ` ${outFracNum}/${precision}`;
      }
    } else {
      result += ` ${outFracNum}/${precision}`;
    }
  }
  result += '"';
  return result;
}

/**
 * Validate a distance string without parsing it to a number.
 * Returns { ok: true, ft: number } or { ok: false, error: string }.
 */
export function validateDistance(input) {
  const ft = parseDistance(input);
  if (ft == null) {
    return { ok: false, error: 'Could not parse distance. Try "12 1/4" or "12.25".' };
  }
  if (ft < 0) {
    return { ok: false, error: 'Distance cannot be negative.' };
  }
  if (ft > 500) {
    return { ok: false, error: 'Distance over 500ft is unreasonable.' };
  }
  return { ok: true, ft };
}

/**
 * Parse just an inches value (1/4, 3 1/4, 7, 11 1/2, etc.) to decimal inches.
 *
 *   parseInches("1/4")    -> 0.25
 *   parseInches("3 1/4")  -> 3.25
 *   parseInches("11½")    -> 11.5
 *   parseInches("")       -> null
 *   parseInches("abc")    -> null
 *   parseInches("12 1/2") -> null  (>= 12 inches is invalid for a single inches field)
 */
export function parseInches(input) {
  if (input == null) return null;
  if (typeof input === 'number') {
    return isFinite(input) ? input : null;
  }
  const s = String(input).trim();
  if (!s) return null;

  // Quick path: pure decimal
  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }

  // Replace unicode fractions and strip unit suffixes
  let cleaned = s;
  for (const [ch, repl] of Object.entries(UNICODE_FRACTIONS)) {
    cleaned = cleaned.split(ch).join(repl);
  }
  cleaned = cleaned
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
    const t = tokens[0];
    const fracM = t.match(/^(\d+)\/(\d+)$/);
    if (fracM) {
      fracNumer = parseInt(fracM[1], 10);
      fracDenom = parseInt(fracM[2], 10);
      if (fracDenom === 0) return null;
    } else if (/^\d+$/.test(t)) {
      whole = parseInt(t, 10);
    } else {
      return null;
    }
  } else {
    // tokens.length === 2: "whole frac"
    if (!/^\d+$/.test(tokens[0])) return null;
    whole = parseInt(tokens[0], 10);
    const fracM = tokens[1].match(/^(\d+)\/(\d+)$/);
    if (!fracM) return null;
    fracNumer = parseInt(fracM[1], 10);
    fracDenom = parseInt(fracM[2], 10);
    if (fracDenom === 0) return null;
  }

  const inches = whole + fracNumer / fracDenom;
  if (inches >= 12 || inches < 0) return null;
  return inches;
}
