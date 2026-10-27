import { vi } from 'vitest'

/**
 * A stand-in for the boards API on one collection: GET lists, PUT replaces,
 * PATCH merges and then checks serviceDay the way the Worker's checkPool does.
 */
export function fakeBoard(collection: string, docs: Record<string, Record<string, unknown>>) {
  const calls: { method: string; id?: string; data?: Record<string, unknown> }[] = []
  const fetches = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const id = url.startsWith(`${collection}/`) ? decodeURIComponent(url.slice(collection.length + 1)) : undefined
    const data = init?.body ? (JSON.parse(init.body as string) as { data: Record<string, unknown> }).data : undefined
    calls.push({ method, id, data })
    if (method === 'GET') return Response.json({ docs: Object.entries(docs).map(([id, data]) => ({ id, data })) })
    if (!id) return new Response('', { status: 404 })
    if (method === 'PUT') docs[id] = data!
    if (method === 'PATCH') {
      const next = { ...docs[id], ...data }
      if (next.serviceDay !== undefined && !['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(next.serviceDay as string)) {
        return Response.json({ error: { message: 'serviceDay must be one of mon, tue, wed, thu, fri, sat, sun' } }, { status: 400 })
      }
      if (id === 'broken') return Response.json({ error: { message: 'Could not save broken' } }, { status: 400 })
      docs[id] = next
    }
    return Response.json({ id })
  })
  vi.stubGlobal('fetch', fetches)
  return { docs, calls }
}
