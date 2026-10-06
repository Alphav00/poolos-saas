import type { Viewer } from './auth';

/**
 * Boards served by this app, each a page under /boards/<slug>.
 * access 'owner': only OWNER_EMAILS can open it. 'team': everyone Access lets in.
 */
export const BOARDS: readonly { slug: string; title: string; access: 'owner' | 'team' }[] = [
	{ slug: 'agent-board', title: 'Agent Board', access: 'owner' },
	{ slug: 'shallow-end', title: 'The Shallow End', access: 'team' },
	{ slug: 'work-orders', title: 'Work Order Notebook', access: 'owner' },
];

export function boardFor(slug: string, viewer: Viewer) {
	const board = BOARDS.find((b) => b.slug === slug);
	if (!board) return { board: null, allowed: false };
	return { board, allowed: board.access === 'team' || viewer.isOwner };
}

const IMPORT_CHUNK = 40;

/** Owner-only: load a board export ({collections: {name: {id: data}}}) into D1. */
async function importBoard(request: Request, env: Env, viewer: Viewer, board: string): Promise<Response> {
	if (!viewer.isOwner) return fail(403, 'forbidden', 'Only an owner can import');
	let body: { collections?: Record<string, Record<string, unknown>> };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return fail(400, 'bad_request', 'Body must be JSON');
	}
	const cols = body.collections;
	if (!cols || typeof cols !== 'object' || Array.isArray(cols)) return fail(400, 'bad_request', 'Body must be {"collections": {...}}');
	const rows: [string, string, string][] = [];
	for (const [collection, docs] of Object.entries(cols)) {
		if (!COLLECTION.test(collection)) return fail(400, 'bad_request', `Bad collection name "${collection}"`);
		if (!docs || typeof docs !== 'object' || Array.isArray(docs)) return fail(400, 'bad_request', `"${collection}" must map ids to documents`);
		for (const [id, data] of Object.entries(docs)) {
			if (!DOC_ID.test(id)) return fail(400, 'bad_request', `Bad document id "${collection}/${id}"`);
			if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, 'bad_request', `"${collection}/${id}" must be an object`);
			const text = JSON.stringify(data);
			if (text.length > MAX_DOC_BYTES) return fail(413, 'too_large', `"${collection}/${id}" is larger than 512 KB`);
			rows.push([collection, id, text]);
		}
	}
	const at = new Date().toISOString();
	for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
		await env.DB.batch(
			rows.slice(i, i + IMPORT_CHUNK).flatMap(([collection, id, data]) => [
				env.DB.prepare(
					`INSERT INTO board_docs (board, collection, id, data, updated_at, updated_by, deleted) VALUES (?,?,?,?,?,?,0)
					 ON CONFLICT (board, collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at,
					   updated_by = excluded.updated_by, deleted = 0`,
				).bind(board, collection, id, data, at, viewer.email),
				env.DB.prepare('INSERT INTO board_writes (board, collection, id, op, data, at, by) VALUES (?,?,?,?,?,?,?)').bind(
					board, collection, id, 'set', data, at, viewer.email,
				),
			]),
		);
	}
	const counts = Object.fromEntries(Object.entries(cols).map(([c, d]) => [c, Object.keys(d).length]));
	return json({ imported: rows.length, collections: counts });
}

const COLLECTION = /^[A-Za-z0-9_-]{1,64}$/;
const DOC_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const MAX_DOC_BYTES = 512 * 1024;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

interface DocRow {
	id: string;
	data: string;
	updated_at: string;
	deleted: number;
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
	const text = await request.text();
	if (text.length > MAX_DOC_BYTES) return fail(413, 'too_large', 'Document is larger than 512 KB');
	try {
		const body = JSON.parse(text) as { data?: unknown };
		if (body.data === null || typeof body.data !== 'object' || Array.isArray(body.data)) throw new Error();
		return body.data as Record<string, unknown>;
	} catch {
		return fail(400, 'bad_request', 'Body must be {"data": {...}}');
	}
}

/**
 * /api/boards/:board/:collection[/:id]
 *   GET collection[?since=ISO]  documents changed after `since`, deletions
 *                               included as {deleted: true}; all live
 *                               documents when `since` is omitted
 *   GET doc                     one document
 *   PUT doc {data}              replace the document
 *   PATCH doc {data}            merge top-level fields into it (404 if missing)
 *   DELETE doc                  remove it
 */
