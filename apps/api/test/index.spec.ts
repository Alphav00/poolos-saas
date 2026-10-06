import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('PoolOS API worker', () => {
	it('answers the health check', async () => {
		const res = await SELF.fetch('https://example.com/api/health');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	it('returns 404 for an unknown route', async () => {
		const res = await SELF.fetch('https://example.com/nope');
		expect(res.status).toBe(404);
	});
});
