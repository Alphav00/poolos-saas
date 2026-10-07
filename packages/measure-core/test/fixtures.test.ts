import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { fixture, fixtureNames, linerShapes, parse, PoolJobV } from '../src'

const want = JSON.parse(readFileSync(new URL('./goldens/fixtures.json', import.meta.url), 'utf8'))
const shapes = JSON.parse(readFileSync(new URL('./goldens/shapes.json', import.meta.url), 'utf8'))

it('serves the same five fixtures, each a valid job with a fresh id', () => {
  expect(fixtureNames()).toEqual(['freeform', 'kidney', 'kidney-liner', 'rectangular', 'rectangular-liner'])
  for (const name of fixtureNames()) {
    const { id, created_at, updated_at, ...rest } = fixture(name)!
    expect(rest).toEqual(want[name])
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/)
    expect(parse(PoolJobV, fixture(name))).toBeTruthy()
  }
  expect(fixture('rectangular')!.id).not.toBe(fixture('rectangular')!.id)
  expect(fixture('nope')).toBeNull()
})

it('lists the liner shapes the same way', () => {
  expect(linerShapes()).toEqual(shapes)
})
