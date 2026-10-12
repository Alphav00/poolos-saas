#!/usr/bin/env node
// User journeys against a real local Worker (docs/TESTING.md, "Run the user journeys").
//
// 1. builds the web app (BRAND, default ccs-pools)
// 2. writes a local Access key to apps/api/.dev.vars (dev-auth.mjs)
// 3. applies the D1 migrations to a fresh local database
// 4. starts `wrangler dev --local` on 127.0.0.1:8787
// 5. drives Chromium at phone size, one signed-in persona per journey
// 6. writes e2e-output/report.md and a screenshot per step
//
// Nothing leaves the machine: local key, local D1, local R2.
//
// Usage: pnpm e2e [journey-id ...]
// Env:   BRAND, E2E_PORT (8787), E2E_SKIP_BUILD=1, CHROMIUM_PATH, E2E_HEADED=1
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { OWNER, removeDevAuth, ROOT, setupDevAuth, tokenFor } from './dev-auth.mjs';

const BRAND = process.env.BRAND || 'ccs-pools';
const PORT = Number(process.env.E2E_PORT || 8787);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, 'e2e-output');
const API = join(ROOT, 'apps', 'api');
// Its own local state, wiped each run, so journeys start from an empty database.
const STATE = join(API, '.wrangler', 'e2e-state');
const only = process.argv.slice(2);
// No prompts or telemetry from wrangler.
const childEnv = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1' };

const log = (msg) => console.log(`[e2e] ${msg}`);

function sh(cmd, args, opts = {}) {
  log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: childEnv, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status ?? r.signal}`);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium';
  return undefined; // playwright-core's own install (`pnpm exec playwright-core install chromium`)
}

let wrangler = null;
function stopWrangler() {
  if (!wrangler || wrangler.exitCode !== null || wrangler.signalCode !== null) return;
  // Detached, so the whole group (pnpm → wrangler → workerd) goes.
  try { process.kill(-wrangler.pid, 'SIGTERM'); } catch { /* already gone */ }
}
// .dev.vars would also change what the API tests see, so it goes too.
process.on('exit', () => { stopWrangler(); removeDevAuth(); });
for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.on(sig, () => process.exit(code));

async function waitForHealth(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (wrangler.exitCode !== null || wrangler.signalCode !== null) throw new Error(`wrangler dev exited with ${wrangler.exitCode ?? wrangler.signalCode}; see e2e-output/wrangler.log`);
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${BASE}/api/health did not answer within ${ms / 1000}s; see e2e-output/wrangler.log`);
}

// The Worker still refuses a request without a token, and reads the local one.
async function checkSignIn() {
  const anon = await fetch(`${BASE}/api/me`);
  if (anon.status !== 401) throw new Error(`/api/me without a token answered ${anon.status}, expected 401`);
  const me = await fetch(`${BASE}/api/me`, { headers: { 'Cf-Access-Jwt-Assertion': await tokenFor(OWNER) } });
  const body = me.ok ? await me.json() : null;
  if (!body?.isOwner) throw new Error(`/api/me with the local owner token answered ${me.status} ${JSON.stringify(body)}`);
  log(`sign-in checked: no token → 401, ${OWNER} → owner`);
}

// COMPANY_LOCK (wrangler.jsonc) lets only staff into a company, so the tech
// persona goes on the default company's staff list first, as an owner would.
async function seedStaff() {
  const res = await fetch(`${BASE}/api/boards/field/staff/e2e-tech`, {
    method: 'PUT',
    headers: { 'Cf-Access-Jwt-Assertion': await tokenFor(OWNER), 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { name: 'Tess Tech', email: 'tech@example.test', role: 'Technician', route: 'Route A', demo: true } }),
  });
  if (!res.ok) throw new Error(`adding tech@example.test to staff answered ${res.status} ${await res.text()}`);
  log('staff seeded: tech@example.test, Technician');
}

async function loadJourneys() {
  const dir = join(ROOT, 'scripts', 'e2e', 'journeys');
  const mods = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
    const j = (await import(pathToFileURL(join(dir, f)).href)).default;
    if (!j?.id || !j.persona?.email || typeof j.run !== 'function') throw new Error(`${f}: export default { id, persona: { email, label }, run(page, step) }`);
    if (only.length && !only.includes(j.id)) continue;
    mods.push(j);
  }
  // Lower `order` first (owner journeys load the data the others read).
  return mods.sort((a, b) => (a.order ?? 50) - (b.order ?? 50) || a.id.localeCompare(b.id));
}

