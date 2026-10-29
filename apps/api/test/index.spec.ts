import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { call, migrate, ORIGIN, token } from './helpers';

beforeAll(migrate);

describe('sign-in', () => {
	it('answers the health check without signing in', async () => {
		const res = await call('/api/health', { as: null });
		expect(res.status).toBe(200);
	});

	it('serves nothing, not even the pages, without an Access token', async () => {
		expect((await call('/api/me', { as: null })).status).toBe(401);
		expect((await call('/api/weather?lat=1&lon=1', { as: null })).status).toBe(401);
		expect((await call('/', { as: null })).status).toBe(401);
		expect((await call('/boards/agent-board.html', { as: null })).status).toBe(401);
	});

	it('refuses a token signed with another key, for another app, or expired', async () => {
		const forged = (await token('tech@example.test')).replace(/\.[^.]+$/, '.AAAA');
		expect((await call('/api/me', { jwt: forged })).status).toBe(401);
		expect((await call('/api/me', { jwt: await token('tech@example.test', { aud: 'other-app' }) })).status).toBe(401);
		expect((await call('/api/me', { jwt: await token('tech@example.test', { iss: 'https://evil.example' }) })).status).toBe(401);
		const past = Math.floor(Date.now() / 1000) - 60;
		expect((await call('/api/me', { jwt: await token('tech@example.test', { exp: past }) })).status).toBe(401);
	});

	it('knows who is signed in and who owns the boards', async () => {
		expect(await (await call('/api/me', { as: 'Tech@Example.test' })).json()).toEqual({ email: 'tech@example.test', isOwner: false, role: null, canEditPools: false, company: '', companies: [] });
		expect(await (await call('/api/me', { as: 'owner@example.test' })).json()).toEqual({ email: 'owner@example.test', isOwner: true, role: null, canEditPools: true, company: '', companies: 'all' });
	});

	it('serves the app and board pages once signed in', async () => {
		const home = await call('/');
		expect(home.status).toBe(200);
		expect(await home.text()).toContain('<div id="app">');
		const board = await call('/boards/agent-board.html', { as: 'owner@example.test' });
		expect(board.status).toBe(200);
		expect(await board.text()).toContain('/boards/runtime.js');
	});
});

