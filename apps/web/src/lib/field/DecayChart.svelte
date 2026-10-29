<script lang="ts">
  import { chartLabel, placeLabel, W, xAt } from './decayChart'
  import { fmt } from './scales'
  import type { Visit } from './types'

  // Sawtooth of free chlorine: up when dosed, down until the next visit,
  // then a dashed line to today's forecast and a dot for today's reading.
  let { visits, forecast, measured }: { visits: Visit[]; forecast?: number; measured?: number } = $props()

  const H = 120
  const TOP = 6
  const y = (v: number) => 100 - (Math.max(0, Math.min(v, TOP)) / TOP) * 80
  const x = (i: number) => xAt(i, visits.length)

  const line = $derived(
    visits
      .flatMap((v, i) => (i === 0 ? [[x(i), y(v.after)]] : [[x(i), y(v.before)], [x(i), y(v.after)]]))
      .map(([a, b]) => `${a!.toFixed(1)},${b!.toFixed(1)}`)
      .join(' '),
  )
  const last = $derived(visits.length - 1)
  const todayX = $derived(x(visits.length))
  const fcstText = $derived(`fcst ${fmt('fc', forecast)}`)
  const todayText = $derived(`today ${fmt('fc', measured)}`)
  const fcstAt = $derived(placeLabel(todayX, fcstText))
  const todayAt = $derived(placeLabel(todayX, todayText))
</script>

<svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chartLabel(visits, forecast, measured)}>
  <line x1="0" y1="100" x2={W} y2="100" style:stroke="var(--line)" />
  <line x1="0" y1="60" x2={W} y2="60" style:stroke="var(--soft)" />
  <line x1="0" y1="20" x2={W} y2="20" style:stroke="var(--soft)" />
  <text x="0" y="16" font-size="11" style:fill="var(--mute)">{TOP} ppm</text>
  <text x="0" y="96" font-size="11" style:fill="var(--mute)">0</text>
  <polyline style:fill="none" style:stroke="var(--brand-sky)" stroke-width="2.5" points={line} />
  {#if forecast !== undefined && last >= 0}
    <polyline style:fill="none" style:stroke="var(--brand-sky)" stroke-width="2.5" stroke-dasharray="4 4" points={`${x(last)},${y(visits[last]!.after)} ${todayX},${y(forecast)}`} />
    <circle cx={todayX} cy={y(forecast)} r="4" style:fill="#fff" style:stroke="var(--brand-sky)" stroke-width="2" />
    <text x={fcstAt.x} y={y(forecast) - 8} font-size="11" style:fill="var(--brand-link)" text-anchor={fcstAt.anchor}>{fcstText}</text>
  {/if}
  {#if measured !== undefined}
    <circle cx={todayX} cy={y(measured)} r="5" fill="#e5484d" />
    <text x={todayAt.x} y={Math.min(y(measured) + 14, 116)} font-size="11" style:fill="var(--bad)" text-anchor={todayAt.anchor}>{todayText}</text>
  {/if}
</svg>
