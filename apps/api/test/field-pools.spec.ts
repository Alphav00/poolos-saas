import { beforeAll, describe, expect, it } from 'vitest';
import { call, migrate } from './helpers';

beforeAll(migrate);

const POOL = { name: 'Quarry Lane', gallons: 18000, tds: 1100, tags: ['Vinyl'], equipment: ['Pump 2019'], cell: { make: 'Hayward', model: 'T-CELL-15' }, note: 'Gate sticks', demo: true };
const doc = (id: string) => `/api/boards/field/pools/${id}`;
const put = (id: string, data: unknown, as = 'owner@example.test') => call(doc(id), { method: 'PUT', as, body: { data } });

describe('pool profiles', () => {
	it('lets an owner save a profile and anyone signed in read it', async () => {
		expect((await put('quarry-lane', POOL)).status).toBe(200);
		const got = (await (await call(doc('quarry-lane'), { as: 'tech@example.test' })).json()) as { data: typeof POOL };
		expect(got.data).toEqual(POOL);
		const list = (await (await call('/api/boards/field/pools', { as: 'tech@example.test' })).json()) as { docs: { id: string }[] };
		expect(list.docs.map((d) => d.id)).toContain('quarry-lane');
	});

	it('refuses writes from anyone but an owner', async () => {
		expect((await put('quarry-lane', POOL, 'tech@example.test')).status).toBe(403);
		expect((await call(doc('quarry-lane'), { method: 'PATCH', body: { data: { note: 'x' } } })).status).toBe(403);
		expect((await call(doc('quarry-lane'), { method: 'DELETE' })).status).toBe(403);
	});

	it('refuses a profile that is not a pool', async () => {
		expect((await put('Bad_Id', POOL)).status).toBe(400);
		expect((await put('no-name', { ...POOL, name: ' ' })).status).toBe(400);
		expect((await put('neg', { ...POOL, gallons: -5 })).status).toBe(400);
		expect((await put('cell', { ...POOL, cell: { make: 'Hayward' } })).status).toBe(400);
		expect((await put('tags', { ...POOL, tags: 'Vinyl' })).status).toBe(400);
		expect((await put('forecast', { ...POOL, forecast: { fc: 3 } })).status).toBe(400);
		expect((await put('demo', { ...POOL, demo: 'yes' })).status).toBe(400);
	});

	it('lets an owner remove a pool', async () => {
		expect((await call(doc('quarry-lane'), { method: 'DELETE', as: 'owner@example.test' })).status).toBe(200);
	});
});
