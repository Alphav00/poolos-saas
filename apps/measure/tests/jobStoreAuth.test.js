/**
 * Tests for how the job store treats a refused save: 401/403 mean "sign in
 * again" and are retried, other 4xx answers are final, and a Retry after
 * signing in sends the same edit and clears the error. Plain node with a
 * stubbed localStorage, cookie, window and fetch.
 *
 * Run with: node tests/jobStoreAuth.test.js
 */
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- stubs ----------
const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => { ls.set(k, String(v)); },
  removeItem: (k) => { ls.delete(k); },
};
// Page-leave listeners by event name, on window and document alike.
let leave = {};
const on = (ev, fn) => { (leave[ev] ||= []).push(fn); };
const off = (ev, fn) => { leave[ev] = (leave[ev] || []).filter((f) => f !== fn); };
const fire = (ev) => (leave[ev] || []).forEach((fn) => fn({ type: ev }));
const listenerCount = () => Object.values(leave).reduce((n, fns) => n + fns.length, 0);
globalThis.document = { cookie: '', visibilityState: 'visible', addEventListener: on, removeEventListener: off };
globalThis.window = {
  location: { pathname: '/measure/new' },
  addEventListener: on,
  removeEventListener: off,
};

let calls = [];
let respond = async () => new Response('{}', { status: 500 });
globalThis.fetch = async (url, opts = {}) => {
  const call = { url: String(url), method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null, opts };
  calls.push(call);
  return respond(call);
};
const jsonRes = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const mine = (id) => calls.filter((c) => c.url.endsWith(`/${id}`));
const { createJobStore } = await import('../src/lib/stores/jobStore.js');
const { get } = await import('svelte/store');

function reset() {
  ls.clear();
  calls = [];
  leave = {};
  globalThis.document.cookie = '';
  globalThis.document.visibilityState = 'visible';
  respond = async () => new Response('{}', { status: 500 });
}


// ---------- 1. 401 and 403 both say to sign in, and both are retried ----------
for (const status of [401, 403]) {
  reset();
  respond = async () => jsonRes({ detail: 'no' }, status);
  const store = createJobStore({ initialId: `job-${status}`, fetchFromServer: false });
  get(store).job.notes = 'edit';
  store.markDirty();
  await sleep(700);
  eq(mine(`job-${status}`).length, 1, `1/${status}: sent once so far`);
  eq(get(store).status, 'error', `1/${status}: an error to retry, not a refusal`);
  ok(/sign in again/i.test(get(store).error || ''), `1/${status}: says to sign in`);
  ok(get(store).retryInMs > 0, `1/${status}: a retry is scheduled`);
  store.destroy();
  await sleep(20);
}

// ---------- 2. the retry timer sends the same edit again ----------
{
  reset();
  respond = async () => jsonRes({ detail: 'no' }, 403);
  const store = createJobStore({ initialId: 'job-timer', fetchFromServer: false });
  get(store).job.notes = 'timed';
  store.markDirty();
  await sleep(1800);
  const sent = mine('job-timer');
  ok(sent.length >= 2, `2: the retry timer fired, got ${sent.length} calls`);
  eq(sent[0].body.notes, sent[1]?.body.notes, '2: the same edit again');
  store.destroy();
  await sleep(20);
}

// ---------- 3. signing in and pressing Retry saves the edit and clears the error ----------
{
  reset();
  respond = async () => jsonRes({ detail: 'no' }, 401);
  const store = createJobStore({ initialId: 'job-signin', fetchFromServer: false });
  get(store).job.notes = 'kept through sign-in';
  store.markDirty();
  await sleep(700);
  eq(get(store).status, 'error', '3: signed out');
  const before = mine('job-signin').length;
  respond = async (c) => jsonRes({ ...c.body, id: 'job-signin', updated_at: '2026-10-27T12:00:00Z' });
  await store.saveNow();
  const after = mine('job-signin');
  eq(after.length, before + 1, '3: Retry sent once');
  eq(after[after.length - 1].method, 'PUT', '3: to the same job');
  eq(after[after.length - 1].body.notes, 'kept through sign-in', '3: with the edit');
  eq(get(store).status, 'saved', '3: saved');
  eq(get(store).error, null, '3: error cleared');
  eq(get(store).retryInMs, null, '3: no retry pending');
  store.destroy();
  await sleep(20);
}

// ---------- 4. which answers are final and which are retried ----------
for (const [status, final] of [[400, true], [404, true], [409, true], [413, true], [422, true], [401, false], [403, false], [500, false], [502, false]]) {
  reset();
  respond = async () => jsonRes({ detail: 'x' }, status);
  const store = createJobStore({ initialId: `job-${status}`, fetchFromServer: false });
  get(store).job.notes = 'edit';
  store.markDirty();
  await store.saveNow();
  eq(get(store).status, final ? 'rejected' : 'error', `4/${status}: ${final ? 'final' : 'retried'}`);
  eq(get(store).retryInMs != null && get(store).retryInMs > 0, !final, `4/${status}: retry ${final ? 'not ' : ''}scheduled`);
  store.destroy();
  await sleep(20);
}

// ---------- 5. a store the user has left sends nothing more ----------
// Leaving the editor while a failed save waits to retry must not leave a
// background loop sending that old snapshot later, over whatever a newer
// editor saved in the meantime.
{
  reset();
  respond = async () => jsonRes({ detail: 'no' }, 401);
  const store = createJobStore({ initialId: 'job-left', fetchFromServer: false });
  get(store).job.notes = 'old snapshot';
  store.markDirty();
  await sleep(700);
  eq(mine('job-left').length, 1, '5: one failed send, retry waiting');
  store.destroy();
  await sleep(100);
  const settled = mine('job-left').length;
  await sleep(2500);
  eq(mine('job-left').length, settled, '5: nothing sent after leaving (retry timer must be cleared)');
}

console.log(`jobStore auth: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log('  FAIL', f);
  process.exit(1);
}
