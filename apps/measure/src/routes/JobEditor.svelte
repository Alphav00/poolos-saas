<script>
  import { onMount, onDestroy } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { createJobStore } from '../lib/stores/jobStore.js';
  import Wizard from '../lib/wizard/Wizard.svelte';
  import { firstIncompleteStep } from '../lib/wizard/steps.js';

  export let id = null;  // from route params, or null for /new

  // Create the store. If we have an id, load that job; else try localStorage.
  const store = createJobStore({ initialId: id });

  let initialStep = null;
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

  function onFinish() {
    // After the last step, take the tech to the read-only view.
    navigate(`/measure/jobs/${$store.id || ''}`);
  }

  onDestroy(() => {
    $store.cancelPending?.();
  });
</script>

<Wizard {store} {initialStep} {onFinish} />
