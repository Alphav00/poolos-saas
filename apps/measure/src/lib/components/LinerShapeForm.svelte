<script>
  /**
   * Liner shape selection (wizard step "liner-shape").
   *
   * The choice is not cosmetic: it decides how the pool is ordered. Standard
   * shapes go on a lettered supplier form, where the A/B walk is supporting
   * evidence. Organic shapes have no repeatable dimension set, so the walk IS
   * the order — and a thin walk blocks the export rather than warning.
   */
  import { requiresAbPlot } from '../utils/linerValidation.js';

  export let job;
  export let store;
  export let title = 'Pool Shape';
  export let description = '';

  // Shapes grouped the way the supplier catalogs group them.
  const GROUPS = [
    {
      name: 'Rectangles & Grecians',
      shapes: [
        ['rectangle', 'Rectangle'],
        ['rectangle_grecian_shallow', 'Rectangle, Grecian shallow end'],
        ['rectangle_grecian_deep', 'Rectangle, Grecian deep end'],
        ['grecian', 'Grecian'],
        ['offset_grecian_left', 'Off-set Grecian (left)'],
        ['offset_grecian_right', 'Off-set Grecian (right)'],
        ['summerville_grecian_left', 'Summerville Grecian (left)'],
        ['summerville_grecian_right', 'Summerville Grecian (right)'],
      ],
    },
    {
      name: 'Roman & Patrician',
      shapes: [
        ['roman_end', 'Roman end'],
        ['double_roman', 'Double Roman'],
        ['patrician_shallow', 'Patrician, shallow end'],
        ['patrician_deep', 'Patrician, deep end'],
      ],
    },
    {
      name: 'L-shapes',
      shapes: [
        ['true_l_left', 'True L (left)'],
        ['true_l_right', 'True L (right)'],
        ['lazy_l_left', 'Lazy L (left)'],
        ['lazy_l_right', 'Lazy L (right)'],
      ],
    },
    {
      name: 'Curves & geometrics',
      shapes: [
        ['oval', 'Oval'],
        ['oval_jewel', 'Oval Jewel'],
        ['round', 'Round'],
        ['octagon', 'Octagon'],
        ['kite', 'Kite'],
      ],
    },
    {
      name: 'Organic — ordered from the A/B plot',
      shapes: [
        ['kidney', 'Kidney'],
        ['figure_8', 'Figure 8'],
        ['mountain_lake_left', 'Mountain Lake (left)'],
        ['mountain_lake_right', 'Mountain Lake (right)'],
        ['odessy_left', 'Odessy (left)'],
        ['odessy_right', 'Odessy (right)'],
        ['freeform', 'Freeform'],
      ],
    },
  ];

  $: liner = job.measurement.liner;
  $: shape = liner?.shape || 'freeform';
  $: needsPlot = requiresAbPlot(shape);
  $: pointCount = (job.measurement.perimeter_points || []).length;

  function pick(value) {
    job.measurement.liner.shape = value;
    store.markDirty();
  }
</script>

<div class="space-y-4">
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- What the current choice means for the order -->
  <div
    class="card {needsPlot
      ? 'border-pool-500/40 bg-pool-500/5'
      : 'border-ink-100/20'}"
  >
    <p class="text-xs uppercase tracking-wider text-pool-500 mb-2">Ordered from</p>
    {#if needsPlot}
      <p class="font-bold text-ink-50">A/B triangulation plot</p>
      <p class="text-sm text-ink-100/70 mt-1">
        This shape has no standard dimension set, so the perimeter walk is the order
        itself. It must be complete — at least 8 points, more on every curve.
      </p>
      <p class="text-sm mt-2 {pointCount >= 8 ? 'text-green-400' : 'text-yellow-400'}">
        {pointCount >= 8 ? '✓' : '⚠'} {pointCount} perimeter point{pointCount === 1 ? '' : 's'} captured
      </p>
    {:else}
      <p class="font-bold text-ink-50">Standard shape form + lettered dimensions</p>
      <p class="text-sm text-ink-100/70 mt-1">
        The supplier has a form for this shape. The A/B walk still goes on the order as
        supporting evidence, but the lettered dimensions are what gets cut.
      </p>
    {/if}
  </div>

  {#each GROUPS as group}
    <div class="card">
      <p class="text-xs uppercase tracking-wider text-ink-100/50 mb-3">{group.name}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each group.shapes as [value, label]}
          <button
            type="button"
            class="text-left px-3 py-3 rounded border transition
              {shape === value
                ? 'border-pool-500 bg-pool-500/15 text-ink-50 font-semibold'
                : 'border-ink-100/15 hover:border-ink-100/30 text-ink-100/80'}"
            on:click={() => pick(value)}
          >
            <span class="block">{label}</span>
            {#if shape === value}
              <span class="block text-xs text-pool-500 mt-0.5">selected</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>
