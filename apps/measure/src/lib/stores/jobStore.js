/**
 * Job store: Svelte writable wrapping a PoolJob, with auto-save and
 * refresh recovery.
 *
 * Responsibilities:
 *   - Hold the current in-memory job (job, id, status, lastSaved, error)
 *   - Persist every change to the server via SaveQueue
 *   - Mirror every edit to localStorage so a refresh (or a server that is
 *     not taking the job yet) loses nothing
 *   - Update the URL after the first save so /jobs/{id}/edit is bookmarkable
 *
 * Local drafts are kept per company and per job: /measure/new only recovers
 * an unsaved new draft, and /jobs/{id}/edit only that job's own draft.
 * A new job stays on the phone until it has the minimum the server takes
 * (four perimeter points); half-finished rows stay in the draft but are left
 * out of what is sent (utils/serverPayload.js).
 *
 * An edit route's unsent draft is only sent if the server copy has not moved
 * since the draft was based on it (same updated_at); otherwise the server copy
 * is shown and the draft is set aside (two newest kept for 14 days; the banner
 * offers them back). Nothing recovered leaves the phone, not even on exit,
 * until that comparison has been made. A draft the server rejected is shown
 * but not sent again until the next edit; the server's reason is in the status
 * details.
 *
 * Components use:
 *   $job.job.meta.customer_name      // read
 *   $job.job.meta.customer_name = X  // write (mutation is fine, Svelte triggers reactivity)
 *   store.markDirty()                // explicit save trigger
 *   store.saveNow()                  // immediate save (bypass debounce)
 *   $job.status, $job.lastSaved, $job.error
 */
import { writable, get } from 'svelte/store';
import { SaveQueue } from './saveQueue.js';
import { api } from '../api.js';
import { canCreate, serverPayload } from '../utils/serverPayload.js';

// One unscoped key held "the current job" before drafts were kept per job;
// it is removed on sight so it can never reopen over another job.
const LEGACY_LS_KEY = 'pool-cover-current-job';
const LS_PREFIX = 'pool-cover-job';
const DEBOUNCE_MS = 500;
const LS_DEBOUNCE_MS = 200;

// What the server sets on a job. Only these are taken from a save's answer;
// everything else stays as the tech has it now.
const SERVER_FIELDS = ['id', 'created_at', 'updated_at'];

const SET_ASIDE = ':set-aside';
const SET_ASIDE_DAYS = 14;

const MSG_MOVED = 'This job changed on the server since the edits on this phone. The server copy is shown; the phone edits were set aside, not sent.';
const MSG_SENT = 'This job changed on the server since the edits on this phone. They were probably sent when you left it, so the server copy is shown. If something is missing, the phone copy is kept: use the button to put it back.';
const MSG_UNCHECKED = 'Could not reach the server to check this job. Your edits are kept on this phone and nothing is sent until it can be checked: tap Save now to try again.';

/** True when Finish may leave the editor: the server has this job. */
export function canLeave(state) {
  return !!state && state.status === 'saved' && !!state.id;
}

/** The company this browser works for: the poolos_company cookie, '' for the default. */
export function currentCompany() {
  try {
    for (const part of String(document.cookie || '').split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === 'poolos_company') return decodeURIComponent(rest.join('=').trim());
    }
  } catch { /* no document */ }
  return '';
}

/** The localStorage key for a job's draft; a job not yet saved is 'new'. */
export function draftKey(company, id) {
  return `${LS_PREFIX}:${company || 'default'}:${id || 'new'}`;
}

/** Answers the same body will get again. 401/403 are not: signing in again fixes them. */
const PERMANENT = new Set([400, 404, 409, 413, 422]);
const isPermanent = (e) => PERMANENT.has(e?.status);
const isSignedOut = (e) => e?.status === 401 || e?.status === 403;

/**
 * The liner-only measurement block.
 *
 * Created lazily by `setProductType`, not by `emptyJob`, so a cover-only job
 * sends `liner: null` and matches the payload shape the API accepted before
 * liner support existed.
 */
