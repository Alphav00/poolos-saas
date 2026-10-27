import { applyD1Migrations, env, SELF } from 'cloudflare:test';
import { importJWK, SignJWT } from 'jose';

const ISSUER = 'https://phi-agents.cloudflareaccess.com';
export const ORIGIN = 'https://poolos.pathofphi.com';

/** Run in beforeAll: each test file gets its own fresh D1. */
export const migrate = () => applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

export async function token(email: string, opts: { aud?: string; iss?: string; exp?: string | number } = {}) {
	const key = await importJWK(env.TEST_PRIVATE_JWK, 'RS256');
	return new SignJWT({ email })
		.setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
		.setIssuer(opts.iss ?? ISSUER)
		.setAudience(opts.aud ?? 'test-aud')
		.setIssuedAt()
		.setExpirationTime(opts.exp ?? '5m')
		.sign(key);
}

export async function call(path: string, init: { method?: string; body?: unknown; as?: string | null; jwt?: string; company?: string; headers?: Record<string, string> } = {}) {
	const headers: Record<string, string> = { ...init.headers };
	// The web app's placeholder sign-in picks the company with this cookie (src/company.ts).
	if (init.company) headers.Cookie = `poolos_company=${init.company}`;
	const jwt = init.jwt ?? (init.as === null ? undefined : await token(init.as ?? 'tech@example.test'));
	if (jwt) headers['Cf-Access-Jwt-Assertion'] = jwt;
	if (init.body !== undefined) headers['Content-Type'] = 'application/json';
	return SELF.fetch(ORIGIN + path, {
		method: init.method ?? 'GET',
		headers,
		...(init.body !== undefined ? { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) } : {}),
	});
}

