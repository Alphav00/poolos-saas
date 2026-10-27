import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDemoCustomer, customerId, newCustomerId, setOrders, takenIds } from './pools'
import { loadDemoStaff } from './staff'

/**
 * A stand-in for the boards API on one collection: GET lists, PUT replaces,
 * PATCH merges and then checks serviceDay the way the Worker's checkPool does.
 */
function fakeBoard(collection: string, docs: Record<string, Record<string, unknown>>) {
  const calls: { method: string; id?: string; data?: Record<string, unknown> }[] = []
  const fetches = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const id = url.startsWith(`${collection}/`) ? decodeURIComponent(url.slice(collection.length + 1)) : undefined
    const data = init?.body ? (JSON.parse(init.body as string) as { data: Record<string, unknown> }).data : undefined
    calls.push({ method, id, data })
    if (method === 'GET') return Response.json({ docs: Object.entries(docs).map(([id, data]) => ({ id, data })) })
    if (!id) return new Response('', { status: 404 })
    if (method === 'PUT') docs[id] = data!
    if (method === 'PATCH') {
      const next = { ...docs[id], ...data }
      if (next.serviceDay !== undefined && !['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(next.serviceDay as string)) {
        return Response.json({ error: { message: 'serviceDay must be one of mon, tue, wed, thu, fri, sat, sun' } }, { status: 400 })
      }
      if (id === 'broken') return Response.json({ error: { message: 'Could not save broken' } }, { status: 400 })
      docs[id] = next
    }
    return Response.json({ id })
  })
  vi.stubGlobal('fetch', fetches)
  return { docs, calls }
}

const POOLS = '/api/boards/field/pools'
const STAFF = '/api/boards/field/staff'

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
    expect(put.data).toMatchObject({ demo: true, serviceDay: 'wed' })
    expect(r.pools).toHaveLength(before.length + 1)
  })
})

describe('loadDemoStaff', () => {
  it('replaces earlier demo records but never someone else holding a demo id', async () => {
    const board = fakeBoard(STAFF, {
      alex: { name: 'Alex Mora', email: 'alex.mora@example.test', role: 'Technician' },
      jordan: { name: 'Jordan', email: 'jordan@example.test', role: 'Technician', demo: true },
      riley: { half: 'a record the screens hide' },
    })
    await loadDemoStaff()
    const puts = board.calls.filter((c) => c.method === 'PUT').map((c) => c.id)
    expect(puts).toEqual(['jordan', 'casey', 'morgan'])
    expect(board.docs.alex).toMatchObject({ name: 'Alex Mora' })
    expect(board.docs.riley).toEqual({ half: 'a record the screens hide' })
  })
})
