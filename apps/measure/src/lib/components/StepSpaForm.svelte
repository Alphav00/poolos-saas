<script>
  /**
   * Step & Spa form (wizard step "step-spa").
   *
   * Captures OPTIONAL step/swim-out and attached-spa data. Both sections
   * are independent and default to null/empty — leaving the section off
   * is a normal, valid final state.
   *
   *   - Step: location (center/left/right/offset) + L×W size (+ offset ft
   *           when location='offset') + optional notes.
   *   - Spa:  flush_with_pool / spillover / separate_cover booleans +
   *           from/to point numbers (referencing perimeter points) +
   *           optional notes.
   *
   * Toggling a section OFF sets the field to null (deletes the spec), not
   * just hides it — the spec is the source of truth, and `null` means
   * "no step" / "no spa".
   */
  import DistanceInput from './DistanceInput.svelte';

  export let job;
  export let store;
  export let title = 'Step & Spa';
  export let description = '';

  // -------- Defensive: make sure job.measurement exists --------
  $: if (!job.measurement) {
    job.measurement = {};
  }

  // -------- Local mirrors of step / spa specs --------
  // We read from job.measurement, mutate, and write back. This keeps the
  // parent store as the single source of truth and makes `null` a real
  // state (not just an "empty object").
  $: step = job.measurement.step ?? null;
  $: spa = job.measurement.spa ?? null;

  const STEP_LOCATIONS = [
    ['center',  'Center'],
    ['left',    'Left'],
    ['right',   'Right'],
    ['offset',  'Offset'],
  ];

  // -------- Step section helpers --------
  function enableStep() {
    if (step) return;
    job.measurement.step = {
      location: 'center',
      size_length_ft: 4,
      size_width_ft: 8,
      offset_ft: 0,
      notes: null,
    };
    store.markDirty();
  }

  function disableStep() {
    job.measurement.step = null;
    store.markDirty();
  }

  function setStepLocation(loc) {
    if (!step || step.location === loc) return;
    job.measurement.step = {
      ...step,
      location: loc,
      // Only meaningful for 'offset'; keep a numeric default there
      offset_ft: loc === 'offset' ? (step.offset_ft ?? 0) : null,
    };
    store.markDirty();
  }

  // -------- Spa section helpers --------
  function enableSpa() {
    if (spa) return;
    job.measurement.spa = {
      flush_with_pool: false,
      spillover: false,
      separate_cover: false,
      from_point: null,
      to_point: null,
      notes: null,
    };
    store.markDirty();
  }

  function disableSpa() {
    job.measurement.spa = null;
    store.markDirty();
  }

  function toggleSpaFlag(field) {
    if (!spa) return;
    job.measurement.spa = { ...spa, [field]: !spa[field] };
    store.markDirty();
  }

  // Used to bound from/to point inputs against the actual perimeter.
  $: ptCount = (job.measurement.perimeter_points || []).length;
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- ============ STEP / SWIM-OUT ============ -->
  <div class="card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-base font-bold">Step / swim-out</p>
        <p class="text-xs text-ink-100/60">
          Built-in step or bench inside the pool
        </p>
      </div>
      <button
        class="btn text-sm py-3 px-4 min-w-[72px] {step ? '' : 'opacity-60'}"
        style={step
          ? 'background: rgb(14,165,233); color: white;'
          : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
        on:click={step ? disableStep : enableStep}
        aria-pressed={!!step}
        aria-label="Toggle step / swim-out"
      >
        {step ? 'On' : 'Off'}
      </button>
    </div>

    {#if !step}
      <p class="text-sm text-ink-100/50 mt-3 border-t border-ink-100/10 pt-3">
        No step / swim-out.
      </p>
    {:else}
      <div class="mt-3 pt-3 border-t border-ink-100/10 space-y-4">
        <!-- Location selector -->
        <div>
          <label class="label">Location</label>
          <div class="grid grid-cols-4 gap-2">
            {#each STEP_LOCATIONS as [val, lbl] (val)}
              <button
                class="btn py-3 text-sm {step.location === val ? '' : 'opacity-50'}"
                style={step.location === val
                  ? 'background: rgb(14,165,233); color: white;'
                  : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
                on:click={() => setStepLocation(val)}
                aria-pressed={step.location === val}
              >{lbl}</button>
            {/each}
          </div>
        </div>

        <!-- Step size: length × width -->
        <div>
          <label class="label">Step size</label>
          <div class="grid grid-cols-2 gap-2">
            <DistanceInput
              label="Length"
              bind:value={step.size_length_ft}
              min="0"
              max="50"
              hint="along the pool edge"
            />
            <DistanceInput
              label="Width"
              bind:value={step.size_width_ft}
              min="0"
              max="50"
              hint="into the pool"
            />
          </div>
        </div>

        <!-- Offset (only when location='offset') -->
        {#if step.location === 'offset'}
          <div>
            <DistanceInput
              label="Offset from edge"
              bind:value={step.offset_ft}
              min="0"
              max="20"
              hint="distance from the nearest pool edge"
            />
          </div>
        {/if}

        <!-- Notes -->
        <div>
          <label class="label">Step notes</label>
          <textarea
            class="field min-h-20 py-2"
            bind:value={step.notes}
            placeholder="e.g. corner step, 3rd from shallow end, wraparound bench"
          ></textarea>
        </div>
      </div>
    {/if}
  </div>

  <!-- ============ ATTACHED SPA ============ -->
  <div class="card">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-base font-bold">Attached spa</p>
        <p class="text-xs text-ink-100/60">
          Spa connected to / overflowing into the pool
        </p>
      </div>
      <button
        class="btn text-sm py-3 px-4 min-w-[72px] {spa ? '' : 'opacity-60'}"
        style={spa
          ? 'background: rgb(14,165,233); color: white;'
          : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
        on:click={spa ? disableSpa : enableSpa}
        aria-pressed={!!spa}
        aria-label="Toggle attached spa"
      >
        {spa ? 'On' : 'Off'}
      </button>
    </div>

    {#if !spa}
      <p class="text-sm text-ink-100/50 mt-3 border-t border-ink-100/10 pt-3">
        No attached spa.
      </p>
    {:else}
      <div class="mt-3 pt-3 border-t border-ink-100/10 space-y-4">
        <!-- Flush / spillover / separate cover toggles -->
        <div class="space-y-2">
          <label class="label">Configuration</label>

          <button
            class="w-full flex items-center justify-between gap-2 py-3 px-3 rounded-lg border min-h-[44px]
                   {spa.flush_with_pool
                     ? 'bg-pool-500/15 border-pool-500/50 text-ink-50'
                     : 'bg-ink-100/5 border-ink-100/20 text-ink-100/80'}"
            on:click={() => toggleSpaFlag('flush_with_pool')}
            aria-pressed={spa.flush_with_pool}
          >
            <span class="text-sm font-semibold text-left">
              Flush with pool
              <span class="block text-xs font-normal text-ink-100/60">
                Spa top is level with the pool deck
              </span>
            </span>
            <span class="text-xs font-mono {spa.flush_with_pool ? 'text-pool-500' : 'text-ink-100/40'}">
              {spa.flush_with_pool ? 'YES' : 'NO'}
            </span>
          </button>

          <button
            class="w-full flex items-center justify-between gap-2 py-3 px-3 rounded-lg border min-h-[44px]
                   {spa.spillover
                     ? 'bg-pool-500/15 border-pool-500/50 text-ink-50'
                     : 'bg-ink-100/5 border-ink-100/20 text-ink-100/80'}"
            on:click={() => toggleSpaFlag('spillover')}
            aria-pressed={spa.spillover}
          >
            <span class="text-sm font-semibold text-left">
              Spillover
              <span class="block text-xs font-normal text-ink-100/60">
                Water flows from spa into the pool
              </span>
            </span>
            <span class="text-xs font-mono {spa.spillover ? 'text-pool-500' : 'text-ink-100/40'}">
              {spa.spillover ? 'YES' : 'NO'}
            </span>
          </button>

          <button
            class="w-full flex items-center justify-between gap-2 py-3 px-3 rounded-lg border min-h-[44px]
                   {spa.separate_cover
                     ? 'bg-pool-500/15 border-pool-500/50 text-ink-50'
                     : 'bg-ink-100/5 border-ink-100/20 text-ink-100/80'}"
            on:click={() => toggleSpaFlag('separate_cover')}
            aria-pressed={spa.separate_cover}
          >
            <span class="text-sm font-semibold text-left">
              Separate cover
              <span class="block text-xs font-normal text-ink-100/60">
                Spa gets its own cover (not part of the pool cover)
              </span>
            </span>
            <span class="text-xs font-mono {spa.separate_cover ? 'text-pool-500' : 'text-ink-100/40'}">
              {spa.separate_cover ? 'YES' : 'NO'}
            </span>
          </button>
        </div>

        <!-- From / To point numbers (optional, reference perimeter points) -->
        <div>
          <label class="label">
            Perimeter point range
            <span class="text-xs font-normal text-ink-100/50 ml-1">(optional)</span>
          </label>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <input
                class="field h-11 text-center"
                type="number"
                inputmode="numeric"
                min="1"
                max={Math.max(1, ptCount)}
                step="1"
                bind:value={spa.from_point}
                placeholder="From pt#"
                aria-label="Spa from point"
                title={ptCount > 0
                  ? `Point number (1–${ptCount})`
                  : 'Capture the perimeter first'}
              />
              <p class="text-[10px] text-ink-100/50 mt-1 text-center">From pt#</p>
            </div>
            <div>
              <input
                class="field h-11 text-center"
                type="number"
                inputmode="numeric"
                min="1"
                max={Math.max(1, ptCount)}
                step="1"
                bind:value={spa.to_point}
                placeholder="To pt#"
                aria-label="Spa to point"
                title={ptCount > 0
                  ? `Point number (1–${ptCount})`
                  : 'Capture the perimeter first'}
              />
              <p class="text-[10px] text-ink-100/50 mt-1 text-center">To pt#</p>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="label">Spa notes</label>
          <textarea
            class="field min-h-20 py-2"
            bind:value={spa.notes}
            placeholder="e.g. raised spa 18in, spillover 4ft weir, separate cover on top"
          ></textarea>
        </div>
      </div>
    {/if}
  </div>
</div>
