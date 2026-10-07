<script>
  /**
   * Floor profile + hopper (wizard step "liner-profile").
   *
   * The tech breaks the floor section into runs, shallow wall to deep wall, and
   * the horizontal runs have to add up to the pool length the perimeter walk
   * reconstructed (E + N + M + L = B on the supplier forms). The check runs on
   * every keystroke, because the only cheap moment to re-tape a run is while
   * the tech is still standing next to it.
   *
   * Each run also shows its developed length — the slant the liner actually
   * follows. That number is always >= the horizontal run, and it is the one the
   * floor panel is cut to.
   */
  import ClosureCheck from './ClosureCheck.svelte';
  import DistanceInput from './DistanceInput.svelte';
  import { formatDistance } from '../utils/distance.js';
  import { reconstructPool } from '../utils/reconstruct.js';
  import {
    checkHopperClosure,
    checkProfileClosure,
    checkProfileContinuity,
    profileTotals,
    segmentDevelopedLengthFt,
  } from '../utils/linerValidation.js';

  export let job;
  export let store;
  export let title = 'Floor Profile';
  export let description = '';

  const KINDS = [
    ['shallow_floor', 'Shallow floor'],
    ['slope', 'Slope'],
    ['hopper_slope', 'Hopper slope'],
    ['deep_floor', 'Hopper bottom'],
    ['break', 'Vertical break'],
  ];

  $: liner = job.measurement.liner;
  $: segments = liner?.profile_segments || [];
  $: hopper = liner?.hopper || null;

  $: pts = job.measurement.perimeter_points || [];
  $: reconstructed = reconstructPool(
    pts,
    parseFloat(job.measurement.ab_distance_ft) || 0,
    parseFloat(job.measurement.shallow_depth_ft) || 0,
    parseFloat(job.measurement.deep_depth_ft) || 0,
  );
  $: lengthFt = reconstructed.lengthFt;
  $: widthFt = reconstructed.widthFt;

  $: totals = profileTotals(segments);
  $: closure = checkProfileClosure(segments, lengthFt);
  $: continuity = checkProfileContinuity(segments);
  $: hopperCheck = checkHopperClosure(hopper, widthFt);
  $: hasHopperBottom = segments.some(s => s.kind === 'deep_floor');


  function developed(seg) {
    return segmentDevelopedLengthFt(
      parseFloat(seg.horizontal_run_ft) || 0,
      (parseFloat(seg.depth_end_ft) || 0) - (parseFloat(seg.depth_start_ft) || 0),
    );
  }

  function renumber(list) {
    return list.map((s, i) => ({ ...s, order: i + 1 }));
  }

  function addSegment() {
    // A new run starts where the last one ended, so the section stays closed
    // by default and the tech only edits what they actually measured.
    const last = segments[segments.length - 1];
    const startDepth = last
      ? parseFloat(last.depth_end_ft) || 0
      : parseFloat(job.measurement.shallow_depth_ft) || 3.5;
    const kind = segments.length === 0 ? 'shallow_floor' : 'slope';

    liner.profile_segments = renumber([
      ...segments,
      {
        order: segments.length + 1,
        kind,
        horizontal_run_ft: 0,
        depth_start_ft: startDepth,
        depth_end_ft: startDepth,
        label: '',
      },
    ]);
    store.markDirty();
  }

  function deleteSegment(i) {
    liner.profile_segments = renumber(segments.filter((_, idx) => idx !== i));
    store.markDirty();
  }

  /** Keep the chain closed: editing a run's end depth moves the next run's start. */
  function syncDownstream(i) {
    const cur = segments[i];
    const next = segments[i + 1];
    if (next) {
      next.depth_start_ft = cur.depth_end_ft;
      liner.profile_segments = [...segments];
    }
    store.markDirty();
  }

  function addHopper() {
    liner.hopper = {
      left_slope_width_ft: 0,
      bottom_width_ft: 0,
      right_slope_width_ft: 0,
      bottom_length_ft: null,
    };
    store.markDirty();
  }

  function removeHopper() {
    liner.hopper = null;
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

  <!-- Live longitudinal closure -->
  {#if pts.length < 4}
    <div class="card border-yellow-500/40 bg-yellow-500/10">
      <p class="text-sm text-yellow-300">
        ⚠ Capture the perimeter first — the profile is checked against the pool length
        the walk reconstructs.
      </p>
    </div>
  {:else}
    <ClosureCheck
      check={closure}
      measuredLabel="of floor runs"
      expectedLabel="pool length"
    />
  {/if}

  {#each continuity as problem}
    <div class="card border-red-500/50 bg-red-500/10">
      <p class="text-sm text-red-300">✕ {problem}</p>
    </div>
  {/each}

  <!-- Developed vs plan: the liner-specific quantity -->
  {#if segments.length > 0}
    <div class="card">
      <p class="text-xs uppercase tracking-wider text-ink-100/50 mb-2">Floor panel</p>
      <div class="flex items-baseline gap-2 flex-wrap">
        <span class="font-mono text-2xl font-bold text-ink-50">
          {formatDistance(totals.developedFt)}
        </span>
        <span class="text-sm text-ink-100/60">developed (slant) length</span>
      </div>
      <p class="text-sm text-ink-100/70 mt-2">
        The liner follows the slope, so the floor panel is cut to this — not to the
        {formatDistance(totals.planFt)} of horizontal run.
      </p>
    </div>
  {/if}

  <!-- Runs -->
  {#if segments.length === 0}
    <div class="card text-center py-8 border-dashed">
      <p class="text-ink-100/60">No floor runs yet.</p>
      <p class="text-sm text-ink-100/50 mt-1">
        Start at the shallow wall and work toward the deep end.
      </p>
      <button class="btn mt-4" on:click={addSegment}>+ Add the first run</button>
    </div>
  {/if}

  <!-- Keyed: a component binding (DistanceInput) inside an unkeyed each block
       loses its write-back when the list re-renders, so an edit would vanish
       and the closure panel would never move. -->
  {#each segments as seg, i (i)}
    <div class="card space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-pool-500">Run {seg.order}</span>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono text-ink-100/60">
            {formatDistance(developed(seg))} developed
          </span>
          <button class="btn-ghost text-red-400/80 px-3" on:click={() => deleteSegment(i)}>
            Delete
          </button>
        </div>
      </div>

      <label class="block">
        <span class="label">Run type</span>
        <select class="field" bind:value={seg.kind} on:change={() => store.markDirty()}>
          {#each KINDS as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
      </label>

      {#if seg.kind === 'break'}
        <p class="text-xs text-ink-100/60">
          A vertical break has no horizontal run — it drops straight down.
        </p>
      {:else}
        <DistanceInput
          bind:value={seg.horizontal_run_ft}
          label="Horizontal run (plan view)"
          min={0}
          max={200}
        />
      {/if}

      <!-- Stacked, not side by side: a DistanceInput is itself two fields plus
           two unit suffixes, so pairing them in a grid squeezes each to a few
           pixels on a phone and the numbers clip out of sight. -->
      <DistanceInput
        bind:value={seg.depth_start_ft}
        label="Depth at start"
        min={0}
        max={20}
      />
      <DistanceInput
        bind:value={seg.depth_end_ft}
        label="Depth at end"
        min={0}
        max={20}
      />

      {#if segments[i + 1]}
        <button
          class="btn-ghost text-xs w-full"
          on:click={() => syncDownstream(i)}
          title="Set the next run's start depth to this run's end depth"
        >
          ↓ Carry {formatDistance(parseFloat(seg.depth_end_ft) || 0)} into run {seg.order + 1}
        </button>
      {/if}
    </div>
  {/each}

  {#if segments.length > 0}
    <button class="btn w-full" on:click={addSegment}>+ Add run</button>
  {/if}

  <!-- Hopper cross-section -->
  <div class="card space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-xs uppercase tracking-wider text-ink-100/50">Hopper cross-section</p>
        <p class="text-sm text-ink-100/70 mt-1">
          Across the deep end: side slope + flat bottom + side slope must span the pool width.
        </p>
      </div>
      {#if hopper}
        <button class="btn-ghost text-red-400/80 px-3 shrink-0" on:click={removeHopper}>
          Remove
        </button>
      {/if}
    </div>

    {#if !hopper}
      {#if hasHopperBottom}
        <p class="text-sm text-yellow-400">
          ⚠ The profile has a hopper bottom, so the fabricator needs its cross-section.
        </p>
      {:else}
        <p class="text-sm text-ink-100/60">
          Flat-bottomed pool? Leave this off.
        </p>
      {/if}
      <button class="btn w-full" on:click={addHopper}>+ Add hopper cross-section</button>
    {:else}
      <div class="space-y-3">
        <DistanceInput
          bind:value={hopper.left_slope_width_ft}
          label="Left slope (G)"
          min={0}
          max={100}
        />
        <DistanceInput
          bind:value={hopper.bottom_width_ft}
          label="Bottom width (H)"
          min={0}
          max={100}
        />
        <DistanceInput
          bind:value={hopper.right_slope_width_ft}
          label="Right slope (I)"
          min={0}
          max={100}
        />
        <DistanceInput
          bind:value={hopper.bottom_length_ft}
          label="Bottom length (M)"
          min={0}
          max={100}
        />
      </div>

      {#if hopperCheck}
        <ClosureCheck
          check={hopperCheck}
          measuredLabel="across the hopper"
          expectedLabel="pool width"
        />
      {/if}
    {/if}
  </div>
</div>
