<script>
  /**
   * Obstacles form (wizard step "obstacles").
   *
   * Captures non-removable obstacles within 18in of the waterline.
   * Each obstacle is a numbered perimeter point (or pair, for handrails /
   * grabrails / etc. that have a front and back).
   *
   * Layout:
   *   - Title + description
   *   - Count callout: "N obstacles · X paired · Y single"
   *   - Stats bar with "Clear all" (only when entries exist)
   *   - Per-obstacle card:
   *       - order badge
   *       - kind dropdown
   *       - pair inputs (front + back) for paired kinds, or single "Pt #" for single kinds
   *       - description textarea
   *       - inline warning for out-of-range or missing point numbers
   *       - delete (×) button
   *   - Sticky "Add obstacle" button at bottom
   *
   * Defensive: if `job.measurement.obstacles` is missing, initialize to [].
   * Auto-save: every input change calls `store.markDirty()` via on:input on the root.
   */
  export let job;
  export let store;
  export let title = 'Obstacles';
  export let description = '';

  // All supported kinds. Order chosen so common kinds come first.
  const KINDS = [
    { value: 'handrail',    label: 'Handrail',        paired: true  },
    { value: 'grabrail',    label: 'Grabrail',        paired: true  },
    { value: 'ladder',      label: 'Ladder',          paired: true  },
    { value: 'slide_leg',   label: 'Slide leg',       paired: true  },
    { value: 'raised_wall', label: 'Raised wall',     paired: true  },
    { value: 'spa_wall',    label: 'Spa wall',        paired: true  },
    { value: 'rock',        label: 'Rock',            paired: false },
    { value: 'waterfall',   label: 'Waterfall',       paired: false },
    { value: 'fill_spout',  label: 'Fill spout',      paired: false },
    { value: 'dive_stand',  label: 'Dive stand',      paired: false },
    { value: 'planter',     label: 'Planter',         paired: false },
  ];

  // Lookup by value
  const KIND_MAP = Object.fromEntries(KINDS.map(k => [k.value, k]));

  function isPaired(kind) {
    return KIND_MAP[kind]?.paired ?? false;
  }
  function kindLabel(kind) {
    return KIND_MAP[kind]?.label ?? kind;
  }

  // Defensive init (idempotent — won't re-fire once set)
  $: if (!job.measurement.obstacles) {
    job.measurement.obstacles = [];
  }

  $: obstacles = job.measurement.obstacles || [];
  $: pts = job.measurement.perimeter_points || [];
  $: ptCount = pts.length;

  // Count callout: paired / single breakdowns
  $: pairedCount = obstacles.filter(o => isPaired(o.kind)).length;
  $: singleCount = obstacles.length - pairedCount;

  // Build a short human list of kinds currently in use (e.g. "handrail+spa wall").
  // Capped at 3 to keep the callout compact.
  $: kindBreakdown = (() => {
    const counts = {};
    for (const o of obstacles) {
      counts[o.kind] = (counts[o.kind] || 0) + 1;
    }
    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => n > 1 ? `${n}× ${kindLabel(k).toLowerCase()}` : kindLabel(k).toLowerCase());
    return entries.slice(0, 3).join(', ');
  })();

  // Auto-suggest point numbers for a brand-new obstacle: front=1, back=2.
  // If those are already taken by other obstacles, pick the first two free numbers.
  function suggestPoints() {
    const used = new Set();
    for (const o of obstacles) {
      if (o.front_point != null) used.add(o.front_point);
      if (o.back_point != null) used.add(o.back_point);
    }
    const all = Array.from({ length: Math.max(ptCount, 2) }, (_, i) => i + 1);
    const free = all.filter(n => !used.has(n));
    return { front: free[0] ?? 1, back: free[1] ?? 2, single: free[0] ?? 1 };
  }

  function addObstacle() {
    const sug = suggestPoints();
    const newOb = {
      kind: 'handrail',
      front_point: sug.front,
      back_point: sug.back,
      description: '',
    };
    job.measurement.obstacles = [...obstacles, newOb];
    store.markDirty();
  }

  function deleteObstacle(i) {
    job.measurement.obstacles = obstacles.filter((_, idx) => idx !== i);
    store.markDirty();
  }

  function clearAll() {
    if (!confirm(`Delete all ${obstacles.length} obstacles?`)) return;
    job.measurement.obstacles = [];
    store.markDirty();
  }

  // When the kind changes, if the obstacle has no point(s) set yet, populate
  // from the suggestion. Never overwrite an explicit user value.
  function onKindChange(o, newKind) {
    o.kind = newKind;
    const sug = suggestPoints();
    if (isPaired(newKind)) {
      if (o.front_point == null) o.front_point = sug.front;
      if (o.back_point == null) o.back_point = sug.back;
      o.single_point = null;
    } else {
      if (o.front_point == null) o.front_point = sug.single;
      o.back_point = null;
    }
    store.markDirty();
  }

  // Per-row validation. Returns null if OK, else a short message.
  function pointWarning(num) {
    if (num == null || num === '' || isNaN(Number(num))) {
      return 'missing';
    }
    const n = Number(num);
    if (n < 1) return 'must be ≥ 1';
    if (ptCount > 0 && n > ptCount) return `perimeter only has ${ptCount} pt${ptCount !== 1 ? 's' : ''}`;
    return null;
  }

  function rowWarning(o) {
    if (isPaired(o.kind)) {
      const f = pointWarning(o.front_point);
      const b = pointWarning(o.back_point);
      if (f && b) return `Front: ${f} · Back: ${b}`;
      if (f) return `Front: ${f}`;
      if (b) return `Back: ${b}`;
    } else {
      const f = pointWarning(o.front_point);
      if (f) return `Pt: ${f}`;
    }
    return null;
  }
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- Count callout -->
  <div class="card border-pool-500/30 bg-pool-500/5">
    <p class="text-xs uppercase tracking-wider text-pool-500 mb-2">Obstacles within 18in of waterline</p>
    <div class="flex items-baseline gap-2">
      <span class="text-2xl font-bold font-mono text-ink-50">
        {obstacles.length}
      </span>
      <span class="text-sm text-ink-100/60">
        {obstacles.length === 1 ? 'obstacle' : 'obstacles'}
      </span>
    </div>
    {#if obstacles.length > 0}
      <div class="mt-2 pt-2 border-t border-ink-100/10 text-sm text-ink-100/70">
        <span>
          <b class="text-pool-500">{pairedCount}</b> paired{pairedCount > 0 ? ` (${KINDS.filter(k => k.paired).map(k => k.label.toLowerCase()).slice(0,2).join(', ')})` : ''}
        </span>
        <span class="mx-2 text-ink-100/30">·</span>
        <span>
          <b class="text-pool-500">{singleCount}</b> single{singleCount > 0 ? ` (${KINDS.filter(k => !k.paired).map(k => k.label.toLowerCase()).slice(0,2).join(', ')})` : ''}
        </span>
        {#if kindBreakdown}
          <p class="text-xs text-ink-100/50 mt-1">— {kindBreakdown}</p>
        {/if}
      </div>
    {:else if ptCount === 0}
      <p class="text-xs text-yellow-400 mt-2">⚠ Capture the perimeter first so points can be referenced.</p>
    {/if}
  </div>

  <!-- Stats bar (only when entries exist) -->
  {#if obstacles.length > 0}
    <div class="card flex items-center justify-between text-sm">
      <span class="text-ink-100/70">
        <b class="text-pool-500">{obstacles.length}</b> {obstacles.length === 1 ? 'obstacle' : 'obstacles'} captured
      </span>
      <button
        class="btn-ghost text-xs py-1 px-2 text-red-400/80"
        on:click={clearAll}
      >
        Clear all
      </button>
    </div>
  {/if}

  <!-- Per-obstacle list -->
  {#if obstacles.length === 0}
    <div class="card text-center py-8 border-dashed">
      <p class="text-ink-100/60">No obstacles yet.</p>
      <p class="text-sm text-ink-100/50 mt-1">
        Tap "+ Add obstacle" to log a handrail, rock, slide, etc.
      </p>
    </div>
  {:else}
    <div class="space-y-1 max-h-[60vh] overflow-y-auto">
      {#each obstacles as o, i (i)}
        {@const paired = isPaired(o.kind)}
        {@const warn = rowWarning(o)}
        <div
          class="card p-2
                 {warn ? 'border-yellow-500/40' : 'border-ink-100/20'}"
        >
          <!-- Row 1: order badge, kind dropdown, delete -->
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                     bg-pool-500/20 text-pool-500 flex-shrink-0"
              title="Obstacle #{i + 1}"
            >
              {i + 1}
            </div>

            <div class="flex-1 min-w-0">
              <select
                class="field h-10 text-base py-1 appearance-none"
                value={o.kind}
                on:change={(e) => onKindChange(o, e.currentTarget.value)}
                aria-label="Obstacle kind"
              >
                {#each KINDS as k}
                  <option value={k.value}>{k.label}{k.paired ? ' (pair)' : ''}</option>
                {/each}
              </select>
            </div>

            <button
              class="btn-danger text-sm px-3 flex-shrink-0"
              on:click={() => deleteObstacle(i)}
              aria-label="Delete obstacle {i + 1}"
              title="Delete obstacle"
            >×</button>
          </div>

          <!-- Row 2: point number input(s) -->
          <div class="flex items-end gap-2 mt-2">
            {#if paired}
              <div class="flex-1 min-w-0">
                <label for="obstacle-{i}-front" class="label !mb-0.5 !text-[10px]">Front pt</label>
                <input
                  id="obstacle-{i}-front"
                  class="field h-10 text-center text-base px-2"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max={Math.max(1, ptCount)}
                  step="1"
                  bind:value={o.front_point}
                  title={ptCount > 0 ? `Perimeter point 1–${ptCount}` : 'Capture the perimeter first'}
                  placeholder="#"
                  aria-label="Front perimeter point"
                />
              </div>
              <span class="text-ink-100/40 font-bold px-1 pb-2">|</span>
              <div class="flex-1 min-w-0">
                <label for="obstacle-{i}-back" class="label !mb-0.5 !text-[10px]">Back pt</label>
                <input
                  id="obstacle-{i}-back"
                  class="field h-10 text-center text-base px-2"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max={Math.max(1, ptCount)}
                  step="1"
                  bind:value={o.back_point}
                  title={ptCount > 0 ? `Perimeter point 1–${ptCount}` : 'Capture the perimeter first'}
                  placeholder="#"
                  aria-label="Back perimeter point"
                />
              </div>
            {:else}
              <div class="flex-1 min-w-0">
                <label for="obstacle-{i}-single" class="label !mb-0.5 !text-[10px]">Pt #</label>
                <input
                  id="obstacle-{i}-single"
                  class="field h-10 text-center text-base px-2"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max={Math.max(1, ptCount)}
                  step="1"
                  bind:value={o.front_point}
                  title={ptCount > 0 ? `Perimeter point 1–${ptCount}` : 'Capture the perimeter first'}
                  placeholder="#"
                  aria-label="Perimeter point"
                />
              </div>
            {/if}
          </div>

          <!-- Row 3: description -->
          <textarea
            class="field mt-2 text-sm py-1 min-h-0 h-12"
            placeholder="description (e.g. 'left of steps', 'spillover lip')"
            bind:value={o.description}
            rows="1"
            aria-label="Obstacle description"
          ></textarea>

          {#if warn}
            <p class="text-xs text-yellow-400 mt-1">⚠ {warn}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Sticky "Add obstacle" button -->
  <div class="sticky bottom-20 -mx-4 px-4 py-2 bg-ink-950/95 backdrop-blur border-t border-ink-100/20 z-10">
    <button
      class="btn w-full text-lg py-4"
      on:click={addObstacle}
      title={`Add obstacle #${obstacles.length + 1}`}
    >
      + Add obstacle{obstacles.length > 0 ? ` #${obstacles.length + 1}` : ''}
    </button>
  </div>
</div>
