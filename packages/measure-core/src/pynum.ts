/**
 * Python-compatible number formatting.
 *
 * The measuring backend was written in Python, and its outputs (JSON strings
 * for Decimal fields, PDF text, warning messages) come from Python's float
 * repr, round(), format(x, '.2f') and Decimal's string form. JavaScript's
 * Number.toFixed and String() differ from those in places (ties round away
 * from zero, "12" vs "12.0", "1e-7" vs "1E-7"), so the port uses these instead
 * and the goldens in test/goldens hold it to the original.
 */

/** The exact decimal value of a double as [negative, digits, exponent] (value = digits × 10^exponent). */
function exact(x: number): [boolean, bigint, number] {
  const neg = x < 0 || Object.is(x, -0)
  const a = Math.abs(x)
  if (a === 0) return [neg, 0n, 0]
  const buf = new DataView(new ArrayBuffer(8))
  buf.setFloat64(0, a)
  const hi = buf.getUint32(0)
  const lo = buf.getUint32(4)
  const biased = (hi >>> 20) & 0x7ff
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo)
  let e2: number
  if (biased === 0) e2 = -1074
  else {
    mant |= 1n << 52n
    e2 = biased - 1075
  }
  if (e2 >= 0) return [neg, mant << BigInt(e2), 0]
  // mant / 2^k = mant × 5^k / 10^k
  return [neg, mant * 5n ** BigInt(-e2), e2]
}

/** Round the exact value of `x` to `places` decimals, ties to even. Returns [negative, scaled integer]. */
function roundExact(x: number, places: number): [boolean, bigint] {
  const [neg, digits, exp] = exact(x)
  const shift = exp + places // value × 10^places = digits × 10^shift
  if (shift >= 0) return [neg, digits * 10n ** BigInt(shift)]
  const div = 10n ** BigInt(-shift)
  let q = digits / div
  const r = digits % div
  const twice = r * 2n
  if (twice > div || (twice === div && q % 2n === 1n)) q += 1n
  return [neg, q]
}

function scaledToFixed(neg: boolean, scaled: bigint, places: number): string {
  let s = scaled.toString()
  if (places > 0) {
    s = s.padStart(places + 1, '0')
    s = `${s.slice(0, -places)}.${s.slice(-places)}`
  }
  return (neg ? '-' : '') + s
}

/** Python format(x, '.Nf'): exact value, round half to even, keeps "-0.00". */
export function pyFixed(x: number, places: number): string {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'nan' : x > 0 ? 'inf' : '-inf'
  const [neg, scaled] = roundExact(x, places)
  return scaledToFixed(neg, scaled, places)
}

/** Python round(x, n) for floats: correctly rounded, ties to even. */
export function pyRound(x: number, places: number): number {
  if (!Number.isFinite(x)) return x
  const [neg, scaled] = roundExact(x, places)
  const v = Number(scaledToFixed(false, scaled, places))
  return neg ? -v : v
}

/** Shortest round-trip digits of a double: [negative, digits, exponent of first digit]. */
function shortest(x: number): [boolean, string, number] {
  const neg = x < 0 || Object.is(x, -0)
  const e = Math.abs(x).toExponential() // e.g. "1.2345e+1", shortest round-trip
  const [mant, ex] = e.split('e')
  return [neg, mant!.replace('.', ''), Number(ex)]
}

/** Python repr(float). */
export function pyRepr(x: number): string {
  if (Number.isNaN(x)) return 'nan'
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf'
  const [neg, digits, e] = shortest(x)
  const sign = neg ? '-' : ''
  if (x === 0) return `${sign}0.0`
  if (e >= -4 && e < 16) {
    if (e < 0) return `${sign}0.${'0'.repeat(-e - 1)}${digits}`
    const intPart = digits.slice(0, e + 1).padEnd(e + 1, '0')
    const frac = digits.slice(e + 1)
    return `${sign}${intPart}.${frac || '0'}`
  }
  const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits
  return `${sign}${m}e${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')}`
}

/** Python Decimal's str() for a coefficient and exponent (to-scientific-string). */
function decimalString(neg: boolean, coeff: string, exp: number): string {
  const digits = coeff.replace(/^0+(?=\d)/, '')
  const sign = neg ? '-' : ''
  const adjusted = exp + digits.length - 1
  if (exp <= 0 && adjusted >= -6) {
    if (exp === 0) return sign + digits
    const point = digits.length + exp
    if (point > 0) return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
    return `${sign}0.${'0'.repeat(-point)}${digits}`
  }
  const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits
  return `${sign}${m}E${adjusted < 0 ? '-' : '+'}${Math.abs(adjusted)}`
}

const DECIMAL_RE = /^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/

/** Decimal(text) as Python parses it, or null when it is not a finite number. */
export function decimalFromString(text: string): string | null {
  const m = DECIMAL_RE.exec(text.trim())
  if (!m) return null
  const intPart = m[2] ?? ''
  const frac = m[3] ?? m[4] ?? ''
  const exp = Number(m[5] ?? 0) - frac.length
  return decimalString(m[1] === '-', intPart + frac || '0', exp)
}

