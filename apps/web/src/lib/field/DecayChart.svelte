<script module lang="ts">
  import { fmt } from './scales'

  export function chartLabel(vCount: number, fcst?: number, meas?: number) {
    return [
      `Free chlorine history (${vCount} visits)`,
      fcst !== undefined ? `forecast ${fmt('fc', fcst)}` : null,
      meas !== undefined ? `today ${fmt('fc', meas)}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }
</script>

<script lang="ts">
  import type { Visit } from './types'

  // Sawtooth of free chlorine: up when dosed, down until the next visit,
  // then a dashed line to today's forecast and a dot for today's reading.
  let { visits, forecast, measured }: { visits: Visit[]; forecast?: number; measured?: number } = $props()

  const W = 342
  const H = 120
  const TOP = 6
  const y = (v: number) => 100 - (Math.max(0, Math.min(v, TOP)) / TOP) * 80
  const step = $derived(W / (visits.length + 1.2))
  const x = (i: number) => 20 + i * step

  const line = $derived(
    visits
      .flatMap((v, i) => (i === 0 ? [[x(i), y(v.after)]] : [[x(i), y(v.before)], [x(i), y(v.after)]]))
      .map(([a, b]) => `${a!.toFixed(1)},${b!.toFixed(1)}`)
      .join(' '),
  )
  const last = $derived(visits.length - 1)
  const todayX = $derived(x(visits.length))

  const ariaLabel = $derived(chartLabel(visits.length, forecast, measured))
</script>

<svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
  <line x1="0" y1="100" x2={W} y2="100" style:stroke="var(--line)" />
  <line x1="0" y1="60" x2={W} y2="60" style:stroke="var(--soft)" />
  <line x1="0" y1="20" x2={W} y2="20" style:stroke="var(--soft)" />
  <text x="0" y="16" font-size="11" style:fill="var(--mute)">{TOP} ppm</text>
  <text x="0" y="96" font-size="11" style:fill="var(--mute)">0</text>
  <polyline style:fill="none" style:stroke="var(--brand-sky)" stroke-width="2.5" points={line} />
  {#if forecast !== undefined && last >= 0}
    <polyline style:fill="none" style:stroke="var(--brand-sky)" stroke-width="2.5" stroke-dasharray="4 4" points={`${x(last)},${y(visits[last]!.after)} ${todayX},${y(forecast)}`} />
    <circle cx={todayX} cy={y(forecast)} r="4" style:fill="#fff" style:stroke="var(--brand-sky)" stroke-width="2" />
    <text x={todayX - 6} y={y(forecast) + 4} font-size="11" style:fill="var(--brand-link)" text-anchor="end">fcst {fmt('fc', forecast)}</text>
  {/if}
  {#if measured !== undefined}
    <circle cx={todayX} cy={y(measured)} r="5" fill="#e5484d" />
    <text x={todayX + 6} y={y(measured) + 4} font-size="11" style:fill="var(--bad)" text-anchor="start">today {fmt('fc', measured)}</text>
  {/if}
</svg>