describe('board access', () => {
	const list = async (as: string) =>
		((await (await call('/api/boards', { as })).json()) as { boards: { slug: string }[] }).boards.map((b) => b.slug);

	it('shows owners every board and the team only team boards', async () => {
		expect(await list('owner@example.test')).toEqual(['agent-board', 'shallow-end', 'work-orders']);
		expect(await list('tech@example.test')).toEqual([]);
	});

	it('keeps field readings as team data without a board page', async () => {
		const doc = '/api/boards/field/readings/maple-court:2026-10-07';
		const put = await call(doc, { method: 'PUT', body: { data: { pool: 'maple-court', date: '2026-10-07', values: { fc: 0.5, ph: 7.8 }, method: 'drop' } } });
		expect(put.status).toBe(200);
		const got = (await (await call(doc, { as: 'other@example.test' })).json()) as { data: { values: unknown } };
		expect(got.data.values).toEqual({ fc: 0.5, ph: 7.8 });
		expect((await call('/boards/field')).status).not.toBe(200);
	});

	it('refuses field readings that are not readings', async () => {
		const ok = { values: { ph: 7.5 }, method: 'strip' };
		const put = (path: string, data: unknown) => call(`/api/boards/field/${path}`, { method: 'PUT', body: { data } });
		expect((await put('readings/oak:2026-10-07', { ...ok, values: { ph: 'x' } })).status).toBe(400);
		expect((await put('readings/oak:2026-10-07', { ...ok, values: { chlorine: 1 } })).status).toBe(400);
		expect((await put('readings/oak:2026-10-07', { ...ok, method: 'guess' })).status).toBe(400);
		expect((await put('readings/oak:2026-10-07', { ...ok, notes: 'x'.repeat(1000) })).status).toBe(400);
		expect((await put('readings/oak', ok)).status).toBe(400);
		expect((await put('stash/anything', ok)).status).toBe(400);
		expect((await put('readings/oak:2026-10-07', ok)).status).toBe(200);
		const patch = await call('/api/boards/field/readings/oak:2026-10-07', { method: 'PATCH', body: { data: { values: { fc: -1 } } } });
		expect(patch.status).toBe(400);
	});

	it('keeps the chemistry setup as settings/products and settings/targets, checked', async () => {
		const put = (id: string, data: unknown) => call(`/api/boards/field/settings/${id}`, { method: 'PUT', as: 'owner@example.test', body: { data } });
		const acid = { id: 'acid', kind: 'acid', name: 'Muriatic acid 31.45%', hclPercent: 31.45, densityGPerMl: 1.16 };
		expect((await put('products', { products: [acid] })).status).toBe(200);
		// a label fact missing, a stray field, an unknown kind, a bad id
		expect((await put('products', { products: [{ ...acid, densityGPerMl: undefined }] })).status).toBe(400);
		expect((await put('products', { products: [{ ...acid, price: 9 }] })).status).toBe(400);
		expect((await put('products', { products: [{ ...acid, kind: 'magic' }] })).status).toBe(400);
		expect((await put('products', { products: [{ ...acid, id: 'Acid!' }] })).status).toBe(400);
		expect((await put('products', { products: [{ id: 'cc', kind: 'calcium-chloride', name: 'CaCl2', assayPercent: 77 }] })).status).toBe(400);
		expect((await put('products', { products: [{ id: 'cc', kind: 'calcium-chloride', name: 'CaCl2', assayPercent: 77, form: 'dihydrate' }] })).status).toBe(200);

		const targets = { source: 'Sample Pool Co. house policy', ranges: { ph: [7.4, 7.6], fc: [2, 4] } };
		expect((await put('targets', targets)).status).toBe(200);
		expect((await put('targets', { ...targets, source: '' })).status).toBe(400);
		expect((await put('targets', { ...targets, ranges: { ph: [7.8, 7.2] } })).status).toBe(400);
		expect((await put('targets', { ...targets, ranges: { temp: [70, 90] } })).status).toBe(400);
		expect((await put('other', { x: 1 })).status).toBe(400);
		const got = (await (await call('/api/boards/field/settings/targets', { as: 'other@example.test' })).json()) as { data: { source: string } };
		expect(got.data.source).toBe('Sample Pool Co. house policy');
	});

	it('lets only an owner change the chemistry setup', async () => {
		const doc = '/api/boards/field/settings/targets';
		const targets = { source: 'Sample Pool Co. house policy', ranges: { ph: [7.4, 7.6] } };
		expect((await call(doc, { method: 'PUT', as: 'owner@example.test', body: { data: targets } })).status).toBe(200);
		// tech@example.test is not on file; a Technician on the staff list is refused the same way.
		const staff = await call('/api/boards/field/staff/sam-settings', {
			method: 'PUT', as: 'owner@example.test', body: { data: { name: 'Sam Settings', email: 'sam.settings@example.test', role: 'Technician' } },
		});
		expect(staff.status).toBe(200);
		for (const as of ['tech@example.test', 'sam.settings@example.test']) {
			expect((await call(doc, { method: 'PUT', as, body: { data: { ...targets, ranges: { ph: [6, 9] } } } })).status, as).toBe(403);
			expect((await call(doc, { method: 'PATCH', as, body: { data: { ranges: { ph: [6, 9] } } } })).status, as).toBe(403);
			expect((await call(doc, { method: 'DELETE', as })).status, as).toBe(403);
			expect((await call('/api/boards/field/settings/products', { method: 'PUT', as, body: { data: { products: [] } } })).status, as).toBe(403);
		}
		const got = (await (await call(doc)).json()) as { data: { ranges: unknown } };
		expect(got.data.ranges).toEqual({ ph: [7.4, 7.6] });
	});

	it('stamps who set the chemistry setup and when, whatever the form says', async () => {
		const doc = '/api/boards/field/settings/products';
		const forged = { products: [], setBy: 'someone@example.test', setAt: '2000-01-01T00:00:00.000Z' };
		const before = Date.now();
		const put = (await (await call(doc, { method: 'PUT', as: 'owner@example.test', body: { data: forged } })).json()) as { data: { setBy: string; setAt: string } };
		expect(put.data.setBy).toBe('owner@example.test');
		expect(Date.parse(put.data.setAt)).toBeGreaterThanOrEqual(before - 1000);
		const patch = await call(doc, { method: 'PATCH', as: 'Owner@Example.test', body: { data: { setBy: 'x@example.test' } } });
		expect(((await patch.json()) as { data: { setBy: string } }).data.setBy).toBe('owner@example.test');
		const got = (await (await call(doc)).json()) as { data: { setBy: string; products: unknown[] } };
		expect(got.data).toMatchObject({ setBy: 'owner@example.test', products: [] });
	});

	it('refuses owner-only boards to the team, page and data alike', async () => {
		for (const path of [
			'/boards/agent-board', '/boards/agent-board.html', '/boards/work-orders', '/api/boards/agent-board/cards', '/api/boards/work-orders/orders/x',
			'/boards/shallow-end', '/boards/shallow-end.html', '/api/boards/shallow-end/cards', '/api/boards/shallow-end/cards/x',
		]) {
			expect((await call(path)).status, path).toBe(403);
		}
		expect((await call('/boards/agent-board.html', { as: 'owner@example.test' })).status).toBe(200);
		expect((await call('/api/boards/agent-board/cards', { as: 'owner@example.test' })).status).toBe(200);
	});
});

