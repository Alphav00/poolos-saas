// Picks the brand packs for a build. BRAND=<folder> selects brands/<folder>/
// (default: poolos); BRAND=<a>,<b> builds several, the first being the default.
// The default pack reaches the app as the module 'virtual:brand' (every pack
// as its `brands` export); colours become --brand-* CSS variables in
// index.html, per pack under :root[data-brand="<id>"]; images are served at
// /brand/<file> (default pack) and /brand/<id>/<file> (each pack, when there
// are several). The web app's manifest is built from the default pack.
// See brands/README.md.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const COLORS = ['primary', 'primaryDark', 'deep', 'link', 'sky', 'ice', 'accent', 'ink', 'surface', 'background']
const FILES = ['logo.png', 'mark.png', 'favicon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']
const HEX = /^#[0-9a-f]{6}$/i

/** Reads and checks brands/<id>/brand.json. Throws with the reason when the pack is incomplete. */
export function loadBrand(id = process.env.BRAND || 'poolos') {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`BRAND "${id}" must be a folder name under brands/`)
  const dir = join(ROOT, id)
  const file = join(dir, 'brand.json')
  if (!existsSync(file)) throw new Error(`No brand pack at brands/${id}/brand.json`)
  const b = JSON.parse(readFileSync(file, 'utf8'))
  for (const k of ['name', 'shortName', 'legalName', 'tagline']) {
    if (typeof b[k] !== 'string' || !b[k].trim()) throw new Error(`brands/${id}/brand.json needs "${k}"`)
  }
  for (const k of COLORS) {
    if (!HEX.test(b.colors?.[k] ?? '')) throw new Error(`brands/${id}/brand.json colors.${k} must be #rrggbb`)
  }
  for (const f of FILES) if (!existsSync(join(dir, f))) throw new Error(`brands/${id}/ is missing ${f}`)
  return { id, dir, name: b.name, shortName: b.shortName, legalName: b.legalName, tagline: b.tagline, pilot: b.pilot === true, colors: b.colors, linear: linearTarget(id, b.linear), loader: loaderSpec(id, b.loader) }
}

/** The company's loading screen after sign-in (optional): goo ball colours and the line under the count. */
function loaderSpec(id, l) {
  if (l === undefined) return null
  if (!(Array.isArray(l?.balls) && l.balls.length >= 2 && l.balls.length <= 8 && l.balls.every((c) => HEX.test(c)))) throw new Error(`brands/${id}/brand.json loader.balls must be 2 to 8 #rrggbb colours`)
  if (typeof l.word !== 'string' || !l.word.trim() || l.word.length > 40) throw new Error(`brands/${id}/brand.json loader.word must be a short line`)
  return { balls: l.balls, word: l.word }
}

/** Where testers file problems in Linear (optional): team key, and project and label names. */
function linearTarget(id, l) {
  if (l === undefined) return null
  const text = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 80
  if (!/^[A-Z][A-Z0-9]{0,9}$/.test(l?.team ?? '')) throw new Error(`brands/${id}/brand.json linear.team must be a Linear team key like HEP`)
  if (l.project !== undefined && !text(l.project)) throw new Error(`brands/${id}/brand.json linear.project must be a project name`)
  if (l.labels !== undefined && !(Array.isArray(l.labels) && l.labels.every(text))) throw new Error(`brands/${id}/brand.json linear.labels must be label names`)
  return { team: l.team, project: l.project, labels: l.labels ?? [] }
}

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Reads every pack in a comma list (BRAND=a,b). The first is the default; one id behaves as loadBrand. */
export function loadBrands(list = process.env.BRAND || 'poolos') {
  const ids = list.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) throw new Error('BRAND names no brand pack')
  if (new Set(ids).size !== ids.length) throw new Error(`BRAND "${list}" names a pack twice`)
  return ids.map((id) => loadBrand(id))
}

const vars = (b) => COLORS.flatMap((k) => [`--brand-${kebab(k)}:${b.colors[k]}`, `--brand-${kebab(k)}-rgb:${rgb(b.colors[k])}`]).join(';')

/**
 * --brand-<name> as hex, and --brand-<name>-rgb as "r g b" for Tailwind's alpha syntax.
 * The first pack is :root; with several, each also gets :root[data-brand="<id>"].
 */
export function brandCss(...packs) {
  const css = [`:root{${vars(packs[0])}}`]
  if (packs.length > 1) for (const b of packs) css.push(`:root[data-brand="${b.id}"]{${vars(b)}}`)
  return css.join('')
}

/** What the app sees of a pack. With several packs, its images live under /brand/<id>/. */
export function publicBrand(b, multi = false) {
  const at = multi ? `/brand/${b.id}/` : '/brand/'
  return { id: b.id, name: b.name, shortName: b.shortName, legalName: b.legalName, tagline: b.tagline, pilot: b.pilot, linear: b.linear, loader: b.loader, logo: `${at}logo.png`, mark: `${at}mark.png` }
}

export function manifest(b) {
  return {
    name: b.name,
    short_name: b.shortName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: b.colors.background,
    theme_color: b.colors.surface,
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

/**
 * Vite plugin. `emit: true` (the web app) also writes /brand/* and
 * /manifest.webmanifest into the build; Measure builds inside the web app's
 * output and reuses them.
 */
export default function brandPlugin({ emit = false } = {}) {
  const packs = loadBrands()
  const b = packs[0]
  const multi = packs.length > 1
  const pubs = packs.map((p) => publicBrand(p, multi))
  const html = { BRAND_NAME: b.name, BRAND_SHORT_NAME: b.shortName, BRAND_SURFACE: b.colors.surface, BRAND_BACKGROUND: b.colors.background, BRAND_INK: b.colors.ink, BRAND_PRIMARY: b.colors.primary }
  const pngs = (dir) => readdirSync(dir).filter((f) => f.endsWith('.png'))
  // Served path -> file on disk.
  const images = new Map(pngs(b.dir).map((f) => [`brand/${f}`, join(b.dir, f)]))
  if (multi) for (const p of packs) for (const f of pngs(p.dir)) images.set(`brand/${p.id}/${f}`, join(p.dir, f))
  return {
    name: 'poolos-brand',
    resolveId(id) {
      if (id === 'virtual:brand') return '\0virtual:brand'
    },
    load(id) {
      if (id === '\0virtual:brand') return `export default ${JSON.stringify(pubs[0])}\nexport const brands = ${JSON.stringify(pubs)}`
    },
    transformIndexHtml(src) {
      const out = src.replace(/%(BRAND_[A-Z_]+)%/g, (m, k) => (k in html ? escapeHtml(html[k]) : m))
      return { html: out, tags: [{ tag: 'style', attrs: { id: 'brand-colors' }, children: brandCss(...packs), injectTo: 'head-prepend' }] }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (emit && path === '/manifest.webmanifest') {
          res.setHeader('Content-Type', 'application/manifest+json')
          return res.end(JSON.stringify(manifest(b), null, 2))
        }
        const file = images.get(path.slice(1))
        if (file) {
          res.setHeader('Content-Type', 'image/png')
          return res.end(readFileSync(file))
        }
        next()
      })
    },
    generateBundle() {
      if (!emit) return
      for (const [fileName, file] of images) this.emitFile({ type: 'asset', fileName, source: readFileSync(file) })
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest(b), null, 2) })
    },
  }
}
