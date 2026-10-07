/**
 * Tests for the cross-dim validation logic (used by CrossDimensionsForm).
 * Run with: node tests/crossDimValidation.test.js
 */
import { classifyCrossDim, entryWarning } from '../src/lib/utils/crossDimValidation.js';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) {
  if (a === b) pass++;
  else { fail++; fails.push(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}

// ---------- 1. Empty / zero distance ----------
{
  const r = classifyCrossDim(0, 30, 16);
  eq(r.role, '-', '1: zero distance -> role "-"');
  eq(r.status, 'none', '1: zero distance -> status "none"');
}
{
  const r = classifyCrossDim(null, 30, 16);
  eq(r.role, '-', '1: null -> role "-"');
}
{
  const r = classifyCrossDim(-5, 30, 16);
  eq(r.role, '-', '1: negative -> role "-"');
}

// ---------- 2. Length detection (length > width) ----------
{
  // dist within 10% of length (30 * 0.10 = 3ft) -> Length
  const r = classifyCrossDim(30, 30, 16);
  eq(r.role, 'Length', '2a: dist=length -> Length');
  eq(r.status, 'green', '2a: exact length -> green');
}
{
  const r = classifyCrossDim(31, 30, 16);  // off by 1ft
  // green: max(0.3, 0.5) = 0.5, diff 1 > 0.5; yellow: max(1.5, 2) = 2, diff 1 < 2
  eq(r.role, 'Length', '2b: dist=31 still Length');
  eq(r.status, 'yellow', '2b: 1ft off on 30ft -> yellow');
}
{
  const r = classifyCrossDim(33, 30, 16);  // off by 3ft
  eq(r.role, 'Length', '2c: dist=33 still Length (within 10%)');
  eq(r.status, 'red', '2c: 3ft off on 30ft -> red');
  ok(r.message.includes('off') && r.message.includes('3'), '2c: message says off 3ft');
}
{
  const r = classifyCrossDim(40, 30, 16);  // off by 10ft -> Diagonal
  eq(r.role, 'Diagonal', '2d: dist=40 -> Diagonal (10% threshold)');
}

// ---------- 3. Width detection ----------
{
  const r = classifyCrossDim(16, 30, 16);
  eq(r.role, 'Width', '3a: dist=width -> Width');
  eq(r.status, 'green', '3a: exact width -> green');
}
{
  const r = classifyCrossDim(17, 30, 16);  // off by 1ft
  // green: max(0.16, 0.5) = 0.5, diff 1 > 0.5; yellow: max(0.8, 2) = 2, diff 1 < 2
  eq(r.role, 'Width', '3b: dist=17 -> Width');
  eq(r.status, 'yellow', '3b: 1ft off on 16ft -> yellow');
}

// ---------- 4. Equal length and width (square pool) ----------
{
  // lengthFt == widthFt -- the spec falls through to Width
  const r = classifyCrossDim(20, 20, 20);
  eq(r.role, 'Width', '4: tied L/W -> Width (spec)');
}

// ---------- 5. No reconstruction (lengthFt or widthFt = 0) ----------
{
  const r = classifyCrossDim(30, 0, 0);
  eq(r.role, 'Diagonal', '5: no reconstruction -> Diagonal');
  eq(r.status, 'info', '5: Diagonal -> info');
}

// ---------- 6. Diagonal: any distance that doesn't match L or W ----------
{
  // length=30, width=16; 25 is > 3ft from length, > 1.6ft from width -> Diagonal
  const r = classifyCrossDim(25, 30, 16);
  eq(r.role, 'Diagonal', '6: 25ft on 30x16 -> Diagonal');
  eq(r.status, 'info', '6: Diagonal status is info');
}

// ---------- 7. entryWarning: structural validation ----------
{
  eq(entryWarning({ from_point: 1, to_point: 2 }, 5), null, '7a: valid entry -> null');
  eq(entryWarning({ from_point: 1, to_point: 1 }, 5), 'from and to must differ', '7b: same point');
  eq(entryWarning({ from_point: 0, to_point: 2 }, 5), 'point 0 doesn\'t exist (1\u20135)', '7c: from out of range');
  eq(entryWarning({ from_point: 1, to_point: 6 }, 5), 'point 6 doesn\'t exist (1\u20135)', '7d: to out of range');
  eq(entryWarning({ from_point: 1, to_point: 2 }, 0), 'capture the perimeter first', '7e: no perimeter points');
  eq(entryWarning({ from_point: null, to_point: 2 }, 5), 'select both points', '7f: missing from');
  eq(entryWarning({}, 5), 'select both points', '7g: empty entry');
  eq(entryWarning({ from_point: 'a', to_point: 2 }, 5), 'point a doesn\'t exist (1\u20135)', '7h: non-numeric from');
}

// ---------- 8. Tolerance floors (within role threshold) ----------
{
  // On a small pool (10ft length), 5% = 0.5ft but min floor is 2ft
  const r = classifyCrossDim(11, 10, 5);  // off by 1ft, within 10% role
  // green: max(0.1, 0.5) = 0.5, diff 1 > 0.5; yellow: max(0.5, 2) = 2, diff 1 < 2
  eq(r.status, 'yellow', '8a: small pool uses 2ft yellow floor');
}
{
  // Off by 0.4ft on small pool (within 10% role = 1ft)
  const r = classifyCrossDim(10.4, 10, 5);  // off by 0.4ft
  // green: max(0.1, 0.5) = 0.5, diff 0.4 < 0.5 -> green
  eq(r.status, 'green', '8b: 0.4ft off within 0.5ft green floor -> green');
}
{
  // 3ft off on a 10ft pool = 30% off, OUT of role threshold -> Diagonal
  const r = classifyCrossDim(13, 10, 5);
  eq(r.role, 'Diagonal', '8c: 3ft off on small pool out of role -> Diagonal');
}

// ---------- 9. Big pool uses percentages ----------
{
  // 50ft length, off by 0.4ft (0.8%) -> green (under 1%)
  const r = classifyCrossDim(50.4, 50, 25);
  eq(r.status, 'green', '9a: 0.8% off on 50ft -> green');
}
{
  // 50ft length, off by 2ft (4%) -> yellow
  const r = classifyCrossDim(52, 50, 25);
  eq(r.status, 'yellow', '9b: 4% off on 50ft -> yellow');
}
{
  // 50ft length, off by 5ft (10%) -> red
  const r = classifyCrossDim(55, 50, 25);
  eq(r.status, 'red', '9c: 10% off on 50ft -> red');
}

console.log(`\nCross-dim validation tests: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of fails.slice(0, 10)) console.log(`  - ${f}`);
  if (fails.length > 10) console.log(`  ... and ${fails.length - 10} more`);
  process.exit(1);
}
