<script lang="ts">
  // The company's loading screen after sign-in: its pool balls spiral inward
  // and goo-merge as the count reaches 100. Colours and the line come from the
  // brand pack's `loader` (brands/README.md). It holds until `done`, plays at
  // least MIN ms so it reads as a moment rather than a flicker, then calls onfinish.
  import { onMount } from 'svelte'

  let { balls, word, done, onfinish }: { balls: string[]; word: string; done: boolean; onfinish: () => void } = $props()

  const MIN = 1400
  const uid = $props.id()
  let p = $state(0)
  const R = $derived(34 * (1 - p * 0.82))
  const pop = $derived(p > 0.985 ? (p - 0.985) / 0.015 : 0)

  onMount(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let last = t0
    let raf = 0
    let ended = false
    const finish = () => {
      if (ended) return
      ended = true
      setTimeout(onfinish, 250)
    }
    const frame = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000
      last = now
      if (reduce) p = done && now - t0 > 600 ? 1 : 0.9
      // Creeps toward 90% while loading; runs to 100% once the data is in.
      else if (done && now - t0 > MIN) p = Math.min(1, p + dt * 1.6)
      else p += (0.9 - p) * Math.min(1, dt / 1.2)
      if (p >= 1) finish()
      else raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  })
</script>

<div class="loader" role="status" aria-live="polite" aria-label={word}>
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <filter id="goo-{uid}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="b" />
        <feColorMatrix in="b" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -10" />
      </filter>
    </defs>
    <g filter="url(#goo-{uid})">
      {#each balls as colour, i (i)}
        {@const a = p * 5.2 + (i * 2 * Math.PI) / balls.length}
        <circle cx={50 + Math.cos(a) * R} cy={50 + Math.sin(a) * R} r={Math.max(3, 6.5 - i * 0.5)} style:fill={colour} />
      {/each}
    </g>
    <circle cx="50" cy="50" r={10 + pop * 6} opacity={pop > 0.5 ? 0.9 : 0} style:fill="#fff" />
  </svg>
  <div class="pct">{Math.round(p * 100)}<small>%</small></div>
  <div class="word">{word}</div>
</div>

<style>
  .loader { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: var(--brand-deep); color: #fff; }
  svg { width: min(70vw, 340px); grid-area: 1 / 1; }
  .pct { grid-area: 1 / 1; z-index: 1; font-weight: 900; font-size: clamp(40px, 12vw, 72px); font-variant-numeric: tabular-nums; }
  .pct small { font-size: .45em; opacity: .7; }
  .word { position: absolute; bottom: 12%; font-weight: 800; font-size: 13px; letter-spacing: .28em; text-transform: uppercase; opacity: .75; }
</style>
