<script>
  /**
   * Customer / dealer meta form. Bound to job.meta via the wizard.
   *
   * Also where the job's product is chosen. That choice decides the rest of the
   * wizard: a cover job walks the perimeter and specs a cover, a liner job adds
   * the vertical capture, and "both" does one walk-around and produces two
   * orders — which is how a replace-everything visit is actually measured.
   */
  export let job;
  export let store;

  const PRODUCTS = [
    ['cover', 'Cover', 'Safety cover only'],
    ['liner', 'Liner', 'Vinyl liner only'],
    ['both', 'Both', 'One walk, two orders'],
  ];

  $: product = job.product_type || 'cover';
</script>

<div class="space-y-3" on:input={() => store.markDirty()}>
  <div>
    <span class="label">Ordering</span>
    <div class="grid grid-cols-3 gap-2">
      {#each PRODUCTS as [value, label, hint]}
        <button
          type="button"
          class="px-2 py-3 rounded-lg border text-center transition
            {product === value
              ? 'border-pool-500 bg-pool-500/15 text-ink-50'
              : 'border-ink-100/20 text-ink-100/70 hover:border-ink-100/40'}"
          on:click={() => store.setProductType(value)}
        >
          <span class="block font-bold">{label}</span>
          <span class="block text-xs mt-0.5 text-ink-100/60">{hint}</span>
        </button>
      {/each}
    </div>
  </div>

  <div>
    <label for="customer_name" class="label">Customer name *</label>
    <input id="customer_name" class="field" bind:value={job.meta.customer_name} placeholder="e.g. Smith family" />
  </div>
  <div>
    <label for="customer_address" class="label">Address</label>
    <input id="customer_address" class="field" bind:value={job.meta.customer_address} />
  </div>
  <div class="grid grid-cols-2 gap-2">
    <div>
      <label for="customer_phone" class="label">Phone</label>
      <input id="customer_phone" class="field" type="tel" bind:value={job.meta.customer_phone} />
    </div>
    <div>
      <label for="customer_email" class="label">Email</label>
      <input id="customer_email" class="field" type="email" bind:value={job.meta.customer_email} />
    </div>
  </div>
  <div>
    <label for="dealer_name" class="label">Dealer name *</label>
    <input id="dealer_name" class="field" bind:value={job.meta.dealer_name} />
  </div>
  <div>
    <label for="dealer_location" class="label">Dealer location</label>
    <input id="dealer_location" class="field" bind:value={job.meta.dealer_location} />
  </div>
  <div class="flex items-center gap-2">
    <input id="photos" type="checkbox" bind:checked={job.meta.photos_attached} class="w-5 h-5" />
    <label for="photos" class="text-base">Photos attached</label>
  </div>
</div>
