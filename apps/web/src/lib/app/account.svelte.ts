// Placeholder sign-in: when the build carries more than one brand pack
// (BRAND=a,b), each pack's id is a username, and signing in makes the app wear
// that brand. Cloudflare Access is still what lets anyone in; this only picks
// the company. One pack in the build means no sign-in. See brands/README.md.
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

let current = $state<Brand | null>(needsSignIn ? matchUsername(savedUsername(store()) ?? '', brands) : defaultBrand)
wear(current)

/** The signed-in brand; the default pack until someone signs in. */
export function brand(): Brand {
  return current ?? defaultBrand
}

export function signedIn(): boolean {
  return current !== null
}

/** Signs in as the pack the username names. Returns false when no pack has that name. */
export function signIn(username: string): boolean {
  const b = matchUsername(username, brands)
  if (!b) return false
  current = b
  saveUsername(store(), b.id)
  wear(b)
  return true
}

export function signOut(): void {
  current = null
  saveUsername(store(), null)
  wear(null)
}

/** Points the page's colours, title and theme colour at the brand. */
function wear(b: Brand | null): void {
  if (!needsSignIn || typeof document === 'undefined') return
  const root = document.documentElement
  if (b) root.dataset.brand = b.id
  else delete root.dataset.brand
  document.title = (b ?? defaultBrand).name
  const surface = getComputedStyle(root).getPropertyValue('--brand-surface').trim()
  if (surface) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface)
}
