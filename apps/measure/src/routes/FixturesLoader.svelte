<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { navigate } from 'svelte-routing';

  let fixtures = [];
  let loading = true;

  async function load(name) {
    const job = await api.loadFixture(name);
    // Save it to DB so it has a real ID
    const created = await api.createJob({
      meta: job.meta,
      measurement: job.measurement,
      cover_spec: job.cover_spec,
      hardware: job.hardware,
    });
    navigate(`/measure/jobs/${created.id}`);
  }

  onMount(async () => {
    fixtures = await api.listFixtures();
    loading = false;
  });
</script>

<div class="space-y-4">
  <h1 class="text-2xl font-bold">Test fixtures</h1>
  <p class="text-ink-100/70">
    Load a built-in test pool to verify the app works end-to-end. These come from
    the Phase 6 eval hook — known ground-truth dimensions.
  </p>

  {#if loading}
    <p>Loading…</p>
  {:else}
    <ul class="space-y-2">
      {#each fixtures as name}
        <li class="card flex items-center justify-between">
          <div class="font-semibold capitalize">{name}</div>
          <button class="btn text-sm" on:click={() => load(name)}>Load</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
