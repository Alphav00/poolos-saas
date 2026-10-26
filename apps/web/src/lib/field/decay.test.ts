import { describe, expect, it } from 'vitest'
import { dateWords, dayDiff, decayRows, nextServiceDate, timeWords, visitMinutes, visitTimeWords, type DatedReading } from './decay'

describe('time on site', () => {
  it('counts minutes from arrival to departure', () => {
    expect(visitMinutes('9:05', '9:40')).toBe(35)
    expect(visitMinutes('9:30', '10:45')).toBe(75)
  })
  it('refuses missing, malformed, or backwards times', () => {
    expect(visitMinutes(undefined, '9:40')).toBeNull()
    expect(visitMinutes('9:05', undefined)).toBeNull()
    expect(visitMinutes('9:05', '9:5')).toBeNull()
    expect(visitMinutes('25:00', '26:00')).toBeNull()
    expect(visitMinutes('9:40', '9:40')).toBeNull()
    expect(visitMinutes('10:00', '9:00')).toBeNull()
  })
  it('words minutes like a tech says them', () => {
    expect(timeWords(35)).toBe('35 min')
    expect(timeWords(65)).toBe('1 h 05 min')
    expect(timeWords(120)).toBe('2 h 00 min')
  })
  it('words a visit with a bad span without inventing a duration', () => {
    expect(visitTimeWords({ arrivedAt: '9:05', leftAt: '9:40' })).toEqual({ span: '9:05–9:40', minutes: 35 })
    expect(visitTimeWords({ arrivedAt: '10:00', leftAt: '9:00' })).toEqual({ span: '10:00–9:00', minutes: null })
    expect(visitTimeWords({ arrivedAt: '9:05' })).toEqual({ span: 'arrived 9:05', minutes: null })
    expect(visitTimeWords({})).toEqual({ span: 'no time logged', minutes: null })
  })
})

describe('dates', () => {
  it('words a date from its parts', () => {
    expect(dateWords('2026-10-20')).toBe('Tue Oct 20')
  })
  it('counts whole days both ways', () => {
    expect(dayDiff('2026-10-13', '2026-10-20')).toBe(7)
    expect(dayDiff('2026-10-20', '2026-10-13')).toBe(-7)
  })
  it('finds the next service day, a week out on the same day', () => {
    expect(nextServiceDate('tue', '2026-10-20')).toBe('2026-10-27')
    expect(nextServiceDate('mon', '2026-10-20')).toBe('2026-10-26')
  })
})

const twoVisits: DatedReading[] = [
  { date: '2026-10-13', values: { fc: 3, ph: 7.5 } },
  { date: '2026-10-20', values: { fc: 2.2, ph: 7.4 } },
]

describe('decay rows', () => {
  it('rates the last interval and projects it to the next service day', () => {
    const rows = decayRows(twoVisits, { serviceDay: 'tue' })
    expect(rows).toEqual([
      { label: 'FC', detail: '3 → 2.2 ppm over 7 days', trend: '−0.1/day · ~1.4 ppm by Tuesday', alert: false },
      { label: 'pH', detail: '7.5 → 7.4 over 7 days', trend: '−0.0/day · ~7.3 by Tuesday', alert: false },
    ])
  })
  it('flags a projection below the company low target', () => {
    const rows = decayRows(twoVisits, { serviceDay: 'tue', lowTargets: { fc: 2 } })
    expect(rows[0]!.alert).toBe(true)
    expect(rows[1]!.alert).toBe(false)
  })
  it('projects seven days out with no service day, named by date', () => {
    const rows = decayRows(twoVisits, {})
    expect(rows[0]!.trend).toBe('−0.1/day · ~1.4 ppm by Tue Oct 27')
  })
  it('needs two visits on different days, and skips chemicals logged once', () => {
    expect(decayRows([twoVisits[1]!], { serviceDay: 'tue' })).toEqual([])
    expect(decayRows([{ date: '2026-10-20', values: { fc: 3 } }, twoVisits[1]!], { serviceDay: 'tue' })).toEqual([])
    const rows = decayRows(
      [
        { date: '2026-10-13', values: { fc: 3 } },
        { date: '2026-10-20', values: { fc: 2.2, ph: 7.4 } },
      ],
      { serviceDay: 'tue' },
    )
    expect(rows.map((r) => r.label)).toEqual(['FC'])
  })
})
