<script>
  /**
   * Two-box distance input: feet (whole number) and inches (whole + fraction).
   * Emits decimal feet via `value` two-way binding.
   *
   * Examples:
   *   feet=12, inches="3 1/4"  -> 12.270833
   *   feet=20, inches="0"      -> 20.0
   *   feet=0,  inches="1/2"    -> 0.0416
   */
  import { parseInches, formatDistance } from '../utils/distance.js';

  export let value = 0;            // decimal feet
  export let label = '';
  export let min = 0;
  export let max = 500;
  export let hint = '';
  export let error = '';
  export let required = false;
  export let autoFocus = false;

  // Internal state: feet (int) and inches (string, accepts fractions)
  let feetStr = '';
  let inchesStr = '';
  let lastEmittedFt = null;
  let mounted = false;

  function parseFeet(s) {
    const n = parseInt(s, 10);
    if (isNaN(n) || n < 0) return null;
    return n;
  }

  // `clamp` is applied when the field loses focus, not on every keystroke:
  // clamping mid-entry rewrote the box under the thumb (typing "28" into a
  // field with min 10 became 10, then 108, then 100).
  function emit(clamp = false) {
    const f = parseFeet(feetStr);
    if (f == null) {
      // invalid feet
      return;
    }
    let inches = 0;
    if (inchesStr.trim()) {
      const parsed = parseInches(inchesStr);
      if (parsed == null) {
        // invalid inches; keep prior value
        return;
      }
      inches = parsed;
    }
    const ft = f + inches / 12;
    const next = clamp ? Math.max(min, Math.min(max, ft)) : ft;
    if (next !== lastEmittedFt) {
      lastEmittedFt = next;
      value = next;
    }
  }

  // Hydrate from external value -> strings. A function, so the reactive
  // statement below depends on `value` only, not on what the user is typing.
  function hydrate(value) {
    const wholeFeet = Math.floor(value);
    const totalInches = (value - wholeFeet) * 12;
    // Round to nearest 1/16" for display
    const rounded = Math.round(totalInches * 16) / 16;
    if (wholeFeet !== parseInt(feetStr, 10)) {
      feetStr = String(wholeFeet);
    }
    if (Math.abs(rounded - Math.floor(rounded)) < 0.01) {
      const s = `${Math.floor(rounded)}`;
      if (s !== inchesStr) inchesStr = s;
    } else {
      // Convert rounded decimal to fraction string
      const whole = Math.floor(rounded);
      const frac = rounded - whole;
      const num = Math.round(frac * 16);
      if (num === 0) {
        if (inchesStr !== '0') inchesStr = '0';
      } else if (num === 16) {
        if (inchesStr !== String(whole + 1)) inchesStr = String(whole + 1);
      } else {
        // Simplify 16ths
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const d = gcd(num, 16);
        const s = whole > 0 ? `${whole} ${num/d}/${16/d}` : `${num/d}/${16/d}`;
        if (s !== inchesStr) inchesStr = s;
      }
    }
  }

  $: if (mounted && value != null) hydrate(value);

  // Re-emit when inputs change
  function onFeetChange() { emit(); }
  function onInchesChange() { emit(); }
  function onLeave() { emit(true); }
  // Tapping into a box selects what is there, so typing replaces it. Without
  // this a new point's "0" stays put and typing 11 in front of it reads 110.
  function selectAll(e) { e.currentTarget.select(); }

  import { onMount, tick } from 'svelte';
  onMount(() => {
    mounted = true;
    // Initial hydration
    if (value != null) {
      const wholeFeet = Math.floor(value);
      const totalInches = (value - wholeFeet) * 12;
      const rounded = Math.round(totalInches * 16) / 16;
      feetStr = String(wholeFeet);
      if (Math.abs(rounded - Math.floor(rounded)) < 0.01) {
        inchesStr = `${Math.floor(rounded)}`;
      } else {
        const whole = Math.floor(rounded);
        const frac = rounded - whole;
        const num = Math.round(frac * 16);
        if (num === 0) {
          inchesStr = '0';
        } else if (num === 16) {
          inchesStr = `${whole + 1}`;
        } else {
          const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
          const d = gcd(num, 16);
          inchesStr = whole > 0 ? `${whole} ${num/d}/${16/d}` : `${num/d}/${16/d}`;
        }
      }
      lastEmittedFt = value;
    }
  });
</script>

<div class="space-y-1">
  {#if label}
    <div class="label">
      {label}{#if required} *{/if}
    </div>
  {/if}
  <div class="flex gap-2 items-center">
    <div class="flex-1">
      <div class="flex">
        <input
          class="field rounded-r-none border-r-0 text-center"
          type="number"
          inputmode="numeric"
          min={min}
          max={max}
          step="1"
          bind:value={feetStr}
          on:input={onFeetChange}
          on:blur={onLeave}
          on:focus={selectAll}
          placeholder="0"
          aria-label={label ? `${label} feet` : 'Feet'}
          {autoFocus}
        />
        <span class="inline-flex items-center px-3 rounded-r-lg bg-ink-100/20 text-ink-100/70 font-semibold border border-l-0 border-ink-100/20">ft</span>
      </div>
    </div>
    <div class="flex-1">
      <div class="flex">
        <input
          class="field rounded-r-none border-r-0 text-center"
          type="text"
          inputmode="decimal"
          bind:value={inchesStr}
          on:input={onInchesChange}
          on:blur={onLeave}
          on:focus={selectAll}
          placeholder="0"
          aria-label={label ? `${label} inches` : 'Inches'}
        />
        <span class="inline-flex items-center px-3 rounded-r-lg bg-ink-100/20 text-ink-100/70 font-semibold border border-l-0 border-ink-100/20">in</span>
      </div>
    </div>
  </div>
  <div class="flex justify-between text-xs">
    <span class="text-ink-100/50">
      {hint || `Accepts fractions: 3, 3 1/4, 1/2, 3\u00BC`}
    </span>
    <span class="text-ink-100/70 font-mono">
      = {formatDistance(value, { useUnicode: true })}
    </span>
  </div>
  {#if error}
    <p class="text-red-400 text-sm">⚠ {error}</p>
  {/if}
</div>
