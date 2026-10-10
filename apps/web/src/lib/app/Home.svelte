<script lang="ts">
  import { brand as current } from './account.svelte'
  import NoPools from '../field/NoPools.svelte'
  import { loadPools } from '../field/pools'
  import RouteMap from '../field/RouteMap.svelte'
  import { ROUTE, STOPS } from '../field/sample'
  import { initials, loadStaff } from '../field/staff'
  import type { Pool, StaffMember } from '../field/types'
  import { describe, hourLabel, loadWeather, locate, rainFrom, savedSpot, type Spot, type Weather } from '../field/weather'

  const brand = $derived(current())

  let { email, isOwner }: { email: string; isOwner: boolean } = $props()

  // Re-read the clock when the app comes back to the front: an installed app
  // can sit open overnight, and there is no pull-to-refresh to fix it.
  let now = $state(new Date())
  let fetchedAt = 0
  const hour = $derived(now.getHours())
  const greeting = $derived(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
  const day = $derived(now.toLocaleDateString('en-US', { weekday: 'long' }))
  const date = $derived(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

  function onVisible() {
    if (document.hidden) return
    now = new Date()
    const spot = savedSpot()
    if (spot && !busy && Date.now() - fetchedAt > 15 * 60 * 1000) showWeather(spot)
  }

  let pools = $state<Pool[] | null>(null)
  let poolsNote = $state('')
  loadPools()
    .then((p) => (pools = p))
    .catch((e) => (poolsNote = e instanceof Error ? e.message : 'Could not load the pools.'))
  const byId = $derived(new Map((pools ?? []).map((p) => [p.id, p])))
  // Still the demo route (dispatch is not built); only stops whose pool is on file show.
  const stops = $derived(STOPS.filter((s) => byId.has(s.poolId)))
  const done = $derived(stops.filter((s) => s.done).length)
  const nextStop = $derived(stops.find((s) => !s.done))
  const nextPool = $derived(nextStop ? byId.get(nextStop.poolId) : undefined)

  // Staff on file. There is no clock-in yet, so this lists who is on the team, not who is on shift.
  let staff = $state<StaffMember[] | null>(null)
  let staffNote = $state('')
  loadStaff()
    .then((s) => (staff = s))
    .catch((e) => (staffNote = e instanceof Error ? e.message : 'Could not load the staff list.'))
  const staffDemo = $derived((staff ?? []).some((s) => s.demo))

  let weather = $state<Weather | null>(null)
  let weatherNote = $state('')
  let busy = $state(false)

  async function showWeather(spot: Spot) {
    busy = true
    weatherNote = ''
    try {
      weather = await loadWeather(spot)
    } catch (e) {
      weatherNote = e instanceof Error ? e.message : 'Weather is unavailable right now.'
    } finally {
      // Failed tries count too, so the minute tick does not retry every minute.
      fetchedAt = Date.now()
      busy = false
    }
  }

  async function askLocation() {
    busy = true
    try {
      await showWeather(await locate())
    } catch (e) {
      weatherNote = e instanceof Error ? e.message : 'Location is off.'
      busy = false
    }
  }

  const saved = savedSpot()
  if (saved) showWeather(saved)

  // Keep the clock ("Rain likely from…") and the weather current while the page stays open.
  $effect(() => {
    const tick = setInterval(onVisible, 60 * 1000)
    return () => clearInterval(tick)
  })

  const look = $derived(weather ? describe(weather.code) : null)
  const rainAt = $derived(weather ? rainFrom(weather, hour) : null)
</script>

<svelte:document onvisibilitychange={onVisible} />

<header class="brandbar">
  <img src={brand.logo} alt={brand.legalName} class="logo" />
  <div class="who">
    <div class="bn">{brand.name}</div>
    <div class="xs">{brand.tagline}</div>
  </div>
</header>

<header class="hello">
  <div>
    <p class="xs">{greeting}{email ? ` · ${email}` : ''}</p>
    <h1 class="day">{day} <span>· {date}</span></h1>
  </div>
  <a class="msg" href="#/messages"><span aria-hidden="true">💬</span> Message board</a>
</header>

{#if brand.pilot}
  <section class="card pilot" aria-label="Test drive">
    <div style="flex:1;min-width:0">
      <div class="nm">You're test-driving the app</div>
      <div class="xs">Anything marked DEMO is made up. See something wrong or missing? Tell us.</div>
    </div>
    <a class="chip" href="#/more/report">🐞 Report</a>
  </section>
{/if}

<section class="card weather" aria-label="Weather">
  {#if weather && look}
    <div class="now">
      <span class="icon" aria-hidden="true">{look.icon}</span>
      <div style="flex:1;min-width:0">
        <div class="row" style="justify-content:flex-start;gap:8px"><span class="temp">{weather.tempF}°</span><span class="sm">{#if look.text}{look.text}<br />{/if}H {weather.highF}° · L {weather.lowF}°</span></div>
        <div class="pred">
          <span class={['pp', weather.rainChance >= 50 && 'warn']}>Rain {weather.rainChance}%</span>
          {#if weather.uvMax !== null}<span class={['pp', weather.uvMax >= 8 && 'warn']}>UV {weather.uvMax}</span>{/if}
          {#if weather.windMph !== null}<span class="pp">Wind {weather.windMph} mph</span>{/if}
          {#if weather.source === 'nws'}<span class="xs">via NWS</span>{/if}
        </div>
      </div>
      <button class="chip refresh" onclick={askLocation} disabled={busy} aria-label="Refresh weather for where I am">↻</button>
    </div>
    {#if rainAt !== null}<p class="alert-soft">Rain likely from {hourLabel(rainAt)}. Plan outdoor work and dosing before then.</p>{/if}
    {#if weatherNote}<p class="xs" role="status" style="margin-top:6px">{weatherNote}{#if weatherNote === 'Sign in again.'}<a class="signin" href="/">Sign in</a>{/if}</p>{/if}
  {:else}
    <div class="row">
      <div><div class="h">Weather</div><p class="sm" role="status">{weatherNote || 'Uses your location, rounded to about 1 km.'}{#if weatherNote === 'Sign in again.'}<a class="signin" href="/">Sign in</a>{/if}</p></div>
      <button class="chip" onclick={askLocation} disabled={busy}>{busy ? 'Loading…' : 'Show weather'}</button>
    </div>
  {/if}
</section>

{#if poolsNote}
  <p class="alert" role="alert"><b>{poolsNote}</b></p>
{:else if pools === null}
  <section class="card"><h2 class="h">Today's route</h2><p class="sm" style="margin-top:4px">Loading pools…</p></section>
{:else if pools.length === 0}
  <NoPools {isOwner} onloaded={(p) => (pools = p)} />
{:else if stops.length === 0}
  <section class="card"><h2 class="h">Today's route</h2><p class="sm" style="margin-top:4px">No route assigned today. {pools.length} pools on file.</p></section>
{:else}
<a class="card tap" href="#/field">
  <div class="row"><h2 class="h">Today's route</h2><span class="sample">DEMO</span></div>
  <div class="row" style="margin-top:4px">
    <div class="big">{ROUTE.headline}</div>
  </div>
  <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={stops.length} aria-valuenow={done} aria-label="Stops done">
    <span style:width={`${(done / stops.length) * 100}%`}></span>
  </div>
  <div class="row xs" style="margin-top:4px"><span>{done} of {stops.length} stops done</span><span>{stops.length - done} to go</span></div>
  {#if nextStop && nextPool}
    <div class="next">
      <span class="num">{stops.indexOf(nextStop) + 1}</span>
      <div style="flex:1">
        <div class="nm">Next · {nextPool.name}</div>
        <div class="pred">{#each nextStop.flags as f (f.text)}<span class={['pp', f.level]}>{f.text}</span>{/each}</div>
      </div>
      <span class="chip">{nextStop.eta.replace(/^next · /, '') || 'next'}</span>
    </div>
  {/if}
  <RouteMap {stops} />
  <div class="tags">{#each ROUTE.load as l (l)}<span class="tag">{l}</span>{/each}</div>
</a>
{/if}

<a class="card tap tool" href="/measure">
  <span class="tool-icon" aria-hidden="true">📏</span>
  <div style="flex:1"><div class="nm">Measure a liner or cover</div><div class="xs">A/B walk · closure checks · order forms</div></div>
  <span class="chip">Open</span>
</a>

<section class="card">
  <div class="row"><h2 class="h">Working today</h2>{#if staff?.length}<span class="xs">{staff.length} on staff{#if staffDemo}<span class="sample" style="margin:0 0 0 4px">DEMO</span>{/if}</span>{/if}</div>
  {#if staffNote}
    <p class="sm" role="status" style="margin-top:4px">{staffNote}</p>
  {:else if staff === null}
    <p class="sm" style="margin-top:4px">Loading staff…</p>
  {:else if staff.length === 0}
    <p class="sm" style="margin-top:4px">No staff on file yet.</p>
    {#if isOwner}<a class="chip addstaff" href="#/more/staff">Add staff</a>{/if}
  {:else}
    <ul class="crew">
      {#each staff as s (s.id)}
        <li>
          <span class="av" aria-hidden="true">{initials(s.name)}</span>
          <div style="min-width:0"><div class="nm">{s.name}</div><div class="xs">{s.route ?? 'No route set'}</div></div>
          <span class="chip">{s.role}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>


<style>
  .brandbar { display: flex; align-items: center; gap: 10px; padding: 0 4px 8px; }
  .brandbar .logo { width: 64px; height: 64px; object-fit: contain; flex: none; filter: drop-shadow(0 2px 3px rgba(14, 60, 95, .18)); }
  .brandbar .who { min-width: 0; }
  .brandbar .bn { font-size: 20px; font-weight: 900; line-height: 1.1; color: var(--brand-title, var(--brand-deep)); }
  .pilot { display: flex; align-items: center; gap: 10px; background: linear-gradient(180deg, var(--card), var(--brand-ice)); border: 2px solid rgb(var(--brand-accent-rgb) / .8); }
  .pilot .chip { min-height: 44px; padding: 0 14px; font-weight: 900; text-decoration: none; background: var(--brand-accent); color: var(--brand-deep); }
  .hello { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; padding: 2px 4px 0; }
  .hello > div { min-width: 0; }
  .hello .xs { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .day { font-size: 22px; font-weight: 900; line-height: 1.15; }
  .day span { color: var(--mute); font-weight: 800; white-space: nowrap; }
  .msg { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border-radius: 22px; font-weight: 900; font-size: 13px; color: #fff; text-decoration: none; background: linear-gradient(180deg, var(--brand-primary), var(--brand-primary-dark)); box-shadow: 0 3px 0 var(--brand-deep); text-shadow: 0 1px 0 rgba(0, 0, 0, .25); }
  .refresh { min-width: 44px; min-height: 44px; justify-content: center; font-size: 18px; }
  .signin { display: inline-flex; align-items: center; min-height: 44px; margin-left: 8px; color: var(--brand-link); font-weight: 900; }
  .tap { display: block; color: inherit; text-decoration: none; }
  .tool { display: flex; align-items: center; gap: 12px; }
  .tool-icon { font-size: 28px; }
  .now { display: flex; align-items: center; gap: 10px; }
  .icon { font-size: 36px; line-height: 1; }
  .temp { font-size: 32px; font-weight: 900; line-height: 1; }
  .alert-soft { margin-top: 8px; background: var(--warnbg); color: var(--warn); border-radius: 12px; padding: 8px 10px; font-size: 13px; font-weight: 700; }
  .progress { height: 10px; border-radius: 99px; background: var(--line); overflow: hidden; margin-top: 10px; }
  .progress span { display: block; height: 100%; background: linear-gradient(90deg, #2bb673, #4fd18f); border-radius: 99px; }
  .next { display: flex; align-items: center; gap: 8px; margin-top: 10px; background: var(--soft); border-radius: 16px; padding: 8px 10px; }
  .crew { list-style: none; margin: 6px 0 0; padding: 0; }
  .crew li { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 10px; padding: 4px 0; border-top: 1px solid var(--line); }
  .crew li:first-child { border-top: 0; }
  .addstaff { margin-top: 8px; min-height: 44px; padding: 0 14px; text-decoration: none; }
  .av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; color: var(--brand-link); background: var(--brand-ice); box-shadow: 0 2px 0 rgb(var(--brand-sky-rgb) / .35); }
</style>
