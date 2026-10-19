<script lang="ts">
  import { tick } from 'svelte'
  import { compare } from './compare'
  import PickWheel from './PickWheel.svelte'
  import { loadDraft, loadReading, saveDraft, saveReading, today } from './readings'
  import { fmt, parseTyped, SCALES } from './scales'
  import type { Method, Param, Pool, Reading } from './types'

  let { pool }: { pool: Pool } = $props()

  /** Same readings, same text: fixed key order so "changed?" is a plain comparison. */
  const canon = (r: Reading) =>
    JSON.stringify({ method: r.method, values: Object.fromEntries(SCALES.filter((s) => r.values[s.key] !== undefined).map((s) => [s.key, r.values[s.key]])) })

  const METHODS: { key: Method; label: string }[] = [
    { key: 'strip', label: 'Strip' },
    { key: 'drop', label: 'Drop kit' },
    { key: 'meter', label: 'Meter' },
  ]

  // The parent re-creates this screen per pool ({#key}), so reading the prop once is fine.
  // svelte-ignore state_referenced_locally
  const poolId = pool.id
  const date = today()

  let reading = $state<Reading>({ method: 'drop', values: {} })
  let saved = $state('') // what the server holds, to know if anything changed
  let phase = $state<'loading' | 'ready' | 'failed' | 'saving'>('loading')
  let status = $state('Loading…')
  let open = $state<Param | null>(null)
  let typedError = $state('')
  let sheet = $state<HTMLElement>()
  let opener: HTMLElement | null = null

  const entered = $derived(SCALES.filter((s) => reading.values[s.key] !== undefined).length)
  const dirty = $derived(canon(reading) !== saved)
  const openAt = $derived(SCALES.findIndex((s) => s.key === open))
  const openScale = $derived(openAt >= 0 ? SCALES[openAt]! : null)
  const nextScale = $derived(openAt >= 0 ? SCALES[openAt + 1] : undefined)
  const openAgreement = $derived(open ? compare(reading.values[open], pool.forecast[open]) : null)

  async function load() {
    phase = 'loading'
    status = 'Loading…'
    try {
      const server = (await loadReading(poolId, date)) ?? { method: 'drop', values: {} }
      saved = canon(server)
      // Unsaved work wins: a draft from earlier, then anything tapped while loading.
      const draft = loadDraft(poolId, date)
      reading = {
        method: draft?.method ?? server.method,
        values: { ...server.values, ...draft?.values, ...$state.snapshot(reading.values) },
      }
      phase = 'ready'
      status = ''
    } catch (e) {
      phase = 'failed'
      status = e instanceof Error ? e.message : 'Could not load readings.'
    }
  }
  load()

  // Keep a draft of unsaved changes so Back, a pool switch or a reload loses nothing.
  $effect(() => {
    const snap = $state.snapshot(reading)
    if (phase === 'ready') saveDraft(poolId, date, canon(snap) === saved ? null : snap)
  })

  async function show(key: Param, from?: HTMLElement) {
    if (!open) {
      opener = from ?? null
      // A history entry for the sheet, so the phone's Back closes it instead of leaving.
      history.pushState({ sheet: true }, '', location.href)
    }
    open = key
    typedError = ''
    await tick()
    const target = (sheet?.querySelector('[role="radio"][tabindex="0"]') as HTMLElement | SVGElement | null) ?? sheet
    target?.focus()
  }

  function close() {
    if (!open) return
    if ((history.state as { sheet?: boolean } | null)?.sheet) history.back()
    else closed()
  }
  async function closed() {
    open = null
    typedError = ''
    await tick() // the screen behind is inert until the sheet is gone
    opener?.focus()
  }

  function next() {
    if (nextScale) show(nextScale.key)
    else close()
  }

  function typed(e: Event & { currentTarget: HTMLInputElement }) {
    if (!openScale) return
    const r = parseTyped(openScale, e.currentTarget.value)
    if ('error' in r) {
      typedError = r.error
      return
    }
    typedError = ''
    if (r.value === undefined) delete reading.values[openScale.key]
    else reading.values[openScale.key] = r.value
  }

  async function save() {
    if (phase !== 'ready' || !dirty) return
    phase = 'saving'
    status = 'Saving…'
    const snap = $state.snapshot(reading)
    try {
      await saveReading(poolId, date, snap)
      saved = canon(snap)
      saveDraft(poolId, date, null)
      location.hash = `#/field/${poolId}`
    } catch (e) {
      status = e instanceof Error ? e.message : 'Could not save readings.'
      phase = 'ready'
    }
  }
