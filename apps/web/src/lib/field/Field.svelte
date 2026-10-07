<script lang="ts">
  import PoolView from './PoolView.svelte'
  import ReadingsEntry from './ReadingsEntry.svelte'
  import RouteView from './RouteView.svelte'
  import { poolById } from './sample'

  // #/field, #/field/<pool>, #/field/<pool>/readings
  let { path }: { path: string[] } = $props()
  const pool = $derived(path[1] ? poolById(path[1]) : undefined)
</script>

{#if !path[1]}
  <RouteView />
{:else if !pool}
  <p class="card">No such pool. <a class="back" href="#/field">Back to the route</a></p>
{:else if path[2] === 'readings'}
  {#key pool.id}<ReadingsEntry {pool} />{/key}
{:else}
  {#key pool.id}<PoolView {pool} />{/key}
{/if}
