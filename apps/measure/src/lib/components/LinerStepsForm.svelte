<script>
  /**
   * Vinyl-over steps (wizard step "liner-steps").
   *
   * Only vinyl-over steps need riser detail — the liner terminates at the wall
   * of a fiberglass step and bills no material for it. Where the liner does
   * wrap the step, every riser is measured individually and the stack has to
   * add up to the shallow wall height, because both describe the same drop
   * from the bead receiver to the shallow floor.
   *
   * Tolerance here is half an inch, not the two inches the floor gets: a riser
   * stack that is off shows as a pucker in the finished vinyl.
   */
  import ClosureCheck from './ClosureCheck.svelte';
  import DistanceInput from './DistanceInput.svelte';
  import { formatDistance } from '../utils/distance.js';
  import { checkRiserSum, shallowWallHeightFt } from '../utils/linerValidation.js';

  export let job;
  export let store;
  export let title = 'Steps';
  export let description = '';

  const CONSTRUCTIONS = [
    ['none', 'No step'],
    ['fiberglass_standard', 'Fiberglass (liner stops at the step)'],
    ['vinyl_over_standard', 'Vinyl-over, standard'],
    ['vinyl_over_complex', 'Vinyl-over, radius / wrap-around'],
  ];

  const CORNERS = [
    ['ninety_degree', '90°'],
    ['radius', 'Radius'],
    ['diagonal', 'Diagonal'],
  ];

  const LOCATIONS = [
    ['center', 'Center'], ['left', 'Left'], ['right', 'Right'],
    ['offset', 'Offset'], ['swimout', 'Swim-out'], ['spa', 'Spa'],
  ];

  $: liner = job.measurement.liner;
  $: steps = liner?.steps || [];
  $: shallowWall = shallowWallHeightFt(
    liner?.wall_heights || [],
    liner?.profile_segments || [],
    parseFloat(job.measurement.shallow_depth_ft) || 0,
  );

  const isVinylOver = (s) =>
    s.construction === 'vinyl_over_standard' || s.construction === 'vinyl_over_complex';

  function riserCheck(step, i) {
    if (!isVinylOver(step)) return null;
    return checkRiserSum(step.risers, shallowWall, undefined, `Step ${i + 1}`);
  }

  function addStep() {
    liner.steps = [
      ...steps,
      {
        construction: 'vinyl_over_standard',
        location: 'center',
        width_ft: 8,
        corner_type: 'radius',
        foam_thickness_in: null,
        risers: [],
        from_point: null,
        to_point: null,
        notes: '',
      },
    ];
    store.markDirty();
  }

  function deleteStep(i) {
    liner.steps = steps.filter((_, idx) => idx !== i);
    store.markDirty();
  }

  function renumber(risers) {
    return risers.map((r, i) => ({ ...r, index: i + 1 }));
  }

  function addRiser(step) {
    step.risers = renumber([
      ...(step.risers || []),
      { index: (step.risers || []).length + 1, riser_height_ft: 1, tread_depth_ft: 1 },
    ]);
    liner.steps = [...steps];
    store.markDirty();
  }

  /**
   * Fill the stack with N equal risers that close on the shallow wall height.
   * A convenience, not a substitute: the tech still has to check each against
   * the tape, since real risers are rarely equal.
   */
  function splitEvenly(step, count) {
    const each = shallowWall / count;
    step.risers = Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      riser_height_ft: Math.round(each * 1000) / 1000,
      tread_depth_ft: step.risers?.[i]?.tread_depth_ft ?? 1,
    }));
    liner.steps = [...steps];
    store.markDirty();
  }

  function deleteRiser(step, i) {
    step.risers = renumber(step.risers.filter((_, idx) => idx !== i));
    liner.steps = [...steps];
    store.markDirty();
  }

  function riserTotal(step) {
    return (step.risers || []).reduce((sum, r) => sum + (parseFloat(r.riser_height_ft) || 0), 0);
  }
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <div class="card border-pool-500/30 bg-pool-500/5">
    <p class="text-xs uppercase tracking-wider text-pool-500 mb-2">Checked against</p>
    <div class="flex items-baseline gap-2">
      <span class="font-mono text-xl font-bold text-ink-50">{formatDistance(shallowWall)}</span>
      <span class="text-sm text-ink-100/60">shallow wall height</span>
    </div>
    <p class="text-sm text-ink-100/70 mt-2">
      Riser heights must add up to this. Both run from the bead receiver down to the
      shallow floor, so they describe the same drop.
    </p>
  </div>

  {#if steps.length === 0}
    <div class="card text-center py-8 border-dashed">
      <p class="text-ink-100/60">No steps recorded.</p>
      <p class="text-sm text-ink-100/50 mt-1">
        Skip this step if the pool has none, or the liner stops at a fiberglass step.
      </p>
      <button class="btn mt-4" on:click={addStep}>+ Add step</button>
    </div>
  {/if}

  {#each steps as step, i}
    <div class="card space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-pool-500">Step {i + 1}</span>
        <button class="btn-ghost text-red-400/80 px-3" on:click={() => deleteStep(i)}>
          Delete
        </button>
      </div>

      <label class="block">
        <span class="label">Construction</span>
        <select class="field" bind:value={step.construction} on:change={() => store.markDirty()}>
          {#each CONSTRUCTIONS as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>

      {#if !isVinylOver(step)}
        <p class="text-sm text-ink-100/60">
          The liner terminates at this step, so it needs no riser detail and consumes
          no material.
        </p>
      {:else}
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="label">Location</span>
            <select class="field" bind:value={step.location} on:change={() => store.markDirty()}>
              {#each LOCATIONS as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </label>
          <label class="block">
            <span class="label">Back corner <span class="text-red-400">*</span></span>
            <select class="field" bind:value={step.corner_type} on:change={() => store.markDirty()}>
              <option value={null}>— required —</option>
              {#each CORNERS as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </label>
        </div>
        {#if !step.corner_type}
          <p class="text-sm text-red-400">
            ✕ Back-corner type is required — each cuts to a different pattern.
          </p>
        {/if}

        <div class="space-y-3">
          <DistanceInput bind:value={step.width_ft} label="Width" min={0.5} max={40} required />
          <label class="block">
            <span class="label">Foam thickness (in)</span>
            <input
              class="field"
              type="number"
              step="0.125"
              min="0"
              max="4"
              bind:value={step.foam_thickness_in}
              placeholder="none"
            />
          </label>
        </div>

        <!-- Riser stack -->
        <div class="pt-3 border-t border-ink-100/10 space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-xs uppercase tracking-wider text-ink-100/50">
              Risers — top to bottom
            </span>
            <span class="text-sm font-mono text-ink-50">
              {formatDistance(riserTotal(step))} total
            </span>
          </div>

          {#if (step.risers || []).length === 0}
            <p class="text-sm text-ink-100/60">
              Measure each riser individually. Or start from an even split and correct
              each against the tape:
            </p>
            <div class="flex gap-2">
              {#each [2, 3, 4] as n}
                <button class="btn-ghost flex-1" on:click={() => splitEvenly(step, n)}>
                  {n} risers
                </button>
              {/each}
            </div>
          {/if}

          <!-- One riser per block, fields stacked: a DistanceInput is two fields
               wide already, so a row of two plus a delete button leaves nothing
               readable on a phone. -->
          {#each step.risers || [] as riser, ri (ri)}
            <div class="rounded-lg border border-ink-100/10 p-3 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-ink-100/70">Riser {riser.index}</span>
                <button
                  class="btn-ghost text-red-400/80 px-3"
                  on:click={() => deleteRiser(step, ri)}
                  aria-label="Delete riser {riser.index}"
                >
                  Delete
                </button>
              </div>
              <DistanceInput
                bind:value={riser.riser_height_ft}
                label="Riser height"
                min={0.1}
                max={3}
              />
              <DistanceInput
                bind:value={riser.tread_depth_ft}
                label="Tread depth"
                min={0}
                max={6}
              />
            </div>
          {/each}

          <button class="btn-ghost w-full" on:click={() => addRiser(step)}>+ Add riser</button>

          <ClosureCheck
            check={riserCheck(step, i)}
            measuredLabel="of risers"
            expectedLabel="shallow wall"
          />
        </div>
      {/if}

      <label class="block">
        <span class="label">Notes</span>
        <input class="field" bind:value={step.notes} placeholder="optional" />
      </label>
    </div>
  {/each}

  {#if steps.length > 0}
    <button class="btn w-full" on:click={addStep}>+ Add step</button>
  {/if}
</div>
