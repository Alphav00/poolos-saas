// The company's chemistry setup: products with their label facts, and target
// ranges with who set them. Kept through the Worker in the field store, so
// every phone on the route sees the same list.
import type { Product, Targets } from './chem'

const doc = (id: 'products' | 'targets') => `/api/boards/field/settings/${id}`

async function load<T>(id: 'products' | 'targets'): Promise<T | null> {
  const res = await fetch(doc(id), { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load the chemistry setup.')
  const body = (await res.json()) as { exists: boolean; data: T }
  return body.exists ? body.data : null
}

async function save(id: 'products' | 'targets', data: unknown): Promise<void> {
  const res = await fetch(doc(id), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (res.ok) return
  const out = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  throw new Error(res.status === 401 ? 'Sign in again.' : (out?.error?.message ?? 'Could not save the chemistry setup.'))
}

export const loadProducts = async (): Promise<Product[]> => (await load<{ products: Product[] }>('products'))?.products ?? []
export const saveProducts = (products: Product[]) => save('products', { products })
export const loadTargets = () => load<Targets>('targets')
export const saveTargets = (targets: Targets) => save('targets', targets)

/**
 * A made-up setup for the sample company. The strengths are the kind printed
 * on common labels; the acid density is the ~31.5% HCl figure from density
 * tables. It is a starting point to check against real labels, not advice.
 */
export const SAMPLE_PRODUCTS: Product[] = [
  { id: 'lc-125', kind: 'liquid-chlorine', name: 'Liquid chlorine 12.5%', tradePercent: 12.5 },
  { id: 'acid-3145', kind: 'acid', name: 'Muriatic acid 31.45%', hclPercent: 31.45, densityGPerMl: 1.16 },
  { id: 'bicarb', kind: 'bicarbonate', name: 'Sodium bicarbonate', assayPercent: 100 },
  { id: 'soda-ash', kind: 'soda-ash', name: 'Soda ash', assayPercent: 100 },
  { id: 'cacl2', kind: 'calcium-chloride', name: 'Calcium chloride dihydrate 77%', assayPercent: 77, form: 'dihydrate' },
  { id: 'cya', kind: 'cyanuric-acid', name: 'Stabilizer (cyanuric acid)', assayPercent: 100 },
  { id: 'salt', kind: 'salt', name: 'Pool salt', assayPercent: 99 },
]

export const SAMPLE_TARGETS: Targets = {
  source: 'Sample Pool Co. house policy (made up for the sample; replace with your own and say where it comes from)',
  ranges: { fc: [2, 4], ph: [7.4, 7.6], ta: [80, 120], ch: [250, 400], cya: [30, 50], salt: [3000, 3400] },
}
