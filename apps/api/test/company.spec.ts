import { env } from 'cloudflare:test';
import { describe, beforeAll, expect, it } from 'vitest';
import { companiesFor, companyFrom, refusedCompany } from '../src/company';
import { call, migrate } from './helpers';

beforeAll(migrate);

const OWNER = 'owner@example.test';
type List = { docs: { id: string }[] };
const pool = (name: string) => ({ data: { name, demo: true } });
const ids = async (path: string, company?: string) => ((await (await call(path, { as: OWNER, company })).json()) as List).docs.map((d) => d.id);

describe('companies sharing one deployment', () => {
	it('reads the company from the cookie, ignoring anything that is not a pack id', () => {
		const req = (cookie: string) => new Request('https://x.test/', { headers: { Cookie: cookie } });
		expect(companyFrom(req('a=1; poolos_company=blue-lagoon; b=2'))).toBe('blue-lagoon');
		expect(companyFrom(req('poolos_company=../field'))).toBe('');
		expect(companyFrom(new Request('https://x.test/'))).toBe('');
	});

	it('keeps each company’s team boards apart, the default company on the plain board', async () => {
		expect((await call('/api/boards/field/pools/p1', { method: 'PUT', as: OWNER, body: pool('Default pool') })).status).toBe(200);
		expect((await call('/api/boards/field/pools/p2', { method: 'PUT', as: OWNER, company: 'blue-lagoon', body: pool('Lagoon pool') })).status).toBe(200);
		expect(await ids('/api/boards/field/pools')).toEqual(['p1']);
		expect(await ids('/api/boards/field/pools', 'blue-lagoon')).toEqual(['p2']);
		expect(await ids('/api/boards/field/pools', 'k-and-r')).toEqual([]);
	});

	it('gives a viewer the role on file at the company they signed in as', async () => {
		const staff = { name: 'Alex', email: 'alex@example.test', role: 'Lead', route: 'Route B', demo: true };
		expect((await call('/api/boards/field/staff/alex', { method: 'PUT', as: OWNER, company: 'blue-lagoon', body: { data: staff } })).status).toBe(200);
		const me = async (company?: string) => ((await (await call('/api/me', { as: 'alex@example.test', company })).json()) as { role: string | null }).role;
		expect(await me('blue-lagoon')).toBe('Lead');
		expect(await me()).toBeNull();
		// Their Lead role at one company lets them change that company's pools only.
		expect((await call('/api/boards/field/pools/p2', { method: 'PATCH', as: 'alex@example.test', company: 'blue-lagoon', body: { data: { name: 'Lagoon' } } })).status).toBe(200);
		expect((await call('/api/boards/field/pools/p1', { method: 'PATCH', as: 'alex@example.test', body: { data: { name: 'Mine now' } } })).status).toBe(403);
	});
});

describe('Measure jobs per company', () => {
	const job = async (company?: string) => {
		const f = (await (await call('/api/measure/fixtures/kidney', { as: OWNER })).json()) as Record<string, unknown>;
		const { id: _id, created_at: _c, updated_at: _u, ...body } = f;
		const res = await call('/api/measure/jobs', { method: 'POST', as: OWNER, company, body });
		expect(res.status).toBe(200);
		return ((await res.json()) as { id: string }).id;
	};
	const listed = async (company?: string) => ((await (await call('/api/measure/jobs', { as: OWNER, company })).json()) as { id: string }[]).map((j) => j.id);

	it('lists, reads, changes and deletes a job only at the company that saved it', async () => {
		const plain = await job();
		const lagoon = await job('blue-lagoon');
		expect(await listed()).toContain(plain);
		expect(await listed()).not.toContain(lagoon);
		expect(await listed('blue-lagoon')).toEqual([lagoon]);
		const at = (path: string, init: Parameters<typeof call>[1] = {}) => call(`/api/measure/jobs/${lagoon}${path}`, { as: OWNER, ...init });
		expect((await at('')).status).toBe(404);
		expect((await at('', { method: 'PUT', body: { notes: 'x' } })).status).toBe(404);
		expect((await at('/swap-ab', { method: 'POST' })).status).toBe(404);
		expect((await at('/reconstruct', { method: 'POST' })).status).toBe(404);
		expect((await at('', { method: 'DELETE' })).status).toBe(404);
		expect((await at('', { company: 'blue-lagoon' })).status).toBe(200);
	});
});

describe('staff-list lock', () => {
	const locked = { ...env, COMPANY_LOCK: 'staff' } as Env;
	const viewer = (email: string, company = '', isOwner = false) => ({ email, isOwner, company });
	const staff = (company: string | undefined, id: string, email: string) =>
		call(`/api/boards/field/staff/${id}`, { method: 'PUT', as: OWNER, company, body: { data: { name: id, email, role: 'Technician', route: 'Route A', demo: true } } });

	it('knows which companies list an email, any case', async () => {
		expect((await staff(undefined, 'jo', 'jo@example.test')).status).toBe(200);
		expect((await staff('k-and-r', 'jo', 'JO@example.test')).status).toBe(200);
		expect((await companiesFor(env, ' Jo@Example.test ')).sort()).toEqual(['', 'k-and-r']);
		expect(await companiesFor(env, 'nobody@example.test')).toEqual([]);
	});

	it('lets staff into their own companies only, and owners anywhere', async () => {
		expect((await staff('blue-lagoon', 'sam', 'sam@example.test')).status).toBe(200);
		expect(await refusedCompany(locked, viewer('sam@example.test', 'blue-lagoon'))).toBeNull();
		const refused = await refusedCompany(locked, viewer('sam@example.test'));
		expect(refused?.status).toBe(403);
		expect(((await refused!.json()) as { error: { code: string } }).error.code).toBe('not_staff');
		expect((await refusedCompany(locked, viewer('stranger@example.test', 'blue-lagoon')))?.status).toBe(403);
		expect(await refusedCompany(locked, viewer('owner@example.test', 'anything', true))).toBeNull();
		expect(await refusedCompany(env, viewer('stranger@example.test', 'blue-lagoon'))).toBeNull();
	});

	it('tells the app where the viewer may work', async () => {
		const me = async (as: string) => (await (await call('/api/me', { as, company: 'k-and-r' })).json()) as { company: string; companies: unknown };
		expect(await me('jo@example.test')).toMatchObject({ company: 'k-and-r' });
		expect(((await me('jo@example.test')).companies as string[]).sort()).toEqual(['', 'k-and-r']);
		expect((await me(OWNER)).companies).toBe('all');
	});
});
