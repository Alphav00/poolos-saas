/**
 * Tests for the job store: per-job drafts, what is sent, and what a save's
 * answer may overwrite. Plain node with a stubbed localStorage, cookie,
 * window and fetch.
 *
 * Run with: node tests/jobStore.test.js
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
globalThis.document = { cookie: '' };
let unloadHandlers = [];
globalThis.window = {
  location: { pathname: '/measure/new' },
  addEventListener: (ev, fn) => { if (ev === 'beforeunload') unloadHandlers.push(fn); },
  removeEventListener: (ev, fn) => { unloadHandlers = unloadHandlers.filter((f) => f !== fn); },
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

const { createJobStore, emptyJob, draftKey } = await import('../src/lib/stores/jobStore.js');
const { get } = await import('svelte/store');

function reset() {
  ls.clear();
  calls = [];
  unloadHandlers = [];
  globalThis.document.cookie = '';
  respond = async () => new Response('{}', { status: 500 });
}
const pts = (n) => Array.from({ length: n }, (_, i) => ({ number: i + 1, a_distance_ft: 12, b_distance_ft: 14 }));

// ---------- 1. emptyJob names no dealer ----------
{
  eq(emptyJob().meta.dealer_name, '', '1: dealer starts blank');
}

// ---------- 2. /new never reopens a saved job ----------
{
  reset();
  ls.set('pool-cover-current-job', JSON.stringify({ id: 'saved-1', job: { ...emptyJob(), notes: 'old' } }));
  ls.set(draftKey('', 'saved-1'), JSON.stringify({ id: 'saved-1', job: { ...emptyJob(), notes: 'old' }, unsynced: false }));
  const store = createJobStore({ fetchFromServer: false });
  const s = get(store);
  eq(s.id, null, '2: no id on /new');
  eq(s.job.notes, '', '2: starts from an empty job');
  ok(!ls.has('pool-cover-current-job'), '2: legacy key removed');
  store.destroy();
}

// ---------- 3. /new recovers an unsaved new draft, for this company only ----------
{
  reset();
  globalThis.document.cookie = 'other=1; poolos_company=sample-co';
  ls.set(draftKey('sample-co', null), JSON.stringify({ id: null, job: { ...emptyJob(), notes: 'half done' }, unsynced: true }));
  const mine = createJobStore({ fetchFromServer: false });
  eq(get(mine).job.notes, 'half done', '3: own company draft recovered');
  mine.destroy();
  globalThis.document.cookie = 'poolos_company=another-co';
  const theirs = createJobStore({ fetchFromServer: false });
  eq(get(theirs).job.notes, '', '3: another company sees nothing');
  theirs.destroy();
}

// ---------- 4. edit route only takes a draft with its own id ----------
{
  reset();
  ls.set(draftKey('', 'job-a'), JSON.stringify({ id: 'job-b', job: { ...emptyJob(), notes: 'wrong job' }, unsynced: true }));
  const store = createJobStore({ initialId: 'job-a', fetchFromServer: false });
  eq(get(store).job.notes, '', '4: mismatched id ignored');
  store.destroy();
}

// ---------- 5. edits go to localStorage; a short job is not POSTed ----------
{
  reset();
  const store = createJobStore({ fetchFromServer: false });
  const s = get(store);
  s.job.meta.customer_name = 'Sample Customer';
  s.job.measurement.perimeter_points = pts(2);
  store.markDirty();
  await sleep(700);
  const saved = JSON.parse(ls.get(draftKey('', null)) || 'null');
  eq(saved?.job?.meta?.customer_name, 'Sample Customer', '5: draft on the phone');
  eq(calls.length, 0, '5: nothing sent before four points');
  eq(get(store).status, 'local', '5: status says phone only');
  store.destroy();
}

// ---------- 6. four points: POST without incomplete rows; draft keeps them ----------
{
  reset();
  respond = async (c) => jsonRes({ ...c.body, id: 'new-1', created_at: 't0', updated_at: 't0' });
  const store = createJobStore({ fetchFromServer: false });
  const s = get(store);
  s.job.measurement.perimeter_points = pts(4);
  s.job.measurement.cross_dimensions = [{ from_point: 1, to_point: null, distance_ft: 20 }];
  store.markDirty();
  await sleep(700);
  eq(calls.map((c) => c.method), ['POST'], '6: one create');
  eq(calls[0].body.measurement.cross_dimensions, [], '6: incomplete row not sent');
  eq(get(store).id, 'new-1', '6: id adopted');
  eq(get(store).job.measurement.cross_dimensions.length, 1, '6: draft keeps the row');
  ok(!ls.has(draftKey('', null)), '6: new draft moved');
  ok(ls.has(draftKey('', 'new-1')), '6: draft under its id');
  store.destroy();
}

// ---------- 7. an answer does not wipe edits typed while it was out ----------
{
  reset();
  let release;
  respond = async (c) => {
    if (c.method !== 'PUT') return jsonRes({}, 500);
    const body = c.body;
    if (calls.filter((x) => x.method === 'PUT').length === 1) await new Promise((r) => { release = r; });
    return jsonRes({ ...body, id: 'job-1', created_at: 't0', updated_at: `t${calls.length}` });
  };
  const store = createJobStore({ initialId: 'job-1', fetchFromServer: false });
  const s = get(store);
  s.job.meta.customer_name = 'First';
  store.markDirty();
  await sleep(600);  // first PUT is out
  get(store).job.meta.customer_name = 'Second';
  store.markDirty();
  release();
  await sleep(50);
  eq(get(store).job.meta.customer_name, 'Second', '7: edit survives the answer');
  eq(get(store).job.updated_at, 't1', '7: server field adopted');
  const draft = JSON.parse(ls.get(draftKey('', 'job-1')));
  eq(draft.unsynced, true, '7: draft still unsynced');
  await sleep(700);
  const puts = calls.filter((c) => c.method === 'PUT');
  eq(puts.length, 2, '7: a follow-up save');
  eq(puts[1].body.meta.customer_name, 'Second', '7: follow-up sends the latest');
  eq(JSON.parse(ls.get(draftKey('', 'job-1'))).unsynced, false, '7: synced after');
  store.destroy();
}

// ---------- 8. a 422 is not retried ----------
{
  reset();
  respond = async () => jsonRes({ detail: [{ loc: ['body', 'meta'], msg: 'Field required' }] }, 422);
  const store = createJobStore({ initialId: 'job-2', fetchFromServer: false });
  store.markDirty();
  await sleep(2000);
  eq(calls.length, 1, '8: sent once');
  eq(get(store).status, 'rejected', '8: status rejected');
  eq(get(store).error, 'body.meta: Field required', '8: readable error');
  store.destroy();
}

// ---------- 9. unload sends a keepalive PUT, not a beacon POST ----------
{
  reset();
  respond = async () => jsonRes({});
  const store = createJobStore({ initialId: 'job-3', fetchFromServer: false });
  get(store).job.notes = 'last words';
  store.markDirty();
  unloadHandlers.forEach((fn) => fn());
  eq(calls.length, 1, '9: one request');
  eq(calls[0].method, 'PUT', '9: PUT');
  eq(calls[0].url, '/api/measure/jobs/job-3', '9: job url');
  eq(calls[0].opts.keepalive, true, '9: keepalive');
  eq(JSON.parse(ls.get(draftKey('', 'job-3'))).job.notes, 'last words', '9: draft written');
  store.destroy();
  eq(unloadHandlers.length, 0, '9: destroy removes the listener');
}

// ---------- 10. a recovered unsynced draft beats the server copy and is sent ----------
{
  reset();
  ls.set(draftKey('', 'job-4'), JSON.stringify({ id: 'job-4', job: { ...emptyJob(), notes: 'offline edit' }, unsynced: true }));
  respond = async (c) => (c.method === 'GET'
    ? jsonRes({ ...emptyJob(), id: 'job-4', notes: 'server' })
    : jsonRes({ ...c.body, id: 'job-4', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-4' });
  await sleep(700);
  eq(get(store).job.notes, 'offline edit', '10: draft kept');
  const put = calls.find((c) => c.method === 'PUT');
  eq(put?.body?.notes, 'offline edit', '10: draft sent');
  store.destroy();
}

console.log(`jobStore: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log('  FAIL', f);
  process.exit(1);
}
