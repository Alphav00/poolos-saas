<script lang="ts">
  // First-run guide, on Today and Route until the company has a customer and
  // its chemistry set up: add the first customer, set up chemistry, then work
  // the route. Owners can also put a made-up customer on today's route to try it.
  import { addDemoCustomer } from './pools'
  import { dayName, dayOf } from './route'
  import { loadProducts, loadTargets } from './settings'
  import type { Pool } from './types'

  let { pools, canEdit, isOwner, onloaded }: { pools: Pool[]; canEdit: boolean; isOwner: boolean; onloaded: (pools: Pool[]) => void } = $props()

  let chemReady = $state<boolean | null>(null)
  Promise.all([loadProducts(), loadTargets()])
    .then(([p, t]) => (chemReady = p.length > 0 && !!t))
    .catch(() => (chemReady = null))

  const hasCustomer = $derived(pools.some((p) => !p.demo))
  const today = dayOf(new Date())
  let busy = $state(false)
  let note = $state('')

  async function tryOne() {
    busy = true
    note = ''
    try {
      const r = await addDemoCustomer(today)
      onloaded(r.pools)
      note = `${r.name} (made up, marked DEMO) is on today's route.`
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not add a made-up customer.'
    } finally {
      busy = false
    }
  }
</script>

{#if !hasCustomer || chemReady === false}
<section class="card start" aria-label="Getting started">
  <h2 class="nm">Get started</h2>
  <p class="xs">Three steps to run your first route in the app.</p>
  <ol class="steps">
    <li class:done={hasCustomer}>
      <span class="tick" aria-hidden="true">{hasCustomer ? '✓' : '1'}</span>
      <div>
        <div class="nm">Add your first customer</div>
        <div class="xs">Name, address, the day you service them, and the pool size. They show on that day's route every week.</div>
        {#if !hasCustomer}
          {#if canEdit}<a class="btn" href="#/field/new">Add a customer</a>
          {:else}<p class="xs ask">Ask an owner, Lead or Dispatcher to add customers.</p>{/if}
        {/if}
      </div>
    </li>
    <li class:done={chemReady === true}>
      <span class="tick" aria-hidden="true">{chemReady ? '✓' : '2'}</span>
      <div>
        <div class="nm">Set up your chemicals</div>
        <div class="xs">The products on your truck and your target ranges, so the app can say how much to add.</div>
        {#if chemReady === false}<a class="btn ghost" href="#/more/chemistry">Set up chemistry</a>{/if}
      </div>
    </li>
    <li>
      <span class="tick" aria-hidden="true">3</span>
      <div>
        <div class="nm">Work the route</div>
        <div class="xs">On the day, open Route, tap a stop, enter the readings. The stop is ticked done and the app shows what to add.</div>
      </div>
    </li>
  </ol>
  {#if isOwner && !hasCustomer}
    <button class="btn ghost" onclick={tryOne} disabled={busy}>{busy ? 'Adding…' : `Try it: a made-up customer on ${dayName(today)}`}</button>
  {/if}
  {#if note}<p class="xs" role="status" style="margin-top:6px">{note}</p>{/if}
</section>
{/if}

<style>
  .start { border: 2px solid rgb(var(--brand-sky-rgb) / .5); }
  .steps { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 12px; }
  .steps li { display: grid; grid-template-columns: 32px 1fr; gap: 10px; align-items: start; }
  .tick { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; background: var(--blue2); color: var(--brand-link); }
  .done .tick { background: var(--okbg); color: var(--ok); }
  .done .nm { text-decoration: line-through; opacity: .7; }
  .steps .btn { margin-top: 8px; text-decoration: none; }
  .ask { margin-top: 6px; font-weight: 800; }
</style>
