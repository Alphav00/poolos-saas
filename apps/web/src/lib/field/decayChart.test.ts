import { describe, expect, it } from 'vitest'

describe('DecayChart layout math', () => {
  const W = 342
  const step = (visitsLength: number) => (W - 40) / Math.max(1, visitsLength)
  const todayX = (visitsLength: number) => 20 + visitsLength * step(visitsLength)

  it('keeps todayX bounded at W - 20 (322px) regardless of visit count', () => {
    expect(todayX(1)).toBe(322)
    expect(todayX(4)).toBe(322)
    expect(todayX(10)).toBe(322)
  })

  it('leaves a 20px margin on the right edge', () => {
    expect(W - todayX(4)).toBe(20)
  })
})
