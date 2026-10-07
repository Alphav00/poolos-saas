<script>
  import { onMount } from 'svelte';
  import SaveStatus from '../components/SaveStatus.svelte';
  import { stepsForJob, stepWarnings, firstIncompleteStep, furthestReachableStep } from './steps.js';
  import { getStepComponent, getStepComponentProps } from './stepComponents.js';

  /** The job store from createJobStore(). */
  export let store;

  /**
   * Initial step (0-indexed). If not given, the wizard starts at the
   * first incomplete non-skippable step.
   */
  export let initialStep = null;

  /** Called when the user advances past the last step. */
  export let onFinish = () => {};

  /** Called when a step's "Jump to step" picker activates. */
  export let onJumpToStep = (idx) => { goTo(idx); };

  let currentStep = 0;

  // The step list depends on what the job is ordering, so it is reactive.
  // Switching product mid-flow can shorten the list (both -> liner drops the
  // cover steps), so the cursor is clamped rather than left pointing past the
  // end, which would blank the screen.
  $: steps = stepsForJob($store.job);
  $: if (currentStep > steps.length - 1) currentStep = steps.length - 1;

  $: step = steps[currentStep];
  $: StepComponent = step ? getStepComponent(step.id) : null;
  $: stepComponentProps = step ? getStepComponentProps(step.id) : {};
  $: progressPct = ((currentStep + 1) / steps.length) * 100;
  $: furthest = furthestReachableStep($store.job, steps);
  $: warnings = step ? stepWarnings(step, $store.job) : [];
  $: canAdvance = step ? (step.isComplete?.($store.job) ?? true) : false;
  $: stepStates = steps.map((s, i) => {
    if (i === currentStep) return 'active';
    if (i < currentStep) return (s.isComplete?.($store.job) ?? true) ? 'done' : 'warning';
    if (i > furthest) return 'locked';
    return (s.isComplete?.($store.job) ?? true) ? 'done' : 'pending';
  });

  function next() {
    if (!canAdvance) return;
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      updateUrl();
    } else {
      onFinish();
    }
  }

  function prev() {
    if (currentStep > 0) {
      currentStep -= 1;
      updateUrl();
    }
  }

  function goTo(i) {
    if (i === currentStep) return;
    // Allow jumping back freely
    if (i < currentStep) {
      currentStep = i;
      updateUrl();
      return;
    }
    // Allow jumping forward to a step whose prerequisites are met
    if (i <= furthest) {
      // Make sure all intermediate steps are complete or skippable
      for (let j = currentStep; j < i; j++) {
        const ok = (steps[j].isComplete?.($store.job) ?? true) || steps[j].skippable;
        if (!ok) return;  // blocked
      }
      currentStep = i;
      updateUrl();
    }
  }

  function updateUrl() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('step', currentStep + 1);
    window.history.replaceState(null, '', url);
  }

  function readUrl() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('step');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > steps.length) return null;
    return n - 1;
  }

  onMount(() => {
    const requested = readUrl();
    const fallback = initialStep ?? firstIncompleteStep($store.job, steps);
    // Cap requested to furthest reachable so we don't strand the user
    currentStep = Math.min(requested ?? fallback, furthest);
  });
</script>

<div class="space-y-4 pb-24">
  <!-- Top: progress + save status -->
  <div class="sticky top-0 z-20 bg-ink-950/95 backdrop-blur -mx-4 px-4 py-3 border-b border-ink-100/20 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-ink-100/70">
        Step <b class="text-ink-50">{currentStep + 1}</b> of {steps.length}
      </span>
      <SaveStatus
        status={$store.status}
        lastSaved={$store.lastSaved}
        error={$store.error}
        retryInMs={$store.retryInMs}
        onRetry={() => $store.saveNow()}
        onSaveNow={() => $store.saveNow()}
        onDiscard={() => {
          if (confirm('Discard this job and start over?')) {
            $store.discard();
            window.location.href = '/measure/new';
          }
        }}
      />
    </div>
    <div class="h-1 bg-ink-100/20 rounded overflow-hidden">
      <div
        class="h-full bg-pool-500 transition-all"
        style="width: {progressPct}%"
      ></div>
    </div>
  </div>

  <!-- Step indicator (numbered pills, horizontally scrollable on small screens) -->
  <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
    {#each steps as s, i}
      {@const state = stepStates[i]}
      <button
        on:click={() => goTo(i)}
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors
               {state === 'active' ? 'border-pool-500 bg-pool-500/10 text-pool-500' : ''}
               {state === 'done' ? 'border-green-500/40 bg-green-500/5 text-green-300' : ''}
               {state === 'warning' ? 'border-yellow-500/40 bg-yellow-500/5 text-yellow-300' : ''}
               {state === 'pending' ? 'border-ink-100/20 text-ink-100/70' : ''}
               {state === 'locked' ? 'border-ink-100/10 text-ink-100/30 cursor-not-allowed' : ''}"
        disabled={state === 'locked'}
        title={state === 'locked' ? 'Complete previous steps first' : s.title}
      >
        <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                     {state === 'active' ? 'bg-pool-500 text-ink-950' : ''}
                     {state === 'done' ? 'bg-green-500 text-ink-950' : ''}
                     {state === 'warning' ? 'bg-yellow-500 text-ink-950' : ''}
                     {state === 'pending' ? 'bg-ink-100/20' : ''}
                     {state === 'locked' ? 'bg-ink-100/10' : ''}">
          {state === 'done' ? '✓' : i + 1}
        </span>
        {s.title}
      </button>
    {/each}
  </div>

  <!-- Step content -->
  <div class="card space-y-3">
    <div>
      <h2 class="text-xl font-bold">{step.title}</h2>
      <p class="text-ink-100/70 text-sm">{step.subtitle}</p>
    </div>

    {#if step.help}
      <details class="text-sm text-ink-100/60">
        <summary class="cursor-pointer text-pool-500">How this works</summary>
        <p class="mt-2">{step.help}</p>
      </details>
    {/if}

    <svelte:component
      this={StepComponent}
      job={$store.job}
      store={store}
      {onJumpToStep}
      {onFinish}
      {...stepComponentProps}
    />

    {#if warnings.length}
      <div class="border border-yellow-500/40 bg-yellow-500/5 rounded-lg p-3 space-y-1">
        {#each warnings as w}
          <p class="text-sm text-yellow-300">⚠ {w.message}</p>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Bottom: nav bar -->
  <div class="fixed bottom-0 left-0 right-0 z-20 bg-ink-950/95 backdrop-blur border-t border-ink-100/20 p-3">
    <div class="max-w-3xl mx-auto flex gap-2">
      <button
        class="btn-ghost flex-1"
        on:click={prev}
        disabled={currentStep === 0}
      >← Back</button>
      <button
        class="btn flex-[2]"
        on:click={next}
        disabled={!canAdvance}
        title={!canAdvance ? 'Complete required fields to continue' : ''}
      >
        {currentStep === steps.length - 1 ? 'Finish → Review' : 'Save & Continue →'}
      </button>
    </div>
  </div>
</div>
