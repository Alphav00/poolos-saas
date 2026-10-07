<script lang="ts">
  import RouteMap from '../field/RouteMap.svelte'
  import { CREW, poolById, ROUTE, STOPS } from '../field/sample'
  import { describe, hourLabel, loadWeather, locate, rainFrom, savedSpot, type Spot, type Weather } from '../field/weather'

  let { email }: { email: string } = $props()

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
    if (spot && Date.now() - fetchedAt > 15 * 60 * 1000) showWeather(spot)
  }

  const done = STOPS.filter((s) => s.done).length
  const nextStop = STOPS.find((s) => !s.done)
  const nextPool = nextStop ? poolById(nextStop.poolId) : undefined
  const working = CREW.filter((c) => c.state !== 'off')

  let weather = $state<Weather | null>(null)
  let weatherNote = $state('')
  let busy = $state(false)

  async function showWeather(spot: Spot) {
    busy = true
    weatherNote = ''
    try {
      weather = await loadWeather(spot)
      fetchedAt = Date.now()
    } catch (e) {
      weatherNote = e instanceof Error ? e.message : 'Weather is unavailable right now.'
    } finally {
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

  const look = $derived(weather ? describe(weather.code) : null)
  const rainAt = $derived(weather ? rainFrom(weather, hour) : null)
</script>

<svelte:document onvisibilitychange={onVisible} />

<header class="hello">
  <div>
    <p class="xs">{greeting}{email ? ` · ${email}` : ''}</p>
    <h1 class="day">{day} <span>· {date}</span></h1>
  </div>
  <a class="msg" href="/boards/shallow-end"><span aria-hidden="true">💬</span> Message board</a>
</header>

<section class="card weather" aria-label="Weather">
  {#if weather && look}
    <div class="now">
      <span class="icon" aria-hidden="true">{look.icon}</span>
      <div style="flex:1;min-width:0">
        <div class="row" style="justify-content:flex-start;gap:8px"><span class="temp">{weather.tempF}°</span><span class="sm">{look.text}<br />H {weather.highF}° · L {weather.lowF}°</span></div>
        <div class="pred">
          <span class={['pp', weather.rainChance >= 50 && 'warn']}>Rain {weather.rainChance}%</span>
          <span class={['pp', weather.uvMax >= 8 && 'warn']}>UV {weather.uvMax}</span>
          <span class="pp">Wind {weather.windMph} mph</span>
        </div>
      </div>
      <button class="chip refresh" onclick={askLocation} disabled={busy} aria-label="Refresh weather for where I am">↻</button>
    </div>
    {#if rainAt !== null}<p class="alert-soft">Rain likely from {hourLabel(rainAt)}. Plan outdoor work and dosing before then.</p>{/if}
    {#if weatherNote}<p class="xs" role="status" style="margin-top:6px">{weatherNote}</p>{/if}
  {:else}
    <div class="row">
      <div><div class="h">Weather</div><p class="sm">{weatherNote || 'Uses your location, rounded to about 1 km.'}</p></div>
      <button class="chip" onclick={askLocation} disabled={busy}>{busy ? 'Loading…' : 'Show weather'}</button>
    </div>
  {/if}
</section>

<a class="card tap" href="#/field">
  <div class="row"><h2 class="h">Today's route</h2><span class="sample">SAMPLE</span></div>
  <div class="row" style="margin-top:4px">
    <div class="big">{ROUTE.headline}</div>
  </div>
  <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={STOPS.length} aria-valuenow={done} aria-label="Stops done">
    <span style:width={`${(done / STOPS.length) * 100}%`}></span>
  </div>
  <div class="row xs" style="margin-top:4px"><span>{done} of {STOPS.length} stops done</span><span>{STOPS.length - done} to go</span></div>
  {#if nextStop && nextPool}
    <div class="next">
      <span class="num">{STOPS.indexOf(nextStop) + 1}</span>
      <div style="flex:1">
        <div class="nm">Next · {nextPool.name}</div>
        <div class="pred">{#each nextStop.flags as f (f.text)}<span class={['pp', f.level]}>{f.text}</span>{/each}</div>
      </div>
      <span class="chip">{nextStop.eta.replace(/^next · /, '') || 'next'}</span>
    </div>
  {/if}
  <RouteMap stops={STOPS} />
  <div class="tags">{#each ROUTE.load as l (l)}<span class="tag">{l}</span>{/each}</div>
</a>

<a class="card tap tool" href="/measure">
  <span class="tool-icon" aria-hidden="true">📏</span>
  <div style="flex:1"><div class="nm">Measure a liner or cover</div><div class="xs">A/B walk · closure checks · order forms</div></div>
  <span class="chip">Open</span>
</a>

<section class="card">
  <div class="row"><h2 class="h">Working today</h2><span class="xs">{working.length} on <span class="sample" style="margin:0 0 0 4px">SAMPLE</span></span></div>
  <ul class="crew">
    {#each CREW as c (c.name)}
      <li class={c.state}>
        <span class="av" aria-hidden="true">{c.initials}</span>
        <div><div class="nm">{c.name} <span class="xs">· {c.role}</span></div><div class="xs">{c.status}</div></div>
        <span class={['dot', c.state]} aria-label={c.state === 'working' ? 'working' : c.state === 'break' ? 'on break' : 'off'}></span>
      </li>
    {/each}
  </ul>
</section>


<style>
  .hello { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; padding: 2px 4px 0; }
  .hello > div { min-width: 0; }
  .hello .xs { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .day { font-size: 22px; font-weight: 900; line-height: 1.15; }
  .day span { color: var(--mute); font-weight: 800; white-space: nowrap; }
  .msg { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border-radius: 22px; font-weight: 900; font-size: 13px; color: #fff; text-decoration: none; background: linear-gradient(180deg, #0a8fd0, #066fa6); box-shadow: 0 3px 0 #05587f; text-shadow: 0 1px 0 rgba(0, 0, 0, .25); }
  .refresh { min-width: 44px; min-height: 44px; justify-content: center; font-size: 18px; }
  .tap { display: block; color: inherit; text-decoration: none; }
  .tool { display: flex; align-items: center; gap: 12px; }
  .tool-icon { font-size: 28px; }
  .now { display: flex; align-items: center; gap: 10px; }
  .icon { font-size: 36px; line-height: 1; }
  .temp { font-size: 32px; font-weight: 900; line-height: 1; }
  .alert-soft { margin-top: 8px; background: var(--warnbg); color: #7a4a06; border-radius: 12px; padding: 8px 10px; font-size: 13px; font-weight: 700; }
  .progress { height: 10px; border-radius: 99px; background: #e3eaf0; overflow: hidden; margin-top: 10px; }
  .progress span { display: block; height: 100%; background: linear-gradient(90deg, #2bb673, #4fd18f); border-radius: 99px; }
  .next { display: flex; align-items: center; gap: 8px; margin-top: 10px; background: #f5f8fb; border-radius: 16px; padding: 8px 10px; }
  .crew { list-style: none; margin: 6px 0 0; padding: 0; }
  .crew li { display: grid; grid-template-columns: 32px 1fr 14px; align-items: center; gap: 10px; padding: 4px 0; border-top: 1px solid var(--line); }
  .crew li:first-child { border-top: 0; }
  .crew li.off .nm, .crew li.off .xs { color: #7b8a97; }
  .av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; color: #0a6f9e; background: linear-gradient(180deg, #e3f5fd, #c9ecfb); box-shadow: 0 2px 0 #b6dcee; }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #c3ced8; }
  .dot.working { background: #2bb673; box-shadow: 0 0 0 3px #e6f7ee; }
  .dot.break { background: #f39c12; box-shadow: 0 0 0 3px #fff3df; }
</style>
