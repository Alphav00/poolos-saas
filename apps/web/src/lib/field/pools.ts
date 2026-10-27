// Customers' pools are kept in D1 at field/pools/<id>, through the Worker
// (apps/api/src/field.ts checks the shape; owners, Leads and Dispatchers may
// write, see apps/api/src/roles.ts). The screens read them from here.
import { generateCustomer, slugify } from './generator'
import { randomTail } from './ids'
import { nextOrder, toDay } from './route'
import { DEMO_PROFILES } from './sample'
import type { Day, Pool, Profile } from './types'

const COLLECTION = '/api/boards/field/pools'

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const texts = (v: unknown) => (Array.isArray(v) ? v.filter(isText) : [])

/** Keeps only what the screens can show; null when the document is not a usable pool. */
export function cleanProfile(id: string, raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isText(r.name)) return null
  const p: Profile = { id, name: r.name, tags: texts(r.tags), equipment: texts(r.equipment) }
  if (isText(r.address)) p.address = r.address
  if (isText(r.phone)) p.phone = r.phone
  const day = toDay(r.serviceDay)
  if (day) p.serviceDay = day
  if (typeof r.order === 'number' && Number.isInteger(r.order) && r.order >= 0) p.order = r.order
  if (isNum(r.gallons)) p.gallons = r.gallons
  if (isNum(r.tds)) p.tds = r.tds
  const cell = r.cell as Record<string, unknown> | undefined
  if (cell && isText(cell.make) && isText(cell.model)) p.cell = { make: cell.make, model: cell.model }
  if (isText(r.note)) p.note = r.note
  if (r.demo === true) p.demo = true
  return p
}

/** A profile as the screens use it. Forecasts come from the forecasting engine once it is connected; until then there are none. */
export function toPool(p: Profile): Pool {
  return { ...p, forecast: {}, ideal: {}, visits: [], decay: [] }
}

let cached: Promise<Pool[]> | null = null
/** Every id on file, shown or not, so a new customer never replaces one the screens hide. */
export const takenIds = new Set<string>()

/** Every pool on file, by name. One request per page load, shared by every screen. */
export function loadPools(fresh = false): Promise<Pool[]> {
  if (!cached || fresh) {
    const p = (async () => {
      const res = await fetch(COLLECTION, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load the pools.')
      const body = (await res.json()) as { docs: { id: string; data?: unknown }[] }
      takenIds.clear()
      for (const d of body.docs) takenIds.add(d.id)
      return body.docs
        .map((d) => cleanProfile(d.id, d.data))
        .filter((p): p is Profile => p !== null)
        .map(toPool)
        .sort((a, b) => a.name.localeCompare(b.name))
    })()
    cached = p
    // A failed load is forgotten so the next screen retries, unless a newer load has replaced it.
    p.catch(() => {
      if (cached === p) cached = null
    })
  }
  return cached
}

/** Owner only: writes each profile to D1 (same id replaces), then reads the whole list back. */
export async function saveProfiles(list: Profile[]): Promise<Pool[]> {
  for (const p of list) {
    const { id, ...data } = p
    const res = await fetch(`${COLLECTION}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (!res.ok) throw new Error(res.status === 403 ? 'Only an owner can load the demo pools.' : 'Could not load the demo pools.')
  }
  return loadPools(true)
}

/** Owner only: writes the made-up demo pools to D1. Pools already on file with the same id are replaced. */
export function loadDemoPools(): Promise<Pool[]> {
  return saveProfiles(DEMO_PROFILES)
}

/**
 * Owner only: adds one made-up customer (marked demo) on `day`'s route, with an
 * id not on file. The list is read again first, so a customer added from
 * another phone, or one the screens hide, is not replaced.
 */
export async function addDemoCustomer(day: Day): Promise<{ name: string; pools: Pool[] }> {
  const onFile = await loadPools(true)
  const p = generateCustomer(Math.random, new Set(takenIds))
  return { name: p.name, pools: await saveProfiles([{ ...p, serviceDay: day, order: nextOrder(onFile, day) }]) }
}

const write = async (path: string, method: 'PUT' | 'PATCH' | 'DELETE', data?: unknown) => {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify({ data }),
  })
  if (res.ok) return
  const why = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message
  if (res.status === 401) throw new Error('Sign in again.')
  if (res.status === 403) throw new Error('Only an owner, a Lead or a Dispatcher can change customers.')
  throw new Error(why ?? 'Could not save the customer.')
}

/**
 * A free id for a new customer: their name as a slug and a random 4-character
 * tail ("jo-reyes-k3x9"). The tail keeps a new customer from taking the id of
 * one removed earlier, whose readings (<id>:<date>) stay on file.
 */
export function customerId(name: string, taken: Iterable<string>, tail: () => string = randomTail): string {
  const base = slugify(name) || 'customer'
  const used = new Set(taken)
  for (;;) {
    const id = `${base}-${tail()}`
    if (!used.has(id)) return id
  }
}

/** Reads the list again, then gives a new customer a free id and the pools as they are now. */
export async function newCustomerId(name: string): Promise<{ id: string; pools: Pool[] }> {
  const pools = await loadPools(true)
  return { id: customerId(name, takenIds), pools }
}

/** Owners, Leads and Dispatchers: saves a customer (same id replaces it), then reads the list back. */
export async function saveCustomer(p: Profile): Promise<Pool[]> {
  const { id, ...data } = p
  await write(`${COLLECTION}/${encodeURIComponent(id)}`, 'PUT', data)
  return loadPools(true)
}

export async function deleteCustomer(id: string): Promise<Pool[]> {
  await write(`${COLLECTION}/${encodeURIComponent(id)}`, 'DELETE')
  return loadPools(true)
}

/**
 * Writes new places on `day`'s route, e.g. from moveStop (route.ts), then reads
 * the list back. The day goes with each place: an imported record may hold
 * 'Monday' or 'MON', which the Worker refuses once it checks the merged record.
 * Every move is tried and the list is read back even when one fails, so the
 * screen shows what was saved; the first failure comes back as `error`.
 */
export async function setOrders(moves: { id: string; order: number }[], day: Day): Promise<{ pools: Pool[]; error?: string }> {
  let error: string | undefined
  for (const m of moves) {
    try {
      await write(`${COLLECTION}/${encodeURIComponent(m.id)}`, 'PATCH', { order: m.order, serviceDay: day })
    } catch (e) {
      error ??= e instanceof Error ? e.message : 'Could not change the order.'
    }
  }
  const pools = await loadPools(true)
  return error ? { pools, error } : { pools }
}
