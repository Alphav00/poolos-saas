<script lang="ts">
  import CustomerForm from './CustomerForm.svelte'
  import PoolView from './PoolView.svelte'
  import { loadPools } from './pools'
  import ReadingsEntry from './ReadingsEntry.svelte'
  import RouteView from './RouteView.svelte'
  import type { Pool } from './types'

  // #/field, #/field/new, #/field/<pool>, #/field/<pool>/readings, #/field/<pool>/edit
  let { path, isOwner, canEdit }: { path: string[]; isOwner: boolean; canEdit: boolean } = $props()
  let pools = $state<Pool[] | null>(null)
  let error = $state('')
  loadPools()
    .then((p) => (pools = p))
    .catch((e) => (error = e instanceof Error ? e.message : 'Could not load the customers.'))
  const pool = $derived(path[1] && pools ? pools.find((p) => p.id === path[1]) : undefined)
  const loaded = (p: Pool[]) => (pools = p)
</script>

{#if error}
  <p class="alert" role="alert"><b>{error}</b>{#if error === 'Sign in again.'} <a href="/">Sign in</a>{/if}</p>
{:else if !pools}
  <p class="sm" role="status" style="margin:6px">Loading customers…</p>
{:else if !path[1]}
  <RouteView {pools} {canEdit} {isOwner} onloaded={loaded} />
{:else if path[1] === 'new' && !pool}
  {#if canEdit}<CustomerForm {pools} onsaved={loaded} />
  {:else}<p class="card">Only an owner, a Lead or a Dispatcher can add customers. <a class="back" href="#/field">Back to the route</a></p>{/if}
{:else if !pool}
  <p class="card">No such customer. <a class="back" href="#/field">Back to the route</a></p>
{:else if path[2] === 'readings'}
  {#key pool.id}<ReadingsEntry {pool} />{/key}
{:else if path[2] === 'edit' && canEdit}
  {#key pool.id}<CustomerForm {pools} {pool} onsaved={loaded} />{/key}
{:else}
  {#key pool.id}<PoolView {pool} {canEdit} />{/key}
{/if}
