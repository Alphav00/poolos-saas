/**
 * /api/chem/* — pool water chemistry from @poolos/pool-chemistry, which runs
 * USGS PHREEQC (compiled to WebAssembly) inside this Worker.
 *
 *   GET  /api/chem/engine                   which PHREEQC build and database answer
 *   GET  /api/chem/salt-cell?make=&model=   the manufacturer's salt range for a cell
 *   POST /api/chem/analyze  { ...readings }                              -> analysis
 *   POST /api/chem/dose     { kind, water, target, gallons, product, cell? } -> dose
 *
 * When readings or label facts are missing or out of range, the answer is
 * 422 with the questions to ask, never a guessed number.
 */
import phreeqcWasm from '@poolos/pool-chemistry/phreeqc.wasm'
import { ENGINE_INFO, PhreeqcError, PoolChemistry, liquidChlorineDose, saltCellRange, type Answer, type Water } from '@poolos/pool-chemistry'

const MAX_BODY = 64 * 1024

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status)
const answer = <T>(a: Answer<T>) => json(a, a.ok ? 200 : 422)

// One engine per isolate: loading the database is the slow part.
let engine: Promise<PoolChemistry> | undefined
const chemistry = () => (engine ??= PoolChemistry.create(phreeqcWasm).catch((e) => ((engine = undefined), Promise.reject(e))))

type Body = Record<string, unknown>

async function readBody(request: Request): Promise<Body | Response> {
	const text = await request.text()
	if (text.length > MAX_BODY) return fail(413, 'too_large', 'Request body is larger than 64 KB')
	try {
		const body: unknown = JSON.parse(text)
		if (body && typeof body === 'object' && !Array.isArray(body)) return body as Body
	} catch {
		// fall through
	}
	return fail(400, 'bad_json', 'Send a JSON object')
}

const KINDS = ['acid', 'soda-ash', 'bicarbonate', 'calcium-chloride', 'cyanuric-acid', 'salt', 'liquid-chlorine'] as const
type Kind = (typeof KINDS)[number]

function dose(c: PoolChemistry, body: Body): Response {
	const kind = body.kind as Kind
	if (!KINDS.includes(kind)) return fail(400, 'bad_kind', `kind must be one of: ${KINDS.join(', ')}`)
	const water = (body.water ?? {}) as Water
	const target = body.target as number
	const gallons = body.gallons as number
	// Product facts come from the label; the engine asks for any that are missing.
	const product = (body.product ?? {}) as never
	switch (kind) {
		case 'acid':
			return answer(c.acidToPh(water, target, gallons, product))
		case 'soda-ash':
			return answer(c.sodaAshToPh(water, target, gallons, product))
		case 'bicarbonate':
			return answer(c.bicarbonateToAlkalinity(water, target, gallons, product))
		case 'calcium-chloride': {
			const form = (body.product as { form?: unknown } | undefined)?.form
			if (form !== 'anhydrous' && form !== 'dihydrate') {
				return answer({ ok: false, questions: [{ field: 'form', ask: 'Is the calcium chloride anhydrous or dihydrate? The label says.' }] })
			}
			return answer(c.calciumChlorideToHardness(water, target, gallons, product))
		}
		case 'cyanuric-acid':
			return answer(c.cyanuricAcidToTarget(water, target, gallons, product))
		case 'salt': {
			// With a cell, the target is the manufacturer's figure for it; an
			// unknown make or model is a question (DESIGN.md §3 #10).
			const cell = body.cell as { make?: string; model?: string } | undefined
			if (cell) {
				const range = saltCellRange(cell.make ?? '', cell.model ?? '')
				if (!range.ok) return answer(range)
				return answer(c.saltToTarget(water, range.value.targetPpm, gallons, product))
			}
			return answer(c.saltToTarget(water, target, gallons, product))
		}
		case 'liquid-chlorine':
			return answer(liquidChlorineDose(water.freeChlorine as number, target, gallons, product))
	}
}

export async function handleChem(request: Request, parts: string[]): Promise<Response> {
	const route = parts.join('/')
	if (route === 'engine') {
		if (request.method !== 'GET') return fail(405, 'method_not_allowed', 'Use GET')
		return json(ENGINE_INFO)
	}
	if (route === 'salt-cell') {
		if (request.method !== 'GET') return fail(405, 'method_not_allowed', 'Use GET')
		const q = new URL(request.url).searchParams
		return answer(saltCellRange(q.get('make') ?? '', q.get('model') ?? ''))
	}
	if (route !== 'analyze' && route !== 'dose') return fail(404, 'not_found', 'No such route')
	if (request.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST')
	const body = await readBody(request)
	if (body instanceof Response) return body
	const c = await chemistry()
	try {
		return route === 'analyze' ? answer(c.analyze(body as unknown as Water)) : dose(c, body)
	} catch (e) {
		// PHREEQC could not solve these readings (it did not converge, or a
		// combination is impossible). Say so rather than return a number.
		if (e instanceof PhreeqcError) return fail(422, 'engine_refused', `PHREEQC could not solve these readings: ${e.message}`)
		throw e
	}
}
