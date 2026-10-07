import type { Reading } from './types'

// Today's readings are stored through the Worker (D1), one document per pool per day.
const doc = (poolId: string, date: string) => `/api/boards/field/readings/${encodeURIComponent(`${poolId}:${date}`)}`

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function loadReading(poolId: string, date: string): Promise<Reading | null> {
  const res = await fetch(doc(poolId, date), { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not load readings.')
  const body = (await res.json()) as { exists: boolean; data: Reading | null }
  return body.exists ? body.data : null
}

export async function saveReading(poolId: string, date: string, reading: Reading): Promise<void> {
  const res = await fetch(doc(poolId, date), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { pool: poolId, date, ...reading } }),
  })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Could not save readings.')
}
