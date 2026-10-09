<script lang="ts">
  import { compare } from './compare'
  import { fmt, fmtDelta, type Scale } from './scales'
  import type { Forecast } from './types'
  import { nearest, wedgeColor, wedges } from './wheel'

  let {
    scale,
    value = $bindable(),
    forecast,
    ideal,
  }: { scale: Scale; value: number | undefined; forecast?: Forecast; ideal?: [number, number] } = $props()

  const R = 160
  const parts = $derived(wedges(scale.values.length, R, R * 0.72))
  const selected = $derived(value === undefined ? -1 : scale.values.indexOf(value))
  const forecastAt = $derived(forecast ? nearest(scale.values, forecast.value) : -1)
  // Roving focus: the selected wedge, else the forecast, else the first.
  const focusAt = $derived(selected >= 0 ? selected : forecastAt >= 0 ? forecastAt : 0)
  const agreement = $derived(compare(value, forecast))

  let svg: SVGSVGElement

  function pick(i: number) {
    value = scale.values[i]
  }

  function onkey(e: KeyboardEvent, i: number) {
    const n = scale.values.length
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(i)
      return
    }
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    if (!forward && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = (i + (forward ? 1 : -1) + n) % n
    pick(next)
    ;(svg.querySelectorAll('[role="radio"]')[next] as SVGElement | undefined)?.focus()
  }
</script>

<svg
  bind:this={svg}
  class="wheel"
  viewBox="-170 -170 340 340"
  role="radiogroup"
  aria-label={`${scale.label} reading`}
>
  {#each parts as w, i (i)}
    {@const on = i === selected}
    <g
      role="radio"
      aria-checked={on}
      aria-label={`${scale.label} ${fmt(scale.key, scale.values[i])}${i === forecastAt ? ', forecast' : ''}`}
      tabindex={i === focusAt ? 0 : -1}
      class="wedge"
      onclick={() => pick(i)}
      onkeydown={(e) => onkey(e, i)}
    >
      <path d={w.path} style:fill={on ? 'var(--brand-sky)' : wedgeColor(i, parts.length)} style:stroke="#fff" stroke-width="2" />
      {#if i === forecastAt}
        <circle cx={w.lx} cy={w.ly - 5} r="21" fill="none" stroke={on ? '#fff' : '#1d2a36'} stroke-width="3" stroke-dasharray="5 4" />
      {/if}
      <text x={w.lx} y={w.ly} font-size={on ? 17 : 15} fill={on ? '#fff' : '#1d2a36'}>{fmt(scale.key, scale.values[i])}</text>
    </g>
  {/each}
  <circle r="62" fill="#fff" stroke="#e3eaf0" stroke-width="4" />
  <text class="hub" y="-6" font-size="38" fill="#1d2a36">{fmt(scale.key, value)}</text>
  {#if agreement.status !== 'none'}
    <text class="hub" y="18" font-size="12" fill={agreement.status === 'ok' ? '#1b7d4e' : '#b42b30'}>
      {fmtDelta(scale.key, agreement.delta)} vs forecast
    </text>
  {:else if forecast}
    <text class="hub" y="18" font-size="12" fill="#6a7c8c">forecast {fmt(scale.key, forecast.value)}</text>
  {/if}
  {#if ideal}
    <text class="hub" y="36" font-size="11" font-weight="600" fill="#6a7c8c">ideal {fmt(scale.key, ideal[0])}–{fmt(scale.key, ideal[1])}</text>
  {/if}
</svg>

<style>
  .wheel {
    display: block;
    width: 100%;
    /* As big as fits: the sheet's other rows need about 300px of the screen. */
    max-width: min(340px, calc(100dvh - 300px));
    min-width: 200px;
    margin: 6px auto 0;
    font-family: Nunito, 'Segoe UI', Arial, sans-serif;
    font-weight: 900;
    touch-action: manipulation;
    user-select: none;
  }
  .wedge {
    cursor: pointer;
    outline: none;
  }
  .wedge text,
  .hub {
    text-anchor: middle;
    dominant-baseline: auto;
    pointer-events: none;
  }
  .wedge:focus-visible path {
    stroke: #1d2a36;
    stroke-width: 4;
  }
</style>
