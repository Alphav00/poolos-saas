import { describe, expect, it } from 'vitest'
import { DEMO_STAFF } from './sample'
import { cleanStaff, staffId } from './staff'

describe('cleanStaff', () => {
  it('keeps a usable record and lower-cases the email', () => {
    expect(cleanStaff('alex', { name: 'Alex', email: 'Alex@Example.test', role: 'Lead', route: 'Route B', demo: true, createdAt: '2026-10-09T12:00:00.000Z', createdBy: 'owner@example.test' })).toEqual({
      id: 'alex', name: 'Alex', email: 'alex@example.test', role: 'Lead', route: 'Route B', demo: true, createdAt: '2026-10-09T12:00:00.000Z', createdBy: 'owner@example.test',
    })
  })

  it('drops records the screens cannot show', () => {
    expect(cleanStaff('x', null)).toBeNull()
    expect(cleanStaff('x', { name: ' ', email: 'a@example.test', role: 'Lead' })).toBeNull()
    expect(cleanStaff('x', { name: 'A', role: 'Lead' })).toBeNull()
    expect(cleanStaff('x', { name: 'A', email: 'a@example.test', role: 'Owner' })).toBeNull()
  })

  it('leaves out blank or odd optional fields', () => {
    expect(cleanStaff('a', { name: 'A', email: 'a@example.test', role: 'Operator', route: '', demo: 'yes' })).toEqual({
      id: 'a', name: 'A', email: 'a@example.test', role: 'Operator',
    })
  })

  it('accepts every demo record and marks it DEMO', () => {
    for (const s of DEMO_STAFF) {
      expect(cleanStaff(s.id, s)).toEqual(s)
      expect(s.demo).toBe(true)
      expect(s.email).toMatch(/@example\.test$/)
    }
  })
})

describe('staffId', () => {
  it('makes a free slug from the name', () => {
    expect(staffId('Sam Lee', [])).toBe('sam-lee')
    expect(staffId('Sam Lee', ['sam-lee', 'sam-lee-2'])).toBe('sam-lee-3')
    expect(staffId('  ¡!  ', [])).toBe('staff')
    expect(staffId('x'.repeat(90), [])).toMatch(/^x{50}$/)
  })
})
