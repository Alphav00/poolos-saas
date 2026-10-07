<script lang="ts">
  import type { Stop } from './types'

  // A sketch of the route, not a street map: stops in driving order on a
  // 100 x 60 grid. Real addresses and a real map come with real routes.
  let { stops }: { stops: Stop[] } = $props()
  const next = $derived(stops.findIndex((s) => !s.done))
  const path = $derived(stops.map((s) => `${s.x},${s.y * 0.6}`).join(' '))
</script>

<svg class="map" viewBox="0 0 100 60" role="img" aria-label={`Route map: ${stops.length} stops, ${stops.filter((s) => s.done).length} done`}>
  <rect width="100" height="60" rx="4" fill="#e8f1e4" />
  <path d="M0,22 C30,18 60,30 100,24" stroke="#fff" stroke-width="3" fill="none" />
  <path d="M40,0 C44,20 38,40 46,60" stroke="#fff" stroke-width="2.5" fill="none" />
  <path d="M78,0 C74,24 84,40 80,60" stroke="#fff" stroke-width="2" fill="none" />
  <ellipse cx="88" cy="12" rx="9" ry="5" fill="#bfe3f5" />
  <polyline points={path} fill="none" stroke="#0aa3e6" stroke-width="1.2" stroke-dasharray="2 1.5" stroke-linejoin="round" />
  {#each stops as s, i (s.poolId)}
    <circle cx={s.x} cy={s.y * 0.6} r={i === next ? 3.4 : 2.4} fill={s.done ? '#2bb673' : i === next ? '#0aa3e6' : '#fff'} stroke={s.done ? '#fff' : '#0a6f9e'} stroke-width="0.7" />
    <text x={s.x} y={s.y * 0.6 + 1} font-size={i === next ? 3.2 : 2.4} text-anchor="middle" font-weight="900" fill={s.done || i === next ? '#fff' : '#0a6f9e'}>{s.done ? '✓' : i + 1}</text>
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