export async function handleBoards(request: Request, env: Env, viewer: Viewer, parts: string[]): Promise<Response> {
	if (parts.length === 0) {
		return json({
			boards: BOARDS.filter((b) => boardFor(b.slug, viewer).allowed).map((b) => ({
				slug: b.slug, title: b.title, access: b.access, url: `/boards/${b.slug}`,
			})),
		});
	}
	const [board, collection, id, extra] = parts;
	const found = boardFor(board ?? '', viewer);
	if (extra !== undefined || !found.board || !board) return fail(404, 'not_found', 'No such board');
	if (!found.allowed) return fail(403, 'forbidden', 'This board is for owners only');
	if (collection === '_import' && id === undefined) {
		return request.method === 'POST' ? importBoard(request, env, viewer, board) : fail(405, 'method_not_allowed', 'Use POST to import');
	}
	if (!collection || !COLLECTION.test(collection)) return fail(400, 'bad_request', 'Bad collection name');
	if (id !== undefined && !DOC_ID.test(id)) return fail(400, 'bad_request', 'Bad document id');

	if (id === undefined) {
		if (request.method !== 'GET') return fail(405, 'method_not_allowed', 'Use GET on a collection');
		const since = new URL(request.url).searchParams.get('since');
		const now = new Date().toISOString();
		const stmt = since
			? env.DB.prepare('SELECT id, data, updated_at, deleted FROM board_docs WHERE board = ? AND collection = ? AND updated_at > ? ORDER BY updated_at').bind(board, collection, since)
			: env.DB.prepare('SELECT id, data, updated_at, deleted FROM board_docs WHERE board = ? AND collection = ? AND deleted = 0 ORDER BY updated_at').bind(board, collection);
		const rows = await stmt.all<DocRow>();
		return json({
			now,
			docs: rows.results.map((r) =>
				r.deleted ? { id: r.id, deleted: true, updated_at: r.updated_at } : { id: r.id, data: JSON.parse(r.data), updated_at: r.updated_at },
			),
		});
	}

	const row = await env.DB.prepare('SELECT id, data, updated_at, deleted FROM board_docs WHERE board = ? AND collection = ? AND id = ?')
		.bind(board, collection, id)
		.first<DocRow>();
	const current = row && !row.deleted ? row : null;

	if (request.method === 'GET') {
		if (!current) return json({ exists: false, id, data: null });
		return json({ exists: true, id, data: JSON.parse(current.data), updated_at: current.updated_at });
	}
	if (request.method !== 'PUT' && request.method !== 'PATCH' && request.method !== 'DELETE') {
		return fail(405, 'method_not_allowed', 'Use GET, PUT, PATCH or DELETE');
	}

	let op: 'set' | 'update' | 'delete';
	let next: Record<string, unknown>;
	let logged: Record<string, unknown>;
	if (request.method === 'DELETE') {
		if (!current) return json({ id, deleted: true });
		op = 'delete';
		next = JSON.parse(current.data) as Record<string, unknown>;
		logged = {};
	} else {
		const body = await readBody(request);
		if (body instanceof Response) return body;
		logged = body;
		if (request.method === 'PATCH') {
			if (!current) return fail(404, 'not_found', 'Document does not exist; use PUT to create it');
			op = 'update';
			next = { ...(JSON.parse(current.data) as Record<string, unknown>), ...body };
		} else {
			op = 'set';
			next = body;
		}
	}
	const data = JSON.stringify(next);
	if (data.length > MAX_DOC_BYTES) return fail(413, 'too_large', 'Document is larger than 512 KB');
	// Strictly increasing per document so pollers using `since` never miss a change.
	const at = new Date(Math.max(Date.now(), row ? Date.parse(row.updated_at) + 1 : 0)).toISOString();
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO board_docs (board, collection, id, data, updated_at, updated_by, deleted) VALUES (?,?,?,?,?,?,?)
			 ON CONFLICT (board, collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at,
			   updated_by = excluded.updated_by, deleted = excluded.deleted`,
		).bind(board, collection, id, data, at, viewer.email, op === 'delete' ? 1 : 0),
		env.DB.prepare('INSERT INTO board_writes (board, collection, id, op, data, at, by) VALUES (?,?,?,?,?,?,?)').bind(
			board, collection, id, op, JSON.stringify(logged), at, viewer.email,
		),
	]);
	return op === 'delete' ? json({ id, deleted: true, updated_at: at }) : json({ id, data: next, updated_at: at });
}
