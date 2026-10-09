<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';

  let jobs = [];
  let loading = true;
  let error = '';

  async function load() {
    try {
      jobs = await api.listJobs();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function del(id) {
    if (!confirm('Delete this job?')) return;
    await api.deleteJob(id);
    await load();
  }

  onMount(load);
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Jobs</h1>
    <div class="flex gap-2">
      <a href="/measure/fixtures" class="btn-ghost text-sm">Try a sample pool…</a>
      <a href="/measure/new" class="btn text-sm">+ New job</a>
    </div>
  </div>

  {#if loading}
    <p class="text-ink-100/70">Loading…</p>
  {:else if error}
    <p class="text-red-400">Error: {error}</p>
  {:else if jobs.length === 0}
    <div class="card text-center py-12">
      <p class="text-ink-100/70">No jobs yet.</p>
      <a href="/measure/new" class="btn inline-block mt-3">Create your first job</a>
    </div>
  {:else}
    <ul class="space-y-2">
      {#each jobs as j (j.id)}
        <li class="card flex items-center justify-between">
          <a href="/measure/jobs/{j.id}" class="flex-1">
            <div class="font-semibold">{j.customer_name}</div>
            <div class="text-sm text-ink-100/70">
              {j.shape_type} · {j.dealer_name} · {new Date(j.updated_at).toLocaleDateString()}
            </div>
          </a>
          <button class="btn-danger text-sm" on:click={() => del(j.id)}>Delete</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
