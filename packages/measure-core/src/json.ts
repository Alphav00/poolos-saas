/**
 * JSON parsing that keeps Python's int/float distinction.
 *
 * The backend read request bodies with Python's json module, where `12` is an
 * int and `12.0` is a float, and pydantic then stores them as Decimal("12") and
 * Decimal("12.0"). JSON.parse loses that, so request bodies go through this
 * parser: integers come back as plain numbers, numbers written with a point or
 * exponent come back as PyFloat.
 */
export class PyFloat {
  constructor(readonly value: number) {}
}

export type PyJson = null | boolean | number | PyFloat | string | PyJson[] | { [k: string]: PyJson }

export class JsonError extends Error {}

export function parsePyJson(text: string): PyJson {
  let i = 0
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i]!)) i++
  }
  const fail = (what: string): never => {
    throw new JsonError(`Invalid JSON: ${what} at position ${i}`)
  }
  const value = (): PyJson => {
    ws()
    const c = text[i]
    if (c === '{') {
      i++
      const obj: Record<string, PyJson> = {}
      ws()
      if (text[i] === '}') {
        i++
        return obj
      }
      for (;;) {
        ws()
        if (text[i] !== '"') fail('expected a key')
        const k = string()
        ws()
        if (text[i] !== ':') fail('expected ":"')
        i++
        obj[k] = value()
        ws()
        if (text[i] === ',') {
          i++
          continue
        }
        if (text[i] === '}') {
          i++
          return obj
        }
        fail('expected "," or "}"')
      }
    }
    if (c === '[') {
      i++
      const arr: PyJson[] = []
      ws()
      if (text[i] === ']') {
        i++
        return arr
      }
      for (;;) {
        arr.push(value())
        ws()
        if (text[i] === ',') {
          i++
          continue
        }
        if (text[i] === ']') {
          i++
          return arr
        }
        fail('expected "," or "]"')
      }
    }
    if (c === '"') return string()
    if (text.startsWith('true', i)) return (i += 4), true
    if (text.startsWith('false', i)) return (i += 5), false
    if (text.startsWith('null', i)) return (i += 4), null
    const m = /^-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i))
    if (!m) return fail('unexpected character')
    i += m[0].length
    const n = Number(m[0])
    return m[1] || m[2] ? new PyFloat(n) : n === 0 ? 0 : n
  }
  const string = (): string => {
    const start = i
    i++
    for (;;) {
      const c = text[i]
      if (c === undefined) fail('unterminated string')
      if (c === '\\') i += 2
      else if (c === '"') break
      else i++
    }
    i++
    return JSON.parse(text.slice(start, i)) as string
  }
  const v = value()
  ws()
  if (i !== text.length) fail('trailing data')
  return v
}
