<script>
  /**
   * 2D top-down SVG mini-map of the reconstructed pool perimeter.
   *
   * Live-updates as the tech adds points. Shows:
   *   - The reconstructed pool outline (closed polygon)
   *   - Each perimeter point as a colored dot:
   *     * good: green
   *     * marginal: yellow
   *     * invalid: red
   *   - The "Pt 1" marker (yellow) at the start of the chain
   *   - The most recently added point (blue ring)
   *   - A-B line (red) at the A-B line position
   *   - Live dimension readout: L × W
   *
   * Pan/zoom is omitted for v1; the map auto-fits the bounding box.
   */
  import { reconstructPool } from '../utils/reconstruct.js';

  export let points = [];          // [{number, a_distance_ft, b_distance_ft, ...}]
  export let abDistance = 20;
  export let shallowDepth = 0;
  export let deepDepth = 0;
  export let highlightNumber = null;  // recently added point
  export let showABLine = true;

  // Run reconstruction reactively
  $: reconstructed = reconstructPool(points, abDistance || 0, shallowDepth || 0, deepDepth || 0);

  // Auto-fit viewBox
  $: usable = reconstructed.points.filter(p => p.quality !== 'invalid');
  $: minX = usable.length > 0 ? Math.min(...usable.map(p => p.x)) : 0;
  $: maxX = usable.length > 0 ? Math.max(...usable.map(p => p.x)) : 1;
  $: minY = usable.length > 0 ? Math.min(...usable.map(p => p.y)) : 0;
  $: maxY = usable.length > 0 ? Math.max(...usable.map(p => p.y)) : 1;

  $: padX = Math.max(2, (maxX - minX) * 0.1);
  $: padY = Math.max(2, (maxY - minY) * 0.1);

  $: viewMinX = minX - padX;
  $: viewMaxX = maxX + padX;
  $: viewMinY = minY - padY;
  $: viewMaxY = maxY + padY;
  $: viewW = Math.max(1, viewMaxX - viewMinX);
  $: viewH = Math.max(1, viewMaxY - viewMinY);

  // Build polygon path
  $: polygonPath = usable.length >= 3 ? (() => {
    const pts = usable.map(p => `${p.x},${p.y}`).join(' ');
    return `M ${pts} Z`;
  })() : '';

  // A-B line position (top-down): A at (0, 0), B at (ab, 0). Show only if
  // the reconstructed pool is "above" the A-B line (y > 0). The A-B line
  // itself sits at y = 0 in the reconstruction's coordinate system, which
  // is below the pool.
  $: abY = 0;
  $: abX1 = 0;
  $: abX2 = abDistance;
</script>

<div class="space-y-2">
  <svg
    viewBox="{viewMinX} {viewMinY} {viewW} {viewH}"
    class="w-full h-64 bg-ink-900 rounded-lg border border-ink-100/20"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Perimeter preview"
  >
    <!-- A-B line at y=0 (red) -->
    {#if showABLine && usable.length >= 1}
      <line
        x1={abX1} y1={abY} x2={abX2} y2={abY}
        stroke="rgba(239,68,68,0.5)" stroke-width="0.3" stroke-dasharray="0.4 0.2"
      />
      <circle cx={abX1} cy={abY} r="0.3" fill="rgb(239,68,68)" />
      <text x={abX1 + 0.3} y={abY - 0.3} font-size="0.7" fill="rgba(239,68,68,0.8)">A</text>
      <circle cx={abX2} cy={abY} r="0.3" fill="rgb(239,68,68)" />
      <text x={abX2 + 0.3} y={abY - 0.3} font-size="0.7" fill="rgba(239,68,68,0.8)">B</text>
    {/if}

    <!-- Pool polygon -->
    {#if usable.length >= 3}
      <path d={polygonPath} fill="rgba(14,165,233,0.2)" stroke="rgb(14,165,233)" stroke-width="0.25" />
    {/if}

    <!-- Each point -->
    {#each reconstructed.points as p (p.number)}
      {#if p.quality === 'invalid'}
        <!-- Show invalid point at NaN-equivalent: skip rendering, but flag in UI -->
      {:else}
        <circle
          cx={p.x} cy={p.y}
          r={p.number === highlightNumber ? 0.7 : 0.4}
          fill={p.quality === 'marginal' ? 'rgb(250,204,21)' : 'rgb(34,197,94)'}
          stroke={p.number === highlightNumber ? 'rgb(14,165,233)' : 'none'}
          stroke-width={p.number === highlightNumber ? 0.15 : 0}
        />
        {#if usable.length < 20}
          <text
            x={p.x} y={p.y - 0.5}
            font-size="0.5" text-anchor="middle"
            fill="rgba(255,255,255,0.5)"
          >{p.number}</text>
        {/if}
      {/if}
    {/each}

    <!-- "Pt 1" marker (yellow, on first valid point) -->
    {#if usable.length > 0}
      {@const first = usable[0]}
      <circle cx={first.x} cy={first.y} r="0.6" fill="none" stroke="rgb(250,204,21)" stroke-width="0.2" />
    {/if}
  </svg>

  <div class="flex justify-between items-center text-xs">
    <div class="flex gap-3">
      <span class="text-green-400">● good</span>
      <span class="text-yellow-400">● marginal</span>
      <span class="text-red-400">● invalid</span>
    </div>
    {#if usable.length >= 3}
      <span class="text-ink-100/70 font-mono">
        {reconstructed.lengthFt.toFixed(1)}' × {reconstructed.widthFt.toFixed(1)}' ·
        {reconstructed.perimeterFt.toFixed(0)}' perimeter ·
        {reconstructed.areaSqft.toFixed(0)} sqft
      </span>
    {/if}
  </div>

  {#if !reconstructed.valid && reconstructed.invalidReasons.length > 0}
    <div class="text-xs text-red-400">
      ⚠ {reconstructed.invalidReasons[0]}
    </div>
  {/if}
</div>
