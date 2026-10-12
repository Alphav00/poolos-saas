import { describe, expect, it } from 'vitest'
import { brandCss, loadBrands, publicBrand, type BrandPack } from '../../../brands/vite-plugin-brand.mjs'

const colors = { primary: '#111111', primaryDark: '#222222', deep: '#333333', link: '#444444', sky: '#555555', ice: '#666666', accent: '#777777', ink: '#888888', surface: '#999999', background: '#aaaaaa' }
const pack = (id: string, scheme?: 'dark'): BrandPack => ({ id, dir: '', name: id, shortName: id, legalName: id, tagline: '', pilot: false, scheme, colors, linear: null, loader: null })

describe('several brand packs', () => {
  it('one pack sets :root only, as before', () => {
    const css = brandCss(pack('blue-lagoon'))
    expect(css).toContain(':root{color-scheme:light;--brand-primary:#111111;--brand-primary-rgb:17 17 17')
    expect(css).not.toContain('data-brand')
  })
  it('several packs also get :root[data-brand]', () => {
    const css = brandCss(pack('blue-lagoon'), { ...pack('k-and-r'), colors: { ...colors, primary: '#0a0b0c' } })
    expect(css).toContain(':root[data-brand="blue-lagoon"]{color-scheme:light;--brand-primary:#111111')
    expect(css).toContain(':root[data-brand="k-and-r"]{color-scheme:light;--brand-primary:#0a0b0c')
  })
  it('a dark pack sets its colour scheme and surfaces; a light one resets them', () => {
    const night = { ...pack('k-and-r', 'dark'), colors: { ...colors, card: '#1c1932' } }
    const css = brandCss(pack('blue-lagoon'), night)
    expect(css).toContain(':root[data-brand="k-and-r"]{color-scheme:dark;')
    expect(css).toContain('--brand-card:#1c1932')
    expect(css).toMatch(/:root\[data-brand="blue-lagoon"\]\{color-scheme:light;[^}]*--brand-card:initial/)
    expect(css).toContain('--scheme-okbg:#12352a')
    expect(css).toMatch(/:root\[data-brand="blue-lagoon"\]\{[^}]*--scheme-okbg:initial/)
    expect(css).not.toContain('light-dark')
  })
  it('images move under /brand/<id>/ only when there are several', () => {
    expect(publicBrand(pack('k-and-r')).logo).toBe('/brand/logo.png')
    expect(publicBrand(pack('k-and-r'), true).mark).toBe('/brand/k-and-r/mark.png')
  })
  it('reads a comma list and says what is wrong with a bad one', () => {
    expect(loadBrands('poolos').map((b) => b.id)).toEqual(['poolos'])
    expect(() => loadBrands('poolos, poolos')).toThrow('names a pack twice')
    expect(() => loadBrands('poolos,no-such-pack')).toThrow('No brand pack at brands/no-such-pack')
    expect(() => loadBrands(' , ')).toThrow('names no brand pack')
  })
})
