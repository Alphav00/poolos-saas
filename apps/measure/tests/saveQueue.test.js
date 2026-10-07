/**
 * Unit tests for the SaveQueue. Plain node, no Svelte, no DOM.
 *
 * Run with: node tests/saveQueue.test.js
 * (or with vitest: npm install -D vitest && npx vitest run)
 */
import { SaveQueue } from '../src/lib/stores/saveQueue.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
  }
}

function assertEq(a, b, msg) {
  assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------- 1. debounce coalesces rapid edits ----------

async function test1() {
  const events = [];
  let saveCount = 0;
  const q = new SaveQueue({
    save: async () => { saveCount++; },
    debounceMs: 50,
  });
  q.on('dirty', () => events.push('dirty'));
  q.on('saving', () => events.push('saving'));
  q.on('saved', () => events.push('saved'));

  // 5 rapid schedules within the debounce window
  for (let i = 0; i < 5; i++) {
    q.schedule();
    await sleep(10);
  }
  // Wait for the debounce to fire + save to complete
  await sleep(100);

  assertEq(saveCount, 1, 'test1: rapid edits coalesce to one save');
  assert(events.includes('dirty'), 'test1: dirty event emitted');
  assert(events.includes('saved'), 'test1: saved event emitted');
}

// ---------- 2. successful save emits correct events ----------

async function test2() {
  const events = [];
  const q = new SaveQueue({
    save: async () => { /* no-op */ },
    debounceMs: 10,
  });
  q.on('saving', () => events.push('saving'));
  q.on('saved', () => events.push('saved'));

  q.schedule();
  await sleep(50);

  assertEq(events.length, 2, 'test2: saving + saved');
  assertEq(events[0], 'saving', 'test2: saving first');
  assertEq(events[1], 'saved', 'test2: saved second');
}

// ---------- 3. retry on error ----------

async function test3() {
  let attempt = 0;
  const events = [];
  const q = new SaveQueue({
    save: async () => {
      attempt++;
      if (attempt < 3) throw new Error('boom');
    },
    debounceMs: 10,
    retryBaseMs: 20,
    retryCapMs: 100,
  });
  q.on('error', (e) => events.push({ fatal: e.fatal, retryInMs: e.retryInMs }));

  q.schedule();
  await sleep(300);  // plenty of time for 2 retries

  assertEq(attempt, 3, 'test3: save attempted 3 times');
  assertEq(events.length, 2, 'test3: 2 error events (both non-fatal)');
  assertEq(events[0].fatal, false, 'test3: first error not fatal');
  assertEq(events[1].fatal, false, 'test3: second error not fatal');
}

// ---------- 4. fatal after maxRetries ----------

async function test4() {
  let attempt = 0;
  const events = [];
  const q = new SaveQueue({
    save: async () => { attempt++; throw new Error('always fails'); },
    debounceMs: 10,
    maxRetries: 2,
    retryBaseMs: 10,
    retryCapMs: 50,
  });
  q.on('error', (e) => events.push({ fatal: e.fatal }));

  q.schedule();
  await sleep(300);

  assertEq(attempt, 3, 'test4: 1 initial + 2 retries');
  assertEq(events.length, 3, 'test4: 3 error events');
  assertEq(events[0].fatal, false, 'test4: first non-fatal');
  assertEq(events[1].fatal, false, 'test4: second non-fatal');
  assertEq(events[2].fatal, true, 'test4: third is fatal');
}

// ---------- 5. fresh schedule during retry cancels the retry ----------

async function test5() {
  let attempt = 0;
  const q = new SaveQueue({
    save: async () => {
      attempt++;
      if (attempt === 1) throw new Error('first fails');
    },
    debounceMs: 10,
    retryBaseMs: 100,
  });

  q.schedule();
  await sleep(50);  // first attempt fails, retry scheduled at +100ms
  // User edits again before the retry fires
  q.schedule();
  await sleep(200);  // wait long enough for retry to have fired if not canceled

  assertEq(attempt, 2, 'test5: 1 initial + 1 successful retry (not 2)');
}

// ---------- 6. flush() bypasses debounce ----------

async function test6() {
  let saved = false;
  const q = new SaveQueue({
    save: async () => { saved = true; },
    debounceMs: 10000,  // very long
  });

  q.schedule();
  await sleep(20);
  assert(!saved, 'test6: not saved yet during long debounce');
  await q.flush();
  assert(saved, 'test6: flush() forces immediate save');
}

// ---------- 7. cancel() prevents a pending debounce ----------

async function test7() {
  let saveCount = 0;
  const q = new SaveQueue({
    save: async () => { saveCount++; },
    debounceMs: 50,
  });

  q.schedule();
  q.cancel();
  await sleep(100);
  assertEq(saveCount, 0, 'test7: cancel prevents save');
}

// ---------- 8. concurrent run() calls coalesce ----------

async function test8() {
  let saveCount = 0;
  const q = new SaveQueue({
    save: async () => {
      saveCount++;
      await sleep(20);  // simulate slow save
    },
    debounceMs: 10,
  });

  q.schedule();
  await sleep(30);  // save is in flight
  // Try to trigger another save while in flight
  q.run();
  q.run();
  q.run();
  await sleep(100);

  // First save runs, then 1 follow-up save because of needResave
  assert(saveCount >= 1 && saveCount <= 2, `test8: coalesced to 1-2 saves, got ${saveCount}`);
}

// ---------- 9. status() reflects state ----------

async function test9() {
  const q = new SaveQueue({
    save: async () => { await sleep(20); throw new Error('fail'); },
    debounceMs: 10,
    retryBaseMs: 10,
  });

  q.schedule();
  await sleep(40);
  // After 1 failed attempt, status should reflect inFlight or recent error
  const s = q.status;
  assert(s.retries >= 1, `test9: retries recorded, got ${s.retries}`);
  assert(s.lastError instanceof Error, 'test9: last error stored');
}

// ---------- run all ----------

(async () => {
  const tests = [test1, test2, test3, test4, test5, test6, test7, test8, test9];
  for (const t of tests) {
    try {
      await t();
    } catch (e) {
      failed++;
      failures.push(`${t.name}: threw ${e.message}`);
    }
  }
  console.log(`\nSaveQueue tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
})();
