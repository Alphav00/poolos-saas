#!/usr/bin/env node
// Proves the fixture lint fails on a planted denylisted string and passes
// on a clean tree. Runs in a throwaway folder; the repo is not touched.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const lint = join(import.meta.dirname, 'fixture-lint.mjs');
const dir = mkdtempSync(join(tmpdir(), 'fixture-lint-'));
const run = () => {
  try {
    execFileSync(process.execPath, [lint, dir], { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status;
  }
};
try {
  mkdirSync(join(dir, 'tests'));
  cpSync(join(import.meta.dirname, '..', 'tests', 'denylist.txt'), join(dir, 'tests', 'denylist.txt'));
  mkdirSync(join(dir, 'apps', 'x', 'test', 'fixtures'), { recursive: true });
  writeFileSync(join(dir, 'apps', 'x', 'test', 'fixtures', 'pool.json'), '{"customer": "Test Customer One"}\n');
  if (run() !== 0) throw new Error('clean fixture was rejected');
  writeFileSync(join(dir, 'apps', 'x', 'test', 'fixtures', 'pool.json'), '{"customer": "ccs pools"}\n');
  if (run() !== 1) throw new Error('planted denylisted string was NOT caught');
  writeFileSync(join(dir, 'apps', 'x', 'test', 'fixtures', 'pool.json'), '{"customer": "Test Customer One"}\n');

  // Data files outside test folders: caught by name or by living in scripts/e2e/.
  const planted = '{"customer": "ccs pools"}\n';
  const caught = [
    ['packages', 'm', 'src', 'fixtures.json'],
    ['apps', 'w', 'src', 'lib', 'field', 'demo.ts'],
    ['apps', 'w', 'src', 'lib', 'field', 'sample.ts'],
    ['apps', 'w', 'src', 'lib', 'field', 'generator.ts'],
    ['apps', 'm', 'src', 'routes', 'FixturesLoader.svelte'],
    ['scripts', 'e2e', 'journeys', 'owner-day.mjs'],
  ];
  for (const parts of caught) {
    mkdirSync(join(dir, ...parts.slice(0, -1)), { recursive: true });
    writeFileSync(join(dir, ...parts), planted);
    if (run() !== 1) throw new Error(`planted string in ${parts.join('/')} was NOT caught`);
    rmSync(join(dir, ...parts));
  }
  // Brand packs and docs may name the company; ordinary source is not a fixture.
  const allowed = [
    ['brands', 'ccs', 'brand.json'],
    ['brands', 'ccs', 'demo.json'],
    ['docs', 'sample.md'],
    ['apps', 'w', 'src', 'lib', 'field', 'route.ts'],
  ];
  for (const parts of allowed) {
    mkdirSync(join(dir, ...parts.slice(0, -1)), { recursive: true });
    writeFileSync(join(dir, ...parts), planted);
  }
  if (run() !== 0) throw new Error('brands/, docs/ or plain source was linted');
  console.log('fixture-lint self-test: OK (clean passes, planted strings fail, brands/docs skipped)');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
