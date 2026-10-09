// Pool profiles are kept in D1 at field/pools/<id>, through the Worker
// (apps/api/src/field.ts checks the shape; owners, Leads and Dispatchers may
// write, see apps/api/src/roles.ts; only owners load the demo set). The screens
// read them from here, never from the demo list in sample.ts.
import { DEMO_FORECASTS, DEMO_PROFILES } from './sample'
import type { Pool, Profile } from './types'

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
  if (isNum(r.gallons)) p.gallons = r.gallons
  if (isNum(r.tds)) p.tds = r.tds
  const cell = r.cell as Record<string, unknown> | undefined
  if (cell && isText(cell.make) && isText(cell.model)) p.cell = { make: cell.make, model: cell.model }
  if (isText(r.note)) p.note = r.note
  if (r.demo === true) p.demo = true
  return p
}

/** A profile as the screens use it. Only demo pools get the demo forecasts; others show "no forecast". */
export function toPool(p: Profile): Pool {
  const view = p.demo ? DEMO_FORECASTS[p.id] : undefined
  return { ...p, forecast: view?.forecast ?? {}, ideal: view?.ideal ?? {}, visits: view?.visits ?? [], decay: view?.decay ?? [] }
}

let cached: Promise<Pool[]> | null = null

/** Every pool on file, by name. One request per page load, shared by every screen. */
export function loadPools(fresh = false): Promise<Pool[]> {
  if (!cached || fresh) {
    cached = (async () => {
      const res = await fetch(COLLECTION, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load the pools.')
      const body = (await res.json()) as { docs: { id: string; data?: unknown }[] }
      return body.docs
        .map((d) => cleanProfile(d.id, d.data))
        .filter((p): p is Profile => p !== null)
        .map(toPool)
        .sort((a, b) => a.name.localeCompare(b.name))
    })()
    cached.catch(() => (cached = null))
  }
  return cached
}

/** Owner only: writes the made-up demo pools to D1. Pools already on file with the same id are replaced. */
export async function loadDemoPools(): Promise<Pool[]> {
  for (const p of DEMO_PROFILES) {
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