export function emptyLinerMeasurement() {
  return {
    shape: 'freeform',
    wall_heights: [],
    profile_segments: [],
    hopper: null,
    steps: [],
    fittings: [],
    floor_type: 'vermiculite',
    cove_type: 'foam',
    floor_repair: 'none',
    wall_repair_notes: '',
    drainage_system: 'unknown',
    hydrostatic_relief_valve: false,
    recent_rainfall_days: 0,
    water_table_notes: '',
  };
}

export function emptyJob() {
  return {
    product_type: 'cover',
    meta: {
      customer_name: '',
      customer_address: '',
      customer_phone: '',
      customer_email: '',
      dealer_name: '',
      dealer_location: '',
      date: new Date().toISOString(),
      photos_attached: false,
    },
    measurement: {
      pool_length: null,
      pool_width: null,
      ab_distance_ft: 20,
      ab_orientation: 'A_left_B_right_facing_pool',
      ab_offset_from_pool_ft: 4,
      ab_note: '',
      shape_type: 'rectangular',
      perimeter_points: [],
      cross_dimensions: [],
      break_off_points: [],
      obstacles: [],
      step: null,
      spa: null,
      deck: { min_width_ft: 3, narrow_sections: [], deck_type: 'concrete' },
      shallow_depth_ft: 3.5,
      deep_depth_ft: 8,
      liner: null,
    },
    cover_spec: {
      type: 'mesh_standard',
      color: 'blue',
      spacing: '5x5',
      anchor_type: 'concrete',
      overlap_standard_in: 12,
      overlap_planter_in: null,
    },
    liner_spec: {
      thickness_mil: 27,
      pattern_name: '',
      pattern_code: null,
      bead_type: 'standard_bead',
      coping_type: 'concrete',
      step_construction: 'none',
      tile_border: false,
      tile_border_pattern: null,
      measured_at_bead_receiver: true,
      waste_factor_pct: 10,
      warranty_years: null,
    },
    hardware: {
      y_straps: 0, wood_deck_anchors: 0, beauty_rings: 0,
      beauty_rings_entire_pool: false, lawn_stakes: 0, paver_tubes_ft: 0,
      perimeter_padding_entire_pool: false,
      perimeter_padding_from_pt: null, perimeter_padding_to_pt: null,
    },
    notes: '',
  };
}

function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLS(key, snapshot) {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // quota or private mode -- not fatal
  }
}

