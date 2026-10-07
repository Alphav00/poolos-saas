/**
 * A small validator with pydantic v2 (lax mode) semantics, enough for the
 * measuring job models: the same coercions, the same constraints, defaults
 * that are not re-validated, field validators that run only on fields that
 * passed, and model validators that run only when every field passed.
 *
 * Validated values are kept in pydantic's JSON dump form: Decimal fields as
 * decimal strings, enums as their values, datetimes as ISO strings.
 */
import { decimalFromFloat, decimalFromInt, decimalFromString } from './pynum'
import { PyFloat } from './json'

export type Loc = (string | number)[]
export interface Issue {
  loc: Loc
  type: string
  msg: string
}

export const INVALID: unique symbol = Symbol('invalid')
export type Out<T> = T | typeof INVALID
export type Validator<T> = (input: unknown, loc: Loc, issues: Issue[]) => Out<T>

const isFloat = (v: unknown): v is PyFloat => v instanceof PyFloat
const asNumber = (v: unknown): number | null => (typeof v === 'number' ? v : isFloat(v) ? v.value : null)

function bounds(n: number, c: { ge?: number; gt?: number; le?: number; lt?: number }): string | null {
  if (c.ge !== undefined && !(n >= c.ge)) return `Input should be greater than or equal to ${c.ge}`
  if (c.gt !== undefined && !(n > c.gt)) return `Input should be greater than ${c.gt}`
  if (c.le !== undefined && !(n <= c.le)) return `Input should be less than or equal to ${c.le}`
  if (c.lt !== undefined && !(n < c.lt)) return `Input should be less than ${c.lt}`
  return null
}

export function decimal(c: { ge?: number; gt?: number; le?: number; lt?: number } = {}): Validator<string> {
  return (v, loc, issues) => {
    let dec: string | null = null
    if (typeof v === 'number') dec = Number.isInteger(v) ? decimalFromInt(v) : decimalFromFloat(v)
    else if (isFloat(v)) dec = Number.isFinite(v.value) ? decimalFromFloat(v.value) : null
    else if (typeof v === 'string') dec = decimalFromString(v)
    if (dec === null) {
      issues.push({ loc, type: 'decimal_parsing', msg: 'Input should be a valid decimal' })
      return INVALID
    }
    const why = bounds(Number(dec), c)
    if (why) {
      issues.push({ loc, type: 'decimal_bounds', msg: why })
      return INVALID
    }
    return dec
  }
}

export function int(c: { ge?: number; le?: number } = {}): Validator<number> {
  return (v, loc, issues) => {
    let n: number | null = null
    if (typeof v === 'boolean') n = v ? 1 : 0
    else if (typeof v === 'number') n = v
    else if (isFloat(v)) n = Number.isInteger(v.value) ? v.value : null
    else if (typeof v === 'string' && /^\s*[+-]?\d+\s*$/.test(v)) n = Number(v)
    if (n === null || !Number.isFinite(n)) {
      issues.push({ loc, type: 'int_parsing', msg: 'Input should be a valid integer' })
      return INVALID
    }
    const why = bounds(n, c)
    if (why) {
      issues.push({ loc, type: 'int_bounds', msg: why })
      return INVALID
    }
    return n
  }
}

export function str(c: { min?: number; max?: number; pattern?: RegExp } = {}): Validator<string> {
  return (v, loc, issues) => {
    if (typeof v !== 'string') {
      issues.push({ loc, type: 'string_type', msg: 'Input should be a valid string' })
      return INVALID
    }
    const len = [...v].length
    if (c.min !== undefined && len < c.min) {
      issues.push({ loc, type: 'string_too_short', msg: `String should have at least ${c.min} character${c.min === 1 ? '' : 's'}` })
      return INVALID
    }
    if (c.max !== undefined && len > c.max) {
      issues.push({ loc, type: 'string_too_long', msg: `String should have at most ${c.max} characters` })
      return INVALID
    }
    if (c.pattern && !c.pattern.test(v)) {
      issues.push({ loc, type: 'string_pattern_mismatch', msg: `String should match pattern '${c.pattern.source}'` })
      return INVALID
    }
    return v
  }
}

const TRUE = new Set(['1', 'on', 't', 'true', 'y', 'yes'])
const FALSE = new Set(['0', 'off', 'f', 'false', 'n', 'no'])

export function bool(): Validator<boolean> {
  return (v, loc, issues) => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'number' && (v === 0 || v === 1)) return v === 1
    if (isFloat(v) && (v.value === 0 || v.value === 1)) return v.value === 1
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase()
      if (TRUE.has(s)) return true
      if (FALSE.has(s)) return false
    }
    issues.push({ loc, type: 'bool_parsing', msg: 'Input should be a valid boolean' })
    return INVALID
  }
}

export function enumOf<T extends string>(values: readonly T[]): Validator<T> {
  return (v, loc, issues) => {
    if (typeof v === 'string' && (values as readonly string[]).includes(v)) return v as T
    issues.push({ loc, type: 'enum', msg: `Input should be ${values.map((x) => `'${x}'`).join(', ')}` })
    return INVALID
  }
}

