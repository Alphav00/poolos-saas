import { afterEach, describe, expect, it, vi } from 'vitest'
import { docId, randomTail } from './ids'

// The Worker's id checks (apps/api/src/feedback.ts, messages.ts).
const REPORT = /^r-\d{8}-\d{6}-[a-z0-9]{4}$/
const POST = /^m-\d{8}-\d{6}-[a-z0-9]{4}$/

const fixed = (...seq: number[]) => {
  let i = 0
  return (n: number) => Uint8Array.from({ length: n }, () => seq[i++ % seq.length])
}

afterEach(() => vi.restoreAllMocks())

describe('docId', () => {
  it('matches the Worker checks for reports and posts', () => {
    for (let i = 0; i < 200; i++) {
      expect(docId('r')).toMatch(REPORT)
      expect(docId('m')).toMatch(POST)
    }
  })

  it('stamps the UTC date and time', () => {
    expect(docId('r', new Date('2026-10-10T07:08:09.123Z'), fixed(0, 1, 2, 3))).toBe('r-20261010-070809-abcd')
  })

  it('draws the tail from crypto.getRandomValues, never Math.random', () => {
    const cryptoSpy = vi.spyOn(crypto, 'getRandomValues')
    const mathSpy = vi.spyOn(Math, 'random')
    docId('m')
    expect(cryptoSpy).toHaveBeenCalled()
    expect(mathSpy).not.toHaveBeenCalled()
  })
})

describe('randomTail', () => {
  it('maps bytes onto a-z0-9', () => {
    expect(randomTail(4, fixed(25, 26, 35, 36))).toBe('z09a')
  })

  it('drops bytes 252-255 so no character is favoured', () => {
    expect(randomTail(4, fixed(252, 253, 254, 255, 0, 1, 2, 3))).toBe('abcd')
  })

  it('keeps drawing until the tail is full when bytes are rejected', () => {
    const bytes = vi.fn(fixed(255, 255, 255, 255, 255, 255, 255, 7))
    expect(randomTail(4, bytes)).toBe('hhhh')
    expect(bytes.mock.calls.length).toBeGreaterThan(1)
  })

  it('is roughly uniform over many draws', () => {
    const counts = new Map<string, number>()
    const draws = 36_000
    for (let i = 0; i < draws / 4; i++) for (const c of randomTail()) counts.set(c, (counts.get(c) ?? 0) + 1)
    expect(counts.size).toBe(36)
    for (const n of counts.values()) expect(Math.abs(n - draws / 36)).toBeLessThan(250) // ~8.5 sigma
  })
})
