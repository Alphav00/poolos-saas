import type { Brand } from 'virtual:brand'
import { describe, expect, it } from 'vitest'
import { allowedFrom, companyCookie, cookieNames, matchUsername, pickCompany, savedUsername, saveUsername, signInBy } from './account.svelte'

const pack = (id: string, name: string): Brand => ({ id, name, shortName: name, legalName: name, tagline: '', pilot: true, linear: null, loader: null, logo: '', mark: '' })
const PACKS = [pack('blue-lagoon', 'Blue Lagoon Pools'), pack('k-and-r', 'K&R Pools')]

describe('matchUsername', () => {
  it('matches the pack id', () => expect(matchUsername('blue-lagoon', PACKS)?.id).toBe('blue-lagoon'))
  it('matches the pack name, any case, trimmed', () => expect(matchUsername('  k&r POOLS ', PACKS)?.id).toBe('k-and-r'))
  it('matches nothing for an unknown or empty name', () => {
    expect(matchUsername('k-and', PACKS)).toBeNull()
    expect(matchUsername('   ', PACKS)).toBeNull()
  })
})

describe('saved username', () => {
  const memory = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
  }
  const blocked = {
    getItem: (): string | null => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
  }

  it('round-trips and forgets', () => {
    const s = memory()
    expect(saveUsername(s, 'k-and-r')).toBe(true)
    expect(savedUsername(s)).toBe('k-and-r')
    expect(saveUsername(s, null)).toBe(true)
    expect(savedUsername(s)).toBeNull()
  })
  it('treats blocked or missing storage as signed out, without throwing', () => {
    expect(() => saveUsername(blocked, 'k-and-r')).not.toThrow()
    expect(saveUsername(blocked, 'k-and-r')).toBe(false)
    expect(saveUsername(undefined, 'k-and-r')).toBe(false)
    expect(savedUsername(blocked)).toBeNull()
    expect(savedUsername(undefined)).toBeNull()
  })
})

describe('signInBy', () => {
  it('reloads once the username is saved', () => expect(signInBy(true, null, true)).toBe('reload'))
  it('signs in without a reload when storage is blocked, so the reload cannot loop', () => expect(signInBy(false, null, true)).toBe('in place'))
  it('still reloads to leave a company already open, which comes back signed out', () => expect(signInBy(false, PACKS[0]!, true)).toBe('reload'))
  it('opens nothing when the company cookie did not stick, or the Worker would use the default company', () => {
    expect(signInBy(false, null, false)).toBe('blocked')
    expect(signInBy(true, PACKS[0]!, false)).toBe('blocked')
  })
})

describe('cookieNames', () => {
  it('finds the company cookie among others', () => {
    expect(cookieNames('a=1; poolos_company=k-and-r; b=2', PACKS[1]!, 'blue-lagoon')).toBe(true)
  })
  it('is false when the cookie is missing or names another company', () => {
    expect(cookieNames('', PACKS[1]!, 'blue-lagoon')).toBe(false)
    expect(cookieNames('poolos_company=k-and-r-2', PACKS[1]!, 'blue-lagoon')).toBe(false)
  })
  it('needs no cookie for the default company', () => expect(cookieNames('', PACKS[0]!, 'blue-lagoon')).toBe(true))
})

describe('companyCookie', () => {
  it('names a company other than the default, for a year', () => {
    expect(companyCookie(PACKS[1]!, 'blue-lagoon', true)).toBe('poolos_company=k-and-r; Path=/; SameSite=Strict; Max-Age=31536000; Secure')
  })
  it('clears the cookie for the default company and on sign-out', () => {
    expect(companyCookie(PACKS[0]!, 'blue-lagoon', false)).toBe('poolos_company=; Path=/; SameSite=Strict; Max-Age=0')
    expect(companyCookie(null, 'blue-lagoon', false)).toContain('Max-Age=0')
  })
})

describe('allowedFrom', () => {
  it('maps the default company and keeps pack order', () => {
    expect(allowedFrom(['k-and-r', ''], PACKS, 'blue-lagoon').map((b) => b.id)).toEqual(['blue-lagoon', 'k-and-r'])
    expect(allowedFrom([''], PACKS, 'blue-lagoon').map((b) => b.id)).toEqual(['blue-lagoon'])
    expect(allowedFrom(['gone'], PACKS, 'blue-lagoon')).toEqual([])
  })
  it('gives an owner every pack', () => expect(allowedFrom('all', PACKS, 'blue-lagoon')).toBe(PACKS))
})

describe('pickCompany', () => {
  const [lagoon, kr] = PACKS as [Brand, Brand]
  it('keeps the saved company while it is still allowed', () => expect(pickCompany('k-and-r', PACKS)).toEqual({ go: kr }))
  it('goes straight to the only company', () => {
    expect(pickCompany(null, [lagoon])).toEqual({ go: lagoon })
    expect(pickCompany('k-and-r', [lagoon])).toEqual({ go: lagoon })
  })
  it('asks when there are several and none is saved', () => expect(pickCompany(null, PACKS)).toEqual({ ask: PACKS }))
  it('has nowhere to go without a staff list', () => expect(pickCompany('k-and-r', [])).toEqual({ none: true }))
})
