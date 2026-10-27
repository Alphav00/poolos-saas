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

const { createJobStore, emptyJob, draftKey, canLeave, whyNotLeave } = await import('../src/lib/stores/jobStore.js');
const { get } = await import('svelte/store');

function reset() {
  ls.clear();
  calls = [];
  leave = {};
  globalThis.document.cookie = '';
  globalThis.document.visibilityState = 'visible';
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
  fire('beforeunload');
  eq(calls.length, 1, '9: one request');
  eq(calls[0].method, 'PUT', '9: PUT');
  eq(calls[0].url, '/api/measure/jobs/job-3', '9: job url');
  eq(calls[0].opts.keepalive, true, '9: keepalive');
  eq(JSON.parse(ls.get(draftKey('', 'job-3'))).job.notes, 'last words', '9: draft written');
  fire('pagehide');
  eq(calls.length, 1, '9: pagehide does not send the same edits twice');
  store.destroy();
  eq(listenerCount(), 0, '9: destroy removes the listeners');
}

// ---------- 10. a recovered unsynced draft beats the copy it was edited from ----------
{
  reset();
  ls.set(draftKey('', 'job-4'), JSON.stringify({ id: 'job-4', job: { ...emptyJob(), updated_at: 't5', notes: 'offline edit' }, unsynced: true }));
  respond = async (c) => (c.method === 'GET'
    ? jsonRes({ ...emptyJob(), id: 'job-4', updated_at: 't5', notes: 'server' })
    : jsonRes({ ...c.body, id: 'job-4', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-4' });
  await sleep(700);
  eq(get(store).job.notes, 'offline edit', '10: draft kept');
  const put = calls.find((c) => c.method === 'PUT');
  eq(put?.body?.notes, 'offline edit', '10: draft sent');
  store.destroy();
}

// ---------- 11. leaving the editor sends an edit still on the debounce ----------
{
  reset();
  respond = async (c) => jsonRes({ ...c.body, id: 'job-5', updated_at: 't1' });
  const store = createJobStore({ initialId: 'job-5', fetchFromServer: false });
  get(store).job.notes = 'typed on the review step';
  store.markDirty();
  store.destroy();
  await sleep(20);
  const puts = calls.filter((c) => c.method === 'PUT');
  eq(puts.length, 1, '11: save sent on destroy');
  eq(puts[0]?.body?.notes, 'typed on the review step', '11: with the edit');
  eq(JSON.parse(ls.get(draftKey('', 'job-5'))).unsynced, false, '11: draft synced after');
  await sleep(700);
  eq(calls.length, 1, '11: no second save after unmount');
}

// ---------- 12. saveNow waits for the server ----------
{
  reset();
  let release;
  respond = async (c) => { await new Promise((r) => { release = r; }); return jsonRes({ ...c.body, id: 'job-6', updated_at: 't1' }); };
  const store = createJobStore({ initialId: 'job-6', fetchFromServer: false });
  get(store).job.notes = 'finish';
  store.markDirty();
  let done = false;
  const p = store.saveNow().then(() => { done = true; });
  await sleep(10);
  eq(done, false, '12: still waiting on the PUT');
  release();
  await p;
  eq(get(store).status, 'saved', '12: saved once resolved');
  store.destroy();
}

// ---------- 13. a draft older than the server copy does not overwrite it ----------
{
  reset();
  ls.set(draftKey('', 'job-7'), JSON.stringify({ id: 'job-7', job: { ...emptyJob(), updated_at: 't1', notes: 'stale edit' }, unsynced: true }));
  respond = async () => jsonRes({ ...emptyJob(), id: 'job-7', updated_at: 't2', notes: 'changed elsewhere' });
  const store = createJobStore({ initialId: 'job-7' });
  await sleep(700);
  eq(calls.map((c) => c.method), ['GET'], '13: draft not sent');
  eq(get(store).job.notes, 'changed elsewhere', '13: server copy shown');
  eq(get(store).status, 'conflict', '13: status says so');
  eq(JSON.parse(ls.get(`${draftKey('', 'job-7')}:set-aside`)).job.notes, 'stale edit', '13: draft set aside');
  eq(JSON.parse(ls.get(draftKey('', 'job-7'))).unsynced, false, '13: draft replaced by the server copy');
  store.destroy();
}

// ---------- 14. a rejected draft is shown but not sent again on reopen ----------
{
  reset();
  respond = async () => jsonRes({ detail: 'bad body' }, 422);
  const first = createJobStore({ initialId: 'job-8', fetchFromServer: false });
  get(first).job.notes = 'bad';
  first.markDirty();
  await sleep(700);
  eq(get(first).status, 'rejected', '14: rejected');
  first.destroy();
  eq(JSON.parse(ls.get(draftKey('', 'job-8'))).rejected, 'bad body', '14: refusal kept with the draft');
  calls = [];
  const again = createJobStore({ initialId: 'job-8', fetchFromServer: false });
  await sleep(700);
  eq(calls.length, 0, '14: not re-sent on reopen');
  eq(get(again).status, 'rejected', '14: shown as rejected');
  eq(get(again).job.notes, 'bad', '14: draft shown');
  get(again).job.notes = 'fixed';
  again.markDirty();
  await sleep(700);
  eq(calls.length, 1, '14: the next edit tries again');
  again.destroy();
}

// ---------- 15. 401/403 are retried, with a sign-in message ----------
{
  reset();
  respond = async () => jsonRes({ detail: 'no' }, 401);
  const store = createJobStore({ initialId: 'job-9', fetchFromServer: false });
  store.markDirty();
  await sleep(700);
  eq(get(store).status, 'error', '15: transient, not rejected');
  ok(/sign in again/i.test(get(store).error || ''), '15: says to sign in');
  ok(get(store).retryInMs > 0, '15: retry scheduled');
  store.destroy();
  await sleep(20);
}

// ---------- 16. leaving mid-save or after a failed save still sends a keepalive PUT ----------
{
  reset();
  respond = async (c) => (c.opts.keepalive ? jsonRes({}) : new Promise(() => {}));
  const store = createJobStore({ initialId: 'job-10', fetchFromServer: false });
  get(store).job.notes = 'in flight';
  store.markDirty();
  await sleep(600);
  eq(get(store).status, 'saving', '16: a save is out');
  globalThis.document.visibilityState = 'hidden';
  fire('visibilitychange');
  const keep = calls.filter((c) => c.opts.keepalive);
  eq(keep.length, 1, '16: keepalive PUT on hide');
  eq(keep[0]?.method, 'PUT', '16: as PUT');
  eq(keep[0]?.body?.notes, 'in flight', '16: with the edits');
  store.destroy();
}

// ---------- follow-ups to the review of the save path ----------
const puts = () => calls.filter((c) => c.method === 'PUT');
const draftOf = (id) => JSON.parse(ls.get(draftKey('', id)) || 'null');
const asideOf = (id, n = 1) => JSON.parse(ls.get(`${draftKey('', id)}:set-aside${n > 1 ? '-' + n : ''}`) || 'null');
const staleDraft = (id, notes, extra = {}) =>
  ls.set(draftKey('', id), JSON.stringify({ id, job: { ...emptyJob(), updated_at: 't1', notes }, unsynced: true, ...extra }));
const serverJob = (id, notes, updated_at = 't2') => ({ ...emptyJob(), id, updated_at, notes });
async function guarded(name, fn) {
  try { await fn(); } catch (e) { ok(false, `${name}: threw ${e && e.message}`); }
}

// ---------- 17. leaving before the server copy is checked sends nothing ----------
await guarded('17', async () => {
  reset();
  staleDraft('job-20', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-20', 'server copy'))); })
    : jsonRes({ ...c.body, id: 'job-20', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-20' });
  globalThis.document.visibilityState = 'hidden';
  fire('visibilitychange');
  eq(puts().length, 0, '17: no exit save before the draft was checked against the server copy');
  globalThis.document.visibilityState = 'visible';
  release();
  await sleep(700);
  eq(puts().length, 0, '17: the stale draft is never sent');
  eq(get(store).status, 'conflict', '17: the server moved, so conflict');
  eq(get(store).job.notes, 'server copy', '17: server copy shown');
  store.destroy();
});

// ---------- 18. typing before the server copy arrives does not skip the check ----------
await guarded('18', async () => {
  reset();
  staleDraft('job-21', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-21', 'server copy'))); })
    : jsonRes({ ...c.body, id: 'job-21', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-21' });
  get(store).job.notes = 'typed meanwhile';
  store.markDirty();
  release();
  await sleep(900);
  eq(puts().length, 0, '18: nothing sent on top of a copy that moved');
  eq(get(store).status, 'conflict', '18: conflict');
  eq(asideOf('job-21')?.job?.notes, 'typed meanwhile', '18: what was typed is set aside, not lost');
  store.destroy();
});

// ---------- 19. a failed check does not send the draft; Save now checks again ----------
await guarded('19', async () => {
  reset();
  staleDraft('job-22', 'phone edit');
  let down = true;
  respond = async (c) => (c.method === 'GET'
    ? (down ? jsonRes({ detail: 'down' }, 500) : jsonRes(serverJob('job-22', 'server', 't1')))
    : jsonRes({ ...c.body, id: 'job-22', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-22' });
  await sleep(700);
  eq(puts().length, 0, '19: draft not sent while the server copy could not be read');
  eq(get(store).status, 'local', '19: says it is on the phone only');
  ok(/phone/i.test(get(store).error || ''), '19: says why');
  down = false;
  await store.saveNow();
  eq(puts().length, 1, '19: Save now checks again, then sends');
  eq(get(store).status, 'saved', '19: saved');
  store.destroy();
});

// ---------- 20. the exit save's answer is taken when the page is still alive ----------
await guarded('20', async () => {
  reset();
  respond = async (c) => jsonRes({ ...c.body, id: 'job-23', updated_at: 'sent-on-exit' });
  const store = createJobStore({ initialId: 'job-23', fetchFromServer: false });
  get(store).job.notes = 'last words';
  store.markDirty();
  globalThis.document.visibilityState = 'hidden';
  fire('visibilitychange');
  await sleep(60);
  eq(draftOf('job-23')?.unsynced, false, '20: draft is synced once the exit save is answered');
  eq(draftOf('job-23')?.job?.updated_at, 'sent-on-exit', '20: and based on the server answer');
  await sleep(700);
  eq(puts().length, 1, '20: no second save after the exit save landed');
  store.destroy();
});

// ---------- 21. a draft whose exit save was sent says so when the copy moved ----------
await guarded('21', async () => {
  reset();
  staleDraft('job-24', 'sent as I left', { sentOnExit: true });
  respond = async () => jsonRes(serverJob('job-24', 'sent as I left'));
  const store = createJobStore({ initialId: 'job-24' });
  await sleep(300);
  eq(get(store).status, 'conflict', '21: the copy moved');
  ok(/probably/i.test(get(store).error || ''), '21: says the phone edits were probably sent when leaving');
  eq(get(store).hasSetAside, true, '21: the phone copy is kept');
  store.destroy();
});

// ---------- 22. leaving stops the retry timer after one last try ----------
await guarded('22', async () => {
  reset();
  respond = async () => jsonRes({ detail: 'down' }, 500);
  const store = createJobStore({ initialId: 'job-25', fetchFromServer: false });
  get(store).job.notes = 'leaving offline';
  store.markDirty();
  store.destroy();
  await sleep(1500);
  eq(puts().length, 1, '22: one last try on leaving, no retry after that');
});

// ---------- 23. a late answer to a closed store does not overwrite the newer draft ----------
await guarded('23', async () => {
  reset();
  let release, n = 0;
  respond = async (c) => {
    n++;
    if (n === 1) await new Promise((r) => { release = r; });
    return jsonRes({ ...c.body, id: 'job-26', updated_at: 'tA' });
  };
  const a = createJobStore({ initialId: 'job-26', fetchFromServer: false });
  get(a).job.notes = 'older';
  a.markDirty();
  a.destroy();
  await sleep(20);
  const b = createJobStore({ initialId: 'job-26', fetchFromServer: false });
  get(b).job.notes = 'newer';
  b.markDirty();
  await sleep(300);
  eq(draftOf('job-26')?.job?.notes, 'newer', '23: the newer store wrote its draft');
  release();
  await sleep(40);
  eq(draftOf('job-26')?.job?.notes, 'newer', '23: the closed store did not write over it');
  await sleep(500);
  b.destroy();
});

// ---------- 24. the set-aside phone copy can be brought back, and is removed after ----------
await guarded('24', async () => {
  reset();
  staleDraft('job-27', 'stale edit');
  respond = async (c) => (c.method === 'GET'
    ? jsonRes(serverJob('job-27', 'server copy'))
    : jsonRes({ ...c.body, id: 'job-27', updated_at: 't3' }));
  const store = createJobStore({ initialId: 'job-27' });
  await sleep(100);
  eq(get(store).status, 'conflict', '24: conflict');
  eq(get(store).hasSetAside, true, '24: the banner can offer the phone copy');
  eq(store.restoreSetAside(), true, '24: restore says yes');
  eq(get(store).job.notes, 'stale edit', '24: phone edits are back in the editor');
  await sleep(700);
  eq(puts()[0]?.body?.notes, 'stale edit', '24: and go out as an ordinary save');
  eq(get(store).status, 'saved', '24: saved');
  eq(asideOf('job-27'), null, '24: set-aside removed once used');
  eq(get(store).hasSetAside, false, '24: nothing left to offer');
  store.destroy();
});

// ---------- 25. a second conflict keeps the first set-aside copy; discard removes both ----------
await guarded('25', async () => {
  reset();
  staleDraft('job-28', 'first edit');
  respond = async () => jsonRes(serverJob('job-28', 'server', 't2'));
  const one = createJobStore({ initialId: 'job-28' });
  await sleep(100);
  one.destroy();
  ls.set(draftKey('', 'job-28'), JSON.stringify({ id: 'job-28', job: { ...emptyJob(), updated_at: 't2', notes: 'second edit' }, unsynced: true }));
  respond = async () => jsonRes(serverJob('job-28', 'server', 't3'));
  const two = createJobStore({ initialId: 'job-28' });
  await sleep(100);
  eq(asideOf('job-28', 1)?.job?.notes, 'second edit', '25: newest set-aside');
  eq(asideOf('job-28', 2)?.job?.notes, 'first edit', '25: the earlier one is not erased');
  two.discard();
  eq([asideOf('job-28', 1), asideOf('job-28', 2)], [null, null], '25: discard removes both');
  two.destroy();
});

// ---------- 26. an old set-aside copy is dropped on opening the job ----------
await guarded('26', async () => {
  reset();
  ls.set(`${draftKey('', 'job-29')}:set-aside`, JSON.stringify({ id: 'job-29', job: emptyJob(), set_aside_at: '2026-01-01T00:00:00.000Z' }));
  const store = createJobStore({ initialId: 'job-29', fetchFromServer: false });
  eq(asideOf('job-29'), null, '26: a copy older than 14 days is gone');
  store.destroy();
});

// ---------- 27. Finish only leaves once the server has the job ----------
await guarded('27', async () => {
  eq(canLeave({ status: 'saved', id: 'a' }), true, '27: saved job');
  eq(canLeave({ status: 'local', id: null }), false, '27: phone-only job');
  eq(canLeave({ status: 'rejected', id: 'a' }), false, '27: refused job');
  eq(canLeave({ status: 'dirty', id: 'a' }), false, '27: unsaved edit');
  eq(canLeave({ status: 'saved', id: null }), false, '27: no id');
  reset();
  respond = async (c) => jsonRes({ ...c.body, id: 'job-30', created_at: 't0', updated_at: 't0' });
  const store = createJobStore({ fetchFromServer: false });
  get(store).job.measurement.perimeter_points = pts(3);
  store.markDirty();
  await store.saveNow();
  eq(canLeave(get(store)), false, '27: three points: still only on the phone');
  get(store).job.measurement.perimeter_points = pts(4);
  store.markDirty();
  await store.saveNow();
  eq(canLeave(get(store)), true, '27: four points: on the server');
  store.destroy();
});

// ---------- 28. a refused save shows the server's reason (rule unchanged) ----------
await guarded('28', async () => {
  reset();
  respond = async () => jsonRes({ detail: [{ loc: ['body', 'measurement', 'liner', 'wall_heights'], msg: 'labels must be unique' }] }, 422);
  const store = createJobStore({ initialId: 'job-31', fetchFromServer: false });
  store.markDirty();
  await sleep(700);
  eq(get(store).status, 'rejected', '28: refused');
  ok(/wall_heights: labels must be unique/.test(get(store).error || ''), '28: the reason names the field');
  await sleep(50);
  eq(puts().length, 1, '28: not sent again until the next edit');
  store.destroy();
});

// ---------- 29. Save now before the server copy arrives waits for the check ----------
await guarded('29', async () => {
  reset();
  staleDraft('job-32', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-32', 'server copy'))); })
    : jsonRes({ ...c.body, id: 'job-32', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-32' });
  const saving = store.saveNow();
  await sleep(30);
  eq(puts().length, 0, '29: Save now does not send before the check');
  release();
  await saving;
  eq(puts().length, 0, '29: the copy moved, so the stale draft is not sent');
  eq(get(store).status, 'conflict', '29: conflict, not overwritten by the held save');
  store.destroy();
});

// ---------- 30. ...and sends once the check says the draft is current ----------
await guarded('30', async () => {
  reset();
  staleDraft('job-33', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-33', 'server', 't1'))); })
    : jsonRes({ ...c.body, id: 'job-33', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-33' });
  const saving = store.saveNow();
  await sleep(30);
  eq(puts().length, 0, '30: held until the check');
  release();
  await saving;
  await sleep(50);
  eq(puts().map((c) => c.body?.notes), ['phone edit'], '30: sent once, with the phone edit');
  eq(get(store).status, 'saved', '30: saved');
  store.destroy();
});

// ---------- second review of the follow-ups ----------
// ---------- 31. a closed store's late server answer does not overwrite a newer store's draft ----------
await guarded('31', async () => {
  reset();
  staleDraft('job-34', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-34', 'server copy'))); })
    : jsonRes({ ...c.body, id: 'job-34', updated_at: 't9' }));
  const a = createJobStore({ initialId: 'job-34' });
  a.destroy();
  const b = createJobStore({ initialId: 'job-34', fetchFromServer: false });
  get(b).job.notes = 'typed in b';
  b.markDirty();
  await sleep(300);
  eq(draftOf('job-34')?.job?.notes, 'typed in b', '31: the newer store wrote its draft');
  release();
  await sleep(60);
  eq(draftOf('job-34')?.job?.notes, 'typed in b', '31: the closed store did not write the server copy over it');
  eq(asideOf('job-34'), null, '31: and set nothing aside');
  b.destroy();
});

// ---------- 32. an exit save answered after Discard does not bind the blank job to the old one ----------
await guarded('32', async () => {
  reset();
  let release;
  respond = async (c) => (c.opts.keepalive
    ? new Promise((r) => { release = () => r(jsonRes({ ...c.body, id: 'job-35', updated_at: 'tZ' })); })
    : jsonRes({ ...c.body, id: 'job-35', updated_at: 'tY' }));
  const store = createJobStore({ initialId: 'job-35', fetchFromServer: false });
  get(store).job.notes = 'to be discarded';
  store.markDirty();
  globalThis.document.visibilityState = 'hidden';
  fire('visibilitychange');
  store.discard();
  release();
  await sleep(60);
  eq(get(store).id, null, '32: the blank job is not bound to the discarded one');
  eq(get(store).status, 'idle', '32: and is not marked saved');
  eq(draftOf('job-35'), null, '32: no draft is written back under the old id');
  store.destroy();
});

// ---------- 33. restoring one set-aside copy offers the older one next instead of deleting it ----------
await guarded('33', async () => {
  reset();
  staleDraft('job-36', 'first');
  respond = async (c) => (c.method === 'GET' ? jsonRes(serverJob('job-36', 'server', 't2')) : jsonRes({ ...c.body, id: 'job-36', updated_at: 't9' }));
  const one = createJobStore({ initialId: 'job-36' });
  await sleep(100);
  one.destroy();
  ls.set(draftKey('', 'job-36'), JSON.stringify({ id: 'job-36', job: { ...emptyJob(), updated_at: 't2', notes: 'second' }, unsynced: true }));
  respond = async (c) => (c.method === 'GET' ? jsonRes(serverJob('job-36', 'server', 't3')) : jsonRes({ ...c.body, id: 'job-36', updated_at: 't9' }));
  const two = createJobStore({ initialId: 'job-36' });
  await sleep(100);
  eq(two.restoreSetAside(), true, '33: restore');
  await sleep(700);
  eq(get(two).status, 'saved', '33: saved');
  eq(asideOf('job-36', 1)?.job?.notes, 'first', '33: the older copy moved up to be offered next');
  eq(asideOf('job-36', 2), null, '33: second slot empty');
  eq(get(two).hasSetAside, true, '33: still offered');
  two.destroy();
});

// ---------- 34. Save now before the check, same base: one PUT, not two ----------
await guarded('34', async () => {
  reset();
  staleDraft('job-37', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-37', 'server', 't1'))); })
    : jsonRes({ ...c.body, id: 'job-37', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-37' });
  const saving = store.saveNow();
  await sleep(30);
  release();
  await saving;
  await sleep(800);
  eq(puts().length, 1, '34: exactly one PUT, no second one after the debounce');
  store.destroy();
});

// ---------- 35. a server read that never answers ends in "on this phone", not a hang ----------
await guarded('35', async () => {
  reset();
  staleDraft('job-38', 'phone edit');
  respond = async (c) => (c.method === 'GET' ? new Promise(() => {}) : jsonRes({ ...c.body, id: 'job-38', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-38', checkTimeoutMs: 150 });
  const outcome = await Promise.race([store.saveNow().then(() => 'settled'), sleep(2500).then(() => 'hung')]);
  eq(outcome, 'settled', '35: Save now comes back');
  eq(get(store).status, 'local', '35: held on the phone');
  ok(/Could not reach/i.test(get(store).error || ''), '35: with a reason');
  eq(puts().length, 0, '35: nothing sent');
  store.destroy();
});

// ---------- 36. Finish refused: the editor can say why ----------
await guarded('36', async () => {
  eq(whyNotLeave({ status: 'saved', id: 'a' }), '', '36: nothing to say when it can leave');
  ok(/four perimeter points/i.test(whyNotLeave({ status: 'local', id: null, error: null })), '36: phone-only job says four points');
  ok(whyNotLeave({ status: 'rejected', id: 'a', error: 'wall_heights: labels must be unique' }).includes('wall_heights: labels must be unique'), '36: a refused save repeats the reason');
  ok(whyNotLeave({ status: 'dirty', id: 'a', error: null }).length > 0, '36: any other refusal still says something');
});

// ---------- third pass: what the fresh review of the second round found ----------
// ---------- 37. the read limit does not cut off a plain refresh of a job with no draft ----------
await guarded('37', async () => {
  reset();
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => setTimeout(() => r(jsonRes(serverJob('job-39', 'server copy'))), 300))
    : jsonRes({ ...c.body, id: 'job-39', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-39', checkTimeoutMs: 100 });
  await sleep(600);
  eq(get(store).job.notes, 'server copy', '37: a slow plain load still shows the server copy');
  store.destroy();
});

// ---------- 38. leaving while the check is pending still sends the flushed save, once the draft is current ----------
await guarded('38', async () => {
  reset();
  staleDraft('job-40', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-40', 'server', 't1'))); })
    : jsonRes({ ...c.body, id: 'job-40', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-40' });
  store.markDirty();
  store.destroy();
  release();
  await sleep(300);
  eq(puts().map((c) => c.body?.notes), ['phone edit'], '38: the save flushed on leaving went out once, with the phone edit');
});

// ---------- 39. a create answered after Discard does not bind the blank job to the new id ----------
await guarded('39', async () => {
  reset();
  let release;
  respond = async (c) => (c.method === 'POST'
    ? new Promise((r) => { release = () => r(jsonRes({ ...c.body, id: 'job-new-1', created_at: 't0', updated_at: 't0' })); })
    : jsonRes({}));
  const store = createJobStore({ fetchFromServer: false });
  get(store).job.measurement.perimeter_points = pts(4);
  store.markDirty();
  await sleep(600);
  store.discard();
  release();
  await sleep(60);
  eq(get(store).id, null, '39: the blank job stays unbound');
  eq(get(store).status, 'idle', '39: and is not marked saved');
  eq(JSON.parse(ls.get(draftKey('', 'job-new-1')) || 'null'), null, '39: no draft under the new id');
  store.destroy();
});

// ---------- 40. leaving while the check is pending, server has moved on: nothing is sent ----------
await guarded('40', async () => {
  reset();
  staleDraft('job-41', 'phone edit');
  let release;
  respond = async (c) => (c.method === 'GET'
    ? new Promise((r) => { release = () => r(jsonRes(serverJob('job-41', 'server moved on', 't2'))); })
    : jsonRes({ ...c.body, id: 'job-41', updated_at: 't9' }));
  const store = createJobStore({ initialId: 'job-41' });
  store.markDirty();
  store.destroy();
  release();
  await sleep(300);
  eq(puts().length, 0, '40: the flushed save is not sent over a newer server copy');
});

console.log(`jobStore: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log('  FAIL', f);
  process.exit(1);
}
