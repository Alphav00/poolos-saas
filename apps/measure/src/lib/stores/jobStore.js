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

/** 4xx other than timeout / rate limit: the server will say the same again. */
const isPermanent = (e) =>
  typeof e?.status === 'number' && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;

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

  // Hydrate from this job's own draft: on /new only a draft never saved,
  // on /jobs/{id}/edit only a draft with that id.
  const id = initialId;
  let initialJob = null;
  let recovered = false;
  const cached = readLS(draftKey(company, id));
  if (cached && cached.job && (id ? cached.id === id : !cached.id)) {
    initialJob = cached.job;
    // An edit route's draft only wins over the server copy when it holds
    // edits the server has not taken; a new draft is unsaved by definition.
    recovered = id ? cached.unsynced === true : true;
  }
  if (!initialJob) {
    initialJob = emptyJob();
  }

  const state = writable({
    job: initialJob,
    id,
    status: 'idle',           // 'idle'|'dirty'|'saving'|'saved'|'local'|'error'|'fatal'|'rejected'
    lastSaved: null,
    error: null,
    retryInMs: null,
  });

  let queue = null;
  // Counts edits, so a save knows whether anything changed while it was out.
  let edits = 0;
  let lsTimer = null;

  function writeDraft(unsynced) {
    if (lsTimer) { clearTimeout(lsTimer); lsTimer = null; }
    const s = get(state);
    writeLS(draftKey(company, s.id), { id: s.id, job: s.job, unsynced });
  }

  // Debounced: Svelte passes a bound value up to the job a tick after the
  // input event that calls markDirty.
  function scheduleDraftWrite() {
    if (lsTimer) clearTimeout(lsTimer);
    lsTimer = setTimeout(() => writeDraft(true), LS_DEBOUNCE_MS);
  }

  function markDirty() {
    edits += 1;
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

  async function performSave() {
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
      adopt(created);
      clearLS(draftKey(company, null));
      writeDraft(edits !== seen);
      if (typeof history !== 'undefined' && history.replaceState) {
        const newUrl = `/measure/jobs/${created.id}/edit`;
        if (window.location.pathname !== newUrl) {
          history.replaceState(null, '', newUrl);
        }
      }
    } else {
      const updated = await api.updateJob(s.id, payload);
      adopt(updated);
      writeDraft(edits !== seen);
    }
    return 'server';
  }

  queue = new SaveQueue({ save: performSave, debounceMs: DEBOUNCE_MS, isPermanent });

  queue.on('dirty', () => state.update(s => ({ ...s, status: 'dirty' })));
  queue.on('saving', () => state.update(s => ({ ...s, status: 'saving', error: null })));
  queue.on('saved', (e) => state.update(s => (
    e?.result === 'local'
      ? { ...s, status: 'local', error: null, retryInMs: null }
      : { ...s, status: 'saved', lastSaved: new Date(), error: null, retryInMs: null }
  )));
  queue.on('error', (e) => {
    state.update(s => ({
      ...s,
      status: e.permanent ? 'rejected' : e.fatal ? 'fatal' : 'error',
      error: e.error?.message || String(e.error),
      retryInMs: e.retryInMs ?? null,
    }));
  });

  // A recovered draft has edits the server has not seen: send them.
  if (recovered) {
    queue.schedule();
  }

  if (fetchFromServer && id) {
    api.getJob(id).then(server => {
      const cur = get(state);
      // Adopt the server copy unless the tech has typed something since mount
      // (or the draft on the phone holds edits the server never took).
      //
      // The edit counter and `status` are the reliable signals for that.
      // Comparing serialised job objects is not — the store holds a job while
      // the server returns a job, and any field the API normalises (Decimals
      // to strings, defaults filled in) makes the two differ even when
      // nothing was edited.
      const hasUnsavedEdits = recovered || edits > 0 || cur.status === 'dirty' || cur.status === 'saving';
      if (hasUnsavedEdits) return;

      writeLS(draftKey(company, server.id), { id: server.id, job: server, unsynced: false });
      state.set({
        job: server,
        id: server.id,
        status: 'idle',
        lastSaved: new Date(),
        error: null,
        retryInMs: null,
      });
    }).catch(err => {
      console.warn('Could not refresh from server:', err);
    });
  }

  function onBeforeUnload() {
    const s = get(state);
    if (s.status !== 'dirty' && s.status !== 'local' && !lsTimer) return;
    // The draft on the phone first: that write cannot fail on the network.
    writeDraft(true);
    if (s.status === 'dirty' && s.id && typeof fetch !== 'undefined') {
      // keepalive lets the request outlive the page. The Worker takes PUT
      // for a job (sendBeacon can only POST).
      try {
        fetch(`/api/measure/jobs/${s.id}`, {
          method: 'PUT',
          keepalive: true,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serverPayload(s.job)),
        }).catch(() => { /* the draft is on the phone */ });
      } catch { /* ignore */ }
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', onBeforeUnload);
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
    saveNow: () => queue.flush(),
    cancelPending: () => queue.cancel(),
    discard: () => {
      queue.cancel();
      if (lsTimer) { clearTimeout(lsTimer); lsTimer = null; }
      clearLS(draftKey(company, get(state).id));
      clearLS(draftKey(company, null));
      state.set({
        job: emptyJob(),
        id: null,
        status: 'idle',
        lastSaved: null,
        error: null,
        retryInMs: null,
      });
    },
    destroy: () => {
      queue.cancel();
      // Keep whatever was typed in the last moment before leaving.
      if (lsTimer) writeDraft(true);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', onBeforeUnload);
      }
    },
  };
}
