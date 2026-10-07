<script lang="ts">
  import { compare } from './compare'
  import DecayChart from './DecayChart.svelte'
  import { loadReading, today } from './readings'
  import { fmt, fmtDelta, SCALES } from './scales'
  import type { Pool, Reading } from './types'

  let { pool }: { pool: Pool } = $props()

  let reading = $state<Reading | null>(null)
  let error = $state('')

  $effect(() => {
    loadReading(pool.id, today())
      .then((r) => (reading = r))
      .catch((e: Error) => (error = e.message))
  })

  const rows = $derived(
    SCALES.filter((s) => pool.forecast[s.key] || reading?.values[s.key] !== undefined).map((s) => ({
      scale: s,
      measured: reading?.values[s.key],
      forecast: pool.forecast[s.key],
      ...compare(reading?.values[s.key], pool.forecast[s.key]),
    })),
  )
  const off = $derived(rows.filter((r) => r.status === 'off'))
  const methodLabel = $derived(reading ? { strip: 'strip', drop: 'drop kit', meter: 'meter' }[reading.method] : 'not tested yet')
</script>

<div class="bar">
  <a class="back" href="#/field">‹ Route</a>
  {#if off.length}<span class="chip bad">{off.length} off forecast</span>{:else if reading}<span class="chip ok">on forecast</span>{/if}
</div>
<span class="sample">SAMPLE DATA</span>

<section class="card" style="margin-top:0">
  <h1 class="big">{pool.name}</h1>
  <div class="tags">{#each pool.tags as t (t)}<span class="tag">{t}</span>{/each}</div>
</section>

<section class="card">
  <div class="row"><h2 class="h">Today vs forecast</h2><span class="xs">{methodLabel}</span></div>
  {#if error}<p class="alert" role="alert"><b>{error}</b></p>{/if}
  <div class="rg">
    {#each rows as r (r.scale.key)}
      <div class={['r', r.status === 'ok' && 'ok', r.status === 'off' && 'off']}>
        <div class="n">{r.scale.label}</div>
        <div class="v">{fmt(r.scale.key, r.measured)}</div>
        <div class="p">{r.forecast ? `fcst ${fmt(r.scale.key, r.forecast.value)}` : 'no forecast'}</div>
        {#if r.status !== 'none'}<div class={['d', r.status]}>{fmtDelta(r.scale.key, r.delta)}</div>{/if}
      </div>
    {/each}
    {#if pool.lsi}
      <div class="r warn"><div class="n">LSI</div><div class="v">{pool.lsi}</div><div class="p">test case</div></div>
    {/if}
  </div>
  {#each off as r (r.scale.key)}
    <div class="alert" role="alert">
      <b>{r.scale.label} is {fmtDelta(r.scale.key, r.delta)} from forecast</b>
      <p>Retest before dosing.{r.scale.key === 'fc' && pool.decay.some((d) => d.alert) ? ' If it repeats: check the chlorine source; this pool’s decay is rising.' : ''}</p>
    </div>
  {/each}
</section>

<section class="card">
  <div class="row"><h2 class="h">Chlorine decay · inferred</h2><span class="xs">{pool.visits.length ? `last ${pool.visits.length} visits` : ''}</span></div>
  {#if pool.visits.length >= 4}
    <DecayChart visits={pool.visits} forecast={pool.forecast.fc?.value} measured={reading?.values.fc} />
    {#each pool.decay as d (d.label)}
      <div class="dr"><b>{d.label}</b><div class="xs">{d.detail}</div><div class="rate" style:color={d.alert ? '#b42b30' : undefined}>{d.trend}</div></div>
    {/each}
  {:else}
    <p class="sm" style="margin-top:6px">Learning this pool. A decay rate shows after 4 visits with readings before and after dosing.</p>
  {/if}
</section>

{#if pool.doses.length}
  <section class="card">
    <div class="row"><h2 class="h">Add now</h2><span class="xs">product · strength · source</span></div>
    {#each pool.doses as d (d.product)}
      <div class="dose"><div class="a">{d.amount}</div><div><div class="w">{d.product}</div><div class="xs">{d.basis}</div></div></div>
    {/each}
  </section>
{:else}
  <section class="card"><h2 class="h">Add now</h2><p class="sm" style="margin-top:4px">Dose amounts come from the chemistry engine, which is not connected yet.</p></section>
{/if}

{#if pool.equipment.length || pool.note}
  <section class="card">
    <h2 class="h">Condition &amp; equipment</h2>
    <div class="tags">{#each pool.equipment as t (t)}<span class="tag">{t}</span>{/each}</div>
    {#if pool.note}<div class="h" style="margin-top:10px">Note for the customer</div><p class="sm" style="margin-top:4px;color:var(--ink)">{pool.note}</p>{/if}
  </section>
{/if}

<a class="btn" href={`#/field/${pool.id}/readings`}>{reading ? "Edit today's readings" : "Enter today's readings"}</a>
