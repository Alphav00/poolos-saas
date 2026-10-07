<script>
  /**
   * Fitting cut-out schedule (wizard step "fittings").
   *
   * Every penetration needs a gasketed cut-out, and the shop cuts them from
   * these coordinates. A fitting is located the same way everything else on the
   * job is: by A/B tape pair where the tech measured one, or by the nearest
   * perimeter point. Depth below the bead places it on the wall; floor fittings
   * (main drains) are flagged instead.
   */
  import DistanceInput from './DistanceInput.svelte';

  export let job;
  export let store;
  export let title = 'Fittings';
  export let description = '';

  const KINDS = [
    ['skimmer', 'Skimmer'],
    ['return', 'Return'],
    ['main_drain', 'Main drain'],
    ['light', 'Light'],
    ['step_jet', 'Step jet'],
    ['vacuum_port', 'Vacuum port'],
    ['auto_fill', 'Auto-fill'],
    ['wall_fitting', 'Other wall fitting'],
  ];

  const LABELS = Object.fromEntries(KINDS);

  // What a conventional residential pool has. Offered as a starting set so the
  // tech edits rather than types.
  const TYPICAL = [
    { kind: 'skimmer', label: 'Skimmer 1' },
    { kind: 'return', label: 'Return 1' },
    { kind: 'return', label: 'Return 2' },
    { kind: 'light', label: 'Pool light' },
    { kind: 'main_drain', label: 'Main drain', on_floor: true },
  ];

  $: liner = job.measurement.liner;
  $: fittings = liner?.fittings || [];
  $: pointCount = (job.measurement.perimeter_points || []).length;
  $: kinds = fittings.map(f => f.kind);
  $: counts = KINDS.map(([k, label]) => [label, kinds.filter(x => x === k).length])
    .filter(([, n]) => n > 0);

  function blank(overrides = {}) {
    return {
      kind: 'return',
      label: '',
      a_distance_ft: null,
      b_distance_ft: null,
      near_point: null,
      depth_below_bead_ft: 1,
      on_floor: false,
      notes: '',
      ...overrides,
    };
  }

  function addFitting() {
    liner.fittings = [...fittings, blank()];
    store.markDirty();
  }

  function addTypical() {
    liner.fittings = [...fittings, ...TYPICAL.map(t => blank(t))];
    store.markDirty();
  }

  function deleteFitting(i) {
    liner.fittings = fittings.filter((_, idx) => idx !== i);
    store.markDirty();
  }

  /** A fitting the shop cannot place is worse than one that is missing. */
  function locationError(f) {
    const hasAb = f.a_distance_ft > 0 && f.b_distance_ft > 0;
    const hasPoint = f.near_point != null && f.near_point !== '';
    if (!hasAb && !hasPoint) {
      return 'Needs a location: both A and B distances, or a nearby point number.';
    }
    if (hasPoint && pointCount > 0 && (f.near_point < 1 || f.near_point > pointCount)) {
      return `Point ${f.near_point} is outside the captured range (1–${pointCount}).`;
    }
    return null;
  }
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <div class="card">
    <p class="text-xs uppercase tracking-wider text-ink-100/50 mb-2">Recorded</p>
    {#if fittings.length === 0}
      <p class="text-sm text-yellow-400">
        ⚠ Nothing yet. Every skimmer, return, light and main drain needs a cut-out.
      </p>
    {:else}
      <p class="text-sm text-ink-100/80">
        {#each counts as [label, n], i}<b class="text-ink-50">{n}</b> {label}{n > 1 ? 's' : ''}{i < counts.length - 1 ? ' · ' : ''}{/each}
      </p>
      <div class="mt-2 space-y-1">
        {#if !kinds.includes('skimmer')}
          <p class="text-xs text-yellow-400">⚠ No skimmer — confirm the pool has none.</p>
        {/if}
        {#if !kinds.includes('main_drain')}
          <p class="text-xs text-yellow-400">⚠ No main drain — confirm the pool has none.</p>
        {/if}
      </div>
    {/if}
  </div>

  {#if fittings.length === 0}
    <div class="card text-center py-8 border-dashed">
      <p class="text-ink-100/60">No fittings yet.</p>
      <button class="btn mt-4" on:click={addTypical}>+ Add the typical set</button>
      <button class="btn-ghost mt-2 w-full" on:click={addFitting}>+ Add one fitting</button>
    </div>
  {/if}

  {#each fittings as fitting, i}
    <div class="card space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-pool-500">
          {LABELS[fitting.kind] || 'Fitting'} {fitting.label ? `— ${fitting.label}` : ''}
        </span>
        <button class="btn-ghost text-red-400/80 px-3" on:click={() => deleteFitting(i)}>
          Delete
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="label">Kind</span>
          <select class="field" bind:value={fitting.kind} on:change={() => store.markDirty()}>
            {#each KINDS as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </label>
        <label class="block">
          <span class="label">Label</span>
          <input class="field" bind:value={fitting.label} placeholder="e.g. Return 2" />
        </label>
      </div>

      <label class="flex items-center gap-3 py-2">
        <input
          type="checkbox"
          class="w-6 h-6"
          bind:checked={fitting.on_floor}
          on:change={() => store.markDirty()}
        />
        <span class="text-sm">On the floor (not the wall)</span>
      </label>

      {#if !fitting.on_floor}
        <DistanceInput
          bind:value={fitting.depth_below_bead_ft}
          label="Depth below the bead"
          min={0}
          max={20}
        />
      {/if}

      <div class="pt-3 border-t border-ink-100/10 space-y-3">
        <p class="text-xs uppercase tracking-wider text-ink-100/50">Location</p>
        <label class="block">
          <span class="label">Nearest point #</span>
          <input
            class="field"
            type="number"
            min="1"
            max={pointCount || undefined}
            bind:value={fitting.near_point}
            placeholder="—"
          />
        </label>
        <p class="text-xs text-ink-100/50">or tape it from both stakes:</p>
        <div class="space-y-3">
          <DistanceInput bind:value={fitting.a_distance_ft} label="From A" min={0} />
          <DistanceInput bind:value={fitting.b_distance_ft} label="From B" min={0} />
        </div>

        {#if locationError(fitting)}
          <p class="text-sm text-red-400">✕ {locationError(fitting)}</p>
        {/if}
      </div>

      <label class="block">
        <span class="label">Notes</span>
        <input class="field" bind:value={fitting.notes} placeholder="optional" />
      </label>
    </div>
  {/each}

  {#if fittings.length > 0}
    <button class="btn w-full" on:click={addFitting}>+ Add fitting</button>
  {/if}
</div>