function clearLS(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function createJobStore({ initialId = null, fetchFromServer = true } = {}) {
  const company = currentCompany();
  clearLS(LEGACY_LS_KEY);
  // Tells this store's draft writes from a newer store's on the same job.
  const storeId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  let destroyed = false;

  // Hydrate from this job's own draft: on /new only a draft never saved,
  // on /jobs/{id}/edit only a draft with that id.
  const id = initialId;
  let initialJob = null;
  let recovered = false;
  // The server's updated_at the draft was edited from.
  let draftBase = null;
  // The draft says its exit save was sent (the page may have died before the answer).
  let sentOnExitDraft = false;
  // The server's answer when it last refused this draft; null once edited.
  let rejectedError = null;
  const cached = readLS(draftKey(company, id));
  if (cached && cached.job && (id ? cached.id === id : !cached.id)) {
    initialJob = cached.job;
    // An edit route's draft only wins over the server copy when it holds
    // edits the server has not taken; a new draft is unsaved by definition.
    recovered = id ? cached.unsynced === true : true;
    draftBase = cached.job.updated_at ?? null;
    sentOnExitDraft = cached.sentOnExit === true;
    if (recovered && cached.rejected) rejectedError = String(cached.rejected);
  }
  if (!initialJob) {
    initialJob = emptyJob();
  }

  const state = writable({
    job: initialJob,
    id,
    // 'idle'|'dirty'|'saving'|'saved'|'local'|'error'|'fatal'|'rejected'|'conflict'
    status: rejectedError ? 'rejected' : 'idle',
    lastSaved: null,
    error: rejectedError,
    retryInMs: null,
    // A phone copy was set aside and the banner can offer it back.
    hasSetAside: false,
  });

  let queue = null;
  // Counts edits, so a save knows whether anything changed while it was out.
  let edits = 0;
  // The edit count the server last took; a recovered draft starts behind.
  let acked = recovered ? -1 : 0;
  // The edit count last sent on the way out, so pagehide after
  // visibilitychange does not send it twice.
  let sentOnExit = null;
  let lsTimer = null;

  // A store that was left must not write over the draft of a newer store on the same job.
  function ownedElsewhere(key) {
    if (!destroyed) return false;
    const cur = readLS(key);
    return !!(cur && cur.owner && cur.owner !== storeId);
  }

  function writeDraft(unsynced, extra = {}) {
    if (lsTimer) { clearTimeout(lsTimer); lsTimer = null; }
    const s = get(state);
    const key = draftKey(company, s.id);
    if (ownedElsewhere(key)) return;
    const draft = { id: s.id, job: s.job, unsynced, owner: storeId, ...extra };
    if (unsynced && rejectedError) draft.rejected = rejectedError;
    writeLS(key, draft);
  }

  function clearDraft(key) {
    if (!ownedElsewhere(key)) clearLS(key);
  }

  // The phone copy a conflict set aside: the newest two are kept, so a second
  // conflict cannot erase the first; copies older than two weeks are dropped.
  const asideKeys = (id) => [draftKey(company, id) + SET_ASIDE, draftKey(company, id) + SET_ASIDE + '-2'];
  function setAside(id, job) {
    const [k1, k2] = asideKeys(id);
    const prev = readLS(k1);
    if (prev) writeLS(k2, prev);
    writeLS(k1, { id, job, set_aside_at: new Date().toISOString() });
  }
  function clearSetAside(id) {
    for (const k of asideKeys(id)) clearLS(k);
  }
  if (id) {
    const cutoff = Date.now() - SET_ASIDE_DAYS * 86400000;
    for (const k of asideKeys(id)) {
      const v = readLS(k);
      if (v && !(Date.parse(v.set_aside_at) > cutoff)) clearLS(k);
    }
  }
  // Set when the tech puts the set-aside copy back; the copy goes once it is saved.
  let restoredFromAside = false;
  if (id && readLS(asideKeys(id)[0])) state.update((s) => ({ ...s, hasSetAside: true }));

  // Debounced: Svelte passes a bound value up to the job a tick after the
  // input event that calls markDirty.
  function scheduleDraftWrite() {
    if (lsTimer) clearTimeout(lsTimer);
    lsTimer = setTimeout(() => writeDraft(true), LS_DEBOUNCE_MS);
  }

  function markDirty() {
    edits += 1;
    rejectedError = null;
    scheduleDraftWrite();
    queue.schedule();
  }

  /** Take the server-set fields from a save's answer; keep the tech's edits. */
  function adopt(server) {
    state.update(cur => {
      const job = cur.job;
      for (const k of SERVER_FIELDS) {
        if (server && k in server) job[k] = server[k];
      }
      return { ...cur, id: server?.id ?? cur.id, job };
    });
  }

  // Nothing recovered is sent until the server copy it was edited from has been
  // seen; if that cannot be done, the edits stay on the phone.
  function holdOnPhone() {
    writeDraft(true);
    state.update((s) => ({ ...s, status: 'local', error: MSG_UNCHECKED, retryInMs: null }));
    return 'held';
  }

  async function performSave() {
    if (get(state).id && !baseChecked) {
      await checkBase();
      if (!baseChecked) return holdOnPhone();
      // The copy had moved: the server copy is on screen and the phone copy set aside.
      if (get(state).status === 'conflict') return 'held';
    }
    const s = get(state);
    const seen = edits;
    const payload = serverPayload(s.job);
    if (!s.id) {
      if (!canCreate(payload)) {
        // Not enough for the server yet; the phone holds it.
        writeDraft(true);
        return 'local';
      }
      const created = await api.createJob(payload);
      acked = seen;
      adopt(created);
      clearDraft(draftKey(company, null));
      writeDraft(edits !== seen);
      if (typeof history !== 'undefined' && history.replaceState) {
        const newUrl = `/measure/jobs/${created.id}/edit`;
        if (window.location.pathname !== newUrl) {
          history.replaceState(null, '', newUrl);
        }
      }
    } else {
      const updated = await api.updateJob(s.id, payload);
      acked = seen;
      adopt(updated);
      writeDraft(edits !== seen);
      if (restoredFromAside) {
        restoredFromAside = false;
        clearSetAside(s.id);
        state.update((cur) => ({ ...cur, hasSetAside: false }));
      }
    }
    return 'server';
  }

  queue = new SaveQueue({ save: performSave, debounceMs: DEBOUNCE_MS, isPermanent });

  queue.on('dirty', () => state.update(s => ({ ...s, status: 'dirty' })));
  queue.on('saving', () => state.update(s => ({ ...s, status: 'saving', error: null })));
  queue.on('saved', (e) => e?.result === 'held' || state.update(s => (
    e?.result === 'local'
      ? { ...s, status: 'local', error: null, retryInMs: null }
      : { ...s, status: 'saved', lastSaved: new Date(), error: null, retryInMs: null }
  )));
  queue.on('error', (e) => {
    const message = isSignedOut(e.error)
      ? 'Signed out or not allowed: sign in again, then Retry'
      : e.error?.message || String(e.error);
    if (e.permanent) {
      // Remember the refusal with the draft, so reopening the job does not
      // send the same body again.
      rejectedError = message;
      writeDraft(true);
    }
    state.update(s => ({
      ...s,
      status: e.permanent ? 'rejected' : e.fatal ? 'fatal' : 'error',
      error: message,
      retryInMs: e.retryInMs ?? null,
    }));
  });

  // A recovered draft has edits the server has not seen: send them, unless
  // the server already refused it (the next edit tries again).
  function resendRecovered() {
    if (recovered && !rejectedError) queue.schedule();
  }

  // The recovered draft wins only over the copy it was edited from. Until the
  // server copy has been read and compared (checkBase), nothing recovered is
  // sent: not by the debounce, not on exit.
  let baseChecked = !(recovered && fetchFromServer && id);
  let baseCheck = null;
  function checkBase() {
    if (baseCheck) return baseCheck;
    baseCheck = api.getJob(id).then(server => {
      const cur = get(state);
      // The edit counter and `status` are the reliable signals for "typed since
      // mount". Comparing serialised job objects is not: the store holds a job
      // while the server returns a job, and any field the API normalises
      // (Decimals to strings, defaults filled in) makes the two differ.
      const hasUnsavedEdits = edits > 0 || cur.status === 'dirty' || cur.status === 'saving';
      let conflict = false;
      if (recovered) {
        if (draftBase && server.updated_at === draftBase) {
          baseChecked = true;
          resendRecovered();
          return;
        }
        // The job changed since (another device, the swap-A/B button on the job
        // view): sending the draft would overwrite that change. What is on
        // screen, edits typed since the page opened included, is set aside.
        conflict = true;
        setAside(id, cur.job);
        queue.cancel();
        recovered = false;
        rejectedError = null;
        acked = edits;
      } else if (hasUnsavedEdits) {
        // Adopt the server copy unless the tech has typed something since mount.
        baseChecked = true;
        return;
      }
      baseChecked = true;
      writeLS(draftKey(company, server.id), { id: server.id, job: server, unsynced: false, owner: storeId });
      state.set({
        job: server,
        id: server.id,
        status: conflict ? 'conflict' : 'idle',
        lastSaved: new Date(),
        error: conflict ? (sentOnExitDraft ? MSG_SENT : MSG_MOVED) : null,
        retryInMs: null,
        hasSetAside: conflict || !!readLS(asideKeys(id)[0]),
      });
    }).catch(err => {
      console.warn('Could not refresh from server:', err);
      baseCheck = null;
      if (!baseChecked) holdOnPhone();
      else resendRecovered();
    });
    return baseCheck;
  }

  if (fetchFromServer && id) {
    checkBase();
  } else {
    resendRecovered();
  }

  // Leaving the page: beforeunload on desktop; pagehide and
  // visibilitychange=hidden are what phones fire reliably.
  function onLeave(ev) {
    if (ev?.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
    const s = get(state);
    // Anything the server has not taken, whether waiting, in flight or failed.
    if (edits === acked && !lsTimer) return;
    // The draft on the phone first: that write cannot fail on the network.
    writeDraft(true);
    if (s.id && baseChecked && !rejectedError && sentOnExit !== edits && typeof fetch !== 'undefined') {
      sentOnExit = edits;
      const seen = edits;
      // If the page dies before the answer, the next open knows the exit save was sent.
      writeDraft(true, { sentOnExit: true });
      // keepalive lets the request outlive the page. The Worker takes PUT
      // for a job (sendBeacon can only POST).
      try {
        fetch(`/api/measure/jobs/${s.id}`, {
          method: 'PUT',
          keepalive: true,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serverPayload(s.job)),
        }).then(async (r) => {
          // The page may still be alive (a hidden tab): take the answer like any save's.
          if (!r.ok) return;
          adopt(await r.json());
          acked = seen;
          if (edits === seen) {
            queue.cancel();
            state.update((cur) => ({ ...cur, status: 'saved', lastSaved: new Date(), error: null, retryInMs: null }));
          }
          writeDraft(edits !== seen);
        }).catch(() => { /* the draft is on the phone */ });
      } catch { /* ignore */ }
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onLeave);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onLeave);
  }

  /**
   * Switch what this job is ordering, creating the liner block on demand.
   *
   * The block is never destroyed on the way back to cover-only: a tech who
   * toggles to liner, captures wall heights, then toggles back would otherwise
   * lose the work silently. It just stops being read.
   */
  function setProductType(productType) {
    state.update(cur => {
      const job = cur.job;
      job.product_type = productType;
      const needsLiner = productType === 'liner' || productType === 'both';
      if (needsLiner && !job.measurement.liner) {
        job.measurement.liner = emptyLinerMeasurement();
      }
      return { ...cur, job };
    });
    markDirty();
  }

  return {
    subscribe: state.subscribe,
    set: state.set,
    update: state.update,
    setProductType,
    markDirty,
    // Resolves once the save (and any follow-up) is done, so a caller can
    // leave the page knowing the server has the edits.
    saveNow: async () => {
      const r = await queue.flush();
      await queue.idle();
      return r;
    },
    cancelPending: () => queue.cancel(),
    discard: () => {
      queue.cancel();
      // Nothing left that the server has not taken.
      acked = edits;
      recovered = false;
      rejectedError = null;
      if (lsTimer) { clearTimeout(lsTimer); lsTimer = null; }
      clearSetAside(get(state).id);
      restoredFromAside = false;
      clearLS(draftKey(company, get(state).id));
      clearLS(draftKey(company, null));
      state.set({
        job: emptyJob(),
        id: null,
        status: 'idle',
        lastSaved: null,
        error: null,
        retryInMs: null,
        hasSetAside: false,
      });
    },
    /**
     * Put the phone copy a conflict set aside back in the editor as ordinary
     * edits, based on the server copy now shown. The next save overwrites the
     * server copy with it; the set-aside copy goes once that save lands.
     */
    restoreSetAside: () => {
      const cur = get(state);
      const saved = readLS(asideKeys(cur.id)[0]);
      if (!saved || !saved.job) return false;
      const job = { ...saved.job };
      for (const k of SERVER_FIELDS) if (cur.job && k in cur.job) job[k] = cur.job[k];
      recovered = false;
      rejectedError = null;
      restoredFromAside = true;
      state.update((st) => ({ ...st, job, status: 'dirty', error: null, hasSetAside: false }));
      markDirty();
      return true;
    },
    destroy: () => {
      // Leaving the editor (Finish on the last step, the back button) must
      // not drop an edit still waiting on the debounce: send it now. The
      // save finishes after unmount and updates the draft as usual.
      if (queue.status.scheduled || get(state).status === 'dirty') {
        queue.flush();
      }
      // One last try, then no timers: a retry after leaving could put old edits
      // over a newer save of the same job. The draft stays on the phone.
      queue.close();
      // Keep whatever was typed in the last moment before leaving.
      if (lsTimer) writeDraft(true);
      destroyed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', onLeave);
        window.removeEventListener('pagehide', onLeave);
      }
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', onLeave);
      }
    },
  };
}