async function runJourney(browser, journey, brand) {
  const dir = join(OUT, journey.id);
  mkdirSync(dir, { recursive: true });
  const result = { id: journey.id, persona: journey.persona, steps: [], problems: [], error: null };
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  // The Access token, as Cloudflare would add it, on requests to the local
  // Worker only (extraHTTPHeaders would also send it to the font CDN, which
  // then fails CORS).
  const jwt = await tokenFor(journey.persona.email);
  await context.route(`${BASE}/**`, (route) => route.continue({ headers: { ...route.request().headers(), 'cf-access-jwt-assertion': jwt } }));
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on('console', (m) => { if (m.type() === 'error') result.problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => result.problems.push(`pageerror: ${e.message}`));
  // Some 4xx are by design (e.g. a made-up salt cell); listed so a reader can tell.
  page.on('response', (r) => { if (r.status() >= 400) result.problems.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`); });

  let n = 0;
  async function step(name, fn) {
    n += 1;
    const shot = join(dir, `${String(n).padStart(2, '0')}-${slug(name)}.png`);
    const started = Date.now();
    let error = null;
    try {
      await fn();
    } catch (e) {
      error = e instanceof Error ? e.message.split('\n')[0] : String(e);
    }
    try {
      await page.screenshot({ path: shot, fullPage: true });
    } catch { /* page gone; the step result still counts */ }
    result.steps.push({ name, ok: !error, error, ms: Date.now() - started, shot: relative(OUT, shot) });
    log(`${journey.id} ${n}. ${error ? 'FAIL' : 'ok  '} ${name}${error ? ` — ${error}` : ''}`);
    // Later steps build on this one, so stop the journey here.
    if (error) throw Object.assign(new Error(error), { stepFailed: true });
  }

  try {
    await journey.run(page, step, { baseURL: BASE, brand });
  } catch (e) {
    if (!e?.stepFailed) result.error = e instanceof Error ? e.message : String(e);
  } finally {
    await context.close();
  }
  return result;
}

function report(results, setupError) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = ['# User journeys', '', `Run ${new Date().toISOString()} against a local Worker (${BASE}), brand \`${BRAND}\`, 390×844 @2x.`, ''];
  if (setupError) lines.push(`**Setup failed:** ${esc(setupError)}`, '');
  for (const r of results) {
    const failed = r.steps.some((s) => !s.ok) || r.error;
    lines.push(`## ${r.id} — ${failed ? 'FAIL' : 'pass'}`, '', `Persona: ${r.persona.label} (\`${r.persona.email}\`)`, '');
    lines.push('| # | Step | Result | Time | Screenshot |', '|---|---|---|---|---|');
    r.steps.forEach((s, i) => lines.push(`| ${i + 1} | ${esc(s.name)} | ${s.ok ? 'pass' : `**FAIL**: ${esc(s.error)}`} | ${(s.ms / 1000).toFixed(1)}s | [${s.shot}](${s.shot}) |`));
    if (r.error) lines.push('', `Journey error outside a step: ${esc(r.error)}`);
    lines.push('', r.problems.length ? '**Console errors and HTTP errors:**' : 'No console or HTTP errors.', '');
    for (const p of r.problems) lines.push(`- ${esc(p)}`);
    lines.push('');
  }
  writeFileSync(join(OUT, 'report.md'), lines.join('\n'));
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const results = [];
  let setupError = null;
  let browser = null;
  try {
    if (process.env.E2E_SKIP_BUILD !== '1') sh('pnpm', ['build'], { cwd: ROOT, env: { ...childEnv, BRAND } });
    const brand = JSON.parse(readFileSync(join(ROOT, 'brands', BRAND, 'brand.json'), 'utf8'));
    // `pnpm test` rebuilds with the default brand, so a reused build may not be this one.
    const built = readFileSync(join(ROOT, 'apps', 'web', 'dist', 'index.html'), 'utf8').toLowerCase();
    if (!built.includes(`--brand-primary:${brand.colors.primary.toLowerCase()}`)) {
      throw new Error(`apps/web/dist was not built with BRAND=${BRAND}; run without E2E_SKIP_BUILD`);
    }
    await setupDevAuth();
    rmSync(STATE, { recursive: true, force: true });
    sh('pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'poolos', '--local', '--persist-to', STATE], { cwd: API });

    log(`starting wrangler dev on ${BASE} (output in e2e-output/wrangler.log)`);
    const wlog = createWriteStream(join(OUT, 'wrangler.log'));
    wrangler = spawn('pnpm', ['exec', 'wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', String(PORT), '--persist-to', STATE, '--show-interactive-dev-session=false'], {
      cwd: API, env: childEnv, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    wrangler.stdout.pipe(wlog);
    wrangler.stderr.pipe(wlog);
    await waitForHealth(120_000);
    log('worker is up');
    await checkSignIn();
    await seedStaff();

    browser = await chromium.launch({ executablePath: chromiumPath(), headless: process.env.E2E_HEADED !== '1' });
    const journeys = await loadJourneys();
    if (!journeys.length) throw new Error(`No journeys match ${only.join(', ')}`);
    for (const j of journeys) results.push(await runJourney(browser, j, brand));
  } catch (e) {
    setupError = e instanceof Error ? e.message : String(e);
    log(`setup failed: ${setupError}`);
  } finally {
    await browser?.close();
    stopWrangler();
  }
  report(results, setupError);
  const failed = setupError || results.some((r) => r.error || r.steps.some((s) => !s.ok));
  const steps = results.flatMap((r) => r.steps);
  log(`${steps.filter((s) => s.ok).length}/${steps.length} steps passed. Report: e2e-output/report.md`);
  process.exit(failed ? 1 : 0);
}

await main();
