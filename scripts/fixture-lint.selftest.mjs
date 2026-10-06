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
  console.log('fixture-lint self-test: OK (clean passes, planted string fails)');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
