import { describe, expect, it } from 'vitest'
import { draftFrom, profileFrom } from './customer'
import { dayOf, doneOn, moveStop, nextOrder, notOnRoute, routeFor, toDay } from './route'
import type { Profile } from './types'

const blank = (id: string): Profile => ({ id, name: '', tags: [], equipment: [] })

describe('customer form', () => {
  it('starts a new customer on the given day', () => {
    expect(draftFrom(null, 'wed')).toMatchObject({ name: '', serviceDay: 'wed', gallons: '', surface: '' })
  })

  it('turns the form into a record, with size, surface and chlorine source as tags', () => {
    const d = { ...draftFrom(null, 'tue'), name: ' Wren Tolliver ', address: '12 Made Up Rd', gallons: '18,000', surface: 'Vinyl', sanitizer: 'Salt', cellMake: 'Maker', cellModel: 'C1' }
    expect(profileFrom(d, blank('wren-tolliver'))).toEqual({
      id: 'wren-tolliver', name: 'Wren Tolliver', address: '12 Made Up Rd', serviceDay: 'tue', gallons: 18000,
      tags: ['18,000 gal', 'Vinyl', 'Salt'], equipment: [], cell: { make: 'Maker', model: 'C1' },
    })
  })

  it('round-trips a record and keeps what the form does not show', () => {
    const p: Profile = { id: 'x', name: 'Pell Harrow', tags: ['22,000 gal', 'Plaster', 'Liquid chlorine', 'Screened'], equipment: ['Sand filter'], gallons: 22000, tds: 1100, serviceDay: 'fri', order: 4, demo: true }
    const d = draftFrom(p, 'mon')
    expect(d).toMatchObject({ serviceDay: 'fri', gallons: '22000', surface: 'Plaster', sanitizer: 'Liquid chlorine' })
    expect(profileFrom({ ...d, surface: 'Vinyl', gallons: '' }, p)).toEqual({
      id: 'x', name: 'Pell Harrow', tags: ['Vinyl', 'Liquid chlorine', 'Screened'], equipment: ['Sand filter'], tds: 1100, serviceDay: 'fri', order: 4, demo: true,
    })
  })

  it('says what is wrong instead of saving', () => {
    expect(profileFrom(draftFrom(null, 'mon'), blank('x'))).toBe('Give the customer a name.')
    expect(profileFrom({ ...draftFrom(null, 'mon'), name: 'A', gallons: 'lots' }, blank('x'))).toMatch(/gallons/)
    expect(profileFrom({ ...draftFrom(null, 'mon'), name: 'A', phone: '1'.repeat(41) }, blank('x'))).toMatch(/phone/)
  })

  it('drops the cell when the pool is not salt', () => {
    const p: Profile = { ...blank('x'), name: 'A', tags: ['Salt'], cell: { make: 'M', model: 'C' } }
    expect(profileFrom({ ...draftFrom(p, 'mon'), sanitizer: 'Trichlor' }, p)).not.toHaveProperty('cell')
  })
})

describe('route', () => {
  const c = (id: string, serviceDay?: Profile['serviceDay'], order?: number): Profile => ({ id, name: id, tags: [], equipment: [], serviceDay, order })

  it('knows the service day of a date', () => {
    expect(dayOf(new Date(2026, 9, 12))).toBe('mon')
    expect(dayOf(new Date(2026, 9, 18))).toBe('sun')
  })

  it("lists the day's customers in route order, unplaced ones last", () => {
    const pools = [c('b', 'mon', 2), c('a', 'mon', 1), c('z', 'mon'), c('y', 'tue', 1), c('x')]
    expect(routeFor(pools, 'mon').map((p) => p.id)).toEqual(['a', 'b', 'z'])
    expect(notOnRoute(pools, 'mon').map((p) => p.id)).toEqual(['y', 'x'])
    expect(nextOrder(pools, 'mon')).toBe(3)
    expect(nextOrder(pools, 'wed')).toBe(1)
  })

  it('keeps one fixed order when two customers share a place, and a move clears the tie', () => {
    const twins = [c('b', 'mon', 1), c('a', 'mon', 1), { ...c('a2', 'mon', 1), name: 'a' }]
    expect(routeFor(twins, 'mon').map((p) => p.id)).toEqual(['a', 'a2', 'b'])
    expect(routeFor([...twins].reverse(), 'mon').map((p) => p.id)).toEqual(['a', 'a2', 'b'])
    expect(moveStop(routeFor(twins, 'mon'), 2, -1)).toEqual([{ id: 'b', order: 2 }, { id: 'a2', order: 3 }])
  })

  it('reads day names written another way, and nothing else', () => {
    expect([toDay('mon'), toDay(' Monday '), toDay('MON'), toDay('sunday')]).toEqual(['mon', 'mon', 'mon', 'sun'])
    expect([toDay('Mo'), toDay('weekday'), toDay(1), toDay(undefined)]).toEqual([undefined, undefined, undefined, undefined])
  })

  it('moves a stop and renumbers only what changed', () => {
    const stops = [c('a', 'mon', 1), c('b', 'mon', 2), c('z', 'mon')]
    expect(moveStop(stops, 2, -1)).toEqual([{ id: 'z', order: 2 }, { id: 'b', order: 3 }])
    expect(moveStop(stops, 0, -1)).toEqual([])
    expect(moveStop(stops, 2, 1)).toEqual([])
  })

  it("counts a stop done when that day's readings hold values", () => {
    const docs = [
      { id: 'a:2026-10-12', data: { values: { fc: 3 } } },
      { id: 'b:2026-10-12', data: { values: {} } },
      { id: 'c:2026-10-11', data: { values: { fc: 3 } } },
      { id: 'd:2026-10-12', deleted: true },
    ]
    expect([...doneOn(docs, '2026-10-12')]).toEqual(['a'])
  })
})

describe('demo data', () => {
  it('finds only records marked demo, and readings for demo customers', async () => {
    const { demoIds } = await import('./demo')
    const ids = demoIds(
      [{ id: 'maple-court', data: { demo: true } }, { id: 'harper', data: {} }],
      [{ id: 'alex', data: { demo: true } }, { id: 'sam', data: { demo: false } }],
      [{ id: 'maple-court:2026-10-12' }, { id: 'harper:2026-10-12' }, { id: 'maple-court-2:2026-10-12' }],
    )
    expect(ids).toEqual({ pools: ['maple-court'], staff: ['alex'], readings: ['maple-court:2026-10-12'] })
  })
})
