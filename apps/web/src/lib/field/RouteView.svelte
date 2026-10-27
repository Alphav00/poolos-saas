<script lang="ts">
  // Today's route: the customers whose service day is today, in route order.
  // A stop is done once today's readings are saved for it. Owners, Leads and
  // Dispatchers add customers and change the order.
  import GetStarted from './GetStarted.svelte'
  import { loadDone, today } from './readings'
  import { setOrders } from './pools'
  import { dayName, dayOf, DAYS, moveStop, notOnRoute, routeFor } from './route'
  import type { Pool } from './types'

  let { pools, canEdit, isOwner, onloaded }: { pools: Pool[]; canEdit: boolean; isOwner: boolean; onloaded: (pools: Pool[]) => void } = $props()

  const day = dayOf(new Date())
  const stops = $derived(routeFor(pools, day))
  const others = $derived(notOnRoute(pools, day))
  let done = $state<Set<string>>(new Set())
  let note = $state('')
  loadDone(today())
    .then((d) => (done = d))
    .catch((e) => (note = e instanceof Error ? e.message : 'Could not load today’s readings.'))
  const doneCount = $derived(stops.filter((s) => done.has(s.id)).length)
  const next = $derived(stops.find((s) => !done.has(s.id)))
  const short = (d: Pool['serviceDay']) => DAYS.find((x) => x.key === d)?.short ?? 'No day'
  const noDay = $derived(others.filter((p) => !p.serviceDay).length)

  let busy = $state(false)
  async function move(index: number, by: -1 | 1) {
    busy = true
    note = ''
    try {
      const r = await setOrders(moveStop(stops, index, by), day)
      onloaded(r.pools)
      if (r.error) note = r.error
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not change the order.'
    } finally {
      busy = false
    }
  }
</script>

<div class="bar">
  <span class="t">{dayName(day)}'s route</span>
  {#if stops.length}<span class="chip">{doneCount} / {stops.length} done</span>{/if}
</div>

<GetStarted {pools} {canEdit} {isOwner} {onloaded} />

{#if stops.length}
  <section class="card" style="margin-top:0" aria-label="Stops">
    <div class="row"><h2 class="h">Stops</h2>{#if canEdit && stops.length > 1}<span class="xs">▲▼ to change the order</span>{/if}</div>
    <ol class="stops">
      {#each stops as s, i (s.id)}
        {@const isDone = done.has(s.id)}
        <li>
          <a class="stop" href={`#/field/${s.id}`}>
            <span class={['num', isDone && 'done']}>{isDone ? '✓' : i + 1}</span>
            <div style="min-width:0">
              <div class="nm">{s.name}</div>
              {#if s.address}<div class="xs addr">{s.address}</div>{/if}
              {#if s.tags.length}<div class="pred">{#each s.tags.slice(0, 3) as t (t)}<span class="pp">{t}</span>{/each}</div>{/if}
            </div>
            {#if isDone}<span class="chip ok">done</span>
            {:else if s === next}<span class="chip">next</span>
            {:else if s.demo}<span class="chip">DEMO</span>
            {:else}<span></span>{/if}
          </a>
          {#if canEdit && stops.length > 1}
            <div class="move">
              <button type="button" onclick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Move ${s.name} up`}>▲</button>
              <button type="button" onclick={() => move(i, 1)} disabled={busy || i === stops.length - 1} aria-label={`Move ${s.name} down`}>▼</button>
            </div>
          {/if}
        </li>
      {/each}
    </ol>
  </section>
{:else if pools.length}
  <section class="card" style="margin-top:0">
    <h2 class="h">No stops today</h2>
    <p class="sm" style="margin-top:4px">Nobody on file is serviced on {dayName(day)}s. Customers show on the route on their service day.</p>
  </section>
{/if}

{#if note}<p class="alert" role="alert"><b>{note}</b></p>{/if}

{#if canEdit}<a class="btn" href="#/field/new">+ Add a customer</a>{/if}

{#if others.length}
  <section class="card" aria-label="Other customers">
    <div class="row"><h2 class="h">Other days</h2><span class="xs">{others.length} customer{others.length === 1 ? '' : 's'}</span></div>
    {#if noDay}<p class="xs" style="margin-top:2px">{noDay} with no service day {noDay === 1 ? 'is' : 'are'} on no route{canEdit ? ': open one and tap Edit to pick a day' : ''}.</p>{/if}
    {#each others as p (p.id)}
      <a class="stop" href={`#/field/${p.id}`}>
        <span class="num day">{short(p.serviceDay)}</span>
        <div style="min-width:0">
          <div class="nm">{p.name}</div>
          {#if p.address}<div class="xs addr">{p.address}</div>{/if}
        </div>
        {#if p.demo}<span class="chip">DEMO</span>{:else}<span></span>{/if}
      </a>
    {/each}
  </section>
{/if}

<style>
  .stops { list-style: none; margin: 4px 0 0; padding: 0; }
  .stops li { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--line); }
  .stops li:first-child { border-top: 0; }
  .stops .stop { flex: 1; min-width: 0; border-top: 0; }
  .move { display: flex; flex-direction: column; gap: 2px; }
  .move button { width: 44px; height: 30px; border: 0; border-radius: 10px; background: var(--soft); color: var(--brand-link); font-size: 13px; cursor: pointer; }
  .move button:disabled { opacity: .35; }
  .addr { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .num.day { font-size: 10px; width: 34px; border-radius: 10px; }
  .stop:has(.num.day) { grid-template-columns: 34px 1fr auto; }
</style>
