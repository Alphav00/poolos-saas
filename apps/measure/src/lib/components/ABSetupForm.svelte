<script>
  /**
   * A-B line setup form (wizard step "ab-setup").
   *
   * Captures:
   *   - Pool shape (rectangular / kidney / freeform) -- affects the rest of the wizard
   *   - Estimated pool length (for the suggest-AB feature)
   *   - A-B distance, offset, orientation, note
   *
   * Includes a live top-down sketch (ABSketch) so the tech can verify
   * the A-B line doesn't cross the pool.
   */
  import DistanceInput from './DistanceInput.svelte';
  import ABSketch from './ABSketch.svelte';

  export let job;
  export let store;
  export let title = 'A-B Line Setup';
  export let description = '';

  // Local mirror of the shape fields; bind back to job.measurement
  function setShape(s) {
    job.measurement.shape_type = s;
    store.markDirty();
  }

  function suggestAB() {
    // Industry: 2/3 of pool length, clamped to [10, 50]
    const L = parseFloat(job.measurement.pool_length) || 40;
    const suggested = Math.max(10, Math.min(50, Math.round(L * 2 / 3)));
    job.measurement.ab_distance_ft = suggested;
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

  <!-- Pool shape -->
  <div>
    <label class="label">Pool shape</label>
    <div class="grid grid-cols-3 gap-2">
      {#each [['rectangular', 'Rectangular'], ['kidney', 'Kidney'], ['freeform', 'Freeform + obstacles']] as [val, lbl]}
        <button
          class="btn py-3 text-sm {job.measurement.shape_type === val ? '' : 'opacity-50'}"
          style={job.measurement.shape_type === val
            ? 'background: rgb(14,165,233); color: white;'
            : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
          on:click={() => setShape(val)}
        >{lbl}</button>
      {/each}
    </div>
  </div>

  <!-- Pool length (used for AB suggestion) -->
  <div>
    <label class="label">Estimated pool length (ft)</label>
    <input
      class="field"
      type="number"
      step="0.5"
      min="0"
      max="200"
      bind:value={job.measurement.pool_length}
      placeholder="e.g. 40"
    />
    <p class="text-xs text-ink-100/50 mt-1">
      Longest dimension. Used to suggest an A-B distance.
    </p>
  </div>

  <!-- Visual sketch -->
  <div>
    <label class="label">Sketch preview</label>
    <ABSketch
      shapeType={job.measurement.shape_type}
      poolLength={parseFloat(job.measurement.pool_length) || 40}
      poolWidth={parseFloat(job.measurement.pool_width) || 20}
      abDistance={parseFloat(job.measurement.ab_distance_ft) || 0}
      abOffset={parseFloat(job.measurement.ab_offset_from_pool_ft) || 0}
      orientation={job.measurement.ab_orientation}
    />
  </div>

  <!-- A-B distance -->
  <div>
    <DistanceInput
      label="A-B distance"
      required={true}
      bind:value={job.measurement.ab_distance_ft}
      min="10"
      max="100"
      hint="Industry: 2/3 pool length, min 10ft, max 100ft (use 100ft tape)"
    />
    <button class="btn-ghost text-sm mt-2" on:click={suggestAB}>
      ↺ Suggest from pool length (2/3 × {job.measurement.pool_length || 40}ft)
    </button>
  </div>

  <!-- A-B offset -->
  <div>
    <DistanceInput
      label="A-B offset from pool edge"
      required={true}
      bind:value={job.measurement.ab_offset_from_pool_ft}
      min="3"
      max="20"
      hint="Minimum 3ft from the pool edge"
    />
  </div>

  <!-- Orientation -->
  <div>
    <label class="label">A-B orientation (facing the pool)</label>
    <div class="grid grid-cols-2 gap-2">
      <button
        class="btn py-3 text-sm"
        style={job.measurement.ab_orientation === 'A_left_B_right_facing_pool'
          ? 'background: rgb(14,165,233); color: white;'
          : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
        on:click={() => { job.measurement.ab_orientation = 'A_left_B_right_facing_pool'; store.markDirty(); }}
      >A on left, B on right</button>
      <button
        class="btn py-3 text-sm"
        style={job.measurement.ab_orientation === 'A_right_B_left_facing_pool'
          ? 'background: rgb(14,165,233); color: white;'
          : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
        on:click={() => { job.measurement.ab_orientation = 'A_right_B_left_facing_pool'; store.markDirty(); }}
      >A on right, B on left</button>
    </div>
  </div>

  <!-- Note -->
  <div>
    <label class="label">A-B note</label>
    <textarea
      class="field min-h-20 py-2"
      bind:value={job.measurement.ab_note}
      placeholder="e.g. Standard A-B on long side, 4ft from edge, stakes in lawn"
    ></textarea>
  </div>
</div>
