import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { exportJWK, generateKeyPair } from 'jose';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest(async () => {
			// Tests sign Cloudflare Access tokens with this key; the Worker
			// verifies them against ACCESS_JWKS instead of Cloudflare's keys.
			const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
			const pub = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' };
			const priv = { ...(await exportJWK(privateKey)), kid: 'test-key', alg: 'RS256' };
			return {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					bindings: {
						ACCESS_AUD: 'test-aud',
						OWNER_EMAILS: 'owner@example.test',
						ACCESS_JWKS: JSON.stringify({ keys: [pub] }),
						TEST_PRIVATE_JWK: priv,
						TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')),
					},
				},
			};
		}),
	],
});
