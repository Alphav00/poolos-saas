// Made-up demo customers, one at a time, for owners trying the screens.
// The names are deliberately "blue collar humor" (Chi's call, see DECISIONS.md):
// pool-trade puns, light innuendo at most. Every one is invented; none names a
// real person or business. Profiles pass apps/api/src/field.ts checkPool.
import type { Profile } from './types'

export const DEMO_CUSTOMER_NAMES: readonly string[] = [
  'Phil McCracken Pool Repair',
  'Algae Bra',
  'Anita Skimmer',
  'Deep End Dale',
  'Seymour Clearwater',
  'Bob Float',
  'Chlorine Dion',
  'Pool Hardy',
  'Marco Polo',
  'Wade Waters',
  'Liz Tubbs',
  'Dee Hydrate',
  'Hugh Jass Backwash Co.',
  'Sandy Bottoms',
  'Rusty Pipes Plumbing',
  'Shock Norris',
  'Al Kalinity',
  'Cy Anuric',
  'Justin Case Leak Detection',
  'Skip Nett',
  'Cal Hypo',
  'Lou Pump',
  'Philter Phil',
  'Polly Vinyl',
  'Dusty Deck',
  'Rip Tide Rentals',
]

const SURFACES = ['Vinyl', 'Plaster', 'Fiberglass'] as const
const SANITISERS = ['Liquid chlorine', 'Salt', 'Trichlor'] as const
// Cell models already used by the demo set (sample.ts), so salt targets resolve.
const CELLS = [
  { make: 'Hayward', model: 'T-CELL-15' },
  { make: 'Pentair', model: 'IC40' },
] as const
const EQUIPMENT = [
  'Variable-speed pump',
  'Single-speed pump 2016',
  'Sand filter',
  'Cartridge filter',
  'DE filter',
  'Gas heater',
  'Heat pump',
  'Robot cleaner',
  'Suction cleaner',
  'Auto cover',
  'Timer · 8 hrs',
  'Booster pump',
]
const NOTES = [
  'Dog drinks from the shallow step. Keep the lid on the shock.',
  'Gate code is on the fridge magnet. Do not ask about the magnet.',
  'Customer counts the skimmer baskets after every visit.',
  'Neighbour waves a lot. Wave back.',
  'Diving board squeaks. Customer says it has character.',
]

const pick = <T>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length) % list.length]!

/** Lower-case letters, digits and dashes, as checkPool wants for an id. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '')
}

function freeId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

/**
 * One made-up customer, marked demo. `rand` is any 0–1 source (seed it in tests);
 * `taken` are ids already on file. Names not yet used are picked first; when all
 * are used, the id gets -2, -3… so nothing on file is replaced.
 */
export function generateCustomer(rand: () => number = Math.random, taken: Set<string> = new Set()): Profile {
  const unused = DEMO_CUSTOMER_NAMES.filter((n) => !taken.has(slugify(n)))
  const name = pick(rand, unused.length ? unused : DEMO_CUSTOMER_NAMES)
  const id = freeId(slugify(name), taken)
  const gallons = 12000 + Math.floor(rand() * 47) * 500 // 12,000–35,000 in steps of 500
  const surface = pick(rand, SURFACES)
  const sanitiser = pick(rand, SANITISERS)
  const p: Profile = {
    id,
    name,
    tags: [`${gallons.toLocaleString('en-US')} gal`, surface, sanitiser],
    gallons,
    equipment: [],
    demo: true,
  }
  if (sanitiser === 'Salt') p.cell = { ...pick(rand, CELLS) }
  else p.tds = 800 + Math.floor(rand() * 9) * 100 // 800–1,600
  const pool = [...EQUIPMENT]
  const count = 2 + Math.floor(rand() * 3) // 2–4
  for (let i = 0; i < count; i++) p.equipment.push(pool.splice(Math.floor(rand() * pool.length) % pool.length, 1)[0]!)
  if (rand() < 0.5) p.note = pick(rand, NOTES)
  return p
}
