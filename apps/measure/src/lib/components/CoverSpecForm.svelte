<script>
  /**
   * Cover & Hardware wizard step.
   *
   * Captures the cover specification (type / color / spacing / anchor /
   * overlap) and the hardware add-ons (y-straps, deck anchors, beauty
   * rings, lawn stakes, paver tubes, perimeter padding). The values feed
   * directly into the generated order form.
   *
   * Layout:
   *   - Cover spec card: type select, color swatches, spacing buttons,
   *     anchor select, two overlap fields.
   *   - Hardware card: y-straps, wood deck anchors, beauty rings
   *     (int OR entire-pool), lawn stakes, paver tubes, perimeter
   *     padding (from/to pair OR entire-pool).
   *   - Order summary preview: one-line human-readable cover spec.
   */
  export let job;
  export let store;
  export let title = 'Cover & Hardware';
  export let description = '';

  // ---- Defensive init (idempotent) ------------------------------------
  $: if (!job.cover_spec) {
    job.cover_spec = {
      type: 'mesh_standard',
      color: 'blue',
      spacing: '5x5',
      anchor_type: 'concrete',
      overlap_standard_in: 12,
      overlap_planter_in: null,
    };
  }
  $: if (!job.hardware) {
    job.hardware = {
      y_straps: 0,
      wood_deck_anchors: 0,
      beauty_rings: 0,
      beauty_rings_entire_pool: false,
      lawn_stakes: 0,
      paver_tubes_ft: 0,
      perimeter_padding_entire_pool: false,
      perimeter_padding_from_pt: null,
      perimeter_padding_to_pt: null,
    };
  }

  // ---- Friendly labels -------------------------------------------------
  const coverTypeOptions = [
    ['mesh_standard',    '12-yr Standard Mesh'],
    ['mesh_super',       '15-yr Super Mesh'],
    ['mesh_commercial',  '20-yr Commercial Mesh'],
    ['solid',            'Solid w/ Drain'],
    ['solid_no_drain',   'Solid no Drain'],
  ];

  const colorOptions = [
    { value: 'blue',   hex: '#1e40af', label: 'Blue' },
    { value: 'green',  hex: '#15803d', label: 'Green' },
    { value: 'black',  hex: '#171717', label: 'Black' },
    { value: 'gray',   hex: '#52525b', label: 'Gray'  },
  ];

  const spacingOptions = [
    ['5x5',   "5' × 5'"],
    ['4x4',   "4' × 4'"],
    ['3x3',   "3' × 3'"],
    ['combo', 'Combo (5×5 + 3×3)'],
  ];

  const anchorOptions = [
    ['concrete',      'Concrete'],
    ['wood_deck',     'Wood deck'],
    ['brass_collar',  'Brass collar'],
    ['aluminum_pipe', 'Aluminum pipe'],
    ['lawn_brick',    'Lawn / brick'],
  ];

  // ---- Selection helpers ----------------------------------------------
  // All setters funnel through one helper so markDirty() always fires
  // (the on:input bubble on the root handles typed inputs, but click
  // events don't bubble through it — they need explicit calls).
  function pickSpec(field, value) {
    job.cover_spec[field] = value;
    store.markDirty();
  }
  function pickHardware(field, value) {
    job.hardware[field] = value;
    store.markDirty();
  }

  // "Entire pool" toggles: when on, hide the numeric input and zero out
  // the count so the order form isn't confused.
  function toggleBeautyRingsEntire(e) {
    job.hardware.beauty_rings_entire_pool = e.target.checked;
    if (job.hardware.beauty_rings_entire_pool) job.hardware.beauty_rings = 0;
    store.markDirty();
  }
  function togglePerimeterPaddingEntire(e) {
    job.hardware.perimeter_padding_entire_pool = e.target.checked;
    if (job.hardware.perimeter_padding_entire_pool) {
      job.hardware.perimeter_padding_from_pt = null;
      job.hardware.perimeter_padding_to_pt = null;
    }
    store.markDirty();
  }

  // When the user types a number into a beauty-rings / perimeter-padding
  // count, un-check the "entire pool" box so the two stay mutually exclusive.
  function onBeautyRingsInput() {
    if (job.hardware.beauty_rings > 0 && job.hardware.beauty_rings_entire_pool) {
      job.hardware.beauty_rings_entire_pool = false;
    }
  }
  function onPerimeterPaddingInput() {
    if ((job.hardware.perimeter_padding_from_pt != null ||
         job.hardware.perimeter_padding_to_pt != null) &&
        job.hardware.perimeter_padding_entire_pool) {
      job.hardware.perimeter_padding_entire_pool = false;
    }
  }

  // ---- Order summary ---------------------------------------------------
  function coverTypeLabel(v) {
    const o = coverTypeOptions.find(o => o[0] === v);
    return o ? o[1] : v;
  }
  function spacingLabel(v) {
    const o = spacingOptions.find(o => o[0] === v);
    return o ? o[1] : v;
  }
  function anchorLabel(v) {
    const o = anchorOptions.find(o => o[0] === v);
    return o ? o[1] : v;
  }
  function colorLabel(v) {
    const o = colorOptions.find(o => o.value === v);
    return o ? o.label : v;
  }

  $: summary = (() => {
    const c = job.cover_spec || {};
    if (!c.type) return 'Pick a cover type to begin.';
    const parts = [
      coverTypeLabel(c.type),
      colorLabel(c.color),
      `${spacingLabel(c.spacing)} spacing`,
      `${anchorLabel(c.anchor_type)} anchors`,
    ];
    if (c.overlap_standard_in != null && c.overlap_standard_in !== '') {
      parts.push(`${c.overlap_standard_in}in overlap`);
    }
    return parts.join(' · ');
  })();
