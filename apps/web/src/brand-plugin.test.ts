import { describe, expect, it } from 'vitest'
import { brandCss, loadBrands, publicBrand, type BrandPack } from '../../../brands/vite-plugin-brand.mjs'

const colors = { primary: '#111111', primaryDark: '#222222', deep: '#333333', link: '#444444', sky: '#555555', ice: '#666666', accent: '#777777', ink: '#888888', surface: '#999999', background: '#aaaaaa' }
const pack = (id: string): BrandPack => ({ id, dir: '', name: id, shortName: id, legalName: id, tagline: '', pilot: false, colors, linear: null, loader: null })

describe('several brand packs', () => {
  it('one pack sets :root only, as before', () => {
    const css = brandCss(pack('blue-lagoon'))
    expect(css).toContain(':root{--brand-primary:#111111;--brand-primary-rgb:17 17 17')
    expect(css).not.toContain('data-brand')
  })
  it('several packs also get :root[data-brand]', () => {
    const css = brandCss(pack('blue-lagoon'), { ...pack('k-and-r'), colors: { ...colors, primary: '#0a0b0c' } })
    expect(css).toContain(':root[data-brand="blue-lagoon"]{--brand-primary:#111111')
    expect(css).toContain(':root[data-brand="k-and-r"]{--brand-primary:#0a0b0c')
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
