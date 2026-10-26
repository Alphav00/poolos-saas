import { beforeAll, describe, expect, it } from 'vitest';
import { call, migrate } from './helpers';

beforeAll(migrate);

const doc = (id: string) => `/api/boards/field/readings/${id}`;
const put = (id: string, data: unknown, as = 'tech@example.test') => call(doc(id), { method: 'PUT', as, body: { data } });

describe('day readings', () => {
	it('keeps arrival and departure times with the day’s readings', async () => {
		const reading = { pool: 'quarry-lane', date: '2026-10-20', method: 'drop', values: { fc: 3, ph: 7.5 }, arrivedAt: '9:05', leftAt: '9:40' };
		expect((await put('quarry-lane:2026-10-20', reading)).status).toBe(200);
		const got = (await (await call(doc('quarry-lane:2026-10-20'), { as: 'tech@example.test' })).json()) as { data: typeof reading };
		expect(got.data).toEqual(reading);
	});

	it('still saves readings with no times', async () => {
		const reading = { pool: 'quarry-lane', date: '2026-10-21', method: 'drop', values: { fc: 2.5 } };
		expect((await put('quarry-lane:2026-10-21', reading)).status).toBe(200);
	});

	it('refuses times that are not clock times, and unknown fields', async () => {
		const base = { pool: 'quarry-lane', date: '2026-10-22', method: 'drop', values: { fc: 3 } };
		expect((await put('quarry-lane:2026-10-22', { ...base, arrivedAt: '25:00' })).status).toBe(400);
		expect((await put('quarry-lane:2026-10-22', { ...base, leftAt: '9:5' })).status).toBe(400);
		expect((await put('quarry-lane:2026-10-22', { ...base, arrivedAt: 905 })).status).toBe(400);
		expect((await put('quarry-lane:2026-10-22', { ...base, minutes: 35 })).status).toBe(400);
	});
});
