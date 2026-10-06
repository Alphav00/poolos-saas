/**
 * Python-faithful number formatting and rounding.
 *
 * The backend builds its messages with `f"{x:.2f}"` and rounds API values with
 * `round(x, n)`. Both round the exact binary value half-to-even, where JS's
 * `toFixed` rounds exact ties away from zero (`(0.125).toFixed(2)` is "0.13",
 * Python gives "0.12"). These helpers reproduce Python's output so messages and
 * rounded values match the backend digit for digit.
 */
import type { Numeric } from './types';

/** Coerce a number or decimal string to a float, as Python's `float()` would. */
export function toNum(v: Numeric | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v);
}

/** `f"{x:.{places}f}"` in Python. */
export function pyFixed(x: number, places: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  const neg = x < 0 || Object.is(x, -0);
  const ax = Math.abs(x);
  if (ax >= 1e21) return (neg ? '-' : '') + ax.toFixed(places);

  // toFixed(100) is the exact decimal expansion to 100 places, which is far
  // more than enough to see whether the value sits exactly on a tie.
  const exact = ax.toFixed(100);
  const dot = exact.indexOf('.');
  const intDigits = exact.slice(0, dot);
  const fracDigits = exact.slice(dot + 1);
  const tail = fracDigits.slice(places);

  let body: string;
  if (tail[0] === '5' && /^0*$/.test(tail.slice(1))) {
    // Exact tie: round half to even.
    const kept = intDigits + fracDigits.slice(0, places);
    let n = BigInt(kept);
    if (n % 2n === 1n) n += 1n;
    const digits = n.toString().padStart(places + 1, '0');
    body = places > 0
      ? `${digits.slice(0, digits.length - places)}.${digits.slice(digits.length - places)}`
      : digits;
  } else {
    body = ax.toFixed(places);
  }
  return (neg ? '-' : '') + body;
}

/** `round(x, places)` in Python (half-to-even on the exact binary value). */
export function pyRound(x: number, places = 0): number {
  if (!Number.isFinite(x)) return x;
  return Number(pyFixed(x, places));
}