describe('import', () => {
	const exportFile = {
		collections: {
			cards: { 'c-a': { title: 'Imported A', col: 'backlog' }, 'c-b': { title: 'Imported B', col: 'done' } },
			log: { l1: { text: 'seeded' } },
		},
	};

	it('loads a board export for an owner', async () => {
		const res = await call('/api/boards/agent-board/_import', { method: 'POST', as: 'owner@example.test', body: exportFile });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ imported: 3, collections: { cards: 2, log: 1 } });
		const got = (await (await call('/api/boards/agent-board/cards/c-b', { as: 'owner@example.test' })).json()) as { data: unknown };
		expect(got.data).toEqual({ title: 'Imported B', col: 'done' });
	});

	it('only lets an owner import, and checks every document first', async () => {
		expect((await call('/api/boards/agent-board/_import', { method: 'POST', body: exportFile })).status).toBe(403);
		const bad = await call('/api/boards/agent-board/_import', {
			method: 'POST', as: 'owner@example.test', body: { collections: { cards: { ok: { a: 1 }, 'bad id!': { a: 2 } } } },
		});
		expect(bad.status).toBe(400);
		const none = (await (await call('/api/boards/agent-board/cards', { as: 'owner@example.test' })).json()) as { docs: { id: string }[] };
		expect(none.docs.map((d) => d.id)).not.toContain('ok');
	});
});

