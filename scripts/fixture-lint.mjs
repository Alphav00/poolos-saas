#!/usr/bin/env node
// Fails when a test or fixture file contains a string from tests/denylist.txt.
// Checked: every file under a test/, tests/, __tests__/ or fixtures/ folder,
// every *.test.* / *.spec.* file, every file whose name starts with fixture,
// demo, sample or generator (any case: demo.ts, FixturesLoader.svelte), and
// everything under scripts/e2e/. Skipped: tests/denylist.txt and this lint's
// own scripts (they hold the terms on purpose), brands/ (the packs are the
// one place company names belong) and docs/.
//
// Usage: node scripts/fixture-lint.mjs [root]   (exit 1 on any hit)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const denylistPath = join(root, 'tests', 'denylist.txt');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.wrangler', 'inputs', '.claude']);
const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'fixtures']);
const DATA_NAME = /^(fixtures?|demo|sample|generator)/i;
const SKIP_TOP = new Set(['brands', 'docs']);
const SKIP_FILES = new Set([
  join('tests', 'denylist.txt'),
  join('scripts', 'fixture-lint.mjs'),
  join('scripts', 'fixture-lint.selftest.mjs'),
]);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const terms = readFileSync(denylistPath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));
const patterns = terms.map((t) => ({ term: t, re: new RegExp(`(?<![A-Za-z0-9])${escape(t)}(?![A-Za-z0-9])`, 'i') }));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const isChecked = (rel) => {
  const parts = rel.split(sep);
  const name = parts[parts.length - 1];
  if (SKIP_TOP.has(parts[0]) || SKIP_FILES.has(rel)) return false;
  return (
    parts.slice(0, -1).some((part) => TEST_DIRS.has(part)) ||
    /\.(test|spec)\.[^.]+$/.test(name) ||
    DATA_NAME.test(name) ||
    (parts[0] === 'scripts' && parts[1] === 'e2e')
  );
};

const hits = [];
for (const path of walk(root)) {
  const rel = relative(root, path);
  if (!isChecked(rel)) continue;
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { term, re } of patterns) if (re.test(line)) hits.push(`${rel}:${i + 1}: contains "${term}"`);
  });
}

if (hits.length > 0) {
  console.error(`fixture-lint: ${hits.length} denylisted string(s) found:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`fixture-lint: OK (${terms.length} terms checked)`);
