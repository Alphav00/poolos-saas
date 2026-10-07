/**
 * The built-in test pools (backend/app/services/fixtures.py): three cover pools
 * and two liner pools with ground-truth geometry. The data is the Python
 * fixtures' own output; each call returns a fresh job with a new id and
 * timestamps, as the Python fixture functions did.
 */
import data from './fixtures.json'
import { utcNow } from './schema'
import { LINER_SHAPES, requiresAbPlot, type PoolJob } from './models'

const FIXTURES = data as unknown as Record<string, Omit<PoolJob, 'id' | 'created_at' | 'updated_at'>>

export const fixtureNames = () => Object.keys(FIXTURES).sort()

export function fixture(name: string): PoolJob | null {
  const f = FIXTURES[name]
  if (!f) return null
  const now = utcNow()
  return { id: crypto.randomUUID(), ...structuredClone(f), created_at: now, updated_at: now } as PoolJob
}

/** Python str.title(): upper-case the first letter of every run of letters, lower-case the rest. */
export const pyTitle = (s: string) => s.replace(/[A-Za-z]+/g, (w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())

/** GET /api/liner/shapes */
export const linerShapes = () =>
  LINER_SHAPES.map((value) => ({ value, label: pyTitle(value.replace(/_/g, ' ')), requires_ab_plot: requiresAbPlot(value) }))
