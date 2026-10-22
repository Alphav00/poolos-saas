/**
 * /api/measure/* — Liner Measure Pro's API, served by the PoolOS Worker.
 *
 * Same routes, request bodies and responses as the original FastAPI backend
 * (paths keep their shape after the /api/measure prefix), so the measuring
 * screens run unchanged. The math, validation and order forms come from
 * @poolos/measure-core, which is held to the Python originals by its goldens.
 * Jobs live in D1; every change is also appended to measure_job_writes.
 */
import {
  coverOrderForm, coverOrderFormFlow, fixture, fixtureNames, HttpError, JsonError, linerOrderForm, linerOrderFormFlow,
  linerShapes, linerTakeoffEndpoint, parse, parsePyJson, PoolJobCreateV, PoolJobUpdateV, PoolJobV, reconstructEndpoint,
  renderPdf, requireLinerJob, utcNow, validateEndpoint, ValidationFailed, type PoolJob,
} from '@poolos/measure-core'
import type { Viewer } from './auth'

const MAX_BODY = 1024 * 1024

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const detail = (status: number, d: unknown) => json({ detail: d }, status)

interface Row {
  id: string
  customer_name: string
  dealer_name: string
  shape_type: string
  product_type: string
  status: string
  data: string
  created_at: string
  updated_at: string
}

async function readBody<T>(request: Request, validator: Parameters<typeof parse<T>>[0]): Promise<T> {
  const text = await request.text()
  if (text.length > MAX_BODY) throw new HttpError(413, 'Request body is larger than 1 MB')
  let raw: unknown
  try {
    raw = parsePyJson(text)
  } catch (e) {
    if (e instanceof JsonError) throw new HttpError(422, [{ type: 'json_invalid', loc: ['body'], msg: e.message }])
    throw e
  }
  try {
    return parse(validator, raw)
  } catch (e) {
    if (e instanceof ValidationFailed) {
      throw new HttpError(422, e.issues.map((i) => ({ type: i.type, loc: ['body', ...i.loc], msg: i.msg })))
    }
    throw e
  }
}

// Saved jobs are per company (src/company.ts): another company's id reads as missing.
const loadRow = (env: Env, id: string, company: string) =>
  env.DB.prepare('SELECT * FROM measure_jobs WHERE id = ? AND company = ?').bind(id, company).first<Row>()
const toJob = (row: Row) => parse(PoolJobV, JSON.parse(row.data)) as PoolJob

async function resolveJob(env: Env, id: string, company: string): Promise<PoolJob> {
  const row = await loadRow(env, id, company)
  if (row) return toJob(row)
  const f = fixture(id)
  if (f) return f
  throw new HttpError(404, 'Job not found')
}

function save(env: Env, job: PoolJob, op: 'create' | 'update', by: string, company: string) {
  const data = JSON.stringify(job)
  const at = new Date().toISOString()
  const write = env.DB.prepare('INSERT INTO measure_job_writes (job_id, op, data, at, by) VALUES (?,?,?,?,?)').bind(job.id, op, data, at, by)
  const cols = [job.meta.customer_name, job.meta.dealer_name, job.measurement.shape_type, job.product_type, data, job.updated_at, by]
  const upsert =
    op === 'create'
      ? env.DB.prepare(
          `INSERT INTO measure_jobs (customer_name, dealer_name, shape_type, product_type, data, updated_at, updated_by, id, status, created_at, created_by, company)
           VALUES (?,?,?,?,?,?,?,?, 'draft', ?, ?, ?)`,
        ).bind(...cols, job.id, job.created_at, by, company)
      : env.DB.prepare(
          'UPDATE measure_jobs SET customer_name = ?, dealer_name = ?, shape_type = ?, product_type = ?, data = ?, updated_at = ?, updated_by = ? WHERE id = ? AND company = ?',
        ).bind(...cols, job.id, company)
  return env.DB.batch([upsert, write])
}

const pdf = (bytes: Uint8Array, filename: string) =>
  new Response(bytes, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' },
  })

export async function handleMeasure(request: Request, env: Env, viewer: Viewer, parts: string[]): Promise<Response> {
  try {
    return await route(request, env, viewer, parts)
  } catch (e) {
    if (e instanceof HttpError) return detail(e.status, e.detail)
    throw e
  }
}

