<script>
  /**
   * Liner spec + site condition (wizard step "liner-spec").
   *
   * Two halves. The top is what the shop cuts — pattern, gauge, bead, coping.
   * The bottom is what the crew hits on drain day: floor and cove condition,
   * and the drainage inputs behind the hydrostatic call. An empty vinyl pool
   * with a high water table floats, so that call is worth making before the
   * truck is loaded, not on site.
   */
  import { assessHydrostaticRisk } from '../utils/linerValidation.js';

  export let job;
  export let store;
  export let title = 'Liner Specification';
  export let description = '';

  const THICKNESSES = [
    [20, '20 mil — builder grade'],
    [27, '27 mil — residential standard'],
    [28, '28 mil'],
    [30, '30 mil — heavy duty'],
  ];

  const BEADS = [
    ['standard_bead', 'Standard bead (snaps into a receiver track)'],
    ['j_hook', 'J-hook (hangs over the wall lip)'],
    ['overlap', 'Overlap (folded over, held by coping)'],
    ['ez_track', 'EZ / universal track'],
  ];

  const COPINGS = [
    ['concrete', 'Concrete'], ['aluminum', 'Aluminum'], ['plastic', 'Plastic'],
    ['stone', 'Stone'], ['cantilever', 'Cantilever'],
  ];

  const FLOORS = [
    ['vermiculite', 'Vermiculite'], ['concrete', 'Concrete'],
    ['sand', 'Sand'], ['grout', 'Grout'],
  ];

  const COVES = [['foam', 'Foam'], ['concrete', 'Concrete'], ['none', 'None']];

  const REPAIRS = [
    ['none', 'None needed'],
    ['standard_wash', 'Standard wash'],
    ['minor_patching', 'Minor patching'],
    ['heavy_resurfacing', 'Heavy resurfacing'],
  ];

  const DRAINAGE = [
    ['french_drain', 'French drain'],
    ['dewatering_well', 'Dewatering well'],
    ['none', 'None'],
    ['unknown', 'Not identified'],
  ];

  const STEP_CONSTRUCTIONS = [
    ['none', 'No step'],
    ['fiberglass_standard', 'Fiberglass'],
    ['vinyl_over_standard', 'Vinyl-over, standard'],
    ['vinyl_over_complex', 'Vinyl-over, radius / wrap-around'],
  ];

  $: spec = job.liner_spec;
  $: liner = job.measurement.liner;

  $: hydro = assessHydrostaticRisk(
    spec?.coping_type,
    liner?.drainage_system,
    liner?.recent_rainfall_days,
    Boolean(liner?.hydrostatic_relief_valve),
  );

  const SEVERITY = {
    low: 'border-green-500/40 bg-green-500/10 text-green-300',
    medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    high: 'border-red-500/50 bg-red-500/10 text-red-300',
  };
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- What the shop cuts -->
  <div class="card space-y-3">
    <p class="text-xs uppercase tracking-wider text-pool-500">What the shop cuts</p>

    <label class="block">
      <span class="label">Pattern <span class="text-red-400">*</span></span>
      <input
        class="field"
        bind:value={spec.pattern_name}
        placeholder="e.g. Sandstone Mosaic"
      />
    </label>
    {#if !String(spec.pattern_name || '').trim()}
      <p class="text-sm text-red-400">✕ Pattern is required on the order.</p>
    {/if}

    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="label">Pattern code</span>
        <input class="field font-mono" bind:value={spec.pattern_code} placeholder="optional" />
      </label>
      <label class="block">
        <span class="label">Thickness</span>
        <select
          class="field"
          bind:value={spec.thickness_mil}
          on:change={() => store.markDirty()}
        >
          {#each THICKNESSES as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
    </div>

    <label class="block">
      <span class="label">Bead type</span>
      <select class="field" bind:value={spec.bead_type} on:change={() => store.markDirty()}>
        {#each BEADS as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="label">Coping</span>
        <select class="field" bind:value={spec.coping_type} on:change={() => store.markDirty()}>
          {#each COPINGS as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="label">Steps</span>
        <select
          class="field"
          bind:value={spec.step_construction}
          on:change={() => store.markDirty()}
        >
          {#each STEP_CONSTRUCTIONS as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
    </div>

    <label class="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        class="w-6 h-6"
        bind:checked={spec.tile_border}
        on:change={() => store.markDirty()}
      />
      <span class="text-sm">Tile border</span>
    </label>
    {#if spec.tile_border}
      <label class="block">
        <span class="label">Border pattern</span>
        <input class="field" bind:value={spec.tile_border_pattern} placeholder="border pattern" />
      </label>
    {/if}

    <label class="block">
      <span class="label">Waste factor (%)</span>
      <input
        class="field"
        type="number"
        min="0"
        max="40"
        step="1"
        bind:value={spec.waste_factor_pct}
      />
      <span class="text-xs text-ink-100/50">
        Fabrication allowance added to the computed material area.
      </span>
    </label>
  </div>

  <!-- The datum confirmation the export enforces -->
  <div
    class="card {spec.measured_at_bead_receiver
      ? 'border-ink-100/20'
      : 'border-red-500/50 bg-red-500/10'}"
  >
    <label class="flex items-start gap-3">
      <input
        type="checkbox"
        class="w-6 h-6 mt-0.5 shrink-0"
        bind:checked={spec.measured_at_bead_receiver}
        on:change={() => store.markDirty()}
      />
      <span>
        <span class="text-sm font-semibold">
          The perimeter was walked at the bead receiver.
        </span>
        <span class="block text-sm text-ink-100/70 mt-1">
          Not the coping edge. A liner cut from a coping-edge walk will not fit, so the
          export is blocked without this.
        </span>
      </span>
    </label>
  </div>

  <!-- What the crew hits on site -->
  <div class="card space-y-3">
    <p class="text-xs uppercase tracking-wider text-pool-500">Site condition</p>

    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="label">Floor</span>
        <select class="field" bind:value={liner.floor_type} on:change={() => store.markDirty()}>
          {#each FLOORS as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="label">Cove</span>
        <select class="field" bind:value={liner.cove_type} on:change={() => store.markDirty()}>
          {#each COVES as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>
    </div>

    <label class="block">
      <span class="label">Floor repair needed</span>
      <select class="field" bind:value={liner.floor_repair} on:change={() => store.markDirty()}>
        {#each REPAIRS as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>

    <label class="block">
      <span class="label">Wall repair notes</span>
      <input class="field" bind:value={liner.wall_repair_notes} placeholder="optional" />
    </label>
  </div>

  <!-- Drain-day risk -->
  <div class="card space-y-3">
    <p class="text-xs uppercase tracking-wider text-pool-500">Drain day</p>

    <label class="block">
      <span class="label">Drainage system</span>
      <select
        class="field"
        bind:value={liner.drainage_system}
        on:change={() => store.markDirty()}
      >
        {#each DRAINAGE as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>

    <label class="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        class="w-6 h-6"
        bind:checked={liner.hydrostatic_relief_valve}
        on:change={() => store.markDirty()}
      />
      <span class="text-sm">Hydrostatic relief valve present</span>
    </label>

    <label class="block">
      <span class="label">Consecutive days of recent rain</span>
      <input
        class="field"
        type="number"
        min="0"
        max="30"
        bind:value={liner.recent_rainfall_days}
      />
    </label>

    <label class="block">
      <span class="label">Water table notes</span>
      <input class="field" bind:value={liner.water_table_notes} placeholder="optional" />
    </label>

    <div class="card {SEVERITY[hydro.severity]}">
      <p class="text-sm font-bold">Hydrostatic risk: {hydro.severity.toUpperCase()}</p>
      <ul class="mt-2 space-y-1">
        {#each hydro.notes as note}
          <li class="text-sm">• {note}</li>
        {/each}
      </ul>
      {#if hydro.severity === 'high'}
        <p class="text-sm font-semibold mt-2">Do not pull the water yet.</p>
      {/if}
    </div>
  </div>
</div>
