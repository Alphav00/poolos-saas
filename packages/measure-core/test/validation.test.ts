// POST /api/jobs bodies: the port must accept exactly what pydantic accepted,
// normalise it the same way, and reject the same inputs at the same places.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePyJson, PoolJobCreateV, ValidationFailed, parse } from '../src'

interface VCase {
  name: string
  body: string
  ok: boolean
  value?: Record<string, unknown>
  errors?: { loc: (string | number)[]; type: string }[]
}
const cases = JSON.parse(readFileSync(new URL('./goldens/validation.json', import.meta.url), 'utf8')) as VCase[]

describe.each(cases.map((c) => [c.name, c] as const))('%s', (_n, c) => {
  it(c.ok ? 'is accepted and normalised the same way' : 'is rejected at the same places', () => {
    let got: unknown
    let issues: { loc: (string | number)[] }[] = []
    try {
      got = parse(PoolJobCreateV, parsePyJson(c.body))
    } catch (e) {
      if (!(e instanceof ValidationFailed)) throw e
      issues = e.issues
    }
    if (c.ok) {
      expect(issues).toEqual([])
      expect(got).toEqual(c.value)
    } else {
      expect(got).toBeUndefined()
      const key = (l: (string | number)[]) => l.join('.')
      expect(issues.map((i) => key(i.loc)).sort()).toEqual(c.errors!.map((e) => key(e.loc)).sort())
    }
  })
})
