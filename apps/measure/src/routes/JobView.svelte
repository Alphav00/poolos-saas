<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import { api } from '../lib/api.js';
  import PoolViewer from '../lib/components/PoolViewer.svelte';

  export let id = null;  // from route params

  let job = null;
  let reconstructed = null;
  let warnings = [];
  let error = '';
  let activeTab = 'model';

  // Coerce Decimal-as-string to numbers, normalize points for the 3D viewer.
  // Merge the reconstruct result (x, y) with the original perimeter points (a, b)
  // so the viewer can show A/B distances on click.
  // If the job has swap_ab=true, the A and B distances the *user sees* are
  // swapped (the recorded A is actually the distance to stake B, and vice versa).
  function normalizeRec(rec, jobMeasurement) {
    if (!rec) return null;
    const abByNum = {};
    const swap = !!(jobMeasurement && jobMeasurement.swap_ab);
    for (const p of (jobMeasurement?.perimeter_points || [])) {
      const origA = parseFloat(p.a_distance_ft);
      const origB = parseFloat(p.b_distance_ft);
      abByNum[p.number] = {
        a_distance_ft: swap ? origB : origA,
        b_distance_ft: swap ? origA : origB,
        notes: p.notes,
        is_obstacle: !!p.is_obstacle,
        obstacle_kind: p.obstacle_kind,
      };
    }
    return {
      length_ft: parseFloat(rec.length_ft),
      width_ft: parseFloat(rec.width_ft),
      perimeter_ft: parseFloat(rec.perimeter_ft),
      area_sqft: parseFloat(rec.area_sqft),
      depth_avg_ft: parseFloat(rec.depth_avg_ft),
      ab_distance_ft: parseFloat(rec.ab_distance_ft),
      points: (rec.points || []).map(p => ({
        number: p.number,
        x_ft: parseFloat(p.x_ft),
        y_ft: parseFloat(p.y_ft),
        quality: p.quality,
        quality_reason: p.quality_reason,
        ...(abByNum[p.number] || {}),
      })),
    };
  }

  function normalizeJob(j) {
    if (!j) return null;
    return {
      ...j,
      measurement: {
        ...j.measurement,
        ab_distance_ft: parseFloat(j.measurement.ab_distance_ft),
        shallow_depth_ft: parseFloat(j.measurement.shallow_depth_ft),
        deep_depth_ft: parseFloat(j.measurement.deep_depth_ft),
        swap_ab: !!j.measurement.swap_ab,
      },
    };
  }

  async function load() {
    if (!id) return;
    try {
      const j = await api.getJob(id);
      const r = await api.reconstruct(id);
      const v = await api.validate(id);
      job = normalizeJob(j);
      reconstructed = normalizeRec(r, j.measurement);
      warnings = v.warnings || [];
    } catch (e) {
      console.error('JobView load failed:', e);
      error = e.message;
    }
  }

  let swapBusy = false;
  async function toggleSwap() {
    if (!id || swapBusy) return;
    swapBusy = true;
    try {
      const out = await api.swapAb(id);
      // Use the canonical job payload from the server, then reload everything.
      job = normalizeJob(out.job);
      reconstructed = normalizeRec(await api.reconstruct(id), out.job.measurement);
      warnings = (await api.validate(id)).warnings || [];
    } catch (e) {
      console.error('swap failed:', e);
      error = e.message;
    } finally {
      swapBusy = false;
    }
  }

  onMount(load);
  $: if (id) load();
</script>

{#if error}
  <div class="card border border-red-500/40">
    <p class="text-red-400">Failed to load job: {error}</p>
    <p class="text-xs text-ink-100/50 mt-2">id={id}</p>
  </div>
{:else if job && reconstructed}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{job.meta.customer_name}</h1>
        <p class="text-sm text-ink-100/70">
          {job.measurement.shape_type} · {job.meta.dealer_name}
        </p>
      </div>
      <div class="flex gap-2">
        <a use:link href="/measure/jobs/{id}/edit" class="btn-ghost text-sm">Edit</a>
        <button type="button"
                class="btn-ghost text-sm disabled:opacity-50"
                disabled={swapBusy}
                title="Flip the recorded A and B tape measurements — use if the stakes were set up on the wrong ends"
                on:click={toggleSwap}>
          {swapBusy ? '…' : (job.measurement.swap_ab ? '↺ Un-swap A/B' : '⇄ Swap A/B')}
        </button>
        <a href={api.orderFormPdfUrl(id)} class="btn text-sm" target="_blank" rel="noopener">PDF</a>
      </div>
    </div>

    {#if job.measurement.swap_ab}
      <div class="card border border-yellow-500/50 bg-yellow-500/5">
        <p class="text-sm text-yellow-200">
          <strong>A and B are swapped</strong> from the recorded values. Reconstruction
          mirrors the pool across the A-B midpoint. Tap a point to confirm; un-swap
          if the geometry looks wrong.
        </p>
      </div>
    {/if}

    {#if warnings && warnings.length}
      <div class="card border border-yellow-500/40">
        <h3 class="font-bold text-yellow-300">Warnings</h3>
        <ul class="text-sm text-yellow-200 list-disc pl-4">
          {#each warnings as w}<li>{w}</li>{/each}
        </ul>
      </div>
    {/if}

    <div class="flex gap-2 border-b border-ink-100/20">
      <button type="button"
              class="px-4 py-2 font-semibold border-b-2 cursor-pointer {activeTab === 'model' ? 'border-pool-500 text-pool-500' : 'border-transparent text-ink-100/80 hover:text-ink-100'}"
              on:click={() => { activeTab = 'model'; console.log('tab -> model'); }}>3D Model</button>
      <button type="button"
              class="px-4 py-2 font-semibold border-b-2 cursor-pointer {activeTab === 'dims' ? 'border-pool-500 text-pool-500' : 'border-transparent text-ink-100/80 hover:text-ink-100'}"
              on:click={() => { activeTab = 'dims'; console.log('tab -> dims'); }}>Dimensions</button>
    </div>

    {#if activeTab === 'model'}
      {#if reconstructed.points.length > 0}
        <PoolViewer points={reconstructed.points} shapeType={job.measurement.shape_type}
                    shallow={job.measurement.shallow_depth_ft}
                    deep={job.measurement.deep_depth_ft}
                    abDistanceFt={job.measurement.ab_distance_ft} />
      {:else}
        <p class="text-ink-100/70">No perimeter points to render.</p>
      {/if}
    {:else}
      <div class="card">
        <table class="w-full text-base">
          <tr><td class="text-ink-100/70">Longest length</td><td class="text-right font-bold">{reconstructed.length_ft.toFixed(2)} ft</td></tr>
          <tr><td class="text-ink-100/70">Widest width</td><td class="text-right font-bold">{reconstructed.width_ft.toFixed(2)} ft</td></tr>
          <tr><td class="text-ink-100/70">Perimeter</td><td class="text-right font-bold">{reconstructed.perimeter_ft.toFixed(1)} ft</td></tr>
          <tr><td class="text-ink-100/70">Area</td><td class="text-right font-bold">{reconstructed.area_sqft.toFixed(0)} sqft</td></tr>
          <tr><td class="text-ink-100/70">Avg depth</td><td class="text-right font-bold">{reconstructed.depth_avg_ft.toFixed(2)} ft</td></tr>
        </table>
      </div>
    {/if}
  </div>
{:else}
  <div class="space-y-3">
    <p class="text-ink-100/70">Loading…</p>
    <p class="text-xs text-ink-100/40">id={id}</p>
  </div>
{/if}