describe('boards', () => {
	const base = '/api/boards/agent-board/cards';
	const as = 'owner@example.test';

	it('lists only boards the viewer may open, with their pages', async () => {
		const { boards } = (await (await call('/api/boards', { as })).json()) as { boards: { slug: string; url: string }[] };
		expect(boards).toEqual([
			expect.objectContaining({ slug: 'agent-board', url: '/boards/agent-board' }),
			expect.objectContaining({ slug: 'shallow-end', url: '/boards/shallow-end' }),
			expect.objectContaining({ slug: 'work-orders', url: '/boards/work-orders' }),
		]);
		expect(((await (await call('/api/boards')).json()) as { boards: unknown[] }).boards).toEqual([]);
	});

	it('creates, reads, merges and deletes a document', async () => {
		expect((await call(`${base}/c1`, { as, method: 'PUT', body: { data: { title: 'First', col: 'backlog' } } })).status).toBe(200);
		const got = (await (await call(`${base}/c1`, { as })).json()) as { exists: boolean; data: Record<string, unknown> };
		expect(got).toMatchObject({ exists: true, data: { title: 'First', col: 'backlog' } });

		await call(`${base}/c1`, { as, method: 'PATCH', body: { data: { col: 'doing', owner: 'tech' } } });
		const merged = (await (await call(`${base}/c1`, { as })).json()) as { data: Record<string, unknown> };
		expect(merged.data).toEqual({ title: 'First', col: 'doing', owner: 'tech' });

		const before = (await (await call(base, { as })).json()) as { now: string; docs: { id: string }[] };
		expect(before.docs.map((d) => d.id)).toContain('c1');

		expect((await call(`${base}/c1`, { as, method: 'DELETE' })).status).toBe(200);
		expect(((await (await call(`${base}/c1`, { as })).json()) as { exists: boolean }).exists).toBe(false);
		const after = (await (await call(base, { as })).json()) as { docs: { id: string }[] };
		expect(after.docs.map((d) => d.id)).not.toContain('c1');
	});

	it('tells a polling client about changes and deletions since it last looked', async () => {
		await call(`${base}/p1`, { as, method: 'PUT', body: { data: { n: 1 } } });
		const { docs } = (await (await call(base, { as })).json()) as { docs: { id: string; updated_at: string }[] };
		const since = docs.find((d) => d.id === 'p1')!.updated_at;

		await call(`${base}/p2`, { as, method: 'PUT', body: { data: { n: 2 } } });
		await call(`${base}/p1`, { as, method: 'DELETE' });
		const changes = (await (await call(`${base}?since=${encodeURIComponent(since)}`, { as })).json()) as { docs: { id: string; deleted?: boolean }[] };
		expect(changes.docs).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: 'p2' }), expect.objectContaining({ id: 'p1', deleted: true })]),
		);
	});

	it('stamps repeated writes to one document with strictly increasing times', async () => {
		const stamps: string[] = [];
		for (let i = 0; i < 5; i++) {
			const r = (await (await call(`${base}/fast`, { as, method: 'PUT', body: { data: { i } } })).json()) as { updated_at: string };
			stamps.push(r.updated_at);
		}
		expect([...stamps].sort()).toEqual(stamps);
		expect(new Set(stamps).size).toBe(5);
	});

	it('records who wrote what, and that record cannot be changed', async () => {
		await call(`${base}/audit`, { method: 'PUT', as: 'owner@example.test', body: { data: { title: 'Audit' } } });
		const row = await env.DB.prepare("SELECT op, by FROM board_writes WHERE id = 'audit'").first<{ op: string; by: string }>();
		expect(row).toEqual({ op: 'set', by: 'owner@example.test' });
		await expect(env.DB.prepare("DELETE FROM board_writes WHERE id = 'audit'").run()).rejects.toThrow(/append-only/);
	});

	it('rejects bad requests', async () => {
		expect((await call('/api/boards/not-a-board/cards')).status).toBe(404);
		expect((await call('/api/boards/agent-board/bad%20name', { as })).status).toBe(400);
		expect((await call(`${base}/x`, { as, method: 'PUT', body: { data: [1, 2] } })).status).toBe(400);
		expect((await call(`${base}/x`, { as, method: 'PUT', body: 'not json' })).status).toBe(400);
		expect((await call(`${base}/missing`, { as, method: 'PATCH', body: { data: { a: 1 } } })).status).toBe(404);
		expect((await call(`${base}/big`, { as, method: 'PUT', body: { data: { s: 'x'.repeat(600 * 1024) } } })).status).toBe(413);
		expect((await call(base, { as, method: 'POST', body: { data: {} } })).status).toBe(405);
	});
});

