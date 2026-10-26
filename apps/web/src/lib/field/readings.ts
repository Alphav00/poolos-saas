import { doneOn } from './route'
import { isClockTime, type DatedReading } from './decay'
import { SCALES } from './scales'
import type { Method, Param, Reading } from './types'

const METHODS: Method[] = ['strip', 'drop', 'meter']

/** Keeps only what the screens can show: a known method, finite numbers for known readings, and clock times. */
export function cleanReading(raw: unknown): Reading | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { method?: unknown; values?: unknown; arrivedAt?: unknown; leftAt?: unknown }
  const values: Reading['values'] = {}
  if (r.values && typeof r.values === 'object') {
    for (const s of SCALES) {
      const v = (r.values as Record<string, unknown>)[s.key]
      if (typeof v === 'number' && Number.isFinite(v)) values[s.key as Param] = v
    }
  }
  const reading: Reading = { method: METHODS.includes(r.method as Method) ? (r.method as Method) : 'drop', values }
  if (isClockTime(r.arrivedAt)) reading.arrivedAt = r.arrivedAt
  if (isClockTime(r.leftAt)) reading.leftAt = r.leftAt
  return reading
}

/** A readings document from the list endpoint, as historyFromDocs reads it. */
export interface HistoryDoc {
  id: string
  deleted?: boolean
  data?: unknown
}

/**
 * A pool's dated visits from list documents: its own ids only, deleted and
 * empty ones skipped, oldest first. A visit counts when its readings hold
 * values, the same rule the route screen uses for "done".
 */
export function historyFromDocs(docs: HistoryDoc[], poolId: string): DatedReading[] {
  const prefix = `${poolId}:`
  const out: DatedReading[] = []
  for (const d of docs) {
    if (d.deleted || !d.id.startsWith(prefix)) continue
    const date = d.id.slice(prefix.length)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const r = cleanReading(d.data)
    if (!r || Object.keys(r.values).length === 0) continue
    out.push({ date, values: r.values, ...(r.arrivedAt ? { arrivedAt: r.arrivedAt } : {}), ...(r.leftAt ? { leftAt: r.leftAt } : {}) })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
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

/**
 * The date the readings screen edits: the requested day when it is a real
 * date no later than today, otherwise today. A future day or malformed text
 * never opens the screen, so a typed address can't invent a future visit.
 */
export function entryDate(requested: string | undefined, todayStr: string): string {
  if (!requested || !/^\d{4}-\d{2}-\d{2}$/.test(requested) || requested > todayStr) return todayStr
  const [y, m, d] = requested.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return todayStr
  return requested
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

/**
 * A pool's past visits, oldest first: its readings documents changed in the
 * last 12 weeks. The list endpoint has no per-pool query, so the window
 * bounds the payload; older visits stay out until a dated query exists.
 */
export async function loadHistory(poolId: string): Promise<DatedReading[]> {
  const since = new Date(Date.now() - 84 * 86400000).toISOString()
  const res = await fetch(`/api/boards/field/readings?since=${encodeURIComponent(since)}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load past visits.')
  const body = (await res.json()) as { docs: HistoryDoc[] }
  return historyFromDocs(body.docs, poolId)
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
