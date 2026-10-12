import { doneOn } from './route'
import { SCALES } from './scales'
import type { Method, Param, Reading } from './types'

const METHODS: Method[] = ['strip', 'drop', 'meter']

/** Keeps only what the screens can show: a known method and finite numbers for known readings. */
export function cleanReading(raw: unknown): Reading | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { method?: unknown; values?: unknown }
  const values: Reading['values'] = {}
  if (r.values && typeof r.values === 'object') {
    for (const s of SCALES) {
      const v = (r.values as Record<string, unknown>)[s.key]
      if (typeof v === 'number' && Number.isFinite(v)) values[s.key as Param] = v
    }
  }
  return { method: METHODS.includes(r.method as Method) ? (r.method as Method) : 'drop', values }
}

/** Unsaved readings survive back/forward and switching pools, until saved. */
const draftKey = (poolId: string, date: string) => `poolos.draft.${poolId}:${date}`
export function loadDraft(poolId: string, date: string): Reading | null {
  try {
    return cleanReading(JSON.parse(sessionStorage.getItem(draftKey(poolId, date)) ?? 'null'))
  } catch {
    return null
  }
}
export function saveDraft(poolId: string, date: string, r: Reading | null) {
  try {
    if (r) sessionStorage.setItem(draftKey(poolId, date), JSON.stringify(r))
    else sessionStorage.removeItem(draftKey(poolId, date))
  } catch {
    /* storage off: drafts just don't survive */
  }
}

// Today's readings are stored through the Worker (D1), one document per pool per day.
const doc = (poolId: string, date: string) => `/api/boards/field/readings/${encodeURIComponent(`${poolId}:${date}`)}`

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function loadReading(poolId: string, date: string): Promise<Reading | null> {
  const res = await fetch(doc(poolId, date), { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load readings.')
  const body = (await res.json()) as { exists: boolean; data: unknown }
  return body.exists ? cleanReading(body.data) : null
}

export async function saveReading(poolId: string, date: string, reading: Reading): Promise<void> {
  const res = await fetch(doc(poolId, date), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { pool: poolId, date, ...reading } }),
  })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not save readings.')
}

/** Pools whose readings for `date` are saved: the stops done on that day's route. */
export async function loadDone(date: string): Promise<Set<string>> {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  // Readings saved since that day's local midnight; the document ids say which day they are for.
  const since = new Date(y, m - 1, d).toISOString()
  const res = await fetch(`/api/boards/field/readings?since=${encodeURIComponent(since)}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load today’s readings.')
  return doneOn(((await res.json()) as { docs: { id: string; deleted?: boolean; data?: unknown }[] }).docs, date)
}
