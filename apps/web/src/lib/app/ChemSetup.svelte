<script lang="ts">
  import { PRODUCT_WORDS, type Product, type ProductKind, type TargetParam, type Targets } from '../field/chem'
  import { SCALES } from '../field/scales'
  import { loadProducts, loadTargets, SAMPLE_PRODUCTS, SAMPLE_TARGETS, saveProducts, saveTargets } from '../field/settings'

  const KINDS = Object.keys(PRODUCT_WORDS) as ProductKind[]
  const PARAMS = SCALES.filter((s) => s.key !== 'temp').map((s) => ({ key: s.key as TargetParam, label: s.label, unit: s.unit }))

  /** The label facts each kind needs; the engine refuses a dose without them. */
  const FACTS: Record<ProductKind, { key: 'tradePercent' | 'hclPercent' | 'densityGPerMl' | 'assayPercent'; label: string }[]> = {
    'liquid-chlorine': [{ key: 'tradePercent', label: 'Trade % (available chlorine, g per 100 mL)' }],
    acid: [
      { key: 'hclPercent', label: '% HCl by weight' },
      { key: 'densityGPerMl', label: 'Density, g/mL (label or SDS)' },
    ],
    'soda-ash': [{ key: 'assayPercent', label: 'Purity % (100 if the label gives none)' }],
    bicarbonate: [{ key: 'assayPercent', label: 'Purity % (100 if the label gives none)' }],
    'calcium-chloride': [{ key: 'assayPercent', label: 'Purity %' }],
    'cyanuric-acid': [{ key: 'assayPercent', label: 'Purity % (100 if the label gives none)' }],
    salt: [{ key: 'assayPercent', label: 'Purity %' }],
  }

  let products = $state<Product[]>([])
  let targets = $state<Targets>({ source: '', ranges: {} })
  let phase = $state<'loading' | 'ready' | 'failed'>('loading')
  let note = $state('')
  let newKind = $state<ProductKind>('liquid-chlorine')

  async function load() {
    try {
      const [p, t] = await Promise.all([loadProducts(), loadTargets()])
      products = p
      targets = t ?? { source: '', ranges: {} }
      phase = 'ready'
    } catch (e) {
      phase = 'failed'
      note = e instanceof Error ? e.message : 'Could not load.'
    }
  }
  load()

  function addProduct() {
    const id = `${newKind}-${Date.now().toString(36)}`
    const p: Product = { id, kind: newKind, name: PRODUCT_WORDS[newKind] }
    if (newKind === 'calcium-chloride') p.form = 'anhydrous'
    products.push(p)
  }

  function useSample() {
    products = structuredClone(SAMPLE_PRODUCTS)
    targets = structuredClone(SAMPLE_TARGETS)
    note = 'Sample setup loaded, not saved. Check every number against your labels, then save.'
  }

  /** Blank fields are left out so the Worker's check names what is missing. */
  function clean(p: Product): Product {
    const out: Product = { id: p.id, kind: p.kind, name: p.name.trim() }
    for (const f of FACTS[p.kind]) if (typeof p[f.key] === 'number' && Number.isFinite(p[f.key])) out[f.key] = p[f.key]
    if (p.kind === 'calcium-chloride') out.form = p.form
    return out
  }

  function number(e: Event & { currentTarget: HTMLInputElement }): number | undefined {
    const t = e.currentTarget.value.trim().replace(',', '.')
    return t === '' ? undefined : Number(t)
  }

  async function saveAll() {
    note = 'Saving…'
    try {
      const ranges: Targets['ranges'] = {}
      for (const p of PARAMS) {
        const r = targets.ranges[p.key]
        if (r && Number.isFinite(r[0]) && Number.isFinite(r[1])) ranges[p.key] = [r[0], r[1]]
      }
      await saveTargets({ source: targets.source.trim(), ranges })
      await saveProducts(products.map(clean))
      note = 'Saved. Every phone on the route sees this setup.'
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not save.'
    }
  }

  function setRange(key: TargetParam, i: 0 | 1, v: number | undefined) {
    const r = targets.ranges[key] ?? [Number.NaN, Number.NaN]
    r[i] = v ?? Number.NaN
    targets.ranges[key] = r
  }
</script>

<div class="bar"><a class="back" href="#/more">‹ More</a><span class="xs">chemistry setup</span></div>

