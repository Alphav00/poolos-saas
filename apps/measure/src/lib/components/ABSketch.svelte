<script>
  /**
   * Top-down SVG sketch of the A-B line setup.
   *
   * Shows:
   *   - Pool (shape varies by shape_type: rectangular / kidney / freeform)
   *   - A and B stakes labeled with their distances
   *   - The A-B line between them
   *   - Imaginary extension of the A-B line (dashed) to verify it doesn't cross the pool
   *   - "Pt 1" arrow at the pool edge below the midpoint of A-B
   *   - "Facing pool" indicator showing orientation
   *
   * All inputs in feet; rendered to a fixed 400x240 viewBox.
   */

  export let shapeType = 'rectangular';
  export let poolLength = 40;        // longest dimension
  export let poolWidth = 20;
  export let abDistance = 20;        // ft
  export let abOffset = 4;           // ft from pool edge
  export let orientation = 'A_left_B_right_facing_pool';

  // viewBox
  const VB_W = 400;
  const VB_H = 240;
  const MARGIN = 30;
  const MAX_POOL_HALF = 50;          // max half-extent in ft we want to draw

  $: scale = Math.min(
    (VB_W - 2 * MARGIN) / Math.max(poolLength, abDistance + 4),
    (VB_H - 2 * MARGIN) / Math.max(poolWidth, abOffset + 8),
  );

  $: cx = VB_W / 2;
  $: cy = VB_H / 2 + 20;  // bias down to leave room for A-B line above

  // Pool rectangle
  $: poolX = cx - (poolLength * scale) / 2;
  $: poolY = cy - (poolWidth * scale) / 2;
  $: poolW = poolLength * scale;
  $: poolH = poolWidth * scale;

  // A and B positions. A-B line is parallel to the long edge of the pool,
  // offset toward "facing the pool" (above the pool in this top-down view).
  $: abY = poolY - abOffset * scale;
  $: halfAB = (abDistance * scale) / 2;
  $: aLeft = orientation === 'A_left_B_right_facing_pool';
  $: aX = aLeft ? cx - halfAB : cx + halfAB;
  $: bX = aLeft ? cx + halfAB : cx - halfAB;

  // Check if the A-B line or its extension intersects the pool
  $: aLineIntersectsPool = (
    abY >= poolY - 1 && abY <= poolY + poolH + 1
  );
  $: aExtensionIntersectsPool = false;  // extension is the same line; just check abY

  // A-B line valid?
  $: abValid = (
    abY < poolY - 1 &&                  // doesn't cross pool body
    abOffset >= 3 &&                    // ≥3ft from edge
    abDistance >= 10 && abDistance <= 100
  );

  // Where does the perpendicular from AB midpoint hit the pool edge?
  $: pt1X = cx;
  $: pt1Y = poolY;
</script>

<svg viewBox="0 0 {VB_W} {VB_H}" class="w-full bg-ink-900 rounded-lg border {abValid ? 'border-green-500/40' : 'border-red-500/40'}" role="img" aria-label="A-B line setup sketch">
  <!-- Facing pool arrow -->
  <g>
    <text x={cx} y="14" text-anchor="middle" fill="currentColor" font-size="11" class="fill-ink-100/70">↓ Facing pool</text>
  </g>

  <!-- Pool -->
  {#if shapeType === 'rectangular'}
    <rect
      x={poolX} y={poolY} width={poolW} height={poolH}
      fill="rgba(14,165,233,0.25)"
      stroke="rgb(14,165,233)"
      stroke-width="2"
      rx="3"
    />
  {:else if shapeType === 'kidney'}
    <ellipse
      cx={cx} cy={cy} rx={poolW/2} ry={poolH/2}
      fill="rgba(14,165,233,0.25)"
      stroke="rgb(14,165,233)"
      stroke-width="2"
    />
  {:else}
    <!-- freeform: lumpy ellipse -->
    <ellipse
      cx={cx} cy={cy} rx={poolW/2} ry={poolH/2}
      fill="rgba(14,165,233,0.25)"
      stroke="rgb(14,165,233)"
      stroke-width="2"
      transform="rotate(5 {cx} {cy})"
    />
  {/if}

  <!-- Pool label -->
  <text x={cx} y={cy + 4} text-anchor="middle" fill="currentColor" font-size="11" class="fill-ink-100/80 font-bold">
    Pool ({poolLength}' × {poolWidth}')
  </text>

  <!-- A-B imaginary extension (dashed) -->
  <line
    x1="0" y1={abY} x2={VB_W} y2={abY}
    stroke="rgb(239,68,68)" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"
  />

  <!-- A-B line -->
  <line
    x1={aX} y1={abY} x2={bX} y2={abY}
    stroke="rgb(239,68,68)" stroke-width="3"
  />

  <!-- A stake -->
  <g>
    <circle cx={aX} cy={abY} r="8" fill="rgb(239,68,68)" />
    <text x={aX} y={abY + 4} text-anchor="middle" fill="white" font-size="11" font-weight="bold">A</text>
  </g>

  <!-- B stake -->
  <g>
    <circle cx={bX} cy={abY} r="8" fill="rgb(239,68,68)" />
    <text x={bX} y={abY + 4} text-anchor="middle" fill="white" font-size="11" font-weight="bold">B</text>
  </g>

  <!-- A-B distance label -->
  <text x={cx} y={abY - 12} text-anchor="middle" fill="currentColor" font-size="10" class="fill-ink-100/70">
    A-B = {abDistance}'
  </text>

  <!-- Offset indicator -->
  <line
    x1={cx} y1={abY} x2={cx} y2={poolY}
    stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" class="stroke-ink-100/40"
  />
  <text x={cx + 4} y={(abY + poolY) / 2} fill="currentColor" font-size="9" class="fill-ink-100/50">
    {abOffset}' offset
  </text>

  <!-- Point 1 indicator -->
  <g>
    <circle cx={pt1X} cy={pt1Y} r="5" fill="rgb(250,204,21)" />
    <text x={pt1X + 10} y={pt1Y + 4} fill="currentColor" font-size="10" font-weight="bold" class="fill-yellow-300">
      Pt 1
    </text>
    <text x={pt1X + 10} y={pt1Y + 16} fill="currentColor" font-size="8" class="fill-ink-100/60">
      (start here)
    </text>
  </g>

  <!-- Validity indicator -->
  <text x="6" y={VB_H - 6} fill="currentColor" font-size="10" class={abValid ? 'fill-green-400' : 'fill-red-400'}>
    {#if abValid}✓ A-B line valid{:else}⚠ A-B line violates industry rules{/if}
  </text>
</svg>
