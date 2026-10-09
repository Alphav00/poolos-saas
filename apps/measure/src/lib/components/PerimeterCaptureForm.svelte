<script>
  /**
   * Perimeter capture form (wizard step "perimeter").
   *
   * Layout:
   *   - Depth fields (shallow, deep)
   *   - Live mini-map of the reconstructed pool
   *   - Stats bar (point count, validity, est. dimensions)
   *   - List of points: each row editable inline, deletable
   *   - Sticky "Add point" button at bottom
   *   - "Undo last" if there's a recent add
   *
   * Each row uses the two-box DistanceInput for A and B.
   * Inline warnings: point quality (good/marginal/invalid) + suspect-points.
   */
  import DistanceInput from './DistanceInput.svelte';
  import PerimeterMap from './PerimeterMap.svelte';
  import { reconstructPool, suspectPoints } from '../utils/reconstruct.js';
  import { formatDistance } from '../utils/distance.js';

  export let job;
  export let store;
  export let title = 'Perimeter Capture';
  export let description = '';

  $: pts = job.measurement.perimeter_points || [];
  $: reconstructed = reconstructPool(
    pts,
    parseFloat(job.measurement.ab_distance_ft) || 0,
    parseFloat(job.measurement.shallow_depth_ft) || 0,
    parseFloat(job.measurement.deep_depth_ft) || 0,
  );
  $: sus = suspectPoints(pts, parseFloat(job.measurement.ab_distance_ft) || 0);

  let lastAddedNumber = null;
  let undoStack = [];   // snapshots for undo (max 20)

  function snapshot() {
    undoStack = [...undoStack, JSON.parse(JSON.stringify(pts))].slice(-20);
  }

  function addPoint() {
    snapshot();
    const next = (pts.length || 0) + 1;
    job.measurement.perimeter_points = [
      ...pts,
      {
        number: next,
        a_distance_ft: 0,
        b_distance_ft: 0,
        notes: '',
        is_obstacle: false,
        obstacle_kind: null,
      },
    ];
    lastAddedNumber = next;
    store.markDirty();
  }

  function deletePoint(num) {
    snapshot();
    job.measurement.perimeter_points = pts
      .filter(p => p.number !== num)
      .map((p, i) => ({ ...p, number: i + 1 }));
    if (lastAddedNumber === num) lastAddedNumber = null;
    store.markDirty();
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    job.measurement.perimeter_points = prev;
    lastAddedNumber = null;
    store.markDirty();
  }

  function clearAll() {
    if (!confirm(`Delete all ${pts.length} perimeter points?`)) return;
    snapshot();
    job.measurement.perimeter_points = [];
    lastAddedNumber = null;
    store.markDirty();
  }

  // Reconstruct a point to check its quality
  function pointQuality(num) {
    const p = reconstructed.points.find(pp => pp.number === num);
    return p ? p.quality : 'unknown';
  }
  function pointReason(num) {
    const p = reconstructed.points.find(pp => pp.number === num);
    return p ? p.qualityReason : null;
  }
  function isSuspect(num) {
    return sus.some(s => s.number === num);
  }
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- Depth (technician measures these while walking the pool) -->
  <div class="card bg-ink-100/5">
    <p class="text-xs uppercase tracking-wider text-ink-100/70 mb-2">Depths</p>
    <div class="grid grid-cols-2 gap-2">
      <DistanceInput
        label="Shallow"
        bind:value={job.measurement.shallow_depth_ft}
        min="0"
        max="20"
        hint="Water depth at shallow end"
      />
      <DistanceInput
        label="Deep"
        bind:value={job.measurement.deep_depth_ft}
        min="0"
        max="20"
        hint="Water depth at deep end"
      />
    </div>
  </div>

  <!-- Stats bar -->
  <div class="card flex items-center justify-between text-sm">
    <div class="flex gap-4">
      <span>
        <b class="text-pool-500">{pts.length}</b>
        <span class="text-ink-100/60">points</span>
      </span>
      {#if reconstructed.valid && pts.length >= 3}
        <span class="text-green-400">● valid</span>
      {:else if pts.length > 0}
        <span class="text-red-400">● {reconstructed.invalidReasons.length} issue{reconstructed.invalidReasons.length !== 1 ? 's' : ''}</span>
      {/if}
    </div>
    <div class="flex gap-2">
      {#if undoStack.length > 0}
        <button class="btn-ghost text-xs py-1 px-2" on:click={undo} title="Undo last change">
          ↶ Undo
        </button>
      {/if}
      {#if pts.length > 0}
        <button class="btn-ghost text-xs py-1 px-2 text-red-400/80" on:click={clearAll}>
          Clear all
        </button>
      {/if}
    </div>
  </div>

  <!-- Mini-map -->
  <PerimeterMap
    points={pts}
    abDistance={parseFloat(job.measurement.ab_distance_ft) || 0}
    shallowDepth={parseFloat(job.measurement.shallow_depth_ft) || 0}
    deepDepth={parseFloat(job.measurement.deep_depth_ft) || 0}
    highlightNumber={lastAddedNumber}
  />

  <!-- Per-point entry list -->
  <div class="space-y-1">
    <div class="flex items-center justify-between">
      <h4 class="text-base font-bold">Points</h4>
      <span class="text-xs text-ink-100/50">clockwise from the AB midpoint</span>
    </div>

    {#if pts.length === 0}
      <div class="card text-center py-8 border-dashed">
        <p class="text-ink-100/60">No points yet.</p>
        <p class="text-sm text-ink-100/50 mt-1">Tap "+ Add point" to start.</p>
      </div>
    {:else}
      <div class="space-y-1 max-h-[60vh] overflow-y-auto">
        {#each pts as p (p.number)}
          {@const q = pointQuality(p.number)}
          {@const reason = pointReason(p.number)}
          {@const susFlag = isSuspect(p.number)}
          <div
            class="card p-2 {p.number === lastAddedNumber ? 'border-pool-500 border-2' : 'border-ink-100/20'}
                 {susFlag || q === 'invalid' ? 'border-red-500/60' : ''}
                 {q === 'marginal' ? 'border-yellow-500/40' : ''}"
          >
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          {q === 'good' ? 'bg-green-500/20 text-green-300' : ''}
                          {q === 'marginal' ? 'bg-yellow-500/20 text-yellow-300' : ''}
                          {q === 'invalid' ? 'bg-red-500/20 text-red-300' : ''}">
                {p.number}
              </div>
              <div class="flex-1 grid grid-cols-2 gap-1">
                <DistanceInput
                  bind:value={p.a_distance_ft}
                  placeholder="A"
                />
                <DistanceInput
                  bind:value={p.b_distance_ft}
                  placeholder="B"
                />
              </div>
              <button
                class="btn-danger text-sm px-3"
                on:click={() => deletePoint(p.number)}
                aria-label="Delete point {p.number}"
                title="Delete point"
              >×</button>
            </div>
            {#if q === 'invalid' && reason}
              <p class="text-xs text-red-400 mt-1">⚠ {reason}</p>
            {:else if q === 'marginal' && reason}
              <p class="text-xs text-yellow-400 mt-1">⚠ {reason}</p>
            {:else if susFlag}
              <p class="text-xs text-red-400 mt-1">⚠ {sus.find(s => s.number === p.number)?.reason}</p>
            {/if}
            <input
              class="field mt-1 text-sm h-9 py-1"
              placeholder="note (e.g. 'tight curve', 'spa wall')"
              bind:value={p.notes}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Sticky "Add point" button -->
  <div class="sticky bottom-20 -mx-4 px-4 py-2 bg-ink-950/95 backdrop-blur border-t border-ink-100/20 z-10">
    <button class="btn w-full text-lg py-4" on:click={addPoint}>
      + Add point {pts.length > 0 ? `#${pts.length + 1}` : ''}
    </button>
  </div>
</div>
