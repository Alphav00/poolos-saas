<script lang="ts">
  // Add a customer (#/field/new) or change one (#/field/<id>/edit). Owners,
  // Leads and Dispatchers may; the Worker checks it again (apps/api/src/roles.ts).
  import { draftFrom, profileFrom, SANITIZERS, SURFACES } from './customer'
  import { deleteCustomer, newCustomerId, saveCustomer } from './pools'
  import { DAYS, dayOf, nextOrder } from './route'
  import type { Pool, Profile } from './types'

  let { pools, pool, onsaved }: { pools: Pool[]; pool?: Pool; onsaved: (pools: Pool[]) => void } = $props()

  // The form starts from the record once; later list reloads do not reset what was typed.
  const start = (): Profile | null => (pool ? $state.snapshot(pool) as Profile : null)
  let d = $state(draftFrom(start(), dayOf(new Date())))
  let busy = $state(false)
  let error = $state('')

  async function save(e: SubmitEvent) {
    e.preventDefault()
    // Checked before anything is fetched; the id is filled in below for a new customer.
    const checked = profileFrom($state.snapshot(d), pool ? { ...($state.snapshot(pool) as Profile) } : { id: 'new', name: '', tags: [], equipment: [] })
    if (typeof checked === 'string') {
      error = checked
      return
    }
    busy = true
    error = ''
    try {
      // A new customer's id is picked from the list as it is now, not as this screen last saw it.
      const fresh = pool ? null : await newCustomerId(d.name)
      const onFile = fresh?.pools ?? pools
      const base: Profile = pool ? { ...($state.snapshot(pool) as Profile) } : { id: fresh!.id, name: '', tags: [], equipment: [] }
      // A new customer, or one moved to another day, goes to the end of that day's route.
      if (!pool || pool.serviceDay !== d.serviceDay) base.order = nextOrder(onFile, d.serviceDay)
      const p = profileFrom($state.snapshot(d), base)
      if (typeof p === 'string') throw new Error(p)
      // The pool's look-ahead (forecast, visits) is not part of the record.
      const { forecast: _f, ideal: _i, visits: _v, decay: _d, ...record } = p as Pool
      onsaved(await saveCustomer(record))
      location.hash = pool ? `#/field/${p.id}` : '#/field'
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not save the customer.'
    } finally {
      busy = false
    }
  }

  async function remove() {
    if (!pool || !confirm(`Remove ${pool.name}? Their readings stay on file.`)) return
    busy = true
    error = ''
    try {
      onsaved(await deleteCustomer(pool.id))
      location.hash = '#/field'
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not remove the customer.'
    } finally {
      busy = false
    }
  }
</script>

<div class="bar"><a class="back" href={pool ? `#/field/${pool.id}` : '#/field'}>‹ {pool ? pool.name : 'Route'}</a><span class="xs">{pool ? 'edit customer' : 'new customer'}</span></div>

<form class="card cust" style="margin-top:0" onsubmit={save}>
  <h1 class="big">{pool ? 'Edit customer' : 'Add a customer'}</h1>
  <label class="f">Customer name <input type="text" bind:value={d.name} maxlength="80" required autocomplete="off" placeholder="e.g. Harper family" /></label>
  <label class="f">Address <input type="text" bind:value={d.address} maxlength="200" autocomplete="off" placeholder="Street, town" /></label>
  <label class="f">Phone <input type="tel" bind:value={d.phone} maxlength="40" autocomplete="off" /></label>

  <span class="f" id="day-label">Service day</span>
  <div class="opts days" role="group" aria-labelledby="day-label">
    {#each DAYS as day (day.key)}
      <button type="button" class="chip" aria-pressed={d.serviceDay === day.key} aria-label={day.long} onclick={() => (d.serviceDay = day.key)}>{day.short}</button>
    {/each}
  </div>
  <p class="xs hint">They show on that day's route every week.</p>

  <label class="f">Pool size, gallons <input type="text" inputmode="numeric" bind:value={d.gallons} maxlength="9" autocomplete="off" placeholder="e.g. 18000" /></label>
  <p class="xs hint">Needed to work out how much to add.</p>

  <span class="f" id="surface-label">Surface</span>
  <div class="opts" role="group" aria-labelledby="surface-label">
    {#each SURFACES as s (s)}
      <button type="button" class="chip" aria-pressed={d.surface === s} onclick={() => (d.surface = d.surface === s ? '' : s)}>{s}</button>
    {/each}
  </div>

  <span class="f" id="san-label">Chlorine source</span>
  <div class="opts" role="group" aria-labelledby="san-label">
    {#each SANITIZERS as s (s)}
      <button type="button" class="chip" aria-pressed={d.sanitizer === s} onclick={() => (d.sanitizer = d.sanitizer === s ? '' : s)}>{s}</button>
    {/each}
  </div>
  {#if d.sanitizer === 'Salt'}
    <div class="two">
      <label class="f">Cell make <input type="text" bind:value={d.cellMake} maxlength="60" autocomplete="off" placeholder="e.g. Hayward" /></label>
      <label class="f">Cell model <input type="text" bind:value={d.cellModel} maxlength="60" autocomplete="off" /></label>
    </div>
  {/if}

  <label class="f">Notes <textarea bind:value={d.note} maxlength="500" rows="3" placeholder="Gate code, dog, where the equipment is…"></textarea></label>

  {#if error}<p class="alert" role="alert"><b>{error}</b></p>{/if}
  <button class="btn" type="submit" disabled={busy || !d.name.trim()}>{busy ? 'Saving…' : pool ? 'Save changes' : 'Add customer'}</button>
  {#if pool}<button class="btn ghost danger" type="button" onclick={remove} disabled={busy}>Remove customer</button>{/if}
</form>

<style>
  .cust .big { margin-bottom: 4px; }
  .f { display: block; font-size: 12px; color: var(--mute); margin-top: 10px; }
  .f input, .f textarea { display: block; width: 100%; font: inherit; font-size: 16px; font-weight: 700; border: 2px solid var(--line); border-radius: 10px; padding: 8px; color: var(--ink); margin-top: 2px; min-height: 48px; background: var(--card); }
  .f input:focus, .f textarea:focus { outline: none; border-color: var(--brand-primary); }
  .opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px; }
  .opts.days { grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .opts .chip { justify-content: center; min-height: 44px; font-size: 13px; padding: 4px 2px; white-space: normal; text-align: center; }
  .opts .chip[aria-pressed='true'] { background: var(--brand-primary); color: #fff; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .hint { margin-top: 3px; }
  .danger { color: var(--bad); }
</style>
