// Owner only: removes everything marked DEMO for the signed-in company: made-up
// customers, made-up staff, and the readings saved for made-up customers.
// Real records are never touched. The Worker keeps who removed what (board_writes).
import { loadPools } from './pools'
import { loadStaff } from './staff'

type Doc = { id: string; data?: { demo?: unknown } }

const list = async (collection: string): Promise<Doc[]> => {
  const res = await fetch(`/api/boards/field/${collection}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not read the demo data.')
  return ((await res.json()) as { docs: Doc[] }).docs
}

const remove = async (collection: string, id: string) => {
  const res = await fetch(`/api/boards/field/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 403 ? 'Only an owner can remove demo data.' : 'Could not remove the demo data.')
}

/** Which records are demo: customers and staff marked demo, and readings for demo customers (`<pool>:<date>`). */
export function demoIds(pools: Doc[], staff: Doc[], readings: Doc[]) {
  const poolIds = pools.filter((d) => d.data?.demo === true).map((d) => d.id)
  const demoPools = new Set(poolIds)
  return {
    pools: poolIds,
    staff: staff.filter((d) => d.data?.demo === true).map((d) => d.id),
    readings: readings.filter((d) => demoPools.has(d.id.slice(0, d.id.lastIndexOf(':')))).map((d) => d.id),
  }
}

export async function removeDemoData(): Promise<{ pools: number; staff: number; readings: number }> {
  const ids = demoIds(await list('pools'), await list('staff'), await list('readings'))
  for (const id of ids.readings) await remove('readings', id)
  for (const id of ids.pools) await remove('pools', id)
  for (const id of ids.staff) await remove('staff', id)
  await Promise.all([loadPools(true), loadStaff(true)])
  return { pools: ids.pools.length, staff: ids.staff.length, readings: ids.readings.length }
}
