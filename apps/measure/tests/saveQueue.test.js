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
  // Wait for the debounced save to actually start rather than sleeping a
  // fixed time: on a busy machine the 10 ms timer can fire after 30 ms, so
  // run() would start the first save and the late timer would add a third.
  let started;
  const inFlight = new Promise((resolve) => (started = resolve));
  const q = new SaveQueue({
    save: async () => {
      saveCount++;
      started();
      await sleep(20);  // simulate slow save
    },
    debounceMs: 10,
  });

  q.schedule();
  await inFlight;  // save is in flight
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

// ---------- 10. permanent errors are fatal at once, not retried ----------

async function test10() {
  let saveCount = 0;
  const errors = [];
  const q = new SaveQueue({
    save: async () => {
      saveCount++;
      const e = new Error('rejected');
      e.status = 422;
      throw e;
    },
    debounceMs: 10,
    retryBaseMs: 10,
    isPermanent: (e) => e.status === 422,
  });
  q.on('error', (e) => errors.push(e));
  q.schedule();
  await sleep(120);
  assertEq(saveCount, 1, 'test10: a 422 is sent once');
  assertEq(errors.length, 1, 'test10: one error event');
  assert(errors[0]?.fatal === true && errors[0]?.permanent === true, 'test10: error is fatal and permanent');
  // The next edit tries again.
  q.schedule();
  await sleep(40);
  assertEq(saveCount, 2, 'test10: next edit sends again');
}

// ---------- 11. saved carries what save() returned ----------

async function test11() {
  let got;
  const q = new SaveQueue({ save: async () => 'local', debounceMs: 10 });
  q.on('saved', (e) => { got = e.result; });
  q.schedule();
  await sleep(40);
  assertEq(got, 'local', 'test11: saved event carries the result');
}

// ---------- 12. idle() waits out the save in flight and its follow-up ----------

async function test12() {
  let saveCount = 0;
  const q = new SaveQueue({ save: async () => { saveCount++; await sleep(30); }, debounceMs: 10 });
  let idle = false;
  await q.idle();
  q.flush();
  q.flush();  // coalesced into a follow-up save
  const waited = q.idle().then(() => { idle = true; });
  await sleep(40);
  assertEq(idle, false, 'test12: still busy during the follow-up');
  await waited;
  assertEq(saveCount, 2, 'test12: both saves ran before idle');
  assertEq(q.status.scheduled, false, 'test12: nothing scheduled');
  q.schedule();
  assertEq(q.status.scheduled, true, 'test12: scheduled shows a pending save');
  q.cancel();
}

// ---------- run all ----------

(async () => {
  const tests = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10, test11, test12];
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
