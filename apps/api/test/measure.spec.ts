import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { call, migrate } from './helpers';

beforeAll(migrate);

const api = (path: string, init: Parameters<typeof call>[1] = {}) => call(`/api/measure${path}`, init);
const fixture = async (name: string) => (await (await api(`/fixtures/${name}`)).json()) as Record<string, unknown>;
const create = async (name: string, as?: string) => {
	const f = await fixture(name);
	const { id: _id, created_at: _c, updated_at: _u, ...body } = f;
	const res = await api('/jobs', { method: 'POST', body, as });
	expect(res.status).toBe(200);
	return (await res.json()) as { id: string; meta: { customer_name: string }; measurement: { swap_ab: boolean }; updated_at: string };
};

describe('measure: sign-in and catalog', () => {
	it('is behind Cloudflare Access like everything else', async () => {
		expect((await api('/health', { as: null })).status).toBe(401);
		expect((await api('/jobs', { as: null })).status).toBe(401);
		expect((await call('/measure', { as: null })).status).toBe(401);
	});

	it('serves the measuring screens under /measure, deep links included', async () => {
		for (const path of ['/measure', '/measure/', '/measure/new', '/measure/jobs/abc/edit']) {
			const res = await call(path);
			expect(res.status, path).toBe(200);
			expect(await res.text()).toContain('<div id="app">');
		}
	});

	it('lists the fixtures and liner shapes', async () => {
		expect(await (await api('/fixtures')).json()).toEqual(['freeform', 'kidney', 'kidney-liner', 'rectangular', 'rectangular-liner']);
		expect((await api('/fixtures/nope')).status).toBe(404);
		const shapes = (await (await api('/liner/shapes')).json()) as { value: string; requires_ab_plot: boolean }[];
		expect(shapes.find((s) => s.value === 'kidney')?.requires_ab_plot).toBe(true);
	});
});

describe('measure: jobs', () => {
	it('creates, reads, lists, updates and deletes a job, recording who did each', async () => {
		const job = await create('rectangular', 'tech@example.test');
		const got = await (await api(`/jobs/${job.id}`)).json();
		expect(got).toEqual(job);

		const list = (await (await api('/jobs')).json()) as { id: string; customer_name: string; product_type: string }[];
		expect(list).toContainEqual(expect.objectContaining({ id: job.id, customer_name: 'Rectangular Test', product_type: 'cover' }));

		const put = await api(`/jobs/${job.id}`, { method: 'PUT', body: { notes: 'Back gate', product_type: 'both' }, as: 'other@example.test' });
		expect(put.status).toBe(200);
		const updated = (await put.json()) as { notes: string; product_type: string; updated_at: string };
		expect(updated.notes).toBe('Back gate');
		expect(updated.product_type).toBe('both');

		expect((await api(`/jobs/${job.id}`, { method: 'DELETE' })).status).toBe(204);
		expect((await api(`/jobs/${job.id}`)).status).toBe(404);

		const log = await env.DB.prepare('SELECT op, by FROM measure_job_writes WHERE job_id = ? ORDER BY seq').bind(job.id).all();
		expect(log.results).toEqual([
			{ op: 'create', by: 'tech@example.test' },
			{ op: 'update', by: 'other@example.test' },
			{ op: 'delete', by: 'tech@example.test' },
		]);
	});

	it('refuses an invalid job with FastAPI-style errors', async () => {
		const res = await api('/jobs', { method: 'POST', body: { meta: { customer_name: 'X', dealer_name: 'D' }, measurement: { ab_distance_ft: 5 } } });
		expect(res.status).toBe(422);
		const { detail } = (await res.json()) as { detail: { loc: (string | number)[] }[] };
		expect(detail.map((d) => d.loc.join('.'))).toContain('body.measurement.ab_distance_ft');
		expect((await api('/jobs', { method: 'POST', body: '{nope' })).status).toBe(422);
	});

	it('swaps A/B on a saved job but not on a fixture', async () => {
		const job = await create('kidney');
		const res = await api(`/jobs/${job.id}/swap-ab`, { method: 'POST' });
		expect(((await res.json()) as { swap_ab: boolean }).swap_ab).toBe(true);
		expect(((await (await api(`/jobs/${job.id}`)).json()) as typeof job).measurement.swap_ab).toBe(true);
		expect((await api('/jobs/kidney/swap-ab', { method: 'POST' })).status).toBe(400);
	});
});

describe('measure: math and order forms', () => {
	it('reconstructs and validates fixtures and saved jobs', async () => {
		const rec = (await (await api('/jobs/rectangular/reconstruct', { method: 'POST' })).json()) as { length_ft: string; points: unknown[] };
		expect(rec.length_ft).toBe('32.001320291666666');
		expect(rec.points.length).toBeGreaterThan(40);
		expect(await (await api('/jobs/rectangular/validate', { method: 'POST' })).json()).toEqual({ warnings: [] });
		expect((await api('/jobs/missing-job/reconstruct', { method: 'POST' })).status).toBe(404);
	});

	it('serves the cover order form as JSON and PDF', async () => {
		const form = (await (await api('/jobs/kidney/order-form', { method: 'POST' })).json()) as { reconstructed: { length_ft: string } };
		expect(form.reconstructed.length_ft).toBe('38.0');
		const pdf = await api('/jobs/kidney/order-form.pdf');
		expect(pdf.headers.get('Content-Type')).toBe('application/pdf');
		expect(pdf.headers.get('Content-Disposition')).toContain('order-form-kidney.pdf');
		expect(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5))).toBe('%PDF-');
	});

	it('runs the liner takeoff and refuses orders that do not close', async () => {
		const ok = (await (await api('/jobs/kidney-liner/liner-takeoff', { method: 'POST' })).json()) as { validation: { ok: boolean } };
		expect(ok.validation.ok).toBe(true);
		expect((await api('/jobs/kidney-liner/liner-order-form.pdf')).status).toBe(200);
		expect((await api('/jobs/kidney/liner-takeoff', { method: 'POST' })).status).toBe(400);

		const f = await fixture('rectangular-liner');
		const { id: _i, created_at: _c, updated_at: _u, ...body } = f as { liner_spec: { pattern_name: string } } & Record<string, unknown>;
		body.liner_spec.pattern_name = '';
		const job = (await (await api('/jobs', { method: 'POST', body })).json()) as { id: string };
		const blocked = await api(`/jobs/${job.id}/liner-order-form`, { method: 'POST' });
		expect(blocked.status).toBe(422);
		expect(await blocked.json()).toEqual({
			detail: { message: 'Liner order blocked: the measurements do not close.', blocking: ['Liner pattern is required on the order.'] },
		});
	});
});
