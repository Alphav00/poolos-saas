import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { canEditPools, roleFor } from '../src/roles';
import { call, migrate } from './helpers';

beforeAll(migrate);

const OWNER = 'owner@example.test';
const ALEX = { name: 'Alex', email: 'alex@example.test', role: 'Lead', route: 'Route B', demo: true };
const doc = (id: string) => `/api/boards/field/staff/${id}`;
const put = (id: string, data: unknown, as = OWNER) => call(doc(id), { method: 'PUT', as, body: { data } });
type Saved = { data: Record<string, unknown> };

describe('staff', () => {
	it('lets an owner add staff, stamps when, and lets anyone signed in read the list', async () => {
		const res = await put('alex', { ...ALEX, email: 'Alex@Example.test', createdAt: '2001-01-01T00:00:00.000Z' });
		expect(res.status).toBe(200);
		const saved = ((await res.json()) as Saved).data;
		expect(saved.email).toBe('alex@example.test');
		expect(saved.createdAt).not.toBe('2001-01-01T00:00:00.000Z');
		expect(Date.now() - Date.parse(saved.createdAt as string)).toBeLessThan(60_000);
		expect(saved.createdBy).toBe(OWNER);
		const list = (await (await call('/api/boards/field/staff', { as: 'tech@example.test' })).json()) as { docs: { id: string }[] };
		expect(list.docs.map((d) => d.id)).toEqual(['alex']);
	});

	it('keeps createdAt when the record is replaced or patched', async () => {
		const first = ((await (await call(doc('alex'), { as: OWNER })).json()) as Saved).data.createdAt;
		const replaced = ((await (await put('alex', { ...ALEX, route: 'Route C', createdAt: '2030-01-01T00:00:00.000Z' })).json()) as Saved).data;
		expect(replaced.createdAt).toBe(first);
		expect(replaced.createdBy).toBe(OWNER);
		expect(replaced.route).toBe('Route C');
		const patched = await call(doc('alex'), { method: 'PATCH', as: OWNER, body: { data: { role: 'Dispatcher', createdAt: 'x' } } });
		expect(patched.status).toBe(200);
		expect(((await patched.json()) as Saved).data).toMatchObject({ role: 'Dispatcher', createdAt: first });
	});

	it('refuses staff writes from anyone but an owner, Leads included', async () => {
		expect((await put('casey', { ...ALEX, name: 'Casey', email: 'casey@example.test' }, 'tech@example.test')).status).toBe(403);
		// alex@example.test is on file as a Dispatcher now; still not an owner.
		expect((await put('casey', { ...ALEX, name: 'Casey', email: 'casey@example.test' }, 'alex@example.test')).status).toBe(403);
		expect((await call(doc('alex'), { method: 'PATCH', as: 'alex@example.test', body: { data: { role: 'Lead' } } })).status).toBe(403);
		expect((await call(doc('alex'), { method: 'DELETE', as: 'tech@example.test' })).status).toBe(403);
	});

	it('refuses a record that is not a staff member', async () => {
		expect((await put('Bad_Id', ALEX)).status).toBe(400);
		expect((await put('no-name', { ...ALEX, name: ' ' })).status).toBe(400);
		expect((await put('long-name', { ...ALEX, name: 'x'.repeat(81) })).status).toBe(400);
		expect((await put('no-email', { ...ALEX, email: 'alex' })).status).toBe(400);
		expect((await put('long-email', { ...ALEX, email: `${'a'.repeat(120)}@example.test` })).status).toBe(400);
		expect((await put('bad-role', { ...ALEX, role: 'Owner' })).status).toBe(400);
		expect((await put('long-route', { ...ALEX, route: 'r'.repeat(41) })).status).toBe(400);
		expect((await put('demo', { ...ALEX, demo: 'yes' })).status).toBe(400);
		expect((await put('extra', { ...ALEX, phone: '555' })).status).toBe(400);
	});

	it('refuses a second record for the same email, and staff in an import', async () => {
		const res = await put('alex-2', { ...ALEX, email: 'ALEX@example.test' });
		expect(res.status).toBe(409);
		const imported = await call('/api/boards/field/_import', { method: 'POST', as: OWNER, body: { collections: { staff: { sam: { ...ALEX, email: 'sam@example.test' } } } } });
		expect(imported.status).toBe(400);
	});

	it('lets an owner remove staff', async () => {
		expect((await put('morgan', { name: 'Morgan', email: 'morgan@example.test', role: 'Operator' })).status).toBe(200);
		expect((await call(doc('morgan'), { method: 'DELETE', as: OWNER })).status).toBe(200);
	});
});

describe('roleFor', () => {
	it('matches the sign-in email to a live staff record, ignoring case', async () => {
		expect(await roleFor(env, 'alex@example.test')).toBe('Dispatcher');
		expect(await roleFor(env, ' ALEX@example.TEST ')).toBe('Dispatcher');
		expect(await roleFor(env, 'nobody@example.test')).toBeNull();
		expect(await roleFor(env, '')).toBeNull();
	});

	it('ignores deleted records', async () => {
		expect(await roleFor(env, 'morgan@example.test')).toBeNull();
	});

	it('gives no role when two records claim one email', async () => {
		const row = (id: string, role: string) =>
			env.DB.prepare("INSERT INTO board_docs (board, collection, id, data, updated_at, updated_by, deleted) VALUES ('field','staff',?,?,?,?,0)")
				.bind(id, JSON.stringify({ name: id, email: 'Twin@example.test', role }), new Date().toISOString(), OWNER)
				.run();
		await row('twin-a', 'Lead');
		expect(await roleFor(env, 'twin@example.test')).toBe('Lead');
		await row('twin-b', 'Technician');
		expect(await roleFor(env, 'twin@example.test')).toBeNull();
	});

	it('gives pool edits to owners, Leads and Dispatchers only', () => {
		expect(canEditPools(true, null)).toBe(true);
		expect(canEditPools(false, 'Lead')).toBe(true);
		expect(canEditPools(false, 'Dispatcher')).toBe(true);
		expect(canEditPools(false, 'Technician')).toBe(false);
		expect(canEditPools(false, 'Operator')).toBe(false);
		expect(canEditPools(false, null)).toBe(false);
	});
});

describe('/api/me', () => {
	it('names the viewer’s role and whether they can change pools', async () => {
		expect(await (await call('/api/me', { as: 'Alex@example.test' })).json()).toEqual({
			email: 'alex@example.test', isOwner: false, role: 'Dispatcher', canEditPools: true, company: '', companies: [''],
		});
		expect((await put('riley', { name: 'Riley', email: 'riley@example.test', role: 'Technician' })).status).toBe(200);
		expect(await (await call('/api/me', { as: 'riley@example.test' })).json()).toEqual({
			email: 'riley@example.test', isOwner: false, role: 'Technician', canEditPools: false, company: '', companies: [''],
		});
	});
});
