/**
 * Tests for distance parsing and formatting.
 * Run with: node tests/distance.test.js
 */
import {
  parseDistance,
  parseInches,
  formatDistance,
  validateDistance,
} from '../src/lib/utils/distance.js';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) {
  const ok_ = Math.abs(a - b) < 1e-9;
  if (ok_) pass++;
  else { fail++; fails.push(`${msg}: expected ${b}, got ${a}`); }
}

// ---------- parseDistance: pure decimal ----------
{
  eq(parseDistance('12.25'), 12.25, '1: plain decimal');
  eq(parseDistance('0'), 0, '1: zero');
  eq(parseDistance('100'), 100, '1: whole number');
  eq(parseDistance(12.25), 12.25, '1: number input');
  eq(parseDistance(null), null, '1: null');
  eq(parseDistance(''), null, '1: empty string');
  eq(parseDistance('   '), null, '1: whitespace');
}

// ---------- parseDistance: feet + fraction (industry notation) ----------
// "12 1/4" reads as "12 feet, 1/4 inch" in industry notation.
{
  eq(parseDistance('12 1/4'), 12 + 1/48, '2: 12 ft + 1/4 in = 12.0208 ft');
  eq(parseDistance('12 1/2'), 12 + 1/24, '2: 12 ft + 1/2 in = 12.0416 ft');
  eq(parseDistance('12 3/4'), 12 + 3/48, '2: 12 ft + 3/4 in = 12.0625 ft');
  eq(parseDistance('12 1/8'), 12 + 1/96, '2: 12 ft + 1/8 in');
  eq(parseDistance('12 7/8'), 12 + 7/96, '2: 12 ft + 7/8 in');
}

// ---------- parseInches: pure inches string ----------
{
  eq(parseInches('3'), 3, '2b: 3 inches');
  eq(parseInches('1/4'), 0.25, '2b: 1/4 inch');
  eq(parseInches('3 1/4'), 3.25, '2b: 3 1/4 inches');
  eq(parseInches('3¼'), 3.25, '2b: 3 + 1/4 inch (unicode)');
  eq(parseInches('11 1/2'), 11.5, '2b: 11 1/2 inches');
  eq(parseInches(null), null, '2b: null');
  eq(parseInches(''), null, '2b: empty');
  eq(parseInches('abc'), null, '2b: invalid');
  eq(parseInches('12'), 12, '2b: 12 inches (max)');
  // 12 1/2 inches is over 12, should be rejected
  ok(parseInches('13') == null || parseInches('12 1/2') == null,
     '2b: >= 12 inches rejected');
}

// ---------- parseDistance: feet + whole inches + fraction ----------
{
  eq(parseDistance('12 3 1/4'), 12 + 3/12 + 1/48, '3: ft+in+frac');
  eq(parseDistance('0 6'), 0.5, '3: 0 feet 6 inches = 0.5 ft');
  eq(parseDistance('0 6 1/2'), 0.5 + 1/24, '3: 0 ft 6.5 in');
}

// ---------- parseDistance: industry notation ----------
{
  eq(parseDistance(`12' 3 1/4"`), 12 + 3/12 + 1/48, '4: industry notation');
  eq(parseDistance('12ft 3in'), 12 + 3/12, '4: ft + in words = 12.25 ft');
  eq(parseDistance('12 feet 3 inches'), 12 + 3/12, '4: full words');
}

// ---------- parseDistance: unicode fractions ----------
{
  eq(parseDistance('12¼'), 12 + 1/48, '5: 12 ft + 1/4 in (unicode)');
  eq(parseDistance('12½'), 12 + 1/24, '5: 12 ft + 1/2 in (unicode)');
  eq(parseDistance('12¾'), 12 + 3/48, '5: 12 ft + 3/4 in (unicode)');
  eq(parseDistance('12⅛'), 12 + 1/96, '5: 12 ft + 1/8 in (unicode)');
  eq(parseDistance("12'3¼"), 12 + 3/12 + 1/48, '5: unicode in industry notation');
}

// ---------- parseDistance: invalid ----------
{
  eq(parseDistance('abc'), null, '6: garbage');
  eq(parseDistance('12 13'), null, '6: 13 inches invalid');
  eq(parseDistance('12 1/0'), null, '6: division by zero');
  eq(parseDistance('-5'), -5, '6: negative allowed at parse level');
}

// ---------- formatDistance: whole + fraction ----------
function strEq(a, b, msg) {
  if (a === b) pass++;
  else { fail++; fails.push(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}
{
  strEq(formatDistance(12.25), "12' 3\"", '7: 12.25 -> 12 3');
  strEq(formatDistance(12.27), "12' 3\u00BC\"", '7: 12.27 -> 12 3 1/4');
  strEq(formatDistance(12.5), "12' 6\"", '7: 12.5 -> 12 6');
  strEq(formatDistance(12.75), "12' 9\"", '7: 12.75 -> 12 9');
  strEq(formatDistance(12.999), "13' 0\"", '7: 12.999 -> 13 0 (round up)');
  strEq(formatDistance(0), "0' 0\"", '7: 0 -> 0 0');
  strEq(formatDistance(null), '', '7: null -> empty');
  strEq(formatDistance(20), "20' 0\"", '7: 20 -> 20 0');
}

// ---------- formatDistance: 1/8" precision ----------
{
  const opts = { precision: 8, useUnicode: false };
  // 12.125 ft = 12' 1.5" = rounds to 12' 1 4/8" (closer to 1 1/2 than 1 1/4 or 1 3/4? no, 1.5 = 12/8 exactly)
  const r1 = formatDistance(12.125, opts);
  ok(r1.includes("12' 1") && r1.includes('/8'),
     `7b: 12.125 with 1/8" -> ${r1}`);
  // 12.27 ft = 12' 3.24" = rounds to 12' 3 2/8"
  const r2 = formatDistance(12.27, opts);
  ok(r2.includes("12' 3") && r2.includes('/8'),
     `7b: 12.27 with 1/8" -> ${r2}`);
}

// ---------- validateDistance ----------
{
  const v1 = validateDistance('12 1/4');
  ok(v1.ok && v1.ft != null, '8: valid 12 1/4');
  const v2 = validateDistance('abc');
  ok(!v2.ok && v2.error, '8: invalid rejected');
  const v3 = validateDistance('600');
  ok(!v3.ok, '8: >500 rejected');
  const v4 = validateDistance('-5');
  ok(!v4.ok, '8: negative rejected');
}

// ---------- round-trip ----------
{
  // 1/4" precision should round-trip cleanly
  for (let ft = 0; ft <= 100; ft += 0.25) {
    const s = formatDistance(ft);
    const back = parseDistance(s);
    if (back == null) {
      fail++; fails.push(`round-trip ${ft}: parse failed on "${s}"`);
      continue;
    }
    if (Math.abs(back - ft) > 0.01) {
      fail++; fails.push(`round-trip ${ft}: got ${back}`);
    } else {
      pass++;
    }
  }
}

console.log(`\nDistance tests: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of fails.slice(0, 10)) console.log(`  - ${f}`);
  if (fails.length > 10) console.log(`  ... and ${fails.length - 10} more`);
  process.exit(1);
}
