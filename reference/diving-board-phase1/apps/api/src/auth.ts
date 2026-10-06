import type { MiddlewareHandler } from 'hono';
import { ApiError } from './errors';
import type { AppEnv, CurrentUser, Env, Role } from './env';

/** Returns the verified email of the caller, or null. */
export type Authenticator = (req: Request, env: Env) => Promise<string | null>;

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }

const certCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const CERT_TTL_MS = 60 * 60 * 1000;

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

async function accessKeys(team: string, refresh = false): Promise<Jwk[]> {
  const hit = certCache.get(team);
  if (!refresh && hit && Date.now() - hit.fetchedAt < CERT_TTL_MS) return hit.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  certCache.set(team, { keys, fetchedAt: Date.now() });
  return keys;
}

/**
 * Verifies the Cloudflare Access JWT (RS256): signature against the team's
 * published keys, audience, issuer and expiry. The plain
 * Cf-Access-Authenticated-User-Email header is never trusted on its own.
 */
export const cloudflareAccess: Authenticator = async (req, env) => {
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(h))) as { kid?: string; alg?: string };
    if (header.alg !== 'RS256' || !header.kid) return null;
    let jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, true)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlDecode(s), new TextEncoder().encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as {
      aud?: string | string[]; iss?: string; exp?: number; email?: string;
    };
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    return claims.email ?? null;
  } catch {
    return null;
  }
};

/** Resolves the caller to a user row. A user belongs to exactly one org in v1. */
export function requireUser(authenticate: Authenticator): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const email = await authenticate(c.req.raw, c.env);
    if (!email) throw new ApiError(401, 'unauthenticated', 'Sign in required');
    const row = await c.env.DB.prepare('SELECT id, org_id, email, role FROM users WHERE email = ? LIMIT 2')
      .bind(email).all<{ id: string; org_id: string; email: string; role: Role }>();
    if (row.results.length !== 1) {
      throw new ApiError(403, 'no_account', 'This email is not set up for an organisation');
    }
    const u = row.results[0]!;
    const user: CurrentUser = { id: u.id, orgId: u.org_id, email: u.email, role: u.role };
    c.set('user', user);
    await next();
  };
}

export function requireRole(...roles: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!roles.includes(c.get('user').role)) throw new ApiError(403, 'forbidden', 'Your role cannot do this');
    await next();
  };
}
