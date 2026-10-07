<script>
  /**
   * Wall heights (wizard step "wall-heights").
   *
   * One reading per wall, bead receiver down to the top of the cove. The datum
   * matters more than the number: measuring from the coping edge instead of the
   * bead receiver is the classic way to scrap a liner, so the form says so and
   * the spec step carries a checkbox the export enforces.
   */
  import DistanceInput from './DistanceInput.svelte';
  import { formatDistance } from '../utils/distance.js';
  import { WALL_SPREAD_WARN_IN } from '../utils/linerValidation.js';

  export let job;
  export let store;
  export let title = 'Wall Heights';
  export let description = '';

  // The walls a conventional rectangle has; techs can rename or add.
  const SUGGESTED = ['shallow_end', 'north_wall', 'deep_end', 'south_wall'];

  $: walls = job.measurement.liner?.wall_heights || [];
  $: heights = walls.map(w => parseFloat(w.height_ft) || 0).filter(h => h > 0);
  $: spreadIn = heights.length > 1 ? (Math.max(...heights) - Math.min(...heights)) * 12 : 0;
  $: hasShallow = walls.some(w => String(w.label || '').toLowerCase().includes('shallow'));
  $: pointCount = (job.measurement.perimeter_points || []).length;

  function nextLabel() {
    const used = new Set(walls.map(w => String(w.label || '').toLowerCase()));
    const free = SUGGESTED.find(s => !used.has(s));
    return free || `wall_${walls.length + 1}`;
  }

  function addWall() {
    job.measurement.liner.wall_heights = [
      ...walls,
      { label: nextLabel(), at_point: null, height_ft: 3.5, notes: '' },
    ];
    store.markDirty();
  }

  function addAllSuggested() {
    const used = new Set(walls.map(w => String(w.label || '').toLowerCase()));
    const additions = SUGGESTED.filter(s => !used.has(s)).map(label => ({
      label, at_point: null, height_ft: 3.5, notes: '',
    }));
    job.measurement.liner.wall_heights = [...walls, ...additions];
    store.markDirty();
  }

  function deleteWall(i) {
    job.measurement.liner.wall_heights = walls.filter((_, idx) => idx !== i);
    store.markDirty();
  }
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- The datum, stated where it cannot be missed -->
  <div class="card border-pool-500/30 bg-pool-500/5">
    <p class="text-xs uppercase tracking-wider text-pool-500 mb-2">Measure from</p>
    <p class="text-ink-50 font-semibold">
      The bead receiver — where the liner snaps into the track.
    </p>
    <p class="text-sm text-ink-100/70 mt-1">
      Not the top of the deck, and not the coping edge. Measure straight down to the
      top of the cove.
    </p>
  </div>

  {#if walls.length > 0}
    <div class="card flex items-center justify-between text-sm flex-wrap gap-2">
      <span class="text-ink-100/70">
        <b class="text-pool-500">{walls.length}</b> wall{walls.length === 1 ? '' : 's'}
        {#if heights.length > 0}
          · avg
          <b class="font-mono text-ink-50">
            {formatDistance(heights.reduce((a, b) => a + b, 0) / heights.length)}
          </b>
        {/if}
      </span>
      {#if spreadIn > WALL_SPREAD_WARN_IN}
        <span class="text-xs text-yellow-400 font-semibold">
          ⚠ varies by {spreadIn.toFixed(1)}" — stepped wall?
        </span>
      {:else if heights.length > 1}
        <span class="text-xs text-green-400 font-semibold">✓ consistent</span>
      {/if}
    </div>
  {/if}

  {#if !hasShallow && walls.length > 0}
    <div class="card border-yellow-500/40 bg-yellow-500/10">
      <p class="text-sm text-yellow-300">
        ⚠ No wall labelled for the shallow end. Step risers are checked against that
        reading, so name one <span class="font-mono">shallow_end</span>.
      </p>
    </div>
  {/if}

  {#if walls.length === 0}
    <div class="card text-center py-8 border-dashed">
      <p class="text-ink-100/60">No wall heights yet.</p>
      <button class="btn mt-4" on:click={addAllSuggested}>
        + Add the 4 standard walls
      </button>
    </div>
  {/if}

  {#each walls as wall, i}
    <div class="card space-y-3">
      <div class="flex items-center justify-between gap-2">
        <input
          class="field flex-1 font-mono"
          bind:value={wall.label}
          placeholder="wall name"
          aria-label="Wall name"
        />
        <button class="btn-ghost text-red-400/80 px-3" on:click={() => deleteWall(i)}>
          Delete
        </button>
      </div>

      <DistanceInput
        bind:value={wall.height_ft}
        label="Height (bead receiver to top of cove)"
        min={0.5}
        max={12}
        required
      />

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="label">At point # (optional)</span>
          <input
            class="field"
            type="number"
            min="1"
            max={pointCount || undefined}
            bind:value={wall.at_point}
            placeholder="—"
          />
        </label>
        <label class="block">
          <span class="label">Notes</span>
          <input class="field" bind:value={wall.notes} placeholder="optional" />
        </label>
      </div>
    </div>
  {/each}

  {#if walls.length > 0}
    <button class="btn w-full" on:click={addWall}>+ Add wall</button>
  {/if}
</div>
