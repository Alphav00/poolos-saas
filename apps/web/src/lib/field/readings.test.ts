import { describe, expect, it } from 'vitest'
import { entryDate, historyFromDocs, type HistoryDoc } from './readings'

describe('entry date', () => {
  it('edits the requested day when it is real and not in the future', () => {
    expect(entryDate('2026-10-20', '2026-10-26')).toBe('2026-10-20')
    expect(entryDate('2026-10-26', '2026-10-26')).toBe('2026-10-26')
  })
  it('falls back to today for anything else', () => {
    expect(entryDate(undefined, '2026-10-26')).toBe('2026-10-26')
    expect(entryDate('', '2026-10-26')).toBe('2026-10-26')
    expect(entryDate('20-10-26', '2026-10-26')).toBe('2026-10-26')
    expect(entryDate('2026-13-01', '2026-10-26')).toBe('2026-10-26')
    expect(entryDate('2026-02-30', '2026-10-26')).toBe('2026-10-26')
    expect(entryDate('2026-10-27', '2026-10-26')).toBe('2026-10-26')
  })
})

describe('history from documents', () => {
  const docs: HistoryDoc[] = [
    { id: 'quarry-lane:2026-10-20', data: { pool: 'quarry-lane', date: '2026-10-20', method: 'drop', values: { fc: 2.2 }, arrivedAt: '9:05', leftAt: '9:40' } },
    { id: 'quarry-lane:2026-10-13', data: { pool: 'quarry-lane', date: '2026-10-13', method: 'drop', values: { fc: 3 } } },
    { id: 'other-pool:2026-10-20', data: { pool: 'other-pool', date: '2026-10-20', method: 'drop', values: { fc: 5 } } },
    { id: 'quarry-lane:2026-10-14', deleted: true, data: { pool: 'quarry-lane', date: '2026-10-14', method: 'drop', values: { fc: 1 } } },
    { id: 'quarry-lane:2026-10-15', data: { pool: 'quarry-lane', date: '2026-10-15', method: 'drop', values: {} } },
    { id: 'quarry-lane:not-a-date', data: { pool: 'quarry-lane', date: 'not-a-date', method: 'drop', values: { fc: 1 } } },
    { id: 'quarry-lane:2026-10-21', data: { pool: 'quarry-lane', date: '2026-10-21', method: 'drop', values: { fc: 2.5 }, arrivedAt: '25:00' } },
  ]
  it('keeps only this pool’s visits with readings, oldest first, times cleaned', () => {
    expect(historyFromDocs(docs, 'quarry-lane')).toEqual([
      { date: '2026-10-13', values: { fc: 3 } },
      { date: '2026-10-20', values: { fc: 2.2 }, arrivedAt: '9:05', leftAt: '9:40' },
      { date: '2026-10-21', values: { fc: 2.5 } },
    ])
  })
})
