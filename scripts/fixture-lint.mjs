#!/usr/bin/env node
// Fails when a test or fixture file contains a string from tests/denylist.txt.
// Checked: every file under a test/, tests/, __tests__/ or fixtures/ folder,
// and every *.test.* / *.spec.* file. tests/denylist.txt itself is skipped.
//
// Usage: node scripts/fixture-lint.mjs [root]   (exit 1 on any hit)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const denylistPath = join(root, 'tests', 'denylist.txt');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.wrangler', 'inputs']);
const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'fixtures']);

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

const isChecked = (rel) =>
  rel.split(sep).slice(0, -1).some((part) => TEST_DIRS.has(part)) || /\.(test|spec)\.[^.]+$/.test(rel);

const hits = [];
for (const path of walk(root)) {
  const rel = relative(root, path);
  if (rel === join('tests', 'denylist.txt') || !isChecked(rel)) continue;
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
