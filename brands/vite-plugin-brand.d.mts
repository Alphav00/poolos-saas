import type { Plugin } from 'vite'
export type BrandPack = {
  id: string
  dir: string
  name: string
  shortName: string
  legalName: string
  tagline: string
  pilot: boolean
  colors: Record<string, string>
  linear: { team: string; project?: string; labels: string[] } | null
}
export function loadBrand(id?: string): BrandPack
export function loadBrands(list?: string): BrandPack[]
export function brandCss(...packs: BrandPack[]): string
export function publicBrand(b: BrandPack, multi?: boolean): { id: string; logo: string; mark: string } & Record<string, unknown>
export default function brandPlugin(options?: { emit?: boolean }): Plugin
