<script lang="ts">
  import PoolView from './PoolView.svelte'
  import { loadPools } from './pools'
  import ReadingsEntry from './ReadingsEntry.svelte'
  import RouteView from './RouteView.svelte'
  import type { Pool } from './types'

  // #/field, #/field/<pool>, #/field/<pool>/readings
  let { path, isOwner }: { path: string[]; isOwner: boolean } = $props()
  let pools = $state<Pool[] | null>(null)
  let error = $state('')
  loadPools()
    .then((p) => (pools = p))
    .catch((e) => (error = e instanceof Error ? e.message : 'Could not load the pools.'))
  const pool = $derived(path[1] && pools ? pools.find((p) => p.id === path[1]) : undefined)
</script>

{#if error}
  <p class="alert" role="alert"><b>{error}</b>{#if error === 'Sign in again.'} <a href="/">Sign in</a>{/if}</p>
{:else if !pools}
  <p class="sm" role="status" style="margin:6px">Loading pools…</p>
{:else if !path[1]}
  <RouteView {pools} {isOwner} onloaded={(p) => (pools = p)} />
{:else if !pool}
  <p class="card">No such pool. <a class="back" href="#/field">Back to the route</a></p>
{:else if path[2] === 'readings'}
  {#key pool.id}<ReadingsEntry {pool} />{/key}
{:else}
  {#key pool.id}<PoolView {pool} />{/key}
{/if}
