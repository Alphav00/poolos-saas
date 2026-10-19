// DEMO DATA. Made-up pools for trying the field screens; nothing here is a
// real customer (DESIGN.md §3 #1).
//
// DEMO_PROFILES are what a pool *is* (volume, cell, equipment). They are not
// read by the screens directly: an owner loads them into D1 with "Load the
// demo pools" (pools.ts), and the screens read pools from there.
//
// They have no service day, so they sit under "Other customers", not on a route.
// Doses and the saturation index come from the chemistry engine (chem.ts)
// using the profile.
import type { Profile, StaffMember } from './types'

export const DEMO_PROFILES: Profile[] = [
  {
    id: 'maple-court',
    name: 'Maple Court',
    tags: ['18,000 gal · measured', 'Vinyl', 'Salt · Model X', 'Full sun', 'No screen', 'Filter 14 psi (base 10)', 'Weekly · last Tue'],
    gallons: 18000,
    cell: { make: 'Sample', model: 'Model X' },
    equipment: ['Liner · fair', 'Cover · n/a', 'Pump 2019', 'Cell 2021 · 3,200 hrs', 'Filter clean due (+4 psi)'],
    note: 'Chlorine was low today, so we added a top-up and checked your salt cell.',
    demo: true,
  },
  { id: 'birch-lane', name: 'Birch Lane', gallons: 22000, tds: 1100, tags: ['22,000 gal', 'Plaster', 'Liquid chlorine'], equipment: [], demo: true },
  { id: 'cedar-ridge', name: 'Cedar Ridge', gallons: 16000, cell: { make: 'Hayward', model: 'T-CELL-15' }, tags: ['16,000 gal', 'Vinyl', 'Salt'], equipment: [], demo: true },
  { id: 'oak-hollow', name: 'Oak Hollow', gallons: 30000, tds: 900, tags: ['30,000 gal', 'Plaster', 'Liquid chlorine'], equipment: [], demo: true },
  { id: 'pine-court', name: 'Pine Court', gallons: 14000, tds: 1300, tags: ['14,000 gal', 'Vinyl', 'Liquid chlorine'], equipment: [], demo: true },
  { id: 'willow-bend', name: 'Willow Bend', gallons: 20000, tds: 1500, tags: ['20,000 gal', 'Fiberglass', 'Trichlor', 'Screened'], equipment: [], demo: true },
  { id: 'spruce-way', name: 'Spruce Way', gallons: 18000, tds: 1000, tags: ['18,000 gal', 'Vinyl', 'Liquid chlorine'], equipment: [], demo: true },
  { id: 'aspen-drive', name: 'Aspen Drive', gallons: 25000, cell: { make: 'Pentair', model: 'IC40' }, tags: ['25,000 gal', 'Plaster', 'Salt'], equipment: [], demo: true },
  { id: 'elm-terrace', name: 'Elm Terrace', gallons: 15000, tds: 1200, tags: ['15,000 gal', 'Plaster', 'Liquid chlorine'], equipment: [], demo: true },
]

/** Made-up staff for trying the app. Owners write them to D1 with "Load demo staff"; screens read D1, not this list. */
export const DEMO_STAFF: StaffMember[] = [
  { id: 'alex', name: 'Alex', email: 'alex@example.test', role: 'Lead', route: 'Route B', demo: true },
  { id: 'jordan', name: 'Jordan', email: 'jordan@example.test', role: 'Technician', route: 'Route A', demo: true },
  { id: 'riley', name: 'Riley', email: 'riley@example.test', role: 'Technician', route: 'Repairs', demo: true },
  { id: 'casey', name: 'Casey', email: 'casey@example.test', role: 'Technician', route: 'Route C', demo: true },
  { id: 'morgan', name: 'Morgan', email: 'morgan@example.test', role: 'Dispatcher', route: 'Office', demo: true },
]