<section class="card" style="margin-top:0">
  <h1 class="big">Products and targets</h1>
  <p class="sm" style="margin-top:4px">
    Doses are worked out from these. Strengths come off the label, so every dose can name its product and basis. Targets are your
    company's own ranges; say where they come from, and that line shows under every dose.
  </p>
  {#if phase === 'ready' && !products.length && !targets.source}
    <button class="btn ghost" onclick={useSample}>Load the sample setup (made up; check it)</button>
  {/if}
</section>

{#if phase === 'failed'}
  <p class="alert" role="alert"><b>{note}</b></p>
  <button class="btn ghost" onclick={load}>Try again</button>
{:else if phase === 'ready'}
  <section class="card">
    <h2 class="h">Products on the truck</h2>
    {#each products as p, i (p.id)}
      <div class="prod">
        <div class="row">
          <span class="chip">{PRODUCT_WORDS[p.kind]}</span>
          <button class="chip" onclick={() => products.splice(i, 1)} aria-label={`Remove ${p.name || PRODUCT_WORDS[p.kind]}`}>Remove</button>
        </div>
        <label class="f">Name, as on the label <input type="text" bind:value={p.name} /></label>
        {#each FACTS[p.kind] as f (f.key)}
          <label class="f">{f.label} <input type="text" inputmode="decimal" value={p[f.key] ?? ''} onchange={(e) => (p[f.key] = number(e))} /></label>
        {/each}
        {#if p.kind === 'calcium-chloride'}
          <div class="seg" role="group" aria-label="Form">
            <button aria-pressed={p.form === 'anhydrous'} onclick={() => (p.form = 'anhydrous')}>Anhydrous (94–97%)</button>
            <button aria-pressed={p.form === 'dihydrate'} onclick={() => (p.form = 'dihydrate')}>Dihydrate (77%)</button>
          </div>
        {/if}
      </div>
    {/each}
    <div class="row" style="margin-top:10px">
      <select class="sel" bind:value={newKind} aria-label="Product kind">
        {#each KINDS as k (k)}<option value={k}>{PRODUCT_WORDS[k]}</option>{/each}
      </select>
      <button class="chip" onclick={addProduct} aria-label={`Add ${PRODUCT_WORDS[newKind]}`}>Add</button>
    </div>
  </section>

  <section class="card">
    <h2 class="h">Target ranges</h2>
    {#each PARAMS as p (p.key)}
      {@const r = targets.ranges[p.key]}
      <div class="tr">
        <span class="nm">{p.label}</span>
        <input type="text" inputmode="decimal" aria-label={`${p.label} low`} value={r && Number.isFinite(r[0]) ? r[0] : ''} onchange={(e) => setRange(p.key, 0, number(e))} />
        <span class="xs">to</span>
        <input type="text" inputmode="decimal" aria-label={`${p.label} high`} value={r && Number.isFinite(r[1]) ? r[1] : ''} onchange={(e) => setRange(p.key, 1, number(e))} />
        <span class="xs">{p.unit}</span>
      </div>
    {/each}
    <label class="f">Where these targets come from (shown under every dose) <textarea rows="2" bind:value={targets.source}></textarea></label>
  </section>

  <button class="btn" onclick={saveAll}>Save setup</button>
  {#if note}<p class="status" role="status">{note}</p>{/if}
{/if}

<style>
  .prod { border-top: 1px solid var(--line); padding: 8px 0; }
  .prod:first-of-type { border-top: 0; }
  .f { display: block; font-size: 12px; color: var(--mute); margin-top: 6px; }
  .f input, .f textarea, .sel { display: block; width: 100%; font: inherit; font-size: 16px; font-weight: 700; border: 2px solid var(--line); border-radius: 10px; padding: 8px; color: var(--ink); margin-top: 2px; min-height: 48px; background: var(--card); }
  .sel { flex: 1; margin-top: 0; }
  .tr { display: grid; grid-template-columns: 44px 1fr auto 1fr 34px; gap: 6px; align-items: center; margin-top: 6px; }
  .tr input { width: 100%; font: inherit; font-size: 16px; font-weight: 800; border: 2px solid var(--line); border-radius: 10px; padding: 8px; min-height: 48px; color: var(--ink); }
  .status { text-align: center; font-size: 13px; color: var(--mute); margin-top: 8px; }
</style>