async function route(request: Request, env: Env, viewer: Viewer, parts: string[]): Promise<Response> {
  const method = request.method
  const company = viewer.company ?? ''
  const [a, b, c, extra] = parts
  const only = (m: string) => {
    if (method !== m) throw new HttpError(405, 'Method Not Allowed')
  }
  if (extra !== undefined) throw new HttpError(404, 'Not Found')

  if (a === 'health' && !b) return only('GET'), json({ status: 'ok' })
  if (a === 'liner' && b === 'shapes' && !c) return only('GET'), json(linerShapes())
  if (a === 'fixtures' && !c) {
    only('GET')
    if (!b) return json(fixtureNames())
    const f = fixture(b)
    if (!f) throw new HttpError(404, `Unknown fixture: ${b}`)
    return json(f)
  }
  if (a !== 'jobs') throw new HttpError(404, 'Not Found')

  // /jobs
  if (!b) {
    if (method === 'GET') {
      const rows = await env.DB.prepare(
        'SELECT id, customer_name, dealer_name, shape_type, product_type, status, created_at, updated_at FROM measure_jobs WHERE company = ? ORDER BY updated_at DESC',
      ).bind(company).all<Omit<Row, 'data'>>()
      return json(rows.results)
    }
    only('POST')
    const body = await readBody(request, PoolJobCreateV)
    const now = utcNow()
    const job = { id: crypto.randomUUID(), ...body, created_at: now, updated_at: now } as PoolJob
    await save(env, job, 'create', viewer.email, company)
    return json(job)
  }

  const id = b
  if (!c) {
    if (method === 'GET') return json(await resolveJobFromDb(env, id, company))
    if (method === 'PUT') {
      const row = await loadRow(env, id, company)
      if (!row) throw new HttpError(404, 'Job not found')
      const job = toJob(row)
      const update = await readBody(request, PoolJobUpdateV)
      for (const k of ['meta', 'product_type', 'measurement', 'cover_spec', 'liner_spec', 'hardware', 'notes'] as const) {
        if (update[k] !== null) (job as unknown as Record<string, unknown>)[k] = update[k]
      }
      job.updated_at = utcNow()
      await save(env, job, 'update', viewer.email, company)
      return json(job)
    }
    only('DELETE')
    const row = await loadRow(env, id, company)
    if (!row) throw new HttpError(404, 'Job not found')
    await env.DB.batch([
      env.DB.prepare('DELETE FROM measure_jobs WHERE id = ? AND company = ?').bind(id, company),
      env.DB.prepare('INSERT INTO measure_job_writes (job_id, op, data, at, by) VALUES (?,?,?,?,?)').bind(id, 'delete', row.data, new Date().toISOString(), viewer.email),
    ])
    return new Response(null, { status: 204 })
  }

  switch (c) {
    case 'reconstruct':
      return only('POST'), json(reconstructEndpoint(await resolveJob(env, id, company)))
    case 'validate':
      return only('POST'), json(validateEndpoint(await resolveJob(env, id, company)))
    case 'order-form':
      return only('POST'), json(coverOrderForm(await resolveJob(env, id, company)))
    case 'order-form.pdf':
      only('GET')
      return pdf(await renderPdf(coverOrderFormFlow(await resolveJob(env, id, company), { lengths: 'ft-in' })), `order-form-${id}.pdf`)
    case 'liner-takeoff':
      return only('POST'), json(linerTakeoffEndpoint(await resolveJob(env, id, company)))
    case 'liner-order-form':
      return only('POST'), json(linerOrderForm(requireLinerJob(await resolveJob(env, id, company))))
    case 'liner-order-form.pdf':
      only('GET')
      return pdf(await renderPdf(linerOrderFormFlow(await resolveJob(env, id, company))), `liner-order-form-${id}.pdf`)
    case 'swap-ab': {
      only('POST')
      const row = await loadRow(env, id, company)
      if (!row) {
        if (fixture(id)) throw new HttpError(400, 'Cannot swap A/B on a fixture job — these are in-memory samples. Use a real saved job instead.')
        throw new HttpError(404, 'Job not found')
      }
      // Like the original: flip the flag in the stored JSON, nothing else.
      const data = JSON.parse(row.data) as { measurement?: { swap_ab?: boolean } }
      const measurement = data.measurement ?? {}
      const swapped = !measurement.swap_ab
      measurement.swap_ab = swapped
      data.measurement = measurement
      const text = JSON.stringify(data)
      await env.DB.batch([
        env.DB.prepare('UPDATE measure_jobs SET data = ?, updated_by = ? WHERE id = ? AND company = ?').bind(text, viewer.email, id, company),
        env.DB.prepare('INSERT INTO measure_job_writes (job_id, op, data, at, by) VALUES (?,?,?,?,?)').bind(id, 'swap_ab', text, new Date().toISOString(), viewer.email),
      ])
      return json({ swap_ab: swapped, job: data })
    }
  }
  throw new HttpError(404, 'Not Found')
}

/** GET /jobs/{id} reads saved jobs only (fixtures are served under /fixtures). */
async function resolveJobFromDb(env: Env, id: string, company: string): Promise<PoolJob> {
  const row = await loadRow(env, id, company)
  if (!row) throw new HttpError(404, 'Job not found')
  return toJob(row)
}
