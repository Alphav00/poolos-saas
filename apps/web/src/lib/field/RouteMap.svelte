<script lang="ts">
  import type { Stop } from './types'

  // A sketch of the route, not a street map: stops in driving order on a
  // 100 x 40 grid (sample positions are 0–100 both ways, squashed to fit). Real addresses and a real map come with real routes.
  let { stops }: { stops: Stop[] } = $props()
  const next = $derived(stops.findIndex((s) => !s.done))
  const Y = 0.36
  const path = $derived(stops.map((s) => `${s.x},${2 + s.y * Y}`).join(' '))
</script>

<svg class="map" viewBox="0 0 100 40" role="img" aria-label={`Route map: ${stops.length} stops, ${stops.filter((s) => s.done).length} done`}>
  <rect width="100" height="40" rx="4" fill="#e8f1e4" />
  <path d="M0,15 C30,12 60,20 100,16" stroke="#fff" stroke-width="2.5" fill="none" />
  <path d="M40,0 C44,14 38,28 46,40" stroke="#fff" stroke-width="2" fill="none" />
  <path d="M78,0 C74,16 84,28 80,40" stroke="#fff" stroke-width="1.6" fill="none" />
  <ellipse cx="90" cy="7" rx="8" ry="4" fill="#bfe3f5" />
  <polyline points={path} style:fill="none" style:stroke="var(--brand-sky)" stroke-width="1" stroke-dasharray="2 1.5" stroke-linejoin="round" />
  {#each stops as s, i (s.poolId)}
    <circle cx={s.x} cy={2 + s.y * Y} r={i === next ? 4 : 3.2} style:fill={s.done ? '#2bb673' : i === next ? 'var(--brand-sky)' : '#fff'} style:stroke={s.done ? '#fff' : 'var(--brand-link)'} stroke-width="0.7" />
    <text x={s.x} y={2 + s.y * Y + 1.3} font-size={i === next ? 4.2 : 3.4} text-anchor="middle" font-weight="900" style:fill={s.done || i === next ? '#fff' : 'var(--brand-link)'}>{s.done ? '✓' : i + 1}</text>
  {/each}
</svg>

<style>
  .map {
    display: block;
    width: 100%;
    height: auto;
    margin-top: 8px;
    border-radius: 14px;
    font-family: Nunito, 'Segoe UI', Arial, sans-serif;
  }
</style>