describe('request guards', () => {
	it('answers a malformed escape in the address with 400, not a crash', async () => {
		for (const path of ['/api/boards/field/readings/%E0%A4%A', '/api/boards/%']) {
			const res = await call(path);
			expect(res.status, path).toBe(400);
			expect(((await res.json()) as { error: { code: string } }).error.code).toBe('bad_request');
		}
		const measure = await call('/api/measure/jobs/%E0%A4%A');
		expect(measure.status).toBe(400);
		expect(((await measure.json()) as { detail: string }).detail).toBe('Bad escape in the address');
	});

	it('refuses writes from another site, and lets this site write', async () => {
		const doc = '/api/boards/agent-board/cards/c-site';
		const as = 'owner@example.test';
		const body = { data: { title: 'From where?' } };
		for (const headers of [
			{ 'Sec-Fetch-Site': 'cross-site' },
			{ 'Sec-Fetch-Site': 'same-site', Origin: 'https://other.pathofphi.com' },
			{ Origin: 'https://evil.example' },
			{ Origin: 'null' },
		]) {
			const res = await call(doc, { method: 'PUT', as, body, headers });
			expect(res.status, JSON.stringify(headers)).toBe(403);
		}
		// A text/plain import from another site, the form-post shape, is refused before it is read.
		const plain = await call('/api/boards/agent-board/_import', {
			method: 'POST', as, body: JSON.stringify({ collections: { cards: { evil: { title: 'x' } } } }), headers: { Origin: 'https://evil.example', 'Content-Type': 'text/plain' },
		});
		expect(plain.status).toBe(403);
		expect((await call(doc, { as })).status).toBe(200);
		expect(((await (await call(doc, { as })).json()) as { exists: boolean }).exists).toBe(false);
		// Reads from anywhere still answer (Access decides who reads).
		expect((await call(doc, { as, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(200);
		// Same origin, by either header, and tools that send neither, may write.
		expect((await call(doc, { method: 'PUT', as, body, headers: { 'Sec-Fetch-Site': 'same-origin', Origin: ORIGIN } })).status).toBe(200);
		expect((await call(doc, { method: 'PUT', as, body, headers: { Origin: ORIGIN } })).status).toBe(200);
		expect((await call(doc, { method: 'PUT', as, body })).status).toBe(200);
	});
});

describe('concurrent edits', () => {
	it('keeps every acknowledged PATCH when several land at once, and logs each write once', async () => {
		const doc = '/api/boards/agent-board/cards/c-race';
		const as = 'owner@example.test';
		expect((await call(doc, { method: 'PUT', as, body: { data: { title: 'Race' } } })).status).toBe(200);
		const fields = Array.from({ length: 8 }, (_, i) => `f${i}`);
		const results = await Promise.all(fields.map((f) => call(doc, { method: 'PATCH', as, body: { data: { [f]: true } } })));
		for (const r of results) expect([200, 409]).toContain(r.status);
		const kept = fields.filter((_, i) => results[i]!.status === 200);
		expect(kept.length).toBeGreaterThan(0);
		const got = (await (await call(doc, { as })).json()) as { data: Record<string, unknown> };
		for (const f of kept) expect(got.data[f], f).toBe(true);
		const log = await env.DB.prepare("SELECT count(*) AS n FROM board_writes WHERE board = 'agent-board' AND collection = 'cards' AND id = 'c-race'").first<{ n: number }>();
		expect(log?.n).toBe(1 + kept.length);
	});

	it('keeps both writes when two land in the same millisecond, with a later time for the second', async () => {
		const doc = '/api/boards/agent-board/cards/c-same-ms';
		const as = 'owner@example.test';
		const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-27T12:00:00.000Z'));
		try {
			const put = (await (await call(doc, { method: 'PUT', as, body: { data: { title: 'Same ms' } } })).json()) as { updated_at: string };
			// One after the other, the clock not moving.
			const a = (await (await call(doc, { method: 'PATCH', as, body: { data: { a: 1 } } })).json()) as { updated_at: string };
			const b = (await (await call(doc, { method: 'PATCH', as, body: { data: { b: 2 } } })).json()) as { updated_at: string };
			expect(Date.parse(a.updated_at)).toBeGreaterThan(Date.parse(put.updated_at));
			expect(Date.parse(b.updated_at)).toBeGreaterThan(Date.parse(a.updated_at));
			// Both at once, the clock not moving: neither is lost and neither is told to retry.
			const [c, d] = await Promise.all([
				call(doc, { method: 'PATCH', as, body: { data: { c: 3 } } }),
				call(doc, { method: 'PATCH', as, body: { data: { d: 4 } } }),
			]);
			expect([c.status, d.status]).toEqual([200, 200]);
			const got = (await (await call(doc, { as })).json()) as { data: Record<string, unknown>; updated_at: string };
			expect(got.data).toMatchObject({ title: 'Same ms', a: 1, b: 2, c: 3, d: 4 });
			expect(Date.parse(got.updated_at)).toBeGreaterThan(Date.parse(b.updated_at));
			const log = await env.DB.prepare("SELECT count(*) AS n FROM board_writes WHERE board = 'agent-board' AND collection = 'cards' AND id = 'c-same-ms'").first<{ n: number }>();
			expect(log?.n).toBe(5);
		} finally {
			now.mockRestore();
		}
	});
});