/** Decimal(str(x)) for a float — how pydantic turns a float into a Decimal. */
export function decimalFromFloat(x: number): string {
  return decimalFromString(pyRepr(x))!
}

/** Decimal(n) for an int. */
export function decimalFromInt(n: number): string {
  return String(n)
}

/** Decimal(str(round(x, places))) — the backend's `_d()` helper. */
export function roundedDecimal(x: number, places = 2): string {
  return decimalFromFloat(pyRound(x, places))
}

/** format(Decimal, '.2f') on an exact decimal string: ROUND_HALF_EVEN. */
export function decimalFixed(dec: string, places: number): string {
  const m = DECIMAL_RE.exec(dec)
  if (!m) throw new Error(`not a decimal: ${dec}`)
  const neg = m[1] === '-'
  const intPart = m[2] ?? ''
  const frac = m[3] ?? m[4] ?? ''
  const exp = Number(m[5] ?? 0) - frac.length
  let coeff = BigInt(intPart + frac || '0')
  const shift = exp + places
  let scaled: bigint
  if (shift >= 0) scaled = coeff * 10n ** BigInt(shift)
  else {
    const div = 10n ** BigInt(-shift)
    scaled = coeff / div
    const r = (coeff % div) * 2n
    if (r > div || (r === div && scaled % 2n === 1n)) scaled += 1n
  }
  coeff = scaled
  return scaledToFixed(neg, coeff, places)
}

/** Exact difference of two decimal strings (Python Decimal subtraction), as a decimal string. */
export function decimalSub(a: string, b: string): string {
  const parse = (s: string): [bigint, number] => {
    const m = DECIMAL_RE.exec(s)!
    const frac = m[3] ?? m[4] ?? ''
    const exp = Number(m[5] ?? 0) - frac.length
    const c = BigInt((m[2] ?? '') + frac || '0')
    return [m[1] === '-' ? -c : c, exp]
  }
  const [ca, ea] = parse(a)
  const [cb, eb] = parse(b)
  const e = Math.min(ea, eb)
  const diff = ca * 10n ** BigInt(ea - e) - cb * 10n ** BigInt(eb - e)
  const neg = diff < 0n
  return decimalString(neg, (neg ? -diff : diff).toString(), e)
}

/** Python float(Decimal) / float(int). */
export const num = (dec: string | number): number => (typeof dec === 'number' ? dec : Number(dec))

/** Python truthiness of a Decimal string: zero is falsy. */
export const decTruthy = (dec: string | null | undefined): boolean => dec != null && Number(dec) !== 0

// ---------- math.hypot ----------

/** Error-free product (Dekker/Veltkamp): x·y = hi + lo exactly. */
function twoProduct(x: number, y: number): [number, number] {
  const hi = x * y
  const split = (a: number): [number, number] => {
    const c = 134217729 * a // 2^27 + 1
    const ah = c - (c - a)
    return [ah, a - ah]
  }
  const [xh, xl] = split(x)
  const [yh, yl] = split(y)
  const lo = ((xh * yh - hi) + xh * yl + xl * yh) + xl * yl
  return [hi, lo]
}

const fastSum = (a: number, b: number): [number, number] => {
  const x = a + b
  return [x, a - x + b]
}

/**
 * CPython 3.11's math.hypot (vector_norm in Modules/mathmodule.c): scaled,
 * compensated sum of squares with one differential correction. Math.hypot
 * can differ from it in the last bit.
 */
export function pyHypot(...coords: number[]): number {
  let max = 0
  let nan = false
  const vec = coords.map((c) => {
    const a = Math.abs(c)
    if (Number.isNaN(a)) nan = true
    if (a > max) max = a
    return a
  })
  if (max === Infinity) return Infinity
  if (nan) return NaN
  if (max === 0 || vec.length <= 1) return max
  // frexp(max): max = m × 2^e, 0.5 <= m < 1
  let e = Math.floor(Math.log2(max)) + 1
  if (max * 2 ** -e >= 1) e += 1
  if (max * 2 ** -e < 0.5) e -= 1
  if (e < -1021) {
    // Tiny values: Python rescales by DBL_MIN first. Not reachable with tape lengths.
    return Math.hypot(...coords)
  }
  const scale = 2 ** -e
  let csum = 1.0
  let frac1 = 0
  let frac2 = 0
  for (const v of vec) {
    const x = v * scale
    const [hi, lo] = twoProduct(x, x)
    const [s, sl] = fastSum(csum, hi)
    csum = s
    frac1 += lo
    frac2 += sl
  }
  let h = Math.sqrt(csum - 1.0 + (frac1 + frac2))
  const [phi, plo] = twoProduct(-h, h)
  const [s, sl] = fastSum(csum, phi)
  csum = s
  frac1 += plo
  frac2 += sl
  const x = csum - 1.0 + (frac1 + frac2)
  h += x / (2.0 * h)
  return h / scale
}
