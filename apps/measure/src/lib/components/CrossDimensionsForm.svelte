<script>
  /**
   * Cross-Dimensions form (wizard step "cross-dims").
   *
   * Industry-standard QA check against the A/B reconstruction: the
   * technician measures 2-4 diagonal distances between numbered
   * perimeter points. Each cross-dim is auto-validated against the
   * reconstructed length/width:
   *
   *   - within 1% (or 0.5ft, whichever is greater) -> green check
   *   - within 5% (or 2ft,    whichever is greater) -> yellow
   *   - otherwise                                  -> red "off by Xft"
   *
   * Role auto-detect: if entry is within 10% of `reconstructed.lengthFt`
   * AND lengthFt > widthFt, label "Length"; else if within 10% of
   * widthFt, label "Width"; else "Diagonal" (no validation).
   *
   * Skippable — warnings are info-only and do not block wizard advance.
   */
  import DistanceInput from './DistanceInput.svelte';
  import { reconstructPool } from '../utils/reconstruct.js';
  import { classifyCrossDim, entryWarning as entryWarningFn } from '../utils/crossDimValidation.js';
  import { formatDistance } from '../utils/distance.js';

  export let job;
  export let store;
  export let title = 'Cross-Dimensions';
  export let description = '';

  // Defensive init (idempotent — won't re-fire once set)
  $: if (!job.measurement.cross_dimensions) {
    job.measurement.cross_dimensions = [];
  }

  $: entries = job.measurement.cross_dimensions || [];
  $: pts = job.measurement.perimeter_points || [];
  $: abDist = parseFloat(job.measurement.ab_distance_ft) || 0;
  $: shallow = parseFloat(job.measurement.shallow_depth_ft) || 0;
  $: deep = parseFloat(job.measurement.deep_depth_ft) || 0;

  // Live reconstruction (used for length/width + per-point coords)
  $: reconstructed = reconstructPool(pts, abDist, shallow, deep);
  $: lengthFt = reconstructed.lengthFt;
  $: widthFt = reconstructed.widthFt;
  $: reconstructedValid = reconstructed.valid && lengthFt > 0 && widthFt > 0;

  // Look up a reconstructed point's coordinates (for the From/To tooltips)
  function pointCoord(num) {
    if (num == null) return null;
    const p = reconstructed.points.find(pp => pp.number === Number(num));
    if (!p || p.quality === 'invalid') return null;
    return { x: p.x, y: p.y };
  }

  // Use the pure helper for the role + tolerance classification
  function classify(entry) {
    return classifyCrossDim(entry && entry.distance_ft, lengthFt, widthFt);
  }

  // Per-entry structural validation (out-of-range points, same point, etc.)
  function entryWarning(entry) {
    return entryWarningFn(entry, pts.length);
  }

  function addEntry() {
    if (pts.length === 0) return;
    job.measurement.cross_dimensions = [
      ...entries,
      { from_point: 1, to_point: Math.min(2, pts.length), distance_ft: 0 },
    ];
    store.markDirty();
  }

  function deleteEntry(i) {
    job.measurement.cross_dimensions = entries.filter((_, idx) => idx !== i);
    store.markDirty();
  }

  function clearAll() {
    if (!confirm(`Delete all ${entries.length} cross-dimensions?`)) return;
    job.measurement.cross_dimensions = [];
    store.markDirty();
  }

  // Status pill colors
  function statusClasses(s) {
    switch (s) {
      case 'green':  return 'text-green-300  bg-green-500/15  border-green-500/40';
      case 'yellow': return 'text-yellow-300 bg-yellow-500/15 border-yellow-500/40';
      case 'red':    return 'text-red-300    bg-red-500/15    border-red-500/40';
      case 'info':   return 'text-ink-100/70 bg-ink-100/10    border-ink-100/20';
      default:       return 'text-ink-100/40 bg-ink-100/5     border-ink-100/10';
    }
  }

  // Tooltip text for the From / To number inputs
  function pointTooltip(num) {
    if (!num) return 'Point number';
    const c = pointCoord(num);
    if (c) {
      return `Pt ${num}: (${c.x.toFixed(1)}', ${c.y.toFixed(1)}')`;
    }
    return pts.length > 0
      ? `Point number (1–${pts.length})`
      : 'Capture the perimeter first';
  }
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- Auto-validate callout -->
  <div class="card border-pool-500/30 bg-pool-500/5">
    <p class="text-xs uppercase tracking-wider text-pool-500 mb-2">Reconstructed</p>

    {#if pts.length === 0}
      <p class="text-yellow-400 text-sm font-semibold">
        ⚠ Capture the perimeter first.
      </p>
    {:else if reconstructedValid}
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold font-mono text-ink-50">
          {formatDistance(lengthFt)} × {formatDistance(widthFt)}
        </span>
        <span class="text-sm text-ink-100/60">length × width</span>
      </div>
    {:else}
      <p class="text-yellow-400 text-sm font-semibold">
        ⚠ Reconstructed dimensions unavailable (need ≥3 valid perimeter points).
      </p>
    {/if}

    <div class="mt-3 pt-3 border-t border-ink-100/10 flex items-center justify-between gap-2">
      <span class="text-sm text-ink-100/70">
        <b class="text-pool-500">{entries.length}</b> of 4 recommended cross-dims
      </span>
      {#if entries.length === 0}
        <span class="text-xs text-yellow-400 font-semibold text-right">
          ⚠ Industry standard requires 2–4 cross-dimensions.
        </span>
      {:else if entries.length >= 2}
        <span class="text-xs text-green-400 font-semibold">
          ✓ looks good
        </span>
      {:else}
        <span class="text-xs text-ink-100/60">
          add at least 1 more
        </span>
      {/if}
    </div>
  </div>

  <!-- Stats bar (only when entries exist) -->
  {#if entries.length > 0}
    <div class="card flex items-center justify-between text-sm">
      <span class="text-ink-100/70">
        <b class="text-pool-500">{entries.length}</b>
        cross-dim{entries.length !== 1 ? 's' : ''}
      </span>
      <button
        class="btn-ghost text-xs py-1 px-2 text-red-400/80"
        on:click={clearAll}
      >
        Clear all
      </button>
    </div>
  {/if}

  <!-- Per-entry list -->
  {#if entries.length === 0}
    <div class="card text-center py-8 border-dashed">
      <p class="text-ink-100/60">No cross-dimensions yet.</p>
      <p class="text-sm text-ink-100/50 mt-1">
        Tap "+ Add cross-dim" to start.
      </p>
    </div>
  {:else}
    <div class="space-y-1 max-h-[60vh] overflow-y-auto">
      {#each entries as entry, i (i)}
        {@const cls = classify(entry)}
        {@const warn = entryWarning(entry)}
        <div
          class="card p-2
                 {cls.status === 'red'    ? 'border-red-500/60'    : ''}
                 {cls.status === 'yellow' ? 'border-yellow-500/40' : ''}"
        >
          <!-- Row 1: order badge, from/to inputs, delete -->
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                     bg-pool-500/20 text-pool-500 flex-shrink-0"
              title="Cross-dim #{i + 1}"
            >
              {i + 1}
            </div>

            <div class="flex items-center gap-1 flex-1 min-w-0">
              <input
                class="field w-16 h-10 text-center text-base px-2"
                type="number"
                inputmode="numeric"
                min="1"
                max={Math.max(1, pts.length)}
                step="1"
                bind:value={entry.from_point}
                title={pointTooltip(entry.from_point)}
                placeholder="From"
                aria-label="From point"
              />
              <span class="text-ink-100/40 font-bold px-1">→</span>
              <input
                class="field w-16 h-10 text-center text-base px-2"
                type="number"
                inputmode="numeric"
                min="1"
                max={Math.max(1, pts.length)}
                step="1"
                bind:value={entry.to_point}
                title={pointTooltip(entry.to_point)}
                placeholder="To"
                aria-label="To point"
              />
            </div>

            <button
              class="btn-danger text-sm px-3 flex-shrink-0"
              on:click={() => deleteEntry(i)}
              aria-label="Delete cross-dim {i + 1}"
              title="Delete cross-dim"
            >×</button>
          </div>

          <!-- Row 2: distance input + status badge -->
          <div class="flex items-end gap-2 mt-2">
            <div class="flex-1 min-w-0">
              <DistanceInput
                bind:value={entry.distance_ft}
                placeholder="0"
                min="0"
                max="500"
                hint="tape between the two points"
              />
            </div>
            <div
              class="flex flex-col items-center justify-center px-2 py-1 rounded border min-w-[72px]
                     {statusClasses(cls.status)}"
              title={cls.status === 'red'
                ? `Differs from reconstructed ${cls.role.toLowerCase()} (${formatDistance(cls.role === 'Length' ? lengthFt : widthFt)}) by ${cls.message.replace('off ', '')}`
                : cls.role === 'Diagonal'
                  ? 'Diagonal measurement — not validated against reconstruction'
                  : `Reconstructed ${cls.role.toLowerCase()}: ${formatDistance(cls.role === 'Length' ? lengthFt : widthFt)}`}
            >
              <span class="text-[10px] uppercase font-semibold leading-none">
                {cls.role}
              </span>
              <span class="text-xs leading-none font-mono mt-0.5">
                {cls.message}
              </span>
            </div>
          </div>

          {#if warn}
            <p class="text-xs text-yellow-400 mt-1">⚠ {warn}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Sticky "Add cross-dim" button -->
  <div class="sticky bottom-20 -mx-4 px-4 py-2 bg-ink-950/95 backdrop-blur border-t border-ink-100/20 z-10">
    <button
      class="btn w-full text-lg py-4"
      on:click={addEntry}
      disabled={pts.length === 0}
      title={pts.length === 0 ? 'Capture perimeter points first' : `Add cross-dimension #${entries.length + 1}`}
    >
      + Add cross-dim {entries.length > 0 ? `#${entries.length + 1}` : ''}
    </button>
  </div>
</div>
