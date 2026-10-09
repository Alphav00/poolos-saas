<script lang="ts">
  import NoPools from './NoPools.svelte'
  import { ROUTE, STOPS } from './sample'
  import type { Pool } from './types'

  let { pools, isOwner, onloaded }: { pools: Pool[]; isOwner: boolean; onloaded: (pools: Pool[]) => void } = $props()
  const byId = $derived(new Map(pools.map((p) => [p.id, p])))
  // The route itself is still the demo route (dispatch is not built); only stops whose pool is on file show.
  const stops = $derived(STOPS.filter((s) => byId.has(s.poolId)))
</script>

{#if pools.length === 0}
<div class="bar"><span class="t">Route</span></div>
<NoPools {isOwner} {onloaded} />
{:else if stops.length === 0}
<div class="bar"><span class="t">Route</span></div>
<section class="card" style="margin-top:0"><h2 class="h">No route assigned today</h2><p class="sm" style="margin-top:4px">{pools.length} pools on file. Routes come with dispatch.</p></section>
{:else}

<div class="bar"><span class="t">{ROUTE.title}</span><span class="chip">{stops.filter((s) => s.done).length} / {stops.length} done</span></div>
<span class="sample" title="Made-up pools so the screens can be tried. Real customers come with the customer list.">DEMO DATA</span>

<section class="card" style="margin-top:0">
  <div class="h">Predicted for today</div>
  <div class="big">{ROUTE.headline}</div>
  <p class="sm" style="margin-top:4px">Forecast from each pool's own decay rate since last visit, before anyone tests.</p>
  <div class="h" style="margin-top:10px">Load on the truck</div>
  <div class="tags">{#each ROUTE.load as l (l)}<span class="tag">{l}</span>{/each}</div>
</section>

<section class="card">
  <div class="row"><h2 class="h">Stops</h2><span class="xs">predicted · before test</span></div>
  {#each stops as s, i (s.poolId)}
    {@const pool = byId.get(s.poolId)}
    <a class="stop" href={`#/field/${s.poolId}`}>
      <span class={['num', s.done && 'done']}>{s.done ? '✓' : i + 1}</span>
      <div>
        <div class="nm">{pool?.name}</div>
        <div class="pred">{#each s.flags as f (f.text)}<span class={['pp', f.level]}>{f.text}</span>{/each}</div>
      </div>
      {#if s.done}<span class="chip ok">done</span>
      {:else if s.action}<span class="chip warn">{s.action}</span>
      {:else if s.eta.startsWith('next')}<span class="chip">{s.eta}</span>
      {:else}<span class="xs">{s.eta}</span>{/if}
    </a>
  {/each}
</section>

<section class="card">
  <div class="row"><h2 class="h">Forecast accuracy · this week</h2><span class="xs">calibration</span></div>
  <div class="rg" style="grid-template-columns:repeat(3,1fr)">
    {#each ROUTE.accuracy as a (a.label)}
      <div class={['r', a.ok ? 'ok' : 'warn']}><div class="n">{a.label}</div><div class="v">{a.value}</div><div class="p">{a.note}</div></div>
    {/each}
  </div>
  <p class="xs" style="margin-top:6px">When a reading and its forecast disagree, the app asks for a retest before dosing.</p>
</section>
{/if}
