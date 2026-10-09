// Staff are kept in D1 at field/staff/<id>, through the Worker
// (apps/api/src/field.ts checks the shape; only owners may write; the Worker
// stamps createdAt and createdBy). A viewer's role comes from the record matching their
// sign-in email. Screens read staff from here, never from sample.ts.
import { DEMO_STAFF } from './sample'
import type { Role, StaffMember } from './types'

const COLLECTION = '/api/boards/field/staff'
export const ROLES: readonly Role[] = ['Technician', 'Lead', 'Dispatcher', 'Operator']
/** Roles the Worker lets change pool profiles (apps/api/src/roles.ts POOL_EDITORS), besides owners. */
export const POOL_EDITORS: readonly Role[] = ['Lead', 'Dispatcher']

/** Up to two letters for an avatar. */
export const initials = (name: string) => name.trim().slice(0, 2).toUpperCase()

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Keeps only what the screens can show; null when the document is not a usable staff record. */
export function cleanStaff(id: string, raw: unknown): StaffMember | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isText(r.name) || !isText(r.email) || !ROLES.includes(r.role as Role)) return null
  const s: StaffMember = { id, name: r.name, email: r.email.toLowerCase(), role: r.role as Role }
  if (isText(r.route)) s.route = r.route
  if (r.demo === true) s.demo = true
  if (isText(r.createdAt)) s.createdAt = r.createdAt
  if (isText(r.createdBy)) s.createdBy = r.createdBy
  return s
}

/** A free id for a new record, from the name: "Sam Lee" → "sam-lee", then "sam-lee-2"… */
export function staffId(name: string, taken: Iterable<string>): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'staff'
  const used = new Set(taken)
  let id = base
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`
  return id
}

let cached: Promise<StaffMember[]> | null = null
/** Every id on file, shown or not, so a new record never replaces one the screens hide. */
export const takenIds = new Set<string>()

/** Everyone on file, by name. One request per page load, shared by every screen. */
export function loadStaff(fresh = false): Promise<StaffMember[]> {
  if (!cached || fresh) {
    const p = (async () => {
      const res = await fetch(COLLECTION, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load the staff list.')
      const body = (await res.json()) as { docs: { id: string; data?: unknown }[] }
      takenIds.clear()
      for (const d of body.docs) takenIds.add(d.id)
      return body.docs
        .map((d) => cleanStaff(d.id, d.data))
        .filter((s): s is StaffMember => s !== null)
        .sort((a, b) => a.name.localeCompare(b.name))
    })()
    cached = p
    p.catch(() => {
      if (cached === p) cached = null
    })
  }
  return cached
}

async function failure(res: Response, fallback: string): Promise<Error> {
  if (res.status === 403) return new Error('Only an owner can change staff.')
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    if (body.error?.message) return new Error(body.error.message)
  } catch {
    // Not JSON; use the fallback.
  }
  return new Error(fallback)
}

/** Owner only: adds or replaces one record. createdAt and createdBy are set by the Worker. */
export async function saveStaff(s: StaffMember): Promise<void> {
  const { id, createdAt: _at, createdBy: _by, ...data } = s
  const res = await fetch(`${COLLECTION}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) throw await failure(res, 'Could not save.')
}

/** Owner only: removes one record. */
export async function deleteStaff(id: string): Promise<void> {
  const res = await fetch(`${COLLECTION}/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
  if (!res.ok) throw await failure(res, 'Could not remove.')
}

/** Owner only: writes the made-up demo staff to D1. Records with the same id are replaced. */
export async function loadDemoStaff(): Promise<StaffMember[]> {
  for (const s of DEMO_STAFF) await saveStaff(s)
  return loadStaff(true)
}
