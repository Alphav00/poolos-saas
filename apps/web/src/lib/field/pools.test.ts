import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBoard } from './fake-board'
import { addDemoCustomer, customerId, newCustomerId, setOrders, takenIds } from './pools'

const POOLS = '/api/boards/field/pools'

afterEach(() => vi.unstubAllGlobals())

describe('setOrders', () => {
  it('sends the canonical day with each place, so an imported "Monday" record can be reordered', async () => {
    const board = fakeBoard(POOLS, {
      'harbor-view': { name: 'Harbor View', serviceDay: 'Monday', order: 1 },
      'quail-run': { name: 'Quail Run', serviceDay: 'MON', order: 2 },
    })
    const r = await setOrders([{ id: 'harbor-view', order: 2 }, { id: 'quail-run', order: 1 }], 'mon')
    expect(r.error).toBeUndefined()
    expect(board.docs['harbor-view']).toMatchObject({ serviceDay: 'mon', order: 2 })
    expect(board.docs['quail-run']).toMatchObject({ serviceDay: 'mon', order: 1 })
    expect(r.pools.map((p) => [p.id, p.serviceDay, p.order])).toEqual([
      ['harbor-view', 'mon', 2],
      ['quail-run', 'mon', 1],
    ])
  })

  it('tries every move and reads the list back when one fails', async () => {
    const board = fakeBoard(POOLS, {
      broken: { name: 'Broken Gate', serviceDay: 'tue', order: 1 },
      'quail-run': { name: 'Quail Run', serviceDay: 'tue', order: 2 },
    })
    const r = await setOrders([{ id: 'broken', order: 2 }, { id: 'quail-run', order: 1 }], 'tue')
    expect(r.error).toBe('Could not save broken')
    expect(board.docs['quail-run']).toMatchObject({ order: 1 })
    expect(board.calls.at(-1)?.method).toBe('GET')
    expect(r.pools.find((p) => p.id === 'broken')?.order).toBe(1)
  })
})

describe('new customer ids', () => {
  it('adds a random tail to the name, and never picks an id on file', () => {
    const tails = ['aaaa', 'bbbb']
    expect(customerId('Jo Reyes', ['jo-reyes-aaaa'], () => tails.shift()!)).toBe('jo-reyes-bbbb')
    expect(customerId('¡!', [], () => 'k3x9')).toBe('customer-k3x9')
    expect(customerId('Jo Reyes', [])).toMatch(/^jo-reyes-[a-z0-9]{4}$/)
  })

  it('reads the list again and counts records the screens drop', async () => {
    fakeBoard(POOLS, { 'jo-reyes-aaaa': { note: 'no name, so not shown' } })
    const r = await newCustomerId('Jo Reyes')
    expect(r.pools).toEqual([])
    expect(takenIds.has('jo-reyes-aaaa')).toBe(true)
    expect(r.id).toMatch(/^jo-reyes-[a-z0-9]{4}$/)
    expect(r.id).not.toBe('jo-reyes-aaaa')
  })

  it('does not replace a customer added since the screen loaded when adding a demo one', async () => {
    // Every demo name is taken by someone, shown or not; the new id must still be free.
    const { DEMO_CUSTOMER_NAMES } = await import('./generator')
    const { slugify } = await import('./generator')
    const onFile: Record<string, Record<string, unknown>> = {}
    for (const n of DEMO_CUSTOMER_NAMES) onFile[slugify(n)] = { name: n }
    const before = Object.keys(onFile)
    const board = fakeBoard(POOLS, onFile)
    const r = await addDemoCustomer('wed')
    const put = board.calls.find((c) => c.method === 'PUT')!
    expect(before).not.toContain(put.id)
    expect(put.id).toMatch(/-[a-z0-9]{4}$/)
    expect(put.data).toMatchObject({ demo: true, serviceDay: 'wed' })
    expect(r.pools).toHaveLength(before.length + 1)
  })
})
