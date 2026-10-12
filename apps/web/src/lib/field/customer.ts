// The add/edit customer form, kept apart from the screen so it can be tested.
// Surface and chlorine source are stored as the pool's tags, which every
// screen already shows; other tags on the record are kept as they are.
import type { Day, Profile } from './types'

export const SURFACES = ['Vinyl', 'Plaster', 'Fiberglass'] as const
export const SANITIZERS = ['Liquid chlorine', 'Salt', 'Trichlor'] as const

export interface Draft {
  name: string
  address: string
  phone: string
  serviceDay: Day
  gallons: string
  surface: string
  sanitizer: string
  cellMake: string
  cellModel: string
  note: string
}

const GALLONS_TAG = /^[\d,]+ gal\b/
const isOurs = (t: string) => GALLONS_TAG.test(t) || (SURFACES as readonly string[]).includes(t) || (SANITIZERS as readonly string[]).includes(t)

/** The form's starting values: the customer's record, or a blank one on `day`. */
export function draftFrom(p: Profile | null, day: Day): Draft {
  return {
    name: p?.name ?? '',
    address: p?.address ?? '',
    phone: p?.phone ?? '',
    serviceDay: p?.serviceDay ?? day,
    gallons: p?.gallons ? String(p.gallons) : '',
    surface: p?.tags.find((t) => (SURFACES as readonly string[]).includes(t)) ?? '',
    sanitizer: p?.tags.find((t) => (SANITIZERS as readonly string[]).includes(t)) ?? '',
    cellMake: p?.cell?.make ?? '',
    cellModel: p?.cell?.model ?? '',
    note: p?.note ?? '',
  }
}

/** The record to save, or the reason it cannot be saved. `base` keeps what the form does not show. */
export function profileFrom(d: Draft, base: Profile): Profile | string {
  const name = d.name.trim()
  if (!name) return 'Give the customer a name.'
  if (name.length > 80) return 'The name is too long (80 characters at most).'
  const text = (v: string, max: number, what: string) => (v.trim().length > max ? `${what} is too long (${max} characters at most).` : '')
  const tooLong = text(d.address, 200, 'The address') || text(d.phone, 40, 'The phone number') || text(d.note, 500, 'The note')
  if (tooLong) return tooLong
  let gallons: number | undefined
  if (d.gallons.trim()) {
    gallons = Number(d.gallons.replace(/[,\s]/g, ''))
    if (!Number.isFinite(gallons) || gallons <= 0 || gallons > 1_000_000) return 'Pool size is in gallons, e.g. 18000.'
    gallons = Math.round(gallons)
  }
  const tags = [
    ...(gallons ? [`${gallons.toLocaleString('en-US')} gal`] : []),
    ...(d.surface ? [d.surface] : []),
    ...(d.sanitizer ? [d.sanitizer] : []),
    ...base.tags.filter((t) => !isOurs(t)),
  ].slice(0, 20)
  const p: Profile = { ...base, name, tags, serviceDay: d.serviceDay }
  for (const [k, v] of [['address', d.address], ['phone', d.phone], ['note', d.note]] as const) {
    if (v.trim()) p[k] = v.trim()
    else delete p[k]
  }
  if (gallons) p.gallons = gallons
  else delete p.gallons
  if (d.sanitizer === 'Salt' && d.cellMake.trim() && d.cellModel.trim()) p.cell = { make: d.cellMake.trim(), model: d.cellModel.trim() }
  else delete p.cell
  return p
}
