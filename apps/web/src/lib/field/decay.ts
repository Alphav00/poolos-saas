// Decay between visits, and time on site — from the visits already logged.
// Pure: dated readings in, rows and minutes out. Nothing here guesses a
// reading, a dose, or a sensor value; a rate needs two real visits.
import { fmt, fmtDelta, scaleFor, SCALES } from './scales'
import { dayName } from './route'
import type { Day, DecayRow, Param, Reading } from './types'

/** One saved day of readings, as the visit list and the decay math use it. */
export interface DatedReading {
  date: string
  values: Partial<Record<Param, number>>
  arrivedAt?: string
  leftAt?: string
}

/** Wall-clock time, H:MM or HH:MM, 24-hour. */
export const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/
export const isClockTime = (v: unknown): v is string => typeof v === 'string' && CLOCK.test(v)

/** Minutes after midnight, or null when the text is not a clock time. */
export function clockMinutes(v: string | undefined): number | null {
  if (!isClockTime(v)) return null
  const [h, m] = v.split(':').map(Number) as [number, number]
  return h * 60 + m
}

/** Minutes on site, from arrival to departure the same day. Null when either
 *  time is missing, malformed, or departure is not after arrival. */
export function visitMinutes(arrivedAt: string | undefined, leftAt: string | undefined): number | null {
  const a = clockMinutes(arrivedAt)
  const l = clockMinutes(leftAt)
  if (a === null || l === null || l <= a) return null
  return l - a
}

/** Minutes in the words a tech uses: "35 min", "1 h 05 min". */
export function timeWords(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

/** A date as "Tue Oct 27": built from the parts, so no locale surprises. */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function dateWords(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d)
  return `${WEEKDAYS[dt.getDay()]} ${MONTHS[m - 1]} ${d}`
}

/** Whole days from `from` to `to`, both yyyy-mm-dd. Negative when `to` is earlier. */
export function dayDiff(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000)
}

/** The next date after `from` that falls on `day`. A week out when `from` is that day. */
export function nextServiceDate(day: Day, from: string): string {
  const [y, m, d] = from.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d)
  for (let i = 1; i <= 7; i++) {
    dt.setDate(dt.getDate() + 1)
    if (dt.getDay() === ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(day)) {
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    }
  }
  return from // unreachable: every weekday occurs within 7 days
}

/** The unit after a formatted value, or nothing when the format carries it. */
const suffix = (key: Param) => {
  const s = scaleFor(key)
  return key === 'temp' || !s.unit ? '' : ` ${s.unit}`
}

/**
 * One row per chemical logged at both of the last two visits: how fast it
 * moved per day, and where that rate puts it at the next visit. The next
 * visit is the pool's service day, or seven days out when none is set.
 * A row is flagged when the projection falls below the company's low target.
 * Empty when fewer than two dated visits, or when both fall on one day.
 */
export function decayRows(
  history: DatedReading[],
  opts: { serviceDay?: Day; lowTargets?: Partial<Record<Param, number>> } = {},
): DecayRow[] {
  if (history.length < 2) return []
  const prev = history[history.length - 2]!
  const last = history[history.length - 1]!
  const days = dayDiff(prev.date, last.date)
  if (days <= 0) return []
  // With a service day the projection lands on it; without one, seven days out.
  const nextDate = opts.serviceDay ? nextServiceDate(opts.serviceDay, last.date) : addDays(last.date, 7)
  const daysToNext = dayDiff(last.date, nextDate)
  const rows: DecayRow[] = []
  for (const s of SCALES) {
    const a = prev.values[s.key]
    const b = last.values[s.key]
    if (a === undefined || b === undefined) continue
    const rate = (b - a) / days
    const projected = Math.max(0, b + rate * daysToNext)
    const low = opts.lowTargets?.[s.key]
    rows.push({
      label: s.label,
      detail: `${fmt(s.key, a)} → ${fmt(s.key, b)}${suffix(s.key)} over ${days} day${days === 1 ? '' : 's'}`,
      trend: `${fmtDelta(s.key, rate)}/day · ~${fmt(s.key, projected)}${suffix(s.key)} by ${opts.serviceDay ? dayName(opts.serviceDay) : dateWords(nextDate)}`,
      alert: low !== undefined && projected < low,
    })
  }
  return rows
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** A dated reading as the visit list shows its time: span, duration, or nothing. */
export function visitTimeWords(r: Pick<Reading, 'arrivedAt' | 'leftAt'>): { span: string; minutes: number | null } {
  const minutes = visitMinutes(r.arrivedAt, r.leftAt)
  if (r.arrivedAt && r.leftAt && minutes !== null) return { span: `${r.arrivedAt}–${r.leftAt}`, minutes }
  if (r.arrivedAt && r.leftAt) return { span: `${r.arrivedAt}–${r.leftAt}`, minutes: null }
  if (r.arrivedAt) return { span: `arrived ${r.arrivedAt}`, minutes: null }
  if (r.leftAt) return { span: `left ${r.leftAt}`, minutes: null }
  return { span: 'no time logged', minutes: null }
}
