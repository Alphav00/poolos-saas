<script>
  /**
   * A single closure check, rendered as the arithmetic rather than a verdict.
   *
   * The tech is being asked to trust a number that disagrees with their tape,
   * so showing "FAIL" alone is not enough — the panel states what was measured,
   * what it has to equal, and the gap, so they can see which of the two is
   * wrong before deciding what to re-tape.
   */
  import { formatDistance } from '../utils/distance.js';

  /** @type {{name, measuredFt, expectedFt, differenceIn, toleranceIn, status, message}|null} */
  export let check = null;
  export let measuredLabel = 'Measured';
  export let expectedLabel = 'Must equal';

  const STATUS = {
    pass: {
      cls: 'border-green-500/40 bg-green-500/10',
      pill: 'text-green-300 bg-green-500/15 border-green-500/40',
      icon: '✓',
      word: 'CLOSES',
    },
    warn: {
      cls: 'border-yellow-500/40 bg-yellow-500/10',
      pill: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/40',
      icon: '⚠',
      word: 'CHECK',
    },
    fail: {
      cls: 'border-red-500/50 bg-red-500/10',
      pill: 'text-red-300 bg-red-500/15 border-red-500/40',
      icon: '✕',
      word: 'BLOCKED',
    },
  };

  $: look = STATUS[check?.status] || STATUS.warn;
  $: offBy = check ? Math.abs(check.differenceIn) : 0;
  $: direction = check && check.differenceIn > 0 ? 'over' : 'under';
</script>

{#if check}
  <div class="card {look.cls}">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="font-mono text-xl font-bold text-ink-50">
            {formatDistance(check.measuredFt)}
          </span>
          <span class="text-ink-100/50 text-sm">{measuredLabel}</span>
          <span class="text-ink-100/40">vs</span>
          <span class="font-mono text-xl font-bold text-ink-50">
            {formatDistance(check.expectedFt)}
          </span>
          <span class="text-ink-100/50 text-sm">{expectedLabel}</span>
        </div>
        <p class="text-sm mt-2 text-ink-100/80">{check.message}</p>
      </div>
      <span
        class="shrink-0 text-xs font-bold px-2 py-1 rounded border {look.pill}"
        title={check.name}
      >
        {look.icon} {look.word}
      </span>
    </div>

    <div class="mt-3 pt-3 border-t border-ink-100/10 flex items-center justify-between text-sm">
      <span class="text-ink-100/60">
        Off by
        <b class="font-mono text-ink-50">{offBy.toFixed(2)}"</b>
        {#if offBy > 0.005}<span class="text-ink-100/50">({direction})</span>{/if}
      </span>
      <span class="text-ink-100/50 font-mono text-xs">
        tolerance ±{check.toleranceIn.toFixed(2)}"
      </span>
    </div>
  </div>
{/if}
