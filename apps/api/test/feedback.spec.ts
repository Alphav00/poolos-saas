import { beforeAll, describe, expect, it } from 'vitest';
import { checkFeedbackDoc } from '../src/feedback';
import { call, migrate } from './helpers';

beforeAll(migrate);

const REPORT = {
	area: 'route',
	severity: 'major',
	device: 'phone',
	title: 'Next stop shows the wrong pool',
	expected: 'Stop 5 after stop 4',
	actual: 'It jumped to stop 7',
	screen: '#/field',
};

describe('problem reports', () => {
	const doc = '/api/boards/feedback/reports/r-20261009-142233-ab12';

	it('saves a report and stamps who sent it, whatever the form says', async () => {
		const put = await call(doc, { method: 'PUT', as: 'tester@example.test', body: { data: { ...REPORT, reporter: 'someone-else@example.test' } } });
		expect(put.status).toBe(200);
		const got = (await (await call(doc, { as: 'other@example.test' })).json()) as { data: Record<string, unknown> };
		expect(got.data.reporter).toBe('tester@example.test');
		expect(typeof got.data.reportedAt).toBe('string');
		expect(got.data.linear).toBeUndefined();
		// The Worker never files in Linear itself; the tester does that under their own sign-in.
		expect(got.data.status).toBeUndefined();
	});

	it('lets the team add to a report but only an owner replace or delete it', async () => {
		expect((await call(doc, { method: 'PATCH', as: 'tester@example.test', body: { data: { steps: 'Open Route, tap stop 4' } } })).status).toBe(200);
		expect((await call(doc, { method: 'PUT', as: 'tester@example.test', body: { data: REPORT } })).status).toBe(403);
		expect((await call(doc, { method: 'DELETE', as: 'tester@example.test' })).status).toBe(403);
		const kept = (await (await call(doc)).json()) as { data: Record<string, unknown> };
		expect(kept.data.reporter).toBe('tester@example.test');
		expect(kept.data.steps).toBe('Open Route, tap stop 4');
		expect((await call(doc, { method: 'DELETE', as: 'owner@example.test' })).status).toBe(200);
	});

	it('drops a Linear link or status a tester sends, and keeps what was there', async () => {
		const own = '/api/boards/feedback/reports/r-20261009-150000-cd34';
		const planted = { ...REPORT, linear: 'HEP-1', linearUrl: 'javascript:alert(1)', status: 'fixed' };
		expect((await call(own, { method: 'PUT', as: 'tester@example.test', body: { data: planted } })).status).toBe(200);
		let got = (await (await call(own)).json()) as { data: Record<string, unknown> };
		expect(got.data.linear).toBeUndefined();
		expect(got.data.linearUrl).toBeUndefined();
		expect(got.data.status).toBeUndefined();

		expect((await call(own, { method: 'PATCH', as: 'owner@example.test', body: { data: { status: 'wont-fix' } } })).status).toBe(200);
		expect((await call(own, { method: 'PATCH', as: 'tester@example.test', body: { data: { status: 'fixed', linear: 'HEP-2', linearUrl: 'https://linear.app/x/issue/HEP-2' } } })).status).toBe(200);
		got = (await (await call(own)).json()) as { data: Record<string, unknown> };
		expect(got.data.status).toBe('wont-fix');
		expect(got.data.linear).toBeUndefined();

		expect((await call(own, { method: 'PATCH', as: 'owner@example.test', body: { data: { linear: 'HEP-3', linearUrl: 'javascript:alert(1)' } } })).status).toBe(400);
		expect((await call(own, { method: 'PATCH', as: 'owner@example.test', body: { data: { linear: 'HEP-3', linearUrl: 'https://linear.app/x/issue/HEP-3' } } })).status).toBe(200);
		got = (await (await call(own)).json()) as { data: Record<string, unknown> };
		expect(got.data.linearUrl).toBe('https://linear.app/x/issue/HEP-3');
		expect((await call(own, { method: 'DELETE', as: 'owner@example.test' })).status).toBe(200);
	});

	it('is not listed as a board page', async () => {
		const res = (await (await call('/api/boards', { as: 'owner@example.test' })).json()) as { boards: { slug: string }[] };
		expect(res.boards.map((b) => b.slug)).not.toContain('feedback');
	});

	it('refuses a report with a missing or unknown field', () => {
		expect(checkFeedbackDoc('reports', 'r-20261009-142233-ab12', REPORT)).toBeNull();
		expect(checkFeedbackDoc('reports', 'bad id', REPORT)).toMatch(/ids look like/);
		expect(checkFeedbackDoc('reports', 'r-20261009-142233-ab12', { ...REPORT, area: 'toString' })).toMatch(/area/);
		expect(checkFeedbackDoc('reports', 'r-20261009-142233-ab12', { ...REPORT, actual: ' ' })).toMatch(/"actual" is needed/);
		expect(checkFeedbackDoc('reports', 'r-20261009-142233-ab12', { ...REPORT, colour: 'red' })).toMatch(/Unexpected field "colour"/);
		expect(checkFeedbackDoc('notes', 'r-20261009-142233-ab12', REPORT)).toMatch(/only keeps "reports"/);
		const id = 'r-20261009-142233-ab12';
		expect(checkFeedbackDoc('reports', id, { ...REPORT, linear: 'HEP-42', linearUrl: 'https://linear.app/x/issue/HEP-42' })).toBeNull();
		expect(checkFeedbackDoc('reports', id, { ...REPORT, linear: 'HEP-42', linearUrl: 'javascript:alert(1)' })).toMatch(/linearUrl/);
		expect(checkFeedbackDoc('reports', id, { ...REPORT, linear: 'HEP-42', linearUrl: 'https://linear.app.evil.test/x' })).toMatch(/linearUrl/);
		expect(checkFeedbackDoc('reports', id, { ...REPORT, linear: '<b>', linearUrl: 'https://linear.app/x' })).toMatch(/linear must be/);
		expect(checkFeedbackDoc('reports', id, { ...REPORT, linearUrl: 'https://linear.app/x' })).toMatch(/go together/);
	});
});
