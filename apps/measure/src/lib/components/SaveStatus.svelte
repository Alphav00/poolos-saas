<script>
  import { onMount } from 'svelte';

  export let status = 'idle';     // 'idle'|'dirty'|'saving'|'saved'|'local'|'error'|'fatal'|'rejected'|'conflict'
  export let lastSaved = null;
  export let error = null;
  export let retryInMs = null;
  export let onRetry = () => {};
  export let onSaveNow = () => {};
  export let onDiscard = () => {};

  let countdown = null;
  let timer = null;

  $: if (retryInMs) {
    if (timer) clearInterval(timer);
    countdown = Math.ceil(retryInMs / 1000);
    timer = setInterval(() => {
      countdown = Math.max(0, countdown - 1);
      if (countdown <= 0) clearInterval(timer);
    }, 1000);
  } else if (timer) {
    clearInterval(timer);
    timer = null;
    countdown = null;
  }

  let now = Date.now();
  let tickInterval;
  onMount(() => {
    tickInterval = setInterval(() => { now = Date.now(); }, 5000);
    return () => clearInterval(tickInterval);
  });

  function relTime(d) {
    if (!d) return '';
    const sec = Math.floor((now - d.getTime()) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return d.toLocaleTimeString();
  }
</script>

<div class="flex items-center gap-2 text-sm">
  {#if status === 'idle'}
    <span class="text-ink-100/50">—</span>
  {:else if status === 'dirty'}
    <span class="text-yellow-400">● Unsaved</span>
  {:else if status === 'saving'}
    <span class="text-pool-500 animate-pulse">● Saving…</span>
  {:else if status === 'saved'}
    <span class="text-green-400">✓ Saved {relTime(lastSaved)}</span>
  {:else if status === 'local'}
    <span class="text-yellow-300" title="A new job goes to the server once it has four perimeter points">● On this phone only</span>
  {:else if status === 'error'}
    <span class="text-red-400">⚠ Save failed{countdown !== null ? ` (retry in ${countdown}s)` : ''}</span>
    <button class="text-pool-500 underline" on:click={onSaveNow}>Retry</button>
  {:else if status === 'fatal'}
    <span class="text-red-500 font-bold">⚠ Save failed (retries exhausted)</span>
    <button class="text-pool-500 underline" on:click={onSaveNow}>Retry now</button>
  {:else if status === 'rejected'}
    <span class="text-red-500 font-bold">⚠ Server would not take this save (kept on this phone)</span>
  {:else if status === 'conflict'}
    <span class="text-yellow-300 font-bold">⚠ Changed elsewhere: showing the server copy</span>
  {/if}

  {#if status !== 'saving' && status !== 'idle'}
    <button class="text-ink-100/50 underline" on:click={onSaveNow}>Save now</button>
  {/if}

  <button class="text-red-400/70 underline" on:click={onDiscard} title="Discard this job and start over">Discard</button>

  {#if error && (status === 'error' || status === 'fatal' || status === 'rejected' || status === 'conflict')}
    <details class="text-xs text-ink-100/50">
      <summary class="cursor-pointer">details</summary>
      <pre class="mt-1 p-2 bg-ink-900 rounded text-xs overflow-x-auto">{error}</pre>
    </details>
  {/if}
</div>
