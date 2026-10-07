import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
  // apps/measure is Liner Measure Pro's Svelte 4 app brought over as is; its own
  // test suites cover it (pnpm --filter @poolos/measure test).
  { ignores: ['**/node_modules/', '**/dist/', '**/.wrangler/', 'reference/', 'inputs/', 'apps/api/worker-configuration.d.ts', 'apps/measure/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['**/*.svelte', '**/*.svelte.ts'], languageOptions: { parserOptions: { parser: ts.parser } } },
  // `const { id: _id, ...rest } = x` drops a key on purpose.
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, varsIgnorePattern: '^_' }] } },
);
