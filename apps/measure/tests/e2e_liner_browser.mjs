/**
 * Browser e2e for the liner wizard.
 *
 * The other suites test the liner math directly; this one is the only thing
 * that proves the screens are wired to it — that the product switch reshapes
 * the wizard, that the closure panel is genuinely live, and that a blocked
 * order disables its own export button.
 *
 * Run with:
 *   ./dev.sh                                   # backend :8000, vite :5173
 *   node tests/e2e_liner_browser.mjs
 *
 * Env:
 *   APP_BASE   default http://127.0.0.1:5173   (vite, proxies /api)
 *   API_BASE   default http://127.0.0.1:8000   (backend, for fixture setup)
 *   CHROME     path to a Chromium binary
 */
import { chromium } from 'playwright-core';

const APP = process.env.APP_BASE || 'http://127.0.0.1:5173';
const API = process.env.API_BASE || 'http://127.0.0.1:8000';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let pass = 0, fail = 0;
const fails = [];
const ok = (c, m) => { if (c) { pass++; } else { fail++; fails.push(m); } };

/**
 * Type into a field the way a person does.
 *
 * Playwright's fill() and keyboard.type() do not drive Svelte's `bind:value`
 * on these number inputs — the value reverts on the next flush. Going through
 * the native value setter and dispatching a bubbling InputEvent is what a real
 * keystroke does, and it is the only way this component actually updates.
 */
async function typeInto(page, selector, value, nth = 0) {
  await page.evaluate(({ selector, value, nth }) => {
    const el = document.querySelectorAll(selector)[nth];
    if (!el) throw new Error(`no element for ${selector}[${nth}]`);
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value',
    ).set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, { selector, value, nth });
}

async function apiJSON(path, opts) {
  const r = await fetch(API + path, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
  return r.json();
}

async function createLinerJob() {
  const fixture = await apiJSON('/api/fixtures/rectangular-liner');
  delete fixture.id;
  delete fixture.created_at;
  delete fixture.updated_at;
  return apiJSON('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fixture),
  });
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

const text = () => page.locator('body').innerText();

try {
  // ---------- 1. A new job is a cover job ----------
  await page.goto(`${APP}/new`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${APP}/new`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Ordering', { timeout: 20000 });

  ok(await page.locator('button:has-text("Liner")').first().isVisible(),
    '1: the product selector renders on the customer step');
  ok(/Step\s+1\s+of\s+8/.test(await text()),
    '1: a new job starts as an 8-step cover job');

  // ---------- 2. Switching product reshapes the wizard ----------
  await page.locator('button:has-text("Liner")').first().click();
  await page.waitForTimeout(400);
  ok(/Step\s+1\s+of\s+12/.test(await text()), '2: liner -> 12 steps');

  await page.locator('button:has-text("Both")').first().click();
  await page.waitForTimeout(400);
  ok(/Step\s+1\s+of\s+14/.test(await text()), '2: both -> 14 steps');

  // ---------- 3. A saved liner job reopens as a liner job ----------
  const job = await createLinerJob();
  ok(job.product_type === 'liner', '3: the fixture round-trips as a liner job');

  await page.goto(`${APP}/jobs/${job.id}/edit`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  ok(/of\s+12/.test(await text()), '3: reopening it shows the 12-step liner wizard');
  ok((await page.locator('input').first().inputValue()).includes('Liner Test'),
    '3: and its saved data, not an empty form');

  // ---------- 4. The floor profile screen ----------
  await page.locator('button[title="Floor profile"]').click();
  await page.waitForTimeout(800);
  let body = await text();
  ok(/developed/i.test(body), '4: shows the developed (slant) length');
  ok(/CLOSES/.test(body), '4: the fixture profile closes');
  ok(/32' 0"/.test(body), '4: on the reconstructed 32ft length');

  // ---------- 5. The closure check is live ----------
  // Shorten the shallow run from 12ft to 9ft: 29ft against a 32ft pool.
  await typeInto(page, 'input[type="number"]', 9);
  await page.waitForTimeout(900);
  body = await text();
  ok(/BLOCKED/.test(body), '5: shortening a run flips the closure to blocked as you type');
  ok(/Re-tape the floor section/.test(body), '5: and says what to do about it');
  ok(/29' 0"/.test(body), '5: the running total updates live');

  // Put it back.
  await typeInto(page, 'input[type="number"]', 12);
  await page.waitForTimeout(900);
  ok(/CLOSES/.test(await text()), '5: restoring the run closes it again');

  // ---------- 6. Deleting a run is caught too ----------
  await page.locator('button:has-text("Delete")').nth(2).click();
  await page.waitForTimeout(900);
  body = await text();
  ok(/BLOCKED/.test(body), '6: deleting the hopper run blocks the order');
  ok(/24' 0"/.test(body), '6: total drops to 24ft');
  ok(/hopper cross-section/.test(body), '6: and the orphaned hopper is called out');

  // ---------- 7. A blocked order cannot be exported ----------
  await page.locator('button[title="Review"]').click();
  await page.waitForTimeout(2500);
  body = await text();
  ok(/Liner order blocked/.test(body), '7: review reports the order as blocked');
  const exportState = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const el = links.find(a => a.textContent.includes('Liner order PDF'));
    return el
      ? { present: true, cls: el.className, disabled: el.getAttribute('aria-disabled') }
      : { present: false };
  });
  ok(exportState.present, '7: the liner export button is present');
  ok(/pointer-events-none/.test(exportState.cls || '') || exportState.disabled === 'true',
    '7: and is disabled while the order is blocked');

  // ---------- 8. No uncaught page errors ----------
  const real = pageErrors.filter(e => !/favicon|WebGL|THREE\.WebGL/i.test(e));
  ok(real.length === 0, `8: no page errors (${real.slice(0, 2).join(' | ') || 'none'})`);
} finally {
  await browser.close();
}

console.log(`\nLiner browser e2e: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log(`  FAIL: ${f}`);
  process.exit(1);
}
