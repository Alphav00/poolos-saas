import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface Viewer {
	/** The company whose team boards this request works on ('' is the default); see company.ts. */
	company?: string;
	email: string;
	isOwner: boolean;
}

let remote: { team: string; keys: JWTVerifyGetKey } | null = null;

function keysFor(env: Env): JWTVerifyGetKey {
	// ACCESS_JWKS is only set by the test suite, to sign tokens with a local key.
	if (env.ACCESS_JWKS) return createLocalJWKSet(JSON.parse(env.ACCESS_JWKS));
	if (!remote || remote.team !== env.ACCESS_TEAM_DOMAIN) {
		remote = { team: env.ACCESS_TEAM_DOMAIN, keys: createRemoteJWKSet(new URL(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`)) };
	}
	return remote.keys;
}

/**
 * Cloudflare Access signs in the viewer before a request reaches the Worker.
 * The Worker still checks Access's signed token (signature, issuer, audience,
 * expiry) so a request that bypasses Access is refused.
 * https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */
export async function viewerFrom(request: Request, env: Env): Promise<Viewer | null> {
	if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
	const token = request.headers.get('Cf-Access-Jwt-Assertion');
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, keysFor(env), {
			issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
			audience: env.ACCESS_AUD,
		});
		const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
		if (!email) return null;
		const owners = (env.OWNER_EMAILS ?? '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
		return { email, isOwner: owners.includes(email) };
	} catch {
		return null;
	}
}