export function intEnum<T extends number>(values: readonly T[]): Validator<T> {
  return (v, loc, issues) => {
    const n = asNumber(v) ?? (typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : null)
    if (n !== null && (values as readonly number[]).includes(n)) return n as T
    issues.push({ loc, type: 'enum', msg: `Input should be ${values.join(', ')}` })
    return INVALID
  }
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** datetime, dumped like pydantic: naive stays naive, UTC as "Z", other offsets as "+HH:MM". */
export function datetime(): Validator<string> {
  return (v, loc, issues) => {
    const n = asNumber(v)
    if (n !== null && typeof v !== 'boolean') {
      // Unix seconds (or milliseconds when very large), UTC.
      const ms = Math.abs(n) > 2e10 ? n : n * 1000
      const d = new Date(ms)
      if (!Number.isNaN(d.getTime())) return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), Math.round((ms % 1000) * 1000), 'Z')
    }
    if (typeof v === 'string') {
      const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,6})\d*)?)?\s*(Z|z|[+-]\d{2}(?::?\d{2})?)?)?$/.exec(v.trim())
      if (m) {
        const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? '0', m[5] ?? '0', m[6] ?? '0'].map(Number) as number[]
        const micro = m[7] ? Number(m[7].padEnd(6, '0')) : 0
        const probe = new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, s!))
        if (probe.getUTCMonth() === mo! - 1 && probe.getUTCDate() === d && h! < 24 && mi! < 60 && s! < 60) {
          let tz = ''
          if (m[8]) {
            if (/^[Zz]$/.test(m[8])) tz = 'Z'
            else {
              const t = m[8].replace(':', '')
              const off = `${t.slice(0, 3)}:${t.slice(3) || '00'}`
              tz = off === '+00:00' || off === '-00:00' ? 'Z' : off
            }
          }
          return isoFromParts(y!, mo!, d!, h!, mi!, s!, micro, tz)
        }
      }
    }
    issues.push({ loc, type: 'datetime_parsing', msg: 'Input should be a valid datetime' })
    return INVALID
  }
}

function isoFromParts(y: number, mo: number, d: number, h: number, mi: number, s: number, micro: number, tz: string): string {
  const base = `${pad(y, 4)}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`
  return base + (micro ? `.${pad(micro, 6)}` : '') + tz
}

/** Python datetime.utcnow().isoformat() — naive, microseconds when non-zero. */
export function utcNow(): string {
  const d = new Date()
  return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds() * 1000, '')
}

export function optional<T>(inner: Validator<T>): Validator<T | null> {
  return (v, loc, issues) => (v === null || v === undefined ? null : inner(v, loc, issues))
}

export function list<T>(item: Validator<T>, c: { min?: number } = {}): Validator<T[]> {
  return (v, loc, issues) => {
    if (!Array.isArray(v)) {
      issues.push({ loc, type: 'list_type', msg: 'Input should be a valid list' })
      return INVALID
    }
    const out: T[] = []
    let ok = true
    v.forEach((x, i) => {
      const r = item(x, [...loc, i], issues)
      if (r === INVALID) ok = false
      else out.push(r)
    })
    if (!ok) return INVALID
    if (c.min !== undefined && out.length < c.min) {
      issues.push({ loc, type: 'too_short', msg: `List should have at least ${c.min} items after validation, not ${out.length}` })
      return INVALID
    }
    return out
  }
}

export interface Field<T> {
  v: Validator<T>
  /** Value used when the key is absent. Omit for a required field. */
  default?: () => T
  /** Runs after the field validated; returns an error message to reject it. */
  check?(value: T): string | null
}

export function field<T>(v: Validator<T>, opts: Omit<Field<T>, 'v'> = {}): Field<T> {
  return { v, ...opts }
}

/** A model: fields in declaration order, unknown keys dropped, optional model-level check. */
export function model<T>(fields: Record<string, Field<unknown>>, after?: (value: T) => string | null): Validator<T> {
  return (v, loc, issues) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v) || v instanceof PyFloat) {
      issues.push({ loc, type: 'model_type', msg: 'Input should be a valid dictionary or object' })
      return INVALID
    }
    const src = v as Record<string, unknown>
    const out: Record<string, unknown> = {}
    let ok = true
    for (const [name, f] of Object.entries(fields)) {
      if (!(name in src) || src[name] === undefined) {
        if (f.default) {
          out[name] = f.default()
          continue
        }
        issues.push({ loc: [...loc, name], type: 'missing', msg: 'Field required' })
        ok = false
        continue
      }
      const r = f.v(src[name], [...loc, name], issues)
      if (r === INVALID) {
        ok = false
        continue
      }
      const why = f.check?.(r)
      if (why) {
        issues.push({ loc: [...loc, name], type: 'value_error', msg: `Value error, ${why}` })
        ok = false
        continue
      }
      out[name] = r
    }
    if (!ok) return INVALID
    const why = after?.(out as T)
    if (why) {
      issues.push({ loc, type: 'value_error', msg: `Value error, ${why}` })
      return INVALID
    }
    return out as T
  }
}

export class ValidationFailed extends Error {
  constructor(readonly issues: Issue[]) {
    super(issues.map((i) => `${i.loc.join('.') || '(body)'}: ${i.msg}`).join('; '))
  }
}

/** Validate or throw ValidationFailed with every issue found. */
export function parse<T>(v: Validator<T>, input: unknown): T {
  const issues: Issue[] = []
  const r = v(input, [], issues)
  if (r === INVALID) throw new ValidationFailed(issues)
  return r
}
