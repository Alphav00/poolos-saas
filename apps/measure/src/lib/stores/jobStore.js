/**
 * Job store: Svelte writable wrapping a PoolJob, with auto-save and
 * refresh recovery.
 *
 * Responsibilities:
 *   - Hold the current in-memory job (job, id, status, lastSaved, error)
 *   - Persist every change to the server via SaveQueue
 *   - Mirror the latest to localStorage so a browser refresh recovers
 *   - Update the URL after the first save so /jobs/{id}/edit is bookmarkable
 *
 * Components use:
 *   $job.job.meta.customer_name      // read
 *   $job.job.meta.customer_name = X  // write (mutation is fine, Svelte triggers reactivity)
 *   $job.markDirty()                 // explicit save trigger
 *   $job.saveNow()                   // immediate save (bypass debounce)
 *   $job.status, $job.lastSaved, $job.error
 */
import { writable, get } from 'svelte/store';
import { SaveQueue } from './saveQueue.js';
import { api } from '../api.js';

const LS_KEY = 'pool-cover-current-job';
const DEBOUNCE_MS = 500;

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
      dealer_name: 'Merlin Dealer',
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

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLS(snapshot) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
  } catch {
    // quota or private mode -- not fatal
  }
}

function clearLS() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

export function createJobStore({ initialId = null, fetchFromServer = true } = {}) {
  // Hydrate initial state from URL param or localStorage
  let initialJob = null;
  let id = initialId;
  if (!id) {
    const cached = readLS();
    if (cached) {
      initialJob = cached.job;
      id = cached.id;
    }
  }
  if (!initialJob) {
    initialJob = emptyJob();
  }

  const state = writable({
    job: initialJob,
    id,
    status: 'idle',           // 'idle'|'dirty'|'saving'|'saved'|'error'|'fatal'
    lastSaved: null,
    error: null,
    retryInMs: null,
  });

  let queue = null;

  async function performSave() {
    const s = get(state);
    if (!s.id) {
      const created = await api.createJob({
        meta: s.job.meta,
        product_type: s.job.product_type,
        measurement: s.job.measurement,
        cover_spec: s.job.cover_spec,
        liner_spec: s.job.liner_spec,
        hardware: s.job.hardware,
        notes: s.job.notes,
      });
      state.update(cur => ({
        ...cur,
        id: created.id,
        job: created,
      }));
      writeLS({ id: created.id, job: created });
      if (typeof history !== 'undefined' && history.replaceState) {
        const newUrl = `/measure/jobs/${created.id}/edit`;
        if (window.location.pathname !== newUrl) {
          history.replaceState(null, '', newUrl);
        }
      }
    } else {
      const updated = await api.updateJob(s.id, {
        meta: s.job.meta,
        product_type: s.job.product_type,
        measurement: s.job.measurement,
        cover_spec: s.job.cover_spec,
        liner_spec: s.job.liner_spec,
        hardware: s.job.hardware,
        notes: s.job.notes,
      });
      state.update(cur => ({ ...cur, job: updated }));
      writeLS({ id: s.id, job: updated });
    }
  }

  queue = new SaveQueue({ save: performSave, debounceMs: DEBOUNCE_MS });

  queue.on('dirty', () => state.update(s => ({ ...s, status: 'dirty' })));
  queue.on('saving', () => state.update(s => ({ ...s, status: 'saving', error: null })));
  queue.on('saved', () => state.update(s => ({ ...s, status: 'saved', lastSaved: new Date(), error: null })));
  queue.on('error', (e) => {
    state.update(s => ({
      ...s,
      status: e.fatal ? 'fatal' : 'error',
      error: e.error?.message || String(e.error),
      retryInMs: e.retryInMs ?? null,
    }));
  });

  if (fetchFromServer && id) {
    api.getJob(id).then(server => {
      const cur = get(state);
      // Adopt the server copy unless the tech has typed something since mount.
      //
      // `status` is the reliable signal for that: it starts 'idle' and only
      // leaves it when markDirty fires. Comparing serialised job objects is
      // not — the store holds a job while the server returns a job, and any
      // field the API normalises (Decimals to strings, defaults filled in)
      // makes the two differ even when nothing was edited.
      const hasUnsavedEdits = cur.status === 'dirty' || cur.status === 'saving';
      if (hasUnsavedEdits) return;

      writeLS({ id: server.id, job: server });
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
    if (s.status === 'dirty' && s.id && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // sendBeacon is fire-and-forget; survives page unload
      const payload = JSON.stringify({
        meta: s.job.meta, product_type: s.job.product_type,
        measurement: s.job.measurement,
        cover_spec: s.job.cover_spec, liner_spec: s.job.liner_spec,
        hardware: s.job.hardware, notes: s.job.notes,
      });
      try {
        navigator.sendBeacon(`/api/measure/jobs/${s.id}`, new Blob([payload], { type: 'application/json' }));
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
    queue.schedule();
  }

  return {
    subscribe: state.subscribe,
    set: state.set,
    update: state.update,
    setProductType,
    markDirty: () => queue.schedule(),
    saveNow: () => queue.flush(),
    cancelPending: () => queue.cancel(),
    discard: () => {
      queue.cancel();
      clearLS();
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', onBeforeUnload);
      }
    },
  };
}
