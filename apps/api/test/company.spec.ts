import { describe, beforeAll, expect, it } from 'vitest';
import { companyFrom } from '../src/company';
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
