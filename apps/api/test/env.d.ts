declare namespace Cloudflare {
	interface Env {
		TEST_PRIVATE_JWK: import('jose').JWK;
		TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
	}
}
