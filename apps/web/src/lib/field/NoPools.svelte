<script lang="ts">
  // Shown when no pools are on file. Owners can load the made-up demo set, or one made-up customer
  // (Leads and Dispatchers can change pools, but adding demo data stays with owners).
  import { addDemoCustomer, loadDemoPools } from './pools'
  import type { Pool } from './types'

  let { isOwner, onloaded }: { isOwner: boolean; onloaded: (pools: Pool[], added?: string) => void } = $props()
  let busy = $state(false)
  let note = $state('')

  async function load() {
    busy = true
    note = ''
    try {
      onloaded(await loadDemoPools())
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not load the demo pools.'
    } finally {
      busy = false
    }
  }

  async function addOne() {
    busy = true
    note = ''
    try {
      const { name, pools } = await addDemoCustomer([])
      onloaded(pools, name)
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not add a demo customer.'
    } finally {
      busy = false
    }
  }
</script>

<section class="card" aria-busy={busy} aria-live="polite">
  <h2 class="h">No pools on file yet</h2>
  <p class="sm" style="margin-top:4px">Pools appear here once they are added. Adding real pools comes with the customer list.</p>
  {#if isOwner}
    <button class="btn" onclick={load} disabled={busy}>{busy ? 'Working…' : 'Load the demo pools'}</button>
    <p class="xs" style="margin-top:6px;text-align:center">Nine made-up pools, marked DEMO, so the screens can be tried.</p>
    <button class="btn ghost" onclick={addOne} disabled={busy}>Add one demo customer</button>
    <p class="xs" style="margin-top:6px;text-align:center">One made-up customer with a joke name, marked DEMO.</p>
  {:else}
    <p class="xs" style="margin-top:6px">Ask an owner to load the demo pools.</p>
  {/if}
  {#if note}<p class="alert" role="alert"><b>{note}</b></p>{/if}
</section>
