<script>
  /**
   * Review & Export wizard step.
   *
   * The LAST step of the wizard. It shows:
   *   - A status badge (green ✓ ready, or yellow warnings)
   *   - The 3D preview (PoolViewer)
   *   - The reconstructed dimensions table
   *   - A job summary (customer, dealer, cover spec, hardware counts)
   *   - A "Jump to step" picker to back-edit any step
   *   - Sticky action buttons: "Download PDF" and "Mark complete & exit"
   *
   * Reconstructs the pool via api.reconstruct(job.id) on mount and on any
   * change to the underlying measurement. If the job is unsaved (no id),
   * the PDF button is disabled and a notice is shown.
   *
   * On a liner job it also pulls the takeoff: material totals and the closure
   * verdict. A liner order that does not close is refused by the server, so the
   * export button is disabled with the reasons listed rather than letting the
   * tech hit a 422 they cannot interpret.
   */
  import { onMount } from 'svelte';
  import { api } from '../api.js';
  import ClosureCheck from './ClosureCheck.svelte';
  import PoolViewer from './PoolViewer.svelte';
  import { stepsForJob } from '../wizard/steps.js';

  export let job;
  export let store;
  export let onJumpToStep = () => {};
  export let onFinish = () => {};
  export let title = 'Review & Export';
  export let description = '';

  // ---- Cover/hardware label helpers (mirrors CoverSpecForm) -----------
  const coverTypeLabels = {
    mesh_standard:    '12-yr Standard Mesh',
    mesh_super:       '15-yr Super Mesh',
    mesh_commercial:  '20-yr Commercial Mesh',
    solid:            'Solid w/ Drain',
    solid_no_drain:   'Solid no Drain',
  };
  const colorLabels = {
    blue: 'Blue', green: 'Green', black: 'Black', gray: 'Gray',
  };
  const spacingLabels = {
    '5x5':   "5' × 5'",
    '4x4':   "4' × 4'",
    '3x3':   "3' × 3'",
    combo: 'Combo (5×5 + 3×3)',
  };
  const anchorLabels = {
    concrete: 'Concrete', wood_deck: 'Wood deck', brass_collar: 'Brass collar',
    aluminum_pipe: 'Aluminum pipe', lawn_brick: 'Lawn / brick',
  };
  const shapeLabels = {
    rectangular: 'Rectangular', kidney: 'Kidney', freeform: 'Freeform',
  };

  function label(map, v) { return v != null && map[v] ? map[v] : (v ?? '—'); }

  // ---- Reconstructed pool state --------------------------------------
  let reconstructed = null;     // server response, or null while loading
  let loadError = null;
  let loading = false;
  let requestSeq = 0;           // monotonically increasing; only the latest response wins

  // Trigger refetch whenever any measurement input changes.
  // We watch a serialised fingerprint of the inputs to avoid spurious calls
  // (the PerimeterCaptureForm mutates the points array in place).
  $: fp = JSON.stringify({
    ab: job.measurement?.ab_distance_ft,
    shallow: job.measurement?.shallow_depth_ft,
    deep: job.measurement?.deep_depth_ft,
    pts: (job.measurement?.perimeter_points || []).map(p => [
      p.number, p.a_distance_ft, p.b_distance_ft,
    ]),
  });

  // Job saved on the server? (Need an id to call /reconstruct and /order-form.pdf.)
  $: hasId = !!(job && job.id);

  // ---- Liner takeoff state -------------------------------------------
  $: needsLiner = job.product_type === 'liner' || job.product_type === 'both';
  $: needsCover = !job.product_type || job.product_type === 'cover' || job.product_type === 'both';

  let takeoff = null;           // server response, or null
  let takeoffError = null;
  let takeoffSeq = 0;

  // Widen the refetch fingerprint to the vertical capture, so editing a wall
  // height or a riser re-runs the takeoff the same way editing a point does.
  $: linerFp = JSON.stringify({
    product: job.product_type,
    liner: job.measurement?.liner,
    spec: job.liner_spec,
  });

  async function loadTakeoff() {
    if (!hasId || !needsLiner) {
      takeoff = null;
      return;
    }
    const myReq = ++takeoffSeq;
    takeoffError = null;
    try {
      const data = await api.linerTakeoff(job.id);
      if (myReq !== takeoffSeq) return;
      takeoff = data;
    } catch (e) {
      if (myReq !== takeoffSeq) return;
      takeoffError = e.message || String(e);
      takeoff = null;
    }
  }

  $: linerOk = takeoff?.validation?.ok === true;
  $: linerBlocking = takeoff?.validation?.blocking || [];
  $: linerWarnings = takeoff?.validation?.warnings || [];
  $: linerPdfHref = hasId ? api.linerOrderFormPdfUrl(job.id) : '#';

  // The server returns the closure checks in its own casing; ClosureCheck
  // renders the client-side shape, so map once here rather than in the markup.
  $: linerChecks = (takeoff?.validation?.checks || []).map(c => ({
    name: c.name,
    measuredFt: parseFloat(c.measured_ft),
    expectedFt: parseFloat(c.expected_ft),
    differenceIn: parseFloat(c.difference_in),
    toleranceIn: parseFloat(c.tolerance_in),
    status: c.status,
    message: c.message,
  }));

  const SEVERITY_CLS = {
    low: 'border-green-500/40 bg-green-500/10 text-green-300',
    medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    high: 'border-red-500/50 bg-red-500/10 text-red-300',
  };

  async function loadReconstructed() {
    if (!hasId) {
      reconstructed = null;
      return;
    }
    const myReq = ++requestSeq;
    loading = true;
    loadError = null;
    try {
      const data = await api.reconstruct(job.id);
      // If a newer request started while we were in flight, drop this result.
      if (myReq !== requestSeq) return;
      reconstructed = data;
    } catch (e) {
      if (myReq !== requestSeq) return;
      loadError = e.message || String(e);
      reconstructed = null;
    } finally {
      if (myReq === requestSeq) loading = false;
    }
  }

  // Reload when the fingerprint changes (and the job is saved)
  let lastFp = null;
  $: if (hasId && fp !== lastFp) {
    lastFp = fp;
    loadReconstructed();
  }

  // The takeoff depends on the perimeter as well as the vertical capture, so
  // it refetches on either fingerprint.
  let lastLinerFp = null;
  $: if (hasId && needsLiner && (linerFp !== lastLinerFp || fp !== lastFp)) {
    lastLinerFp = linerFp;
    loadTakeoff();
  }

  onMount(() => {
    if (hasId) {
      loadReconstructed();
      if (needsLiner) loadTakeoff();
    }
  });

  // ---- Status badge derivation ---------------------------------------
  $: invalidCount = reconstructed
    ? reconstructed.points?.filter(p => p.quality === 'invalid').length || 0
    : 0;
  $: marginalCount = reconstructed
    ? reconstructed.points?.filter(p => p.quality === 'marginal').length || 0
    : 0;
  $: warnings = invalidCount > 0 || marginalCount > 0;

  // ---- Dimension formatters ------------------------------------------
  function ft(v, decimals = 1) {
    if (v == null || isNaN(v)) return '—';
    return `${Number(v).toFixed(decimals)} ft`;
  }
  function sqft(v) {
    if (v == null || isNaN(v)) return '—';
    return `${Math.round(Number(v))} sqft`;
  }
  function intOrDash(v) {
    if (v == null) return '—';
    return String(v);
  }

  // ---- Hardware summary (short, one-line) ----------------------------
  $: hwParts = (() => {
    const h = job.hardware || {};
    const out = [];
    if (h.y_straps > 0) out.push(`${h.y_straps} Y-strap${h.y_straps === 1 ? '' : 's'}`);
    if (h.wood_deck_anchors > 0) out.push(`${h.wood_deck_anchors} deck anchor${h.wood_deck_anchors === 1 ? '' : 's'}`);
    if (h.beauty_rings_entire_pool) out.push('beauty rings (entire pool)');
    else if (h.beauty_rings > 0) out.push(`${h.beauty_rings} beauty ring${h.beauty_rings === 1 ? '' : 's'}`);
    if (h.lawn_stakes > 0) out.push(`${h.lawn_stakes} lawn stake${h.lawn_stakes === 1 ? '' : 's'}`);
    if (h.paver_tubes_ft > 0) out.push(`${h.paver_tubes_ft}ft paver tube${Number(h.paver_tubes_ft) === 1 ? '' : 's'}`);
    if (h.perimeter_padding_entire_pool) out.push('padding (entire pool)');
    else if (h.perimeter_padding_from_pt && h.perimeter_padding_to_pt) {
      out.push(`padding pt ${h.perimeter_padding_from_pt}→${h.perimeter_padding_to_pt}`);
    }
    return out;
  })();

  $: pdfHref = hasId ? api.orderFormPdfUrl(job.id) : '#';

  // The picker lists the job's own steps: on a liner job the wizard's list is
  // longer, and an index taken from the cover list would jump to the wrong
  // screen (or past the end).
  $: jobSteps = stepsForJob(job);
  $: reviewStepIndex = jobSteps.length - 1;
