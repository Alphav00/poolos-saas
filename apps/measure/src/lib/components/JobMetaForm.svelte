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
    <label for="customer-name" class="label">Customer name *</label>
    <input id="customer-name" class="field" bind:value={job.meta.customer_name} placeholder="e.g. Smith family" />
  </div>
  <div>
    <label for="customer-address" class="label">Address</label>
    <input id="customer-address" class="field" bind:value={job.meta.customer_address} />
  </div>
  <div class="grid grid-cols-2 gap-2">
    <div>
      <label for="customer-phone" class="label">Phone</label>
      <input id="customer-phone" class="field" type="tel" bind:value={job.meta.customer_phone} />
    </div>
    <div>
      <label for="customer-email" class="label">Email</label>
      <input id="customer-email" class="field" type="email" bind:value={job.meta.customer_email} />
    </div>
  </div>
  <div>
    <label for="dealer-name" class="label">Dealer name *</label>
    <input id="dealer-name" class="field" bind:value={job.meta.dealer_name} />
  </div>
  <div>
    <label for="dealer-location" class="label">Dealer location</label>
    <input id="dealer-location" class="field" bind:value={job.meta.dealer_location} />
  </div>
  <div class="flex items-center gap-2">
    <input id="photos" type="checkbox" bind:checked={job.meta.photos_attached} class="w-5 h-5" />
    <label for="photos" class="text-base">Photos attached</label>
  </div>
</div>
