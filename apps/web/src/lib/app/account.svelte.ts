// Placeholder sign-in: when the build carries more than one brand pack
// (BRAND=a,b), each pack's id is a username, and signing in makes the app wear
// that brand and work on that company's data: the poolos_company cookie tells
// the Worker whose team boards to use (apps/api/src/company.ts; the default
// pack sets none and keeps the plain boards). Cloudflare Access is still what
// lets anyone in. Which companies a person may pick comes from /api/me: their
// staff lists, or all of them for an owner (DECISIONS d0023). One pack in the
// build means no sign-in. See brands/README.md.
import defaultBrand, { brands, type Brand } from 'virtual:brand'

const KEY = 'poolos.account'

/** The pack a typed username names: its id or its name, any case, spaces trimmed. */
export function matchUsername(input: string, packs: Brand[]): Brand | null {
  const u = input.trim().toLowerCase()
  if (!u) return null
  return packs.find((b) => b.id === u || b.name.toLowerCase() === u) ?? null
}

/** The saved username, or null when there is none or storage is blocked. */
export function savedUsername(storage: Pick<Storage, 'getItem'> | undefined): string | null {
  try {
    return storage?.getItem(KEY) ?? null
  } catch {
    return null
  }
}

/** Saves (or with null, forgets) the username. Blocked storage only costs the next visit a sign-in. */
export function saveUsername(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, id: string | null): void {
  try {
    if (id) storage?.setItem(KEY, id)
    else storage?.removeItem(KEY)
  } catch {
    // Private window or blocked site data.
  }
}

const store = (): Storage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export const needsSignIn = brands.length > 1

/** The packs a person may open: /api/me's companies ('' is the default pack), or every pack for 'all'. */
export function allowedFrom(companies: string[] | 'all', packs: Brand[], defaultId: string): Brand[] {
  if (companies === 'all') return packs
  const ids = companies.map((c) => c || defaultId)
  return packs.filter((b) => ids.includes(b.id))
}

export type CompanyPick = { go: Brand } | { ask: Brand[] } | { none: true }

/** Where sign-in goes: the saved company if still allowed, the only allowed one, a choice, or nowhere. */
export function pickCompany(saved: string | null, allowed: Brand[]): CompanyPick {
  const kept = allowed.find((b) => b.id === saved)
  if (kept) return { go: kept }
  if (allowed.length === 1) return { go: allowed[0]! }
  if (allowed.length > 1) return { ask: allowed }
  return { none: true }
}

let allowed = $state<Brand[]>(brands)

/** Sets the packs this person may open, from /api/me. */
export function setAllowed(packs: Brand[]): void {
  allowed = packs
}

export function allowedBrands(): Brand[] {
  return allowed
}

let current = $state<Brand | null>(needsSignIn ? matchUsername(savedUsername(store()) ?? '', brands) : defaultBrand)
wear(current)

/** The signed-in brand; the default pack until someone signs in. */
export function brand(): Brand {
  return current ?? defaultBrand
}

export function signedIn(): boolean {
  return current !== null
}

/** Signs in as the pack the username names. Returns false when this person may not open a pack by that name. */
export function signIn(username: string): boolean {
  const b = matchUsername(username, allowed)
  if (!b) return false
  saveUsername(store(), b.id)
  switchTo(b)
  return true
}

export function signOut(): void {
  saveUsername(store(), null)
  switchTo(null)
}

// Screens cache pools and staff for the page's life (field/pools.ts,
// field/staff.ts), so a change of company starts the page afresh; the saved
// username brings the new company back, loading screen first.
function switchTo(b: Brand | null): void {
  wear(b)
  if (typeof location !== 'undefined' && typeof document !== 'undefined') location.reload()
  else current = b
}

/** The cookie value for a brand: none for the default pack, whose data is on the plain boards. */
export function companyCookie(b: Brand | null, defaultId: string, secure: boolean): string {
  const id = b && b.id !== defaultId ? b.id : ''
  return `poolos_company=${id}; Path=/; SameSite=Strict; Max-Age=${id ? 31536000 : 0}${secure ? '; Secure' : ''}`
}

/** Points the page's colours, title, theme colour and company cookie at the brand. */
function wear(b: Brand | null): void {
  if (!needsSignIn || typeof document === 'undefined') return
  document.cookie = companyCookie(b, defaultBrand.id, location.protocol === 'https:')
  const root = document.documentElement
  if (b) root.dataset.brand = b.id
  else delete root.dataset.brand
  document.title = (b ?? defaultBrand).name
  const surface = getComputedStyle(root).getPropertyValue('--brand-surface').trim()
  if (surface) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface)
}
