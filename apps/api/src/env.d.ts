// Set only by the test suite: a JWKS to verify locally signed Access tokens.
interface Env {
	ACCESS_JWKS?: string;
}

// Wrangler bundles .wasm imports as compiled WebAssembly modules.
declare module '*.wasm' {
	const module: WebAssembly.Module;
	export default module;
}
