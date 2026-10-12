// Today's route: the customers whose weekly service day is today, in the
// order the office set. A stop is done once today's readings are saved.
import type { Day, Pool, Profile } from './types'

export const DAYS: { key: Day; short: string; long: string }[] = [
  { key: 'mon', short: 'Mon', long: 'Monday' },
  { key: 'tue', short: 'Tue', long: 'Tuesday' },
  { key: 'wed', short: 'Wed', long: 'Wednesday' },
  { key: 'thu', short: 'Thu', long: 'Thursday' },
  { key: 'fri', short: 'Fri', long: 'Friday' },
  { key: 'sat', short: 'Sat', long: 'Saturday' },
  { key: 'sun', short: 'Sun', long: 'Sunday' },
]

export const isDay = (v: unknown): v is Day => DAYS.some((d) => d.key === v)

/** The service day a date falls on. */
export const dayOf = (d: Date): Day => DAYS[(d.getDay() + 6) % 7]!.key

export const dayName = (day: Day) => DAYS.find((d) => d.key === day)!.long

/** Stops before customers with no place yet; ties by name. */
const byOrder = (a: Profile, b: Profile) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name)

/** The customers on a day's route, in driving order. */
export function routeFor<P extends Profile>(pools: P[], day: Day): P[] {
  return pools.filter((p) => p.serviceDay === day).sort(byOrder)
}

/** Everyone not on that day's route, by service day (Monday first, no day last), then name. */
export function notOnRoute<P extends Profile>(pools: P[], day: Day): P[] {
  const rank = (p: Profile) => (p.serviceDay ? DAYS.findIndex((d) => d.key === p.serviceDay) : DAYS.length)
  return pools.filter((p) => p.serviceDay !== day).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

/** The place a new customer takes: after everyone already on that day. */
export function nextOrder(pools: Profile[], day: Day): number {
  return Math.max(0, ...routeFor(pools, day).map((p) => p.order ?? 0)) + 1
}

/**
 * Moves stop `index` one place up (-1) or down (+1) and numbers the day 1..n.
 * Returns only the customers whose order changed, with their new order.
 */
export function moveStop(stops: Profile[], index: number, by: -1 | 1): { id: string; order: number }[] {
  const to = index + by
  if (index < 0 || index >= stops.length || to < 0 || to >= stops.length) return []
  const list = [...stops]
  ;[list[index], list[to]] = [list[to]!, list[index]!]
  return list.map((p, i) => ({ id: p.id, order: i + 1 })).filter((m, i) => list[i]!.order !== m.order)
}

/** Pool ids with readings saved for `date` (yyyy-mm-dd), from reading documents `<pool>:<date>`. */
export function doneOn(docs: { id: string; deleted?: boolean; data?: unknown }[], date: string): Set<string> {
  const done = new Set<string>()
  for (const d of docs) {
    if (d.deleted || !d.id.endsWith(`:${date}`)) continue
    const values = (d.data as { values?: Record<string, unknown> } | undefined)?.values
    if (values && Object.keys(values).length > 0) done.add(d.id.slice(0, -date.length - 1))
  }
  return done
}

export type { Pool }