</script>

<div class="space-y-4" on:input={() => store.markDirty()}>
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- ===================== Cover specification ===================== -->
  <div class="card space-y-4">
    <p class="text-xs uppercase tracking-wider text-pool-500">Cover specification</p>

    <!-- Cover type -->
    <div>
      <label class="label" for="cover-type">Cover type</label>
      <select
        id="cover-type"
        class="field"
        bind:value={job.cover_spec.type}
        on:change={() => store.markDirty()}
      >
        {#each coverTypeOptions as [val, lbl]}
          <option value={val}>{lbl}</option>
        {/each}
      </select>
    </div>

    <!-- Color swatches -->
    <div>
      <span class="label">Color</span>
      <div class="flex items-center gap-3 mt-1" role="radiogroup" aria-label="Cover color">
        {#each colorOptions as c}
          {@const selected = job.cover_spec.color === c.value}
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.label}
            title={c.label}
            on:click={() => pickSpec('color', c.value)}
            class="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95
                   {selected ? 'ring-2 ring-pool-500 ring-offset-2 ring-offset-ink-950' : 'ring-1 ring-ink-100/20'}"
          >
            <span
              class="w-9 h-9 rounded-full border border-black/40"
              style="background-color: {c.hex};"
            ></span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Spacing buttons -->
    <div>
      <span class="label">Strap spacing</span>
      <div class="grid grid-cols-4 gap-2 mt-1" role="radiogroup" aria-label="Strap spacing">
        {#each spacingOptions as [val, lbl]}
          <button
            type="button"
            role="radio"
            aria-checked={job.cover_spec.spacing === val}
            on:click={() => pickSpec('spacing', val)}
            class="btn py-3 text-sm {job.cover_spec.spacing === val ? '' : 'opacity-50'}"
            style={job.cover_spec.spacing === val
              ? 'background: rgb(14,165,233); color: white;'
              : 'background: rgba(255,255,255,0.05); color: rgb(229,229,232);'}
          >{lbl}</button>
        {/each}
      </div>
    </div>

    <!-- Anchor type -->
    <div>
      <label class="label" for="anchor-type">Anchor type</label>
      <select
        id="anchor-type"
        class="field"
        bind:value={job.cover_spec.anchor_type}
        on:change={() => store.markDirty()}
      >
        {#each anchorOptions as [val, lbl]}
          <option value={val}>{lbl}</option>
        {/each}
      </select>
    </div>

    <!-- Overlap (standard) -->
    <div>
      <label class="label" for="overlap-standard">Overlap — standard (in)</label>
      <input
        id="overlap-standard"
        class="field"
        type="number"
        inputmode="numeric"
        min="0"
        max="36"
        step="1"
        bind:value={job.cover_spec.overlap_standard_in}
        placeholder="12"
      />
      <p class="text-xs text-ink-100/50 mt-1">
        Industry standard is 12in.
      </p>
    </div>

    <!-- Overlap (planter) -->
    <div>
      <label class="label" for="overlap-planter">Overlap — planter areas (in)</label>
      <input
        id="overlap-planter"
        class="field"
        type="number"
        inputmode="numeric"
        min="0"
        max="36"
        step="1"
        bind:value={job.cover_spec.overlap_planter_in}
        placeholder="optional"
      />
      <p class="text-xs text-ink-100/50 mt-1">
        Leave blank if the pool has no planter overhangs.
      </p>
    </div>
  </div>

  <!-- ===================== Hardware add-ons ========================= -->
  <div class="card space-y-4">
    <p class="text-xs uppercase tracking-wider text-pool-500">Hardware add-ons</p>

    <!-- Y-straps -->
    <div>
      <label class="label" for="hw-y-straps">Y-straps</label>
      <input
        id="hw-y-straps"
        class="field"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        bind:value={job.hardware.y_straps}
        placeholder="0"
      />
    </div>

    <!-- Wood deck anchors -->
    <div>
      <label class="label" for="hw-deck-anchors">Wood deck anchors</label>
      <input
        id="hw-deck-anchors"
        class="field"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        bind:value={job.hardware.wood_deck_anchors}
        placeholder="0"
      />
    </div>

    <!-- Beauty rings: int OR entire pool -->
    <div>
      <div class="flex items-center justify-between">
        <label class="label" for="hw-beauty-rings">Beauty rings</label>
        <label class="flex items-center gap-2 text-sm text-ink-100/80 select-none">
          <input
            type="checkbox"
            class="w-5 h-5 accent-pool-500"
            bind:checked={job.hardware.beauty_rings_entire_pool}
            on:change={toggleBeautyRingsEntire}
          />
          Entire pool
        </label>
      </div>
      <input
        id="hw-beauty-rings"
        class="field"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        bind:value={job.hardware.beauty_rings}
        on:input={onBeautyRingsInput}
        disabled={job.hardware.beauty_rings_entire_pool}
        placeholder={job.hardware.beauty_rings_entire_pool ? 'Covering entire pool' : '0'}
      />
    </div>

    <!-- Lawn stakes -->
    <div>
      <label class="label" for="hw-lawn-stakes">Lawn stakes</label>
      <input
        id="hw-lawn-stakes"
        class="field"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        bind:value={job.hardware.lawn_stakes}
        placeholder="0"
      />
    </div>

    <!-- Paver tubes (ft) -->
    <div>
      <label class="label" for="hw-paver-tubes">Paver tubes (ft)</label>
      <input
        id="hw-paver-tubes"
        class="field"
        type="number"
        inputmode="decimal"
        min="0"
        step="1"
        bind:value={job.hardware.paver_tubes_ft}
        placeholder="0"
      />
    </div>

    <!-- Perimeter padding: from/to pair OR entire pool -->
    <div>
      <div class="flex items-center justify-between">
        <span class="label !mb-0">Perimeter padding</span>
        <label class="flex items-center gap-2 text-sm text-ink-100/80 select-none">
          <input
            type="checkbox"
            class="w-5 h-5 accent-pool-500"
            bind:checked={job.hardware.perimeter_padding_entire_pool}
            on:change={togglePerimeterPaddingEntire}
          />
          Entire pool
        </label>
      </div>

      {#if job.hardware.perimeter_padding_entire_pool}
        <p class="text-sm text-ink-100/60 mt-2 px-1">
          Padding will run the full perimeter.
        </p>
      {:else}
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label class="text-xs text-ink-100/60" for="hw-pad-from">From pt</label>
            <input
              id="hw-pad-from"
              class="field"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              bind:value={job.hardware.perimeter_padding_from_pt}
              on:input={onPerimeterPaddingInput}
              placeholder="1"
            />
          </div>
          <div>
            <label class="text-xs text-ink-100/60" for="hw-pad-to">To pt</label>
            <input
              id="hw-pad-to"
              class="field"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              bind:value={job.hardware.perimeter_padding_to_pt}
              on:input={onPerimeterPaddingInput}
              placeholder="1"
            />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- ===================== Order summary preview =================== -->
  <div class="card border-pool-500/30 bg-pool-500/5">
    <p class="text-xs uppercase tracking-wider text-pool-500 mb-2">Order summary</p>
    <p class="text-sm text-ink-50 leading-relaxed">
      {summary}
    </p>
  </div>
</div>
