#!/usr/bin/env node
// Local sign-in for the user journeys (scripts/e2e/run.mjs).
//
// The Worker checks a Cloudflare Access token on every request (apps/api/src/auth.ts).
// When ACCESS_JWKS is set it verifies against that key set instead of
// Cloudflare's, which is how the API tests sign in. This file uses the same
// path for `wrangler dev`: it makes a throwaway RS256 key, writes the public
// half to apps/api/.dev.vars (read by `wrangler dev` only, never deployed,
// gitignored) and signs tokens with the private half, which stays in memory.
// No new bypass: the Worker still checks signature, issuer, audience and expiry.
//
// The API tests (apps/api/vitest.config.mts) read .dev.vars too, and fail
// against this issuer, so run.mjs removes it when it finishes.
//
// Standalone: `node scripts/e2e/dev-auth.mjs` writes .dev.vars and prints an
// owner token for curl, e.g. curl -H "Cf-Access-Jwt-Assertion: <token>" ...
// `node scripts/e2e/dev-auth.mjs --remove` takes .dev.vars away again.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEV_VARS = join(ROOT, 'apps', 'api', '.dev.vars');
export const TEAM_DOMAIN = 'local-e2e.test';
export const AUD = 'local-e2e';
export const OWNER = 'owner@example.test';
const KID = 'e2e';
const MARKER = '# Written by scripts/e2e/dev-auth.mjs';

let privateKey = null;

/** Make a fresh key and write apps/api/.dev.vars. Refuses to replace a .dev.vars someone else wrote. */
export async function setupDevAuth({ owners = [OWNER] } = {}) {
  if (existsSync(DEV_VARS) && !readFileSync(DEV_VARS, 'utf8').startsWith(MARKER)) {
    throw new Error(`${DEV_VARS} exists and was not written by the e2e kit. Move it aside (it may hold secrets) and run again.`);
  }
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  const pub = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: 'RS256', use: 'sig' };
  const vars = {
    ACCESS_JWKS: JSON.stringify({ keys: [pub] }),
    ACCESS_AUD: AUD,
    ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    OWNER_EMAILS: owners.join(','),
  };
  // Single quotes: dotenv keeps the JSON's double quotes as they are.
  const body = Object.entries(vars).map(([k, v]) => `${k}='${v}'`).join('\n');
  writeFileSync(DEV_VARS, `${MARKER} for local user journeys. Not a secret; regenerated each run.\n${body}\n`);
  return { vars, tokenFor };
}

/** Delete apps/api/.dev.vars if this kit wrote it. */
export function removeDevAuth() {
  if (existsSync(DEV_VARS) && readFileSync(DEV_VARS, 'utf8').startsWith(MARKER)) rmSync(DEV_VARS);
}

/** A 2-hour Access-style token for `email`, signed with the key from setupDevAuth(). */
export async function tokenFor(email) {
  if (!privateKey) throw new Error('Call setupDevAuth() first');
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(`https://${TEAM_DOMAIN}`)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--remove')) {
    removeDevAuth();
    process.exit(0);
  }
  await setupDevAuth();
  console.error(`Wrote ${DEV_VARS}. Token for ${OWNER} (valid 2 h, until .dev.vars is rewritten). Remove it before pnpm test with --remove.`);
  console.log(await tokenFor(OWNER));
}
