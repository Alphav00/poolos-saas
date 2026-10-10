import type { Brand } from 'virtual:brand'
import { describe, expect, it } from 'vitest'
import { matchUsername, savedUsername, saveUsername } from './account.svelte'

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
    saveUsername(s, 'k-and-r')
    expect(savedUsername(s)).toBe('k-and-r')
    saveUsername(s, null)
    expect(savedUsername(s)).toBeNull()
  })
  it('treats blocked or missing storage as signed out, without throwing', () => {
    expect(() => saveUsername(blocked, 'k-and-r')).not.toThrow()
    expect(savedUsername(blocked)).toBeNull()
    expect(savedUsername(undefined)).toBeNull()
  })
})
