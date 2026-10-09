// Set only by the test suite: a JWKS to verify locally signed Access tokens.
interface Env {
	ACCESS_JWKS?: string;
	// Optional secret. With it, a new problem report also opens a Linear issue
	// (src/feedback.ts). Set it with `wrangler secret put LINEAR_API_KEY`.
	LINEAR_API_KEY?: string;
}

// Wrangler bundles .wasm imports as compiled WebAssembly modules.
declare module '*.wasm' {
	const module: WebAssembly.Module;
	export default module;
}
