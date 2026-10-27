<script>
  import { onMount, onDestroy } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { createJobStore, canLeave, whyNotLeave } from '../lib/stores/jobStore.js';
  import Wizard from '../lib/wizard/Wizard.svelte';
  import { firstIncompleteStep } from '../lib/wizard/steps.js';

  export let id = null;  // from route params, or null for /new

  // Create the store. If we have an id, load that job; else try localStorage.
  const store = createJobStore({ initialId: id });

  let initialStep = null;
  // Shown when Finish is refused, so the tap is not silent.
  let finishNote = '';
  let lastSeenId = null;

  // When the store gets a real id, reflect it in the URL.
  $: if ($store.id && lastSeenId !== $store.id) {
    lastSeenId = $store.id;
    if (!id) {
      navigate(`/measure/jobs/${$store.id}/edit`, { replace: true });
    }
  }

  // Once the job is loaded from the server, pick a sensible initial step.
  $: if (initialStep === null && $store.job && $store.id) {
    initialStep = firstIncompleteStep($store.job);
  }

  async function onFinish() {
    // After the last step, take the tech to the read-only view. Save first:
    // the view, the order form and reconstruct all read the server copy, and
    // an edit typed in the last moment may still be waiting on the debounce.
    await store.saveNow();
    // Leave only once the server has the job; otherwise the status chip says why
    // (on this phone only, refused, could not be checked) and the edits stay here.
    if (canLeave($store)) {
      finishNote = '';
      navigate(`/measure/jobs/${$store.id}`);
    } else {
      finishNote = whyNotLeave($store);
    }
  }

  onDestroy(() => {
    // The methods live on the store, not on its value. destroy() sends a
    // pending save rather than dropping it.
    store.destroy();
  });
</script>

{#if finishNote}
  <div class="text-sm text-yellow-300 bg-ink-900 rounded p-2 mb-2" role="alert">{finishNote}</div>
{/if}
<Wizard {store} {initialStep} {onFinish} />
