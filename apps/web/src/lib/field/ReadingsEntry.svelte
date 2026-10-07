<script lang="ts">
  import { tick } from 'svelte'
  import { compare } from './compare'
  import PickWheel from './PickWheel.svelte'
  import { loadReading, saveReading, today } from './readings'
  import { fmt, SCALES } from './scales'
  import type { Method, Param, Pool, Reading } from './types'

  let { pool }: { pool: Pool } = $props()

  const METHODS: { key: Method; label: string }[] = [
    { key: 'strip', label: 'Strip' },
    { key: 'drop', label: 'Drop kit' },
    { key: 'meter', label: 'Meter' },
  ]

  let reading = $state<Reading>({ method: 'drop', values: {} })
  let open = $state<Param | null>(null)
  let status = $state('Loading…')
  let saving = $state(false)
  let sheet = $state<HTMLElement>()

  const date = today()
  const entered = $derived(SCALES.filter((s) => reading.values[s.key] !== undefined).length)
  const openScale = $derived(open ? SCALES.find((s) => s.key === open)! : null)
  const openAgreement = $derived(open ? compare(reading.values[open], pool.forecast[open]) : null)

  $effect(() => {
    loadReading(pool.id, date)
      .then((r) => {
        if (r) reading = { method: r.method, values: r.values }
        status = ''
      })
      .catch((e: Error) => (status = e.message))
  })

  async function show(key: Param) {
    open = key
    await tick()
    ;(sheet?.querySelector('[role="radio"][tabindex="0"]') as SVGElement | null)?.focus()
  }

  function next() {
    const i = SCALES.findIndex((s) => s.key === open)
    const after = SCALES[i + 1]
    if (after) show(after.key)
    else open = null
  }

  function typed(e: Event & { currentTarget: HTMLInputElement }) {
    const v = e.currentTarget.valueAsNumber
    if (open && Number.isFinite(v)) reading.values[open] = v
  }

  async function save() {
    saving = true
    status = 'Saving…'
    try {
      await saveReading(pool.id, date, $state.snapshot(reading))
      status = 'Saved.'
      location.hash = `#/field/${pool.id}`
    } catch (e) {
      status = e instanceof Error ? e.message : 'Could not save readings.'
    } finally {
      saving = false
    }
  }
</script>

<div class="bar">
  <a class="back" href={`#/field/${pool.id}`}>‹ {pool.name}</a>
  <span class="chip">{entered} / {SCALES.length}</span>
</div>
<span class="sample">SAMPLE DATA</span>
<h1 class="h" style="margin:0 6px">Today's readings · {date}</h1>

<div class="eg">
  {#each SCALES as s (s.key)}
    {@const v = reading.values[s.key]}
    {@const f = pool.forecast[s.key]}
    <button
      class={['e', v === undefined && 'empty', compare(v, f).status === 'off' && 'off']}
      onclick={() => show(s.key)}
    >
      <div class="n">{s.label}</div>
      <div class="v">{fmt(s.key, v)}</div>
      <div class="p">{f ? `fcst ${fmt(s.key, f.value)}` : 'no forecast'}</div>
    </button>
  {/each}
</div>

<button class="btn" disabled={saving || entered === 0} onclick={save}>Save readings</button>
{#if status}<p class="status" role="status">{status}</p>{/if}

{#if open && openScale}
  <div class="dim" aria-hidden="true" onclick={() => (open = null)}></div>
  <div
    class="sheet"
    bind:this={sheet}
    role="dialog"
    aria-modal="true"
    aria-label={`${openScale.label} reading`}
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && (open = null)}
  >
    <div class="row">
      <div>
        <div class="h" style="text-transform:none">{openScale.label}</div>
        <div class="xs">tap the number{pool.forecast[open] ? ` · forecast ${fmt(open, pool.forecast[open]!.value)} is ringed` : ''}</div>
      </div>
      <button class="chip" onclick={() => (open = null)}>Done</button>
    </div>
    <PickWheel scale={openScale} bind:value={reading.values[open]} forecast={pool.forecast[open]} ideal={pool.ideal[open]} />
    {#if openAgreement?.status === 'off'}
      <div class="alert" role="alert">
        <b>Outside the forecast by more than ±{fmt(open, pool.forecast[open]!.band)}</b>
        <p>Retest before dosing. If it repeats, the reading stands and the forecast learns from it.</p>
      </div>
    {/if}
    <label class="type">Or type it <input type="number" inputmode="decimal" step="any" value={reading.values[open] ?? ''} onchange={typed} /> {openScale.unit}</label>
    <div class="seg" role="group" aria-label="Test method">
      {#each METHODS as m (m.key)}
        <button aria-pressed={reading.method === m.key} onclick={() => (reading.method = m.key)}>{m.label}</button>
      {/each}
    </div>
    <div class="row" style="gap:10px">
      <button class="btn ghost" style="flex:1" onclick={() => open && delete reading.values[open]}>Retest</button>
      <button class="btn" style="flex:2" onclick={next}>
        {SCALES.findIndex((s) => s.key === open) < SCALES.length - 1 ? `Next · ${SCALES[SCALES.findIndex((s) => s.key === open) + 1]!.label} ▸` : 'Done'}
      </button>
    </div>
  </div>
{/if}