</script>

<div class="space-y-4">
  <div>
    <h3 class="text-lg font-bold">{title}</h3>
    {#if description}
      <p class="text-ink-100/70 text-sm mt-1">{description}</p>
    {/if}
  </div>

  <!-- Status badge (or unsaved-job notice) -->
  {#if !hasId}
    <div class="border border-yellow-500/40 bg-yellow-500/5 rounded-lg p-3">
      <p class="text-sm text-yellow-300">
        ⚠ Save the job first to export. The PDF and reconstruction need a server-side job id.
      </p>
    </div>
  {:else if loading && !reconstructed}
    <div class="card flex items-center justify-center py-6 text-ink-100/70">
      <span class="text-sm">Loading reconstruction…</span>
    </div>
  {:else if loadError}
    <div class="border border-red-500/40 bg-red-500/5 rounded-lg p-3">
      <p class="text-sm text-red-300">⚠ Couldn't reconstruct: {loadError}</p>
      <button
        type="button"
        class="btn-ghost text-xs py-1 px-2 mt-2"
        on:click={loadReconstructed}
      >Retry</button>
    </div>
  {:else if warnings}
    <div class="border border-yellow-500/40 bg-yellow-500/5 rounded-lg p-3 space-y-1">
      <div class="flex items-center gap-2">
        <span class="text-yellow-300 font-bold">⚠ Warnings</span>
        {#if invalidCount > 0}
          <span class="text-xs text-red-300">{invalidCount} invalid point{invalidCount === 1 ? '' : 's'}</span>
        {/if}
        {#if marginalCount > 0}
          <span class="text-xs text-yellow-300">{marginalCount} marginal</span>
        {/if}
      </div>
      <p class="text-xs text-ink-100/70">
        Reconstruction completed with issues. The order form will still generate
        but you should review the suspect points and re-tape if possible.
      </p>
    </div>
  {:else if reconstructed}
    <div class="border border-green-500/40 bg-green-500/5 rounded-lg p-3">
      <p class="text-sm text-green-300 font-bold">✓ Ready</p>
      <p class="text-xs text-ink-100/70 mt-1">
        Reconstruction looks clean. You can download the PDF.
      </p>
    </div>
  {/if}

  <!-- 3D preview -->
  <div class="card space-y-2 !p-2">
    {#if reconstructed && reconstructed.points && reconstructed.points.length >= 3}
      <PoolViewer
        points={reconstructed.points}
        shapeType={job.measurement?.shape_type}
        shallow={Number(job.measurement?.shallow_depth_ft) || 0}
        deep={Number(job.measurement?.deep_depth_ft) || 0}
      />
    {:else}
      <div class="w-full h-72 bg-ink-950 rounded-lg flex items-center justify-center text-ink-100/50 text-sm">
        3D preview will appear once the pool is reconstructed
      </div>
    {/if}
  </div>

  <!-- Dimensions table -->
  <div class="card space-y-2">
    <p class="text-xs uppercase tracking-wider text-pool-500">Reconstructed dimensions</p>
    <dl class="divide-y divide-ink-100/10">
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Longest length</dt>
        <dd class="font-bold text-ink-50">{ft(reconstructed?.length_ft)}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Widest width</dt>
        <dd class="font-bold text-ink-50">{ft(reconstructed?.width_ft)}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Perimeter</dt>
        <dd class="font-bold text-ink-50">{ft(reconstructed?.perimeter_ft, 0)}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Area</dt>
        <dd class="font-bold text-ink-50">{sqft(reconstructed?.area_sqft)}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Avg depth</dt>
        <dd class="font-bold text-ink-50">{ft(reconstructed?.depth_avg_ft, 2)}</dd>
      </div>
    </dl>
  </div>

  <!-- Job summary -->
  <div class="card space-y-2">
    <p class="text-xs uppercase tracking-wider text-pool-500">Job summary</p>
    <dl class="divide-y divide-ink-100/10">
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Customer</dt>
        <dd class="font-medium text-ink-50 text-right">{job.meta?.customer_name || '—'}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Dealer</dt>
        <dd class="font-medium text-ink-50 text-right">{job.meta?.dealer_name || '—'}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Pool shape</dt>
        <dd class="font-medium text-ink-50">{label(shapeLabels, job.measurement?.shape_type)}</dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Cover</dt>
        <dd class="font-medium text-ink-50 text-right text-sm">
          {label(coverTypeLabels, job.cover_spec?.type)} ·
          {label(colorLabels, job.cover_spec?.color)} ·
          {label(spacingLabels, job.cover_spec?.spacing)} ·
          {label(anchorLabels, job.cover_spec?.anchor_type)}
        </dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Obstacles</dt>
        <dd class="font-medium text-ink-50">
          {(job.measurement?.obstacles || []).length}
        </dd>
      </div>
      <div class="flex justify-between py-2">
        <dt class="text-ink-100/80">Cross-dims</dt>
        <dd class="font-medium text-ink-50">
          {(job.measurement?.cross_dimensions || []).length}
        </dd>
      </div>
    </dl>
    {#if hwParts.length > 0}
      <div class="pt-2 border-t border-ink-100/10">
        <p class="text-xs text-ink-100/60 mb-1">Hardware add-ons</p>
        <p class="text-sm text-ink-50">{hwParts.join(' · ')}</p>
      </div>
    {/if}
  </div>

  <!-- Jump-to-step picker -->
  <div class="card space-y-2">
    <p class="text-xs uppercase tracking-wider text-pool-500">Jump to step</p>
    <p class="text-xs text-ink-100/60">Tap a step to back-edit it.</p>
    <div class="grid grid-cols-2 gap-2">
      {#each jobSteps as s, i}
        <button
          type="button"
          on:click={() => onJumpToStep(i)}
          class="text-left px-3 py-3 rounded-lg border text-sm transition-colors min-h-[44px]
                 {i === reviewStepIndex
                   ? 'border-pool-500 bg-pool-500/10 text-pool-500'
                   : 'border-ink-100/20 bg-ink-100/5 text-ink-100/90 hover:border-pool-500/60'}"
          aria-label="Go to step {i + 1}: {s.title}"
          aria-current={i === reviewStepIndex ? 'step' : undefined}
        >
          <span class="font-bold mr-1">{i + 1}.</span>
          <span>{s.title}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Liner takeoff -->
  {#if needsLiner && hasId}
    {#if takeoffError}
      <div class="card border-red-500/50 bg-red-500/10">
        <p class="text-sm text-red-300">Could not load the liner takeoff: {takeoffError}</p>
      </div>
    {:else if !takeoff}
      <div class="card flex items-center justify-center py-6 text-ink-100/70">
        <span class="text-sm">Loading liner takeoff…</span>
      </div>
    {:else}
      <!-- Verdict first: it decides whether the order can go out at all -->
      <div
        class="card {linerOk
          ? 'border-green-500/40 bg-green-500/10'
          : 'border-red-500/50 bg-red-500/10'}"
      >
        <p class="font-bold {linerOk ? 'text-green-300' : 'text-red-300'}">
          {linerOk ? '✓ Liner order ready' : '✕ Liner order blocked'}
        </p>
        {#if !linerOk}
          <p class="text-sm text-ink-100/80 mt-1">
            The measurements contradict each other or the order is incomplete. Fix these
            before the shop can cut:
          </p>
          <ul class="mt-2 space-y-1">
            {#each linerBlocking as reason}
              <li class="text-sm text-red-300">• {reason}</li>
            {/each}
          </ul>
        {/if}
        {#if linerWarnings.length > 0}
          <ul class="mt-3 pt-3 border-t border-ink-100/10 space-y-1">
            {#each linerWarnings as warning}
              <li class="text-sm text-yellow-300">⚠ {warning}</li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- The closure arithmetic, stated -->
      {#each linerChecks as check}
        <ClosureCheck {check} />
      {/each}

      <!-- Material -->
      {#if takeoff.takeoff}
        <div class="card">
          <p class="text-xs uppercase tracking-wider text-pool-500 mb-3">Material takeoff</p>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-ink-100/70">
                Wall panel
                <span class="text-ink-100/50">
                  ({parseFloat(takeoff.takeoff.perimeter_ft).toFixed(1)}ft perimeter ×
                  {parseFloat(takeoff.takeoff.wall_height_avg_ft).toFixed(2)}ft avg)
                </span>
              </dt>
              <dd class="font-mono text-ink-50">{sqft(takeoff.takeoff.wall_area_sqft)}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-100/70">
                Floor panel
                <span class="text-ink-100/50">
                  ({parseFloat(takeoff.takeoff.floor_developed_length_ft).toFixed(2)}ft developed)
                </span>
              </dt>
              <dd class="font-mono text-ink-50">
                {sqft(takeoff.takeoff.floor_developed_area_sqft)}
              </dd>
            </div>
            {#if parseFloat(takeoff.takeoff.step_area_sqft) > 0}
              <div class="flex justify-between gap-3">
                <dt class="text-ink-100/70">Steps</dt>
                <dd class="font-mono text-ink-50">{sqft(takeoff.takeoff.step_area_sqft)}</dd>
              </div>
            {/if}
            <div class="flex justify-between gap-3 pt-2 border-t border-ink-100/10">
              <dt class="text-ink-100/70">Subtotal</dt>
              <dd class="font-mono text-ink-50">{sqft(takeoff.takeoff.subtotal_sqft)}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-100/70">
                Waste factor ({parseFloat(takeoff.takeoff.waste_factor_pct).toFixed(0)}%)
              </dt>
              <dd class="font-mono text-ink-50">
                {sqft(
                  parseFloat(takeoff.takeoff.total_material_sqft)
                    - parseFloat(takeoff.takeoff.subtotal_sqft),
                )}
              </dd>
            </div>
            <div class="flex justify-between gap-3 pt-2 border-t border-ink-100/20">
              <dt class="font-bold text-ink-50">Total material</dt>
              <dd class="font-mono font-bold text-lg text-pool-500">
                {sqft(takeoff.takeoff.total_material_sqft)}
              </dd>
            </div>
          </dl>
          <p class="text-xs text-ink-100/50 mt-3">
            The floor is cut to its developed (slant) length, not its plan-view run — the
            liner follows the slope.
          </p>
        </div>
      {/if}

      <!-- Drain-day call -->
      {#if takeoff.validation.hydrostatic}
        <div class="card {SEVERITY_CLS[takeoff.validation.hydrostatic.severity]}">
          <p class="text-sm font-bold">
            Hydrostatic risk: {takeoff.validation.hydrostatic.severity.toUpperCase()}
          </p>
          <ul class="mt-2 space-y-1">
            {#each takeoff.validation.hydrostatic.notes as note}
              <li class="text-sm">• {note}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  {/if}

  <!-- Spacer so the sticky action bar doesn't cover the last card -->
  <div class="h-28" aria-hidden="true"></div>

  <!-- Sticky action bar -->
  <div class="fixed bottom-0 left-0 right-0 z-20 bg-ink-950/95 backdrop-blur border-t border-ink-100/20 p-3">
    <div class="max-w-3xl mx-auto flex flex-col gap-2">
      {#if needsCover}
        <a
          class="btn w-full text-lg py-4 text-center {(!hasId || loading) ? 'pointer-events-none opacity-50' : ''}"
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!hasId || loading}
          on:click={(e) => { if (!hasId || loading) e.preventDefault(); }}
          title={!hasId ? 'Save the job first to export' : 'Open the order form PDF in a new tab'}
        >
          ↓ {needsLiner ? 'Cover order PDF' : 'Download PDF'}
        </a>
      {/if}

      {#if needsLiner}
        <!-- Disabled while the order is blocked: the server refuses it anyway,
             and a 422 in a new tab is not a message the tech can act on. -->
        <a
          class="btn w-full text-lg py-4 text-center {(!hasId || !linerOk) ? 'pointer-events-none opacity-50' : ''}"
          href={linerPdfHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!hasId || !linerOk}
          on:click={(e) => { if (!hasId || !linerOk) e.preventDefault(); }}
          title={!hasId
            ? 'Save the job first to export'
            : (linerOk
              ? 'Open the liner order form PDF in a new tab'
              : 'Blocked: the measurements do not close')}
        >
          ↓ Liner order PDF
        </a>
        {#if hasId && takeoff && !linerOk}
          <p class="text-xs text-red-300 text-center">
            {linerBlocking.length} issue{linerBlocking.length === 1 ? '' : 's'} to fix before the liner order can go out.
          </p>
        {/if}
      {/if}

      <button
        type="button"
        class="btn-ghost w-full text-lg py-4"
        on:click={onFinish}
      >
        Mark complete &amp; exit
      </button>
    </div>
  </div>
</div>
