<script lang="ts">
  import RouteMap from '../field/RouteMap.svelte'
  import { CREW, poolById, ROUTE, STOPS } from '../field/sample'
  import { describe, hourLabel, loadWeather, locate, rainFrom, savedSpot, type Spot, type Weather } from '../field/weather'

  let { email }: { email: string } = $props()

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const day = now.toLocaleDateString('en-US', { weekday: 'long' })
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

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

<header class="hello">
  <p class="xs">{greeting}{email ? ` · ${email}` : ''}</p>
  <h1 class="big">{day}</h1>
  <p class="day">{date}</p>
</header>

<section class="card weather" aria-label="Weather">
  {#if weather && look}
    <div class="row">
      <div class="now">
        <span class="icon" aria-hidden="true">{look.icon}</span>
        <div>
          <div class="temp">{weather.tempF}°</div>
          <div class="sm">{look.text} · H {weather.highF}° L {weather.lowF}°</div>
        </div>
      </div>
      <button class="chip" onclick={askLocation} disabled={busy} aria-label="Refresh weather for where I am">↻</button>
    </div>
    <div class="wx">
      <div class={['r', weather.rainChance >= 50 ? 'warn' : '']}><div class="n">Rain</div><div class="v">{weather.rainChance}%</div></div>
      <div class={['r', weather.uvMax >= 8 ? 'warn' : '']}><div class="n">UV max</div><div class="v">{weather.uvMax}</div></div>
      <div class="r"><div class="n">Wind</div><div class="v">{weather.windMph}<small> mph</small></div></div>
    </div>
    {#if rainAt !== null}<p class="alert-soft">Rain likely from {hourLabel(rainAt)}. Plan outdoor work and dosing before then.</p>{/if}
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

<section class="card">
  <div class="row"><h2 class="h">Working today</h2><span class="xs">{working.length} on · <span class="sample" style="margin:0">SAMPLE</span></span></div>
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

<a class="btn" href="/boards/shallow-end">💬 Message board</a>

<style>
  .hello { padding: 4px 6px 2px; }
  .day { font-size: 18px; font-weight: 800; color: var(--mute); }
  .tap { display: block; color: inherit; text-decoration: none; }
  .now { display: flex; align-items: center; gap: 10px; }
  .icon { font-size: 40px; line-height: 1; }
  .temp { font-size: 34px; font-weight: 900; line-height: 1; }
  .wx { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
  .wx small { font-size: 11px; font-weight: 700; }
  .alert-soft { margin-top: 8px; background: var(--warnbg); color: #7a4a06; border-radius: 12px; padding: 8px 10px; font-size: 13px; font-weight: 700; }
  .progress { height: 10px; border-radius: 99px; background: #e3eaf0; overflow: hidden; margin-top: 10px; }
  .progress span { display: block; height: 100%; background: linear-gradient(90deg, #2bb673, #4fd18f); border-radius: 99px; }
  .next { display: flex; align-items: center; gap: 8px; margin-top: 10px; background: #f5f8fb; border-radius: 16px; padding: 8px 10px; }
  .crew { list-style: none; margin: 6px 0 0; padding: 0; }
  .crew li { display: grid; grid-template-columns: 40px 1fr 14px; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line); }
  .crew li:first-child { border-top: 0; }
  .crew li.off { opacity: .55; }
  .av { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; color: #0a6f9e; background: linear-gradient(180deg, #e3f5fd, #c9ecfb); box-shadow: 0 2px 0 #b6dcee; }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #c3ced8; }
  .dot.working { background: #2bb673; box-shadow: 0 0 0 3px #e6f7ee; }
  .dot.break { background: #f39c12; box-shadow: 0 0 0 3px #fff3df; }
</style>
