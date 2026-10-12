<script lang="ts">
  import { amountWords, analyze, cellRange, dose, plan, strengthWords, waterFrom, type Analysis, type Answer, type Ask, type CellRange, type Dose, type Product, type Targets } from './chem'
  import { compare } from './compare'
  import DecayChart from './DecayChart.svelte'
  import { loadReading, today } from './readings'
  import { fmt, fmtDelta, SCALES, scaleFor } from './scales'
  import { loadProducts, loadTargets } from './settings'
  import { dayName } from './route'
  import type { Pool, Reading } from './types'

  let { pool, canEdit = false }: { pool: Pool; canEdit?: boolean } = $props()

  let reading = $state<Reading | null>(null)
  let error = $state('')
  let products = $state<Product[]>([])
  let targets = $state<Targets | null>(null)
  let setupError = $state('')
  // The salt range for this pool's cell, from its manufacturer, or the question why not.
  let cell = $state<Answer<CellRange> | null>(null)

  // Everything the engine said about today's water, or why it could not say.
  let analysis = $state<Answer<Analysis> | null>(null)
  let doses = $state<{ ask: Ask; answer: Answer<Dose> }[]>([])
  let chemError = $state('')
  let chemBusy = $state(false)

  $effect(() => {
    loadReading(pool.id, today())
      .then((r) => (reading = r))
      .catch((e: Error) => (error = e.message))
    Promise.all([loadProducts(), loadTargets()])
      .then(([p, t]) => {
        products = p
        targets = t
      })
      .catch((e: Error) => (setupError = e.message))
    if (pool.cell) cellRange(pool.cell).then((r) => (cell = r)).catch(() => (cell = null))
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
  const water = $derived(waterFrom(reading, pool))
  const planned = $derived(plan(reading, targets, products, cell?.ok ? cell.value : null))
  const tested = $derived(!!reading && Object.keys(reading.values).length > 0)

  // Ask the engine whenever the readings or the setup change.
  $effect(() => {
    const w = $state.snapshot(water)
    const asks = $state.snapshot(planned.asks)
    const gallons = pool.gallons
    if (!tested) {
      analysis = null
      doses = []
      return
    }
    let stale = false
    chemBusy = true
    chemError = ''
    Promise.all([analyze(w), ...(gallons ? asks.map((ask) => dose(ask, w, gallons).then((answer) => ({ ask, answer }))) : [])])
      .then(([a, ...d]) => {
        if (stale) return
        analysis = a as Answer<Analysis>
        doses = d as { ask: Ask; answer: Answer<Dose> }[]
      })
      .catch((e: Error) => {
        if (!stale) chemError = e.message
      })
      .finally(() => {
        if (!stale) chemBusy = false
      })
    return () => {
      stale = true
    }
  })

  const si = $derived(analysis?.ok ? analysis.value.saturationIndex : null)
  const siWords = $derived(si === null ? '' : si > 0.05 ? 'scale-forming' : si < -0.05 ? 'corrosive' : 'balanced')
</script>

<div class="bar">
  <a class="back" href="#/field">‹ Route</a>
  {#if off.length}<span class="chip bad">{off.length} off forecast</span>{:else if tested}<span class="chip ok">tested today</span>{/if}
</div>
{#if pool.demo}<span class="sample" title="A made-up customer for trying the app.">DEMO</span>{/if}

<section class="card" style="margin-top:0">
  <div class="row" style="align-items:flex-start">
    <h1 class="big">{pool.name}</h1>
    {#if canEdit}<a class="chip edit" href={`#/field/${pool.id}/edit`}>Edit</a>{/if}
  </div>
  {#if pool.address}<a class="contact" href={`https://maps.google.com/?q=${encodeURIComponent(pool.address)}`} target="_blank" rel="noopener">📍 {pool.address}</a>{/if}
  {#if pool.phone && /\d/.test(pool.phone)}<a class="contact" href={`tel:${pool.phone.replace(/[^\d+]/g, '')}`}>📞 {pool.phone}</a>{/if}
  <p class="xs" style="margin-top:4px">{pool.serviceDay ? `Serviced ${dayName(pool.serviceDay)}s` : 'No service day set'}</p>
  {#if pool.tags.length}<div class="tags">{#each pool.tags as t (t)}<span class="tag">{t}</span>{/each}</div>{/if}
</section>

<section class="card">
  <div class="row"><h2 class="h">Today's readings</h2><span class="xs">{methodLabel}</span></div>
  {#if error}<p class="alert" role="alert"><b>{error}</b></p>{/if}
  {#if !rows.length}<p class="sm" style="margin-top:4px">Not tested yet today.</p>{/if}
  <div class="rg">
    {#each rows as r (r.scale.key)}
      <div class={['r', r.status === 'ok' && 'ok', r.status === 'off' && 'off']}>
        <div class="n">{r.scale.label}</div>
        <div class="v">{fmt(r.scale.key, r.measured)}</div>
        <div class="p">{r.forecast ? `fcst ${fmt(r.scale.key, r.forecast.value)}` : ''}</div>
        {#if r.status !== 'none'}<div class={['d', r.status]}>{fmtDelta(r.scale.key, r.delta)}</div>{/if}
      </div>
    {/each}
  </div>
  {#each off as r (r.scale.key)}
    <div class="alert" role="alert">
      <b>{r.scale.label} is {fmtDelta(r.scale.key, r.delta)} from forecast</b>
      <p>Retest before dosing.{r.scale.key === 'fc' && pool.decay.some((d) => d.alert) ? ' If it repeats: check the chlorine source; this pool’s decay is rising.' : ''}</p>
    </div>
  {/each}
</section>

<section class="card">
  <div class="row"><h2 class="h">Water · PHREEQC</h2><span class="xs">{chemBusy ? 'computing…' : analysis?.ok ? 'from today’s readings' : ''}</span></div>
  {#if !tested}
    <p class="sm" style="margin-top:4px">Enter today's readings to see the saturation index and what to add.</p>
  {:else if chemError}
    <p class="alert" role="alert"><b>{chemError}</b></p>
  {:else if analysis && !analysis.ok}
    <p class="sm" style="margin-top:4px">To work out the water, the engine still needs:</p>
    <ul class="asks">{#each analysis.questions as q (q.field)}<li>{q.ask}</li>{/each}</ul>
  {:else if analysis?.ok}
    {@const a = analysis.value}
    <div class="rg" style="grid-template-columns:repeat(3,1fr)">
      <div class={['r', siWords === 'balanced' ? 'ok' : 'warn']}><div class="n">SI</div><div class="v">{(si! >= 0 ? '+' : '−') + Math.abs(si!).toFixed(2)}</div><div class="p">{siWords}</div></div>
      <div class="r"><div class="n">Carb. alk</div><div class="v">{Math.round(a.alkalinity.carbonate)}</div><div class="p">of TA {Math.round(a.alkalinity.total)}</div></div>
      {#if a.chlorine}
        <div class="r"><div class="n">HOCl</div><div class="v">{a.chlorine.hocl.toFixed(2)}</div><div class="p">{a.chlorine.hoclPercentOfFree.toFixed(0)}% of FC</div></div>
      {:else}
        <div class="r"><div class="n">HOCl</div><div class="v">—</div><div class="p">no FC reading</div></div>
      {/if}
    </div>
    <p class="xs" style="margin-top:6px">
      SI 0 is balanced; above 0 tends to scale, below 0 tends to etch. Cyanurate carries {Math.round(a.alkalinity.cyanurate)} ppm of the alkalinity.
      {#if pool.tds !== undefined && water.salt === undefined}TDS {pool.tds.toLocaleString('en-US')} from the pool record.{/if}
    </p>
  {/if}
</section>

<section class="card">
  <div class="row"><h2 class="h">Add now</h2><span class="xs">product · strength · target</span></div>
  {#if setupError}
    <p class="alert" role="alert"><b>{setupError}</b></p>
  {:else if !targets || !products.length}
    <p class="sm" style="margin-top:4px">No doses until the company's products and target ranges are set up.</p>
    <a class="btn ghost" href="#/more/chemistry">Set up chemistry</a>
  {:else if !tested}
    <p class="sm" style="margin-top:4px">Doses show once today's readings are saved.</p>
  {:else if !pool.gallons}
    <p class="sm" style="margin-top:4px">This pool has no volume on record, so no amount can be worked out.</p>
  {:else}
    {#each doses as d (d.ask.kind)}
      {@const s = scaleFor(d.ask.param)}
      {#if d.answer.ok}
        <div class="dose">
          <div class="a">{amountWords(d.answer.value)}</div>
          <div>
            <div class="w">{strengthWords(d.ask.product)}</div>
            <div class="xs">{s.label} → {fmt(d.ask.param, d.ask.target)}{d.ask.source ? ` · ${d.ask.source}` : ''}{d.answer.value.after ? ` · pH after ${d.answer.value.after.ph.toFixed(1)}` : ''}</div>
          </div>
        </div>
      {:else}
        <div class="dose">
          <div class="a">?</div>
          <div>
            <div class="w">{strengthWords(d.ask.product)}</div>
            <div class="xs">{d.answer.questions.map((q) => q.ask).join(' ')}</div>
          </div>
        </div>
      {/if}
    {/each}
    {#each planned.notes as n (n.param)}
      <div class="dose"><div class="a">—</div><div><div class="w">{scaleFor(n.param).label}</div><div class="xs">{n.text}</div></div></div>
    {/each}
    {#if pool.cell && cell && !cell.ok}
      <div class="dose"><div class="a">?</div><div><div class="w">Salt cell · {pool.cell.make} {pool.cell.model}</div><div class="xs">{cell.questions.map((q) => q.ask).join(' ')} Until then salt is judged against the company's range.</div></div></div>
    {/if}
    {#if !doses.length && !planned.notes.length && !chemBusy}
      <p class="sm" style="margin-top:4px">Everything is inside the target ranges. Nothing to add.</p>
    {/if}
    <p class="xs" style="margin-top:8px">Targets: {targets.source}. Each amount is from today's readings alone: add acid first, then chlorine, let it mix, retest.</p>
  {/if}
</section>

{#if pool.visits.length >= 4}
  <section class="card">
    <div class="row"><h2 class="h">Chlorine decay · inferred</h2><span class="xs">last {pool.visits.length} visits</span></div>
    <DecayChart visits={pool.visits} forecast={pool.forecast.fc?.value} measured={reading?.values.fc} />
    {#each pool.decay as d (d.label)}
      <div class="dr"><b>{d.label}</b><div class="xs">{d.detail}</div><div class="rate" style:color={d.alert ? 'var(--bad)' : undefined}>{d.trend}</div></div>
    {/each}
  </section>
{/if}

{#if pool.equipment.length || pool.note}
  <section class="card">
    <h2 class="h">{pool.equipment.length ? "Equipment & notes" : "Notes"}</h2>
    <div class="tags">{#each pool.equipment as t (t)}<span class="tag">{t}</span>{/each}</div>
    {#if pool.note}{#if pool.equipment.length}<div class="h" style="margin-top:10px">Notes</div>{/if}<p class="sm" style="margin-top:4px;color:var(--ink)">{pool.note}</p>{/if}
  </section>
{/if}

<a class="btn" href={`#/field/${pool.id}/readings`}>{reading ? "Edit today's readings" : "Enter today's readings"}</a>

<style>
  .asks { margin: 6px 0 0 18px; font-size: 13px; color: var(--ink); }
  .contact { display: flex; align-items: center; min-height: 44px; font-weight: 800; color: var(--brand-link); text-decoration: none; }
  .edit { min-height: 44px; padding: 0 16px; text-decoration: none; flex: none; }
  .asks li { margin-top: 4px; }
</style>
