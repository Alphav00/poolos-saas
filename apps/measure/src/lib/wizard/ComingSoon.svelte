<script>
  /**
   * Placeholder step body for steps whose real form lands in a later
   * sub-phase (2.2 AB setup, 2.3 perimeter, ...). Shows what fields
   * the step will capture so the wizard is fully navigable in 2.1.
   */
  export let job;
  export let store;
  export let stepId;
  export let title;
  export let description;
  export let fields = [];
</script>

<div class="space-y-4">
  <div class="card border border-dashed border-pool-500/40 bg-pool-500/5">
    <div class="flex items-start gap-3">
      <span class="text-pool-500 text-2xl">🚧</span>
      <div class="flex-1">
        <h3 class="text-lg font-bold">Coming soon: {title}</h3>
        <p class="text-ink-100/80 mt-1">{description}</p>
        {#if fields.length}
          <p class="text-sm text-ink-100/60 mt-2">
            Fields this step will capture: <code class="text-pool-500">{fields.join(', ')}</code>
          </p>
        {/if}
        <p class="text-xs text-ink-100/50 mt-2">
          For now, the data structure is already in the model — this is just the
          capture UI. You can advance past this step and the underlying fields
          will be filled in by the real form once it lands.
        </p>
      </div>
    </div>
  </div>

  <details class="text-sm text-ink-100/60">
    <summary class="cursor-pointer">Show current values</summary>
    <pre class="mt-2 p-3 bg-ink-900 rounded text-xs overflow-x-auto">{JSON.stringify(job, null, 2).slice(0, 800)}{JSON.stringify(job).length > 800 ? '\n…' : ''}</pre>
  </details>
</div>