</script>

<svelte:window
  onpopstate={() => open && closed()}
  onkeydown={(e) => e.key === 'Escape' && open && close()}
/>

<div inert={!!open}>
  <div class="bar">
    <a class="back" href={`#/field/${poolId}`}>‹ {pool.name}</a>
    <span class="chip">{entered} / {SCALES.length}</span>
  </div>
  <h1 class="h" style="margin:0 6px">Today's readings · {date} {#if pool.demo}<span class="sample" title="Made-up pools so the screens can be tried. Real customers come with the customer list.">DEMO DATA</span>{/if}</h1>

  <div class="eg">
    {#each SCALES as s (s.key)}
      {@const v = reading.values[s.key]}
      {@const f = pool.forecast[s.key]}
      <button
        class={['e', v === undefined && 'empty', compare(v, f).status === 'off' && 'off']}
        disabled={phase !== 'ready'}
        onclick={(e) => show(s.key, e.currentTarget)}
      >
        <div class="n">{s.label}</div>
        <div class="v">{fmt(s.key, v)}</div>
        <div class="p">{f ? `fcst ${fmt(s.key, f.value)}` : ''}</div>
      </button>
    {/each}
  </div>

  {#if phase === 'failed'}
    <div class="alert" role="alert"><b>{status}</b><p>Readings can't be entered until today's saved readings load, so nothing gets overwritten.</p></div>
    <button class="btn ghost" onclick={load}>Try again</button>
  {:else}
    <button class="btn" disabled={phase !== 'ready' || !dirty} onclick={save}>{phase === 'saving' ? 'Saving…' : dirty ? 'Save readings' : 'Saved'}</button>
    {#if status}<p class="status" role="status">{status}{#if status === 'Sign in again.'} <a href="/">Sign in</a>{/if}</p>{/if}
    {#if dirty && phase === 'ready'}<p class="xs" style="text-align:center;margin-top:6px">Not saved yet · kept on this phone until you save</p>{/if}
  {/if}
</div>

{#if open && openScale}
  <div class="dim" aria-hidden="true" onclick={close}></div>
  <div class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-label={`${openScale.label} reading`} tabindex="-1">
    <div class="row">
      <div>
        <div class="h" style="text-transform:none">{openScale.label}</div>
        <div class="xs">tap the number{pool.forecast[open] ? ` · ring marks forecast ${fmt(open, pool.forecast[open]!.value)}` : ''}</div>
      </div>
      <button class="chip" onclick={close}>Done</button>
    </div>
    <PickWheel scale={openScale} bind:value={reading.values[open]} forecast={pool.forecast[open]} ideal={pool.ideal[open]} />
    {#if openAgreement?.status === 'off'}
      <p class="offline" role="alert">Off forecast by more than ±{fmt(open, pool.forecast[open]!.band)} · retest before dosing</p>
    {/if}
    <label class="type">
      Or type it
      <input type="text" inputmode="decimal" autocomplete="off" value={reading.values[open] ?? ''} onchange={typed} aria-invalid={!!typedError} />
      {openScale.unit}
    </label>
    {#if typedError}<p class="offline" role="alert">{typedError}</p>{/if}
    <div class="seg" role="group" aria-label="Test method">
      {#each METHODS as m (m.key)}
        <button aria-pressed={reading.method === m.key} onclick={() => (reading.method = m.key)}>{m.label}</button>
      {/each}
    </div>
    <div class="actions">
      <button class="btn ghost" onclick={() => open && delete reading.values[open]}>Retest</button>
      <button class="btn" onclick={next}>{nextScale ? `Next · ${nextScale.label} ▸` : 'Done'}</button>
    </div>
  </div>
{/if}
